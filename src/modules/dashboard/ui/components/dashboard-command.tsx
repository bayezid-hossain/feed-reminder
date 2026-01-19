"use client";

import {
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandResponsiveDialog,
} from "@/components/ui/command";
import { Farmer } from "@/modules/farmers/types";
import { useTRPC } from "@/trpc/client";
import { useQuery } from "@tanstack/react-query";
import { History, Loader2, User } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { useDebounce } from "use-debounce"; // Optional: prevent spamming API

interface Props {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
}

const DashboardCommand = ({ open, setOpen }: Props) => {
  // const router = useRouter();
  const trpc = useTRPC();
  
  // 1. Search State
  const [query, setQuery] = useState("");
  // Debounce search to wait 300ms after typing stops before fetching
  const [debouncedQuery] = useDebounce(query, 300);

  // 2. Fetch Active Farmers
  const { data: activeData, isPending: isActivePending } = useQuery(
    trpc.farmers.getMany.queryOptions({ search: debouncedQuery, status: "active", pageSize: 5 }, { enabled: open })
  );

  // 3. Fetch History
 
    const { data: historyData,isPending:isHistoryPending } = useQuery(
      trpc.farmers.getHistorySuggestion.queryOptions({search:debouncedQuery,pageSize:5}, { enabled: open })
    );
  const isLoading = isActivePending || isHistoryPending;

  // 4. Handle Selection
  const handleSelect = (id: string, type: "active" | "history") => {
    setOpen(false);
    
    if (type === "active") {
        // Navigate to active farmer details (adjust route as needed)
        // router.push(`/farmers/${id}`);
        console.log("Selected Active Farmer:", id);
    } else {
        // Navigate to history details
        // router.push(`/history/${id}`);
        console.log("Selected History Record:", id);
    }
  };

  return (
    <CommandResponsiveDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search farmers or history..." 
        value={query}
        onValueChange={setQuery}
      />
      
      <CommandList>
        {/* Loading State */}
        {isLoading && (
          <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
             <Loader2 className="h-4 w-4 animate-spin" /> Searching...
          </div>
        )}

        {/* Empty State */}
        {!isLoading && 
         activeData?.items.length === 0 && 
         historyData?.items.length === 0 && (
          <CommandEmpty>No results found.</CommandEmpty>
        )}

        {/* Group: Active Farmers */}
        {activeData?.items && activeData.items.length > 0 && (
          <CommandGroup heading="Active Farmers">
            {activeData.items.map((farmer:Farmer) => (
              <CommandItem
                key={farmer.id}
                value={`active-${farmer.name}`} // Unique value for accessibility
                onSelect={() => handleSelect(farmer.id, "active")}
              >
                <User className="mr-2 h-4 w-4 opacity-70" />
                <div className="flex flex-col">
                    <span>{farmer.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                        Age: {farmer.age ?? 0} days • {farmer.doc} Birds
                    </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* Group: History */}
        {historyData?.items && historyData.items.length > 0 && (
          <CommandGroup heading="Production History">
            {historyData.items.map((item) => (
              <CommandItem
                key={item.id}
                value={`history-${item.farmerName}-${item.endDate}`}
                onSelect={() => handleSelect(item.id, "history")}
              >
                <History className="mr-2 h-4 w-4 opacity-70" />
                <div className="flex flex-col">
                    <span>{item.farmerName}</span>
                    <span className="text-[10px] text-muted-foreground">
                        Ended: {new Date(item.endDate).toLocaleDateString()} • Result: {item.finalRemaining} bags left
                    </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandResponsiveDialog>
  );
};

export default DashboardCommand;