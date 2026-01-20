"use client";

import ErrorState from "@/components/error-state";
import LoadingState from "@/components/loading-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/modules/farmers/ui/components/data-table";
import { historyColumns } from "@/modules/farmers/ui/components/history/history-columns";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity, Archive, ArrowLeft, History, Wheat } from "lucide-react"; // Added Icons
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";

// --- Types ---
interface Log {
  id: string;
  type: "FEED" | "MORTALITY" | "NOTE";
  valueChange: number;
  previousValue: number;
  newValue: number;
  createdAt: string | Date;
  note?:string;
}

// --- Helper for Logs Tab ---
const LogsTimeline = ({ logs }: { logs: Log[] }) => {
  if (!logs || logs.length === 0) {
    return <div className="text-muted-foreground text-sm py-8 text-center">No activity recorded yet.</div>;
  }

  return (
    <div className="space-y-6">
      {logs.map((log) => (
        <div key={log.id} className="flex gap-4">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold
              ${log.type === "FEED" ? "bg-amber-500" : log.type === "MORTALITY" ? "bg-red-500" : "bg-slate-500"}`}
            >
              {log.type === "FEED" ? "F" : log.type === "MORTALITY" ? "M" : "S"}
            </div>
            <div className="w-px h-full bg-border mt-2 min-h-[24px]" />
          </div>
          <div className="space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">
                {log.type === "FEED" ? "Added Feed" : log.type === "MORTALITY" ? "Reported Mortality" : "System Log"}
              </span>
              <span className="text-xs text-muted-foreground">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
            <div className="text-sm">
               {log.type === "NOTE" ? (
                 <span className="text-slate-600 italic">{log.note}</span>
               ) : (
                 <span className={log.type === "FEED" ? "text-amber-600 font-medium" : "text-red-600 font-medium"}>
                   {log.type === "FEED" ? "+" : "-"}{log.valueChange} {log.type === "FEED" ? "Bags" : "Birds"}
                 </span>
               )}
            </div>
            {log.type !== "NOTE" && (
                <div className="text-xs text-muted-foreground">
                Previous: {log.previousValue.toFixed(log.type === "FEED" ? 2 : 0)} &rarr; New: {log.newValue.toFixed(log.type === "FEED" ? 2 : 0)}
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

const FarmerDetailsContent = ({ id }: { id: string }) => {
  const trpc = useTRPC();
  // Changed query option to use 'id' not 'name' as per your previous setup, ensure this matches your router input
  const { data } = useSuspenseQuery(trpc.farmers.getDetails.queryOptions({ id: id }));

  const { farmer, logs, history } = data;
  
  // Safe Calculations
  const docCount = parseInt(farmer.doc) || 0;
  const liveBirds = Math.max(0, docCount - farmer.mortality);
  const survivalRate = docCount > 0 
    ? ((liveBirds / docCount) * 100).toFixed(2) 
    : "0.00";
    
  const remainingFeed = (farmer.inputFeed || 0) - (farmer.intake || 0);
  const feedProgress = farmer.inputFeed > 0 
    ? Math.min(100, (remainingFeed / farmer.inputFeed) * 100) 
    : 0;

  const isActive = farmer.status === "active";

  return (
    <div className="flex-1 p-4 md:p-8 space-y-6 bg-white">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
            <Link href={isActive?"/farmers":"/history"}><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
            <h1 className="text-2xl font-bold tracking-tight">{farmer.name}</h1>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {/* DYNAMIC BADGE */}
                {isActive ? (
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                        <Activity className="h-3 w-3" /> Active Cycle
                    </Badge>
                ) : (
                    <Badge variant="outline" className="bg-slate-100 text-slate-600 border-slate-200 gap-1">
                        <Archive className="h-3 w-3" /> Archived Cycle
                    </Badge>
                )}
                <span>•</span>
                <span>Started {new Date(farmer.createdAt).toLocaleDateString()}</span>
                {!isActive && (
                    <>
                        <span>•</span>
                        <span>Ended {new Date(farmer.updatedAt).toLocaleDateString()}</span>
                    </>
                )}
            </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-7">
        
        {/* LEFT SIDE: Stats & Overview */}
        <div className="col-span-7 md:col-span-2 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Cycle Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Cycle Age</span>
                        <span className="font-bold text-xl">{farmer.age} Days</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Live Birds</span>
                        <div className="text-right">
                            <div className="font-bold">{liveBirds.toLocaleString()}</div>
                            <div className="text-xs text-muted-foreground">DOC: {farmer.doc}</div>
                        </div>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Survival Rate</span>
                        <span className={`font-bold ${parseFloat(survivalRate) > 95 ? "text-emerald-600" : "text-orange-500"}`}>
                            {survivalRate}%
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-slate-50 border-slate-200">
                <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Wheat className="h-4 w-4" /> Feed Inventory
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold mb-1">{remainingFeed.toFixed(2)} Bags</div>
                    <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Intake: {farmer.intake?.toFixed(2) || 0}</span>
                        <span>Total: {farmer.inputFeed}</span>
                    </div>
                    {/* Feed Progress Bar */}
                    <div className="mt-3 h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div 
                            className={`h-full ${!isActive ? 'bg-slate-400' : remainingFeed < 5 ? 'bg-red-500' : 'bg-amber-500'}`}
                            style={{ width: `${feedProgress}%` }} 
                        />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT SIDE: Tabs System */}
        <div className="col-span-7 md:col-span-5">
            <Tabs defaultValue="logs" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="logs">Activity Logs</TabsTrigger>
                    <TabsTrigger value="history">Other Cycles</TabsTrigger>
                    <TabsTrigger value="analysis" disabled>Analysis (Pro)</TabsTrigger>
                </TabsList>
                
                {/* 1. LOGS TAB */}
                <TabsContent value="logs" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <History className="h-4 w-4" /> Audit Trail
                            </CardTitle>
                            <CardDescription>
                                {isActive 
                                    ? "Live record of feed inputs and mortality reports."
                                    : "Archived record of inputs for this closed cycle."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LogsTimeline logs={logs as Log[]} />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* 2. HISTORY TAB */}
                <TabsContent value="history" className="mt-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Previous Production Cycles</CardTitle>
                            <CardDescription>Historical performance for {farmer.name}</CardDescription>
                        </CardHeader>
                        <CardContent>
                             {history.length > 0 ? (
                                <DataTable 
                                    columns={historyColumns} 
                                    data={history} 
                                    deleteButton={false}
                                />
                             ) : (
                                 <div className="flex flex-col items-center justify-center py-12 text-muted-foreground bg-slate-50 rounded-lg border border-dashed">
                                    <History className="h-8 w-8 mb-2 opacity-20" />
                                    <p>No past cycles found for this farmer.</p>
                                 </div>
                             )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
};

export default function FarmerDetailsPage() {
  const params = useParams();
  // Using ID, not Name, as the primary key
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <ErrorBoundary fallback={<ErrorState title="Error" description="Failed to load farmer details" />}>
      <Suspense fallback={<LoadingState title="Loading" description="Fetching farmer logs..." />}>
        <FarmerDetailsContent id={id??""} />
      </Suspense>
    </ErrorBoundary>
  );
}