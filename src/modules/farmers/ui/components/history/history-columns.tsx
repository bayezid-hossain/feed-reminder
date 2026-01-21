"use client";

import ResponsiveDialog from "@/components/responsive-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ColumnDef } from "@tanstack/react-table";
import { Activity, ArrowUpDown, CalendarDays, MoreHorizontal, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { FarmerHistory } from "../../../types";

// FIX 1: Defined a type that includes the optional status
type HistoryRow = FarmerHistory & { status?: string };

// FIX 2: Explicitly typed the parameter to avoid 'any' error
const isRowActive = (row: HistoryRow) => row.status === 'active';

const ActionsCell = ({ history }: { history: HistoryRow }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // FIX 3: Moved useMutation to the top level (Must be before any return statement)
  const deleteMutation = useMutation(
    trpc.farmers.deleteHistory.mutationOptions({
      onSuccess: async () => {
        toast.success("Record deleted successfully");
        await queryClient.invalidateQueries(trpc.farmers.getHistory.queryOptions({}));
        setShowDeleteModal(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to delete record");
      }
    })
  );

  // FIX 4: Conditional return happens AFTER hooks are initialized
  if (history.status === 'active') {
    return (
        <div className="w-8 h-8 flex items-center justify-center">
             <span className="sr-only">Active</span>
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Open menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600 focus:bg-red-50 cursor-pointer"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Record
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ResponsiveDialog
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        title="Delete Record"
        description="Are you sure you want to delete this history record? This action cannot be undone."
      >
        <div className="flex justify-end gap-2 pt-4">
          <Button 
            variant="outline" 
            onClick={() => setShowDeleteModal(false)}
            disabled={deleteMutation.isPending}
          >
            Cancel
          </Button>
          <Button 
            variant="destructive" 
            onClick={() => deleteMutation.mutate({ id: history.id })}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </Button>
        </div>
      </ResponsiveDialog>
    </>
  );
};

export const historyColumns: ColumnDef<FarmerHistory>[] = [
  {
    accessorKey: "farmerName",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8 text-sm font-medium"
        >
          Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
        // Cast row.original to HistoryRow to access the optional status property
        const isActive = isRowActive(row.original as HistoryRow);
        return (
            <div className="flex items-center gap-2">
                <Link 
                    href={`/farmers/${row.original.id}`}
                    className={`text-sm font-medium hover:underline transition-colors ${isActive ? 'text-emerald-700 font-bold' : 'text-foreground hover:text-primary'}`}
                >
                    {row.getValue("farmerName")}
                </Link>
                {isActive && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <Activity className="h-3 w-3" /> Current
                    </Badge>
                )}
            </div>
        )
    },
  },
  {
    accessorKey: "doc",
    header: "DOC",
    cell: ({ row }) => {
      const amount = parseInt(row.getValue("doc"));
      return (
        <div className="font-mono text-sm text-muted-foreground bg-slate-100 px-2 py-0.5 rounded-md w-fit">
          {amount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "age",
    header: "Cycle Age",
    cell: ({ row }) => (
      <div className="text-sm font-medium">
       <span className="text-muted-foreground font-normal">
              {row.getValue("age")} {Number(row.getValue("age")) === 1 ? "day" : "days"}</span>
      </div>
    ),
  },
  {
    accessorKey: "mortality",
    header: "Mortality",
    cell: ({ row }) => {
      const val = row.original.mortality;
      return (
        <Badge 
          variant={val > 0 ? "destructive" : "secondary"}
          className={`text-sm font-normal ${val === 0 ? "bg-slate-100 text-slate-500 hover:bg-slate-200" : ""}`}
        >
          {val.toLocaleString()}
        </Badge>
      );
    },
  },
  {
    accessorKey: "finalInputFeed",
    header: () => <div className="text-right text-sm">Total Feed</div>,
    cell: ({ row }) => {
      const val = parseFloat(row.getValue("finalInputFeed"));
      return <div className="text-right text-sm font-mono text-muted-foreground">{val.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "finalIntake",
    header: () => <div className="text-right text-sm">Consumed</div>,
    cell: ({ row }) => {
      const val = parseFloat(row.getValue("finalIntake"));
      return <div className="text-right text-sm font-mono text-zinc-700">{val.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "finalRemaining",
    header: () => <div className="text-right text-sm">Leftover</div>,
    cell: ({ row }) => {
      const val = parseFloat(row.getValue("finalRemaining"));
      const isActive = isRowActive(row.original as HistoryRow);
      
      return (
        <div className={`text-right text-sm font-mono font-bold ${isActive ? "text-amber-600" : val > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          {val.toFixed(2)}
        </div>
      );
    },
  },
  {
    accessorKey: "timespan",
    header: "Timespan",
    cell: ({ row }) => {
      const isActive = isRowActive(row.original as HistoryRow);
      const start = new Date(row.original.startDate);
      const end = new Date(row.original.endDate);
      
      if (isActive) {
        return (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50/50 px-2 py-1 rounded-md">
                <CalendarDays className="h-4 w-4 opacity-50" />
                <span className="font-medium">Ongoing</span>
            </div>
        )
      }

      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const options: Intl.DateTimeFormatOptions = { 
        month: 'short', 
        day: 'numeric', 
        year: '2-digit' 
      };

      return (
        <div className="flex items-center gap-2 text-sm">
          <CalendarDays className="h-4 w-4 text-muted-foreground opacity-50" />
          <div className="flex flex-col">
            <span className="font-medium leading-none">
              {diffDays} {diffDays === 1 ? "day" : "days"}
            </span>
            <span className="text-muted-foreground text-sm mt-0.5">
              {start.toLocaleDateString('en-US', options)} - {end.toLocaleDateString('en-US', options)}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell history={row.original as HistoryRow} />,
  },
];