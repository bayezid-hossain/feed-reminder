"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { PlusIcon, RefreshCw } from "lucide-react";
import { Suspense, useState } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { toast } from "sonner";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { columns } from "../components/columns";
import { CreateFarmerModal } from "../components/create-farmer-modal";
import { DataTable } from "../components/data-table";

const FarmersContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const trpc = useTRPC();
    const queryClient = useQueryClient();
    
    const { data } = useSuspenseQuery(
        trpc.farmers.getMany.queryOptions({ ...filters, status: "active" })
    );

    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Replace fetch with tRPC Mutation
    const syncMutation = useMutation(
        trpc.farmers.syncFeed.mutationOptions({
            onSuccess: async (result) => {
                // 1. Reload the table data
                await queryClient.invalidateQueries(
                    trpc.farmers.getMany.queryOptions({})
                );
                
                toast.success(`Synced! Updated ${result.updatedCount} farmers.`);
            },
            onError: (err) => {
                toast.error(err.message || "Failed to sync feed.");
            }
        })
    );

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4 bg-white pt-2">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Farmers</h1>
                <div className="flex items-center gap-2">
                    {/* Sync Button */}
                    <Button 
                        variant="outline" 
                        onClick={() => syncMutation.mutate()} 
                        disabled={syncMutation.isPending}
                    >
                        <RefreshCw 
                            className={`mr-2 size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} 
                        />
                        {syncMutation.isPending ? "Syncing..." : "Sync Feed"}
                    </Button>

                    <Button onClick={() => setIsCreateOpen(true)}>
                        <PlusIcon className="mr-2 size-4" />
                        Add Farmer
                    </Button>
                </div>
            </div>

            <DataTable data={data.items} columns={columns} />

            {/* ... Pagination & Modals ... */}
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

            <CreateFarmerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
};

export const FarmersView = () => {
    return (
        <ErrorBoundary fallback={<ErrorState title="Error" description="Failed to load farmers" />}>
            <Suspense fallback={<LoadingState title="Loading" description="Loading farmers..." />}>
                <FarmersContent />
            </Suspense>
        </ErrorBoundary>
    )
}