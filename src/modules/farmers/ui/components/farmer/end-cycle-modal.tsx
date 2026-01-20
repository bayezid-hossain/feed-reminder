"use client";

import ResponsiveDialog from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";

interface EndCycleModalProps {
  farmerId: string;
  farmerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EndCycleModal = ({
  farmerId,
  farmerName,
  open,
  onOpenChange,
}: EndCycleModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const endMutation = useMutation(
    trpc.farmers.end.mutationOptions({
      onSuccess: async () => {
        toast.success(`${farmerName} moved to history`);
        await queryClient.invalidateQueries(trpc.farmers.getMany.queryOptions({}));
        onOpenChange(false);
      },
      onError: (error) => toast.error(error.message),
    })
  );

  return (
    <ResponsiveDialog
      title="Confirm End Cycle"
      description="Are you sure you want to end this cycle?"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-4 pt-2">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            This will archive <strong>{farmerName}</strong> and move all records to the history table. This action cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            onClick={() => endMutation.mutate({ id: farmerId })}
            disabled={endMutation.isPending}
          >
            {endMutation.isPending ? "Archiving..." : "Yes, End Cycle"}
          </Button>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={endMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
};