"use client";

import { ColumnDef } from "@tanstack/react-table";
import { Farmer } from "../../types";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";

const EndButton = ({ id }: { id: string }) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const endMutation = useMutation(
    trpc.farmers.end.mutationOptions({
      onSuccess: async () => {
        toast.success("Farmer moved to history");

        await queryClient.invalidateQueries(
          trpc.farmers.getMany.queryOptions({})
        );
      },
      onError: (error) => {
        toast.error(error.message);
      },
    })
  );

  return (
    <Button
      variant="destructive"
      size="sm"
      onClick={() => endMutation.mutate({ id })}
      disabled={endMutation.isPending}
    >
      End
    </Button>
  );
};

export const columns: ColumnDef<Farmer>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "doc",
    header: "Doc",
  },
  {
    accessorKey: "inputFeed",
    header: "Input Feed",
  },
  {
    accessorKey: "intake",
    header: "Intake",
  },
  {
    id: "remaining",
    header: "Remaining",
    cell: ({ row }) => {
      const input = row.original.inputFeed;
      const intake = row.original.intake;
      return <span>{input - intake}</span>;
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      if (row.original.status === "history") return null;
      return <EndButton id={row.original.id} />;
    },
  },
];
