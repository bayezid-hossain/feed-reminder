"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTRPC } from "@/trpc/client";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { SortingState } from "@tanstack/react-table";
import { PlusIcon, RefreshCw, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { DataTable } from "../components/data-table";
import { columns } from "../components/farmer/columns";
import { StartCycleModal } from "../components/farmer/start-cycle-modal";

const FarmersContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const [sorting, setSorting] = useState<SortingState>([]);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    
    // Local state for immediate input feedback
    const [searchTerm, setSearchTerm] = useState(filters.search || "");

    const trpc = useTRPC();
    const queryClient = useQueryClient();
    
    // Debounce Effect
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

    // Query with placeholderData to prevent full reloads
    const { data, isPending, isFetching } = useQuery({
        ...trpc.farmers.getCycles.queryOptions({
            page: filters.page,
            pageSize: filters.pageSize || 10,
            search: filters.search,
            status: "active",
        }),
        placeholderData: keepPreviousData, 
    });

    const syncMutation = useMutation(
        trpc.farmers.syncFeed.mutationOptions({
            onSuccess: async (result) => {
                await queryClient.invalidateQueries(trpc.farmers.getCycles.queryOptions({}));
                toast.success(`Synced! Updated ${result.updatedCount} cycles.`);
            },
            onError: (err) => toast.error(err.message || "Failed to sync feed.")
        })
    );

    // Initial Loading State
    if (isPending) {
        return <LoadingState title="Loading" description="Loading cycles..." />;
    }

    // Error State
    if (!data) {
        return <ErrorState title="Error" description="Failed to load cycles" />;
    }

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4 bg-white pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold tracking-tight">Active Cycles</h1>
                
                <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                    {/* Search Input Container */}
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search farmer name..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            // 2. Add 'pr-8' to prevent text overlap with the X button
                            className="pl-8 pr-8" 
                        />
                        {/* 3. The Clear Button */}
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm("")}
                                className="absolute right-2 top-2.5 text-muted-foreground hover:text-foreground focus:outline-none"
                                aria-label="Clear search"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
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
                            Start Cycle
                        </Button>
                    </div>
                </div>
            </div>

            {/* Table Area - Dims when fetching new search results */}
            <div className={`transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                <DataTable 
                    data={data.items} 
                    columns={columns} 
                    sorting={sorting}
                    onSortingChange={setSorting}
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

            <StartCycleModal open={isCreateOpen} onOpenChange={setIsCreateOpen} />
        </div>
    );
};

export const FarmersView = () => {
    return <FarmersContent />;
}
