"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown, MoreHorizontal, Plus, Power, Skull } from "lucide-react";
import Link from "next/link"; // 1. Import Link
import { useState } from "react";
import { Farmer } from "../../../types";
import { AddFeedModal } from "./add-feed-modal";
import { AddMortalityModal } from "./add-mortality-modal";
import { EndCycleModal } from "./end-cycle-modal";

const ActionsCell = ({ farmer }: { farmer: Farmer }) => {
  const [showAddFeed, setShowAddFeed] = useState(false);
  const [showEndCycle, setShowEndCycle] = useState(false);
  const [showAddMortality, setShowAddMortality] = useState(false);

  if (farmer.status === "history") return null;

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
          
          <DropdownMenuItem onClick={() => setShowAddFeed(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Feed
          </DropdownMenuItem>

          <DropdownMenuItem onClick={() => setShowAddMortality(true)}>
            <Skull className="mr-2 h-4 w-4" />
            Add Mortality
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowEndCycle(true)}
            className="text-destructive focus:text-destructive"
          >
            <Power className="mr-2 h-4 w-4" />
            End Cycle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AddFeedModal 
        id={farmer.id}
        open={showAddFeed} 
        onOpenChange={setShowAddFeed} 
      />
      
      <AddMortalityModal
        farmerId={farmer.id}
        farmerName={farmer.name}
        open={showAddMortality}
        onOpenChange={setShowAddMortality}
      />
      
      <EndCycleModal 
        farmerId={farmer.id} 
        farmerName={farmer.name}
        remaining={farmer.inputFeed-farmer.intake}
        total={farmer.inputFeed}
        open={showEndCycle} 
        onOpenChange={setShowEndCycle} 
      />
    </>
  );
};

export const columns: ColumnDef<Farmer>[] = [
  {
    accessorKey: "name",
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
      // 2. Updated Cell Renderer with Link
      <Link 
        href={`/farmers/${row.original.id}`}
        className="text-sm font-medium text-foreground hover:underline hover:text-primary transition-colors"
      >
        {row.getValue("name")}
      </Link>
    ),
  },
  {
    accessorKey: "age",
    header: "Age",
    cell: ({ row }) => {
      const age = row.getValue("age") as number;
      return (
        <div className="flex items-center gap-1 text-sm">
          <span>{age}</span>
          <span className="text-muted-foreground">{age > 1 ? "days" : "day"}</span>
        </div>
      );
    },
  },
  {
    accessorKey: "doc",
    header: "DOC",
    cell: ({ row }) => {
      const amount = parseInt(row.getValue("doc"));
      return (
        <div className="text-sm text-muted-foreground">
          {amount.toLocaleString()}
        </div>
      );
    },
  },
  {
    accessorKey: "mortality",
    header: "Mortality",
    cell: ({ row }) => {
      const mortality = row.original.mortality;
      return (
        <div
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium
          ${mortality > 0 ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-500"}`}
        >
          {mortality > 0 ? '-' : ""}{mortality}
        </div>
      );
    },
  },
  {
    accessorKey: "inputFeed",
    header: () => <div className="text-right text-sm">Input (Bags)</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("inputFeed"));
      return <div className="text-right text-sm">{amount.toFixed(2)}</div>;
    },
  },
  {
    accessorKey: "intake",
    header: () => <div className="text-right text-sm">Intake (Bags)</div>,
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue("intake"));
      return (
        <div className="text-right text-sm text-muted-foreground">
          {amount.toFixed(2)}
        </div>
      );
    },
  },
  {
    id: "remaining",
    header: () => <div className="text-right text-sm">Remaining</div>,
    cell: ({ row }) => {
      const remaining = row.original.inputFeed - row.original.intake;
      const isLow = remaining < 5;

      return (
        <div
          className={`text-right text-sm font-medium ${
            isLow ? "text-orange-600" : "text-green-600"
          }`}
        >
          {remaining.toFixed(2)}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => <ActionsCell farmer={row.original} />,
  },
];