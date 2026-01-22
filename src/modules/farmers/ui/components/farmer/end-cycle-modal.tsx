"use client";

import ResponsiveDialog from "@/components/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Import Input
import { Label } from "@/components/ui/label"; // Import Label
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface EndCycleModalProps {
  farmerId: string;
  farmerName: string;
  open: boolean;
  remaining: number;
  total:number
  onOpenChange: (open: boolean) => void;
}

export const EndCycleModal = ({
  farmerId,
  farmerName,
  open,
  remaining,total,
  onOpenChange,
}: EndCycleModalProps) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  
  // State to track manual remaining stock
  const [remainingStock, setRemainingStock] = useState<string>(remaining.toString());

  const endMutation = useMutation(
    trpc.farmers.end.mutationOptions({
      onSuccess: async () => {
        toast.success(`${farmerName} moved to history`);
        await queryClient.invalidateQueries(trpc.farmers.getMany.queryOptions({}));
        onOpenChange(false);
        setRemainingStock(remaining.toString()); // Reset
      },
      onError: (error) => toast.error(error.message),
    })
  );

  const handleEndCycle = () => {
    // Validate input
    const stockValue = parseFloat(remainingStock);
    if (isNaN(stockValue) || stockValue < 0) {
        toast.error("Please enter a valid remaining stock amount");
        return;
    }

    endMutation.mutate({ 
        id: farmerId, 
        remainingStock: stockValue // Send to backend
    });
  };

  return (
    <ResponsiveDialog
      title="Confirm End Cycle"
      description="Are you sure you want to end this cycle?"
      open={open}
      onOpenChange={onOpenChange}
    >
      <div className="space-y-6 pt-2">
        {/* Warning Box */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            This will archive <strong>{farmerName}</strong>. This action cannot be undone.
          </p>
        </div>

        {/* Input Section */}
        <div className="space-y-2">
            <Label htmlFor="stock">Physical Remaining Stock (Bags)</Label>
            <Input 
                id="stock"
                type="number" 
                step="1.00"
                min="0"
                max={total}
                placeholder="0.00"
                value={remainingStock}
                onChange={(e) => setRemainingStock(e.target.value)}
                className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
                Enter the actual number of bags physically left in the shed.
            </p>
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2">
          <Button
            variant="destructive"
            onClick={handleEndCycle}
            disabled={endMutation.isPending}
          >
            {endMutation.isPending ? "Archiving..." : "Confirm & End Cycle"}
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