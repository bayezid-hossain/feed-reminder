"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, CalendarDays } from "lucide-react";
import { FarmerHistory } from "../../types";

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
    cell: ({ row }) => (
      <div className="font-semibold text-foreground text-sm">
        {row.getValue("farmerName")}
      </div>
    ),
  },
  {
    accessorKey: "doc",
    header: "DOC",
    cell: ({ row }) => {
      const amount = parseInt(row.getValue("doc"));
      return (
        // Changed text-xs to text-sm for consistency
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
        {row.getValue("age")} <span className="text-muted-foreground font-normal">days</span>
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
          // Enforced text-sm inside badge
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
      return (
        <div className={`text-right text-sm font-mono font-bold ${val > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          {val.toFixed(2)}
        </div>
      );
    },
  },
  {
    accessorKey: "timespan",
    header: "Timespan",
    cell: ({ row }) => {
      const start = new Date(row.original.startDate);
      const end = new Date(row.original.endDate);
      
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
            {/* Changed from text-[10px] to text-sm text-muted-foreground */}
            <span className="text-muted-foreground text-sm mt-0.5">
              {start.toLocaleDateString('en-US', options)} - {end.toLocaleDateString('en-US', options)}
            </span>
          </div>
        </div>
      );
    },
  },
];