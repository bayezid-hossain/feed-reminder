import { ColumnDef } from "@tanstack/react-table";
import { FarmerHistory } from "../../types";

export const historyColumns: ColumnDef<FarmerHistory>[] = [
  {
    accessorKey: "farmerName",
    header: "Name",
  },
  {
    accessorKey: "age",
    header: "Age (days)",
  },
  {
    accessorKey: "doc",
    header: "Doc",
  },
  {
    accessorKey: "mortality",
    header: "Mortality",
  },
  {
    accessorKey: "finalInputFeed",
    header: "Total Feed (bags)",
  },
  {
    accessorKey: "finalIntake",
    header: "Intake (bags)",
  },
  {
    accessorKey: "finalRemaining",
    header: "Remaining (bags)",
  },{
  accessorKey: "timespan",
  header: "Timespan",
  cell: ({ row }) => {
    const start = new Date(row.original.startDate);
    const end = new Date(row.original.endDate);
    
    // Calculate difference
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Date formatting options
    const options: Intl.DateTimeFormatOptions = { 
      month: 'long', 
      day: 'numeric', 
      year: 'numeric' 
    };

    return (
      <div className="flex flex-col">
        <span className="font-medium">
          {diffDays} {diffDays === 1 ? "day" : "days"}
        </span>
        <span className="text-xs text-muted-foreground">
          {start.toLocaleDateString('en-US', options)} - {end.toLocaleDateString('en-US', options)}
        </span>
      </div>
    );
  },
},
];
