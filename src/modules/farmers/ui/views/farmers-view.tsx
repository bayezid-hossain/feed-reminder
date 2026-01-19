"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";
import { PlusIcon, RefreshCw, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { columns } from "../components/columns";
import { CreateFarmerModal } from "../components/create-farmer-modal";
import { DataTable } from "../components/data-table";

const FarmersContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // 1. Local state for immediate input feedback
    const [searchTerm, setSearchTerm] = useState(filters.search || "");

    const trpc = useTRPC();
    const queryClient = useQueryClient();
    
    // 2. Simple Debounce (No Transition needed with keepPreviousData)
    useEffect(() => {
        const timeoutId = setTimeout(() => {
            if (searchTerm !== filters.search) {
                setFilters({ 
                    search: searchTerm, 
                    page: 1 
                });
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [searchTerm, filters.search, setFilters]);

    // 3. Use standard useQuery with placeholderData
    const { data, isPending, isFetching } = useQuery({
        ...trpc.farmers.getMany.queryOptions({ 
            ...filters, 
            status: "active",
            sortBy: sorting[0]?.id,
            sortOrder: sorting[0]?.desc ? "desc" : "asc" 
        }),
        // This is the magic line that prevents the component reload:
        placeholderData: keepPreviousData, 
    });

    const syncMutation = useMutation(
        trpc.farmers.syncFeed.mutationOptions({
            onSuccess: async (result) => {
                await queryClient.invalidateQueries(trpc.farmers.getMany.queryOptions({}));
                toast.success(`Synced! Updated ${result.updatedCount} farmers.`);
            },
            onError: (err) => toast.error(err.message || "Failed to sync feed.")
        })
    );

    // 4. Handle Initial Loading Manually
    // This replicates the "Suspense" behavior but only for the very first load
    if (isPending) {
        return <LoadingState title="Loading" description="Loading farmers..." />;
    }

    // 5. Handle Error State Manually (optional, if data is undefined)
    if (!data) {
        return <ErrorState title="Error" description="Failed to load farmers" />;
    }

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4 bg-white pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Farmers</h1>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8"
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <Button 
                            variant="outline" 
                            className="flex-1 sm:flex-none"
                            onClick={() => syncMutation.mutate()} 
                            disabled={syncMutation.isPending}
                        >
                            <RefreshCw className={`mr-2 size-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
                            {syncMutation.isPending ? "Syncing..." : "Sync"}
                        </Button>

                        <Button className="flex-1 sm:flex-none" onClick={() => setIsCreateOpen(true)}>
                            <PlusIcon className="mr-2 size-4" />
                            Add Farmer
                        </Button>
                    </div>
                </div>
            </div>

            {/* 6. Table Area - Only dims when fetching new data */}
            <div className={`transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                <DataTable 
                    data={data.items} 
                    columns={columns} 
                    sorting={sorting}
                    onSortingChange={setSorting} // Direct setSorting is fine with standard useQuery
                />
            </div>

            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ page: Math.max(1, filters.page - 1) })}
                    disabled={filters.page === 1 || isFetching}
                >
                    Previous
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ page: filters.page + 1 })}
                    disabled={filters.page >= data.totalPages || isFetching}
                >
                    Next
                </Button>
            </div>

            <CreateFarmerModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
};

// 7. Remove the Suspense/ErrorBoundary wrapper here since we handle it internally now
export const FarmersView = () => {
    return <FarmersContent />;
}