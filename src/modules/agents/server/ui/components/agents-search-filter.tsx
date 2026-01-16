import { Input } from "@/components/ui/input";
import { useAgentsFilters } from "@/modules/agents/hooks/use-agents-filters";
import { SearchIcon } from "lucide-react";

export const AgentsSearchFilter = () => {
  const [filters, setFilters] = useAgentsFilters();

  return (
    <div className="relative">
      <Input
        placeholder="Filter by Name"
        className="h-9 bg-white w-[200px] pl-7"
        value={filters.search}
        onChange={(e) =>
          setFilters({ search: e.target.value })
        }
      />
      <SearchIcon className="size-4 left-2 absolute top-1/2 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
};
