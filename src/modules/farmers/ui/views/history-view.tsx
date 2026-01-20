"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // 1. Import Input
import { useTRPC } from "@/trpc/client";
import { keepPreviousData, useQuery } from "@tanstack/react-query"; // 2. Switch imports
import { SortingState } from "@tanstack/react-table";
import { Search, X } from "lucide-react"; // 3. Import Icons
import { useEffect, useState } from "react";
import { useFarmersFilters } from "../../hooks/use-farmers-filters";
import { DataTable } from "../components/data-table";
import { historyColumns } from "../components/history/history-columns";

const HistoryContent = () => {
    const [filters, setFilters] = useFarmersFilters();
    const [sorting, setSorting] = useState<SortingState>([]);
    
    // 4. Local state for immediate input feedback
    const [searchTerm, setSearchTerm] = useState(filters.search || "");

    const trpc = useTRPC();

    // 5. Debounce Effect to update filters
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
    
    // 6. Use useQuery with placeholderData (prevents full reload)
    const { data, isPending, isFetching } = useQuery({
        ...trpc.farmers.getHistory.queryOptions({ 
            ...filters,
            sortBy: sorting[0]?.id,
            sortOrder: sorting[0]?.desc ? "desc" : "asc"
        }),
        placeholderData: keepPreviousData,
    });

    // 7. Handle Initial Loading
    if (isPending) {
        return <LoadingState title="Loading" description="Loading history..." />;
    }

    // 8. Handle Error
    if (!data) {
        return <ErrorState title="Error" description="Failed to load history" />;
    }

    return (
        <div className="flex-1 pb-4 px-4 md:px-8 flex flex-col gap-y-4 bg-white pt-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                <div className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Production History</h1>
                    <p className="text-sm text-muted-foreground">
                        Archive of completed cycles, feed consumption, and mortality records.
                    </p>
                </div>

                {/* 9. Search Bar Implementation */}
                <div className="relative w-full md:w-64">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search history..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-8"
                    />
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
            </div>

            {/* 10. Table with opacity transition */}
            <div className={`transition-opacity duration-200 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                <DataTable 
                    data={data.items} 
                    columns={historyColumns} 
                    sorting={sorting}
                    onSortingChange={setSorting}
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
            </div>
        </div>
    );
};

// 11. Simplified View (Suspense moved inside via conditional return)
export const HistoryView = () => {
    return <HistoryContent />;
}  