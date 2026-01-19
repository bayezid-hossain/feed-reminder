"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { OnChangeFn, SortingState } from "@tanstack/react-table"; // Import Table types
import { Suspense, useState, useTransition } from "react"; // Import useTransition
import { ErrorBoundary } from "react-error-boundary";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { DataTable } from "../components/data-table";
import { historyColumns } from "../components/history-columns";

const HistoryContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const [sorting, setSorting] = useState<SortingState>([]);
    
    // 1. Initialize Transition to prevent Suspense fallback on sort/filter
    const [isPending, startTransition] = useTransition();

    const trpc = useTRPC();
    
    // 2. Query with sorting params
    const { data } = useSuspenseQuery(
        trpc.farmers.getHistory.queryOptions({ 
            ...filters,
            sortBy: sorting[0]?.id,
            sortOrder: sorting[0]?.desc ? "desc" : "asc"
        })
    );

    // 3. Wrapper to handle sorting state updates inside transition
    const handleSortingChange: OnChangeFn<SortingState> = (updaterOrValue) => {
        startTransition(() => {
            setSorting((old) => {
                return typeof updaterOrValue === "function" 
                    ? updaterOrValue(old) 
                    : updaterOrValue;
            });
        });
    };

    // 4. Wrapper to handle page updates inside transition
    const handlePageChange = (newPage: number) => {
        startTransition(() => {
            setFilters({ page: newPage });
        });
    };

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4 bg-white pt-2">
            <div className="flex flex-col gap-1 pb-2 border-b">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Production History</h1>
                <p className="text-sm text-muted-foreground">
                    Archive of completed cycles, feed consumption, and mortality records.
                </p>
            </div>

            {/* 5. Opacity transition for visual feedback */}
            <div className={`mt-2 transition-opacity ${isPending ? "opacity-50 pointer-events-none" : ""}`}>
                <DataTable 
                    data={data.items} 
                    columns={historyColumns} 
                    sorting={sorting}
                    onSortingChange={handleSortingChange}
                />
            </div>

            <div className="flex items-center justify-between py-4">
                <div className="text-sm text-muted-foreground">
                   Page {filters.page} of {data.totalPages}
                </div>
                <div className="flex space-x-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                        disabled={filters.page === 1 || isPending}
                    >
                        Previous
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handlePageChange(filters.page + 1)}
                        disabled={filters.page >= data.totalPages || isPending}
                    >
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export const HistoryView = () => {
    return (
        <ErrorBoundary fallback={<ErrorState title="Error" description="Failed to load history" />}>
            <Suspense fallback={<LoadingState title="Loading" description="Loading history..." />}>
                <HistoryContent />
            </Suspense>
        </ErrorBoundary>
    )
}