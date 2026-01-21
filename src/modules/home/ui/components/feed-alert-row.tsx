import { Button } from "@/components/ui/button";
import { Farmer } from "@/modules/farmers/types";
import { AddFeedModal } from "@/modules/farmers/ui/components/farmer/add-feed-modal";
import { useState } from "react";

export const FeedAlertRow = ({ farmer }: { farmer: Farmer }) => {
  const [showRefill, setShowRefill] = useState(false);
  const remaining = farmer.inputFeed - farmer.intake;
  return (
    <div className="flex items-center justify-between p-4 border rounded-lg bg-red-50/50 border-red-100">
      <div className="flex flex-col gap-1">
        <span className="font-semibold text-sm">{farmer.name}</span>
        <span className="text-xs text-muted-foreground">Age: {farmer.age} days</span>
      </div>
      <div className="flex items-center gap-4">
        <div className="text-right">
          <div className="text-sm font-bold text-red-600">{remaining.toFixed(1)} Bags</div>
          <div className="text-[10px] text-red-400">Remaining</div>
        </div>
        <Button size="sm" variant="outline" className="h-8 border-red-200 hover:bg-red-100 hover:text-red-700" onClick={() => setShowRefill(true)}>
          Refill
        </Button>
        {showRefill && (
        <AddFeedModal 
            id={farmer.id}
            open={showRefill}
            onOpenChange={setShowRefill}
        />
      )}
      </div>
    </div>
  );
};