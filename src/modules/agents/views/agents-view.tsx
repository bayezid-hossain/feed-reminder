"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DataTable } from "../server/ui/components/data-table";
import { columns } from "../server/ui/components/columns";
import { AgentGetOne } from "../types";
import EmptyState from "@/components/empty-state";
import { useAgentsFilters } from "../hooks/use-agents-filters";
import DataPagination from "../server/ui/components/data-pagination";

export const AgentsView = () => {
  const [filters, setFilters] = useAgentsFilters();
  const trpc = useTRPC();
  const { data } = useSuspenseQuery(
    trpc.agents.getMany.queryOptions({ ...filters })
  );

  return (
    <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
      {/* <ResponsiveDialog
        title="Responsive test"
        description="Responsive description"
        open
        onOpenChange={() => {}}
      >
        <Button>Some action</Button>
      </ResponsiveDialog> */}
      {/* {JSON.stringify(data, null, 2)} */}
      <DataTable data={data.items} columns={columns} />
      <DataPagination
        page={filters.page}
        totalPages={data.totalPages}
        onPageChange={(page) => setFilters({ page })}
      />
      {data.items.length === 0 && (
        <EmptyState
          title="Create your first agent"
          description="Create an agent to join your meetings. Each agent will follow your instructions and can interact with participants during the call."
        />
      )}
    </div>
  );
};

export const AgentsViewLoading = () => {
  return (
    <LoadingState
      title="Loading Agents"
      description="This may take a few seconds"
    />
  );
};
export const AgentsViewLoadingError = () => {
  return (
    <ErrorState
      title="Error Loading Agents"
      description="Something went wrong"
    />
  );
};
