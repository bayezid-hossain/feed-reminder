"use client";

import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { DataTable } from "../components/data-table";
import { columns } from "../components/columns";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { Button } from "@/components/ui/button";
import { ErrorBoundary } from "react-error-boundary";
import { Suspense } from "react";
import LoadingState from "@/components/loading-state";
import ErrorState from "@/components/error-state";

const HistoryContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const trpc = useTRPC();
    const { data } = useSuspenseQuery(
        trpc.farmers.getMany.queryOptions({ ...filters, status: "history" })
    );

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">History</h1>
            </div>

            <DataTable data={data.items} columns={columns} />

            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
                    disabled={filters.page === 1}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ page: filters.page + 1 })}
                    disabled={filters.page >= data.totalPages}
                >
                    Next
                </Button>
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
