"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/trpc/client";
import { AddStockDialog } from "./add-stock-dialog";

export const MainStockTable = () => {
  const [data] = trpc.farmers.getMany.useSuspenseQuery({
    page: 1,
    pageSize: 100,
  });

  return (
    <div className="rounded-md border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Farmer Name</TableHead>
            <TableHead>Running Cycles</TableHead>
            <TableHead>Total Stock Input</TableHead>
            <TableHead>Total Stock Intake</TableHead>
            <TableHead>Remaining Stock</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.items.map((farmer) => (
            <TableRow key={farmer.id}>
              <TableCell className="font-medium">{farmer.name}</TableCell>
              <TableCell>{farmer.activeCyclesCount}</TableCell>
              <TableCell>{farmer.mainStockInput.toFixed(2)}</TableCell>
              <TableCell>{farmer.totalIntake.toFixed(2)}</TableCell>
              <TableCell>{farmer.mainStockRemaining.toFixed(2)}</TableCell>
              <TableCell className="text-right">
                <AddStockDialog farmerId={farmer.id} farmerName={farmer.name} />
              </TableCell>
            </TableRow>
          ))}
          {data.items.length === 0 && (
            <TableRow>
              <TableCell colSpan={6} className="h-24 text-center">
                No farmers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
};
