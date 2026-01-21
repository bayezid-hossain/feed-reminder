"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import { useSuspenseQuery } from "@tanstack/react-query";
import { History as HistoryIcon, TrendingDown, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export const HistoricalAnalysis = () => {
  const trpc = useTRPC();
  
  // Fetch History Data (Last 10 cycles for charts)
  const { data } = useSuspenseQuery(
    trpc.farmers.getHistory.queryOptions({ 
      page: 1, 
      pageSize: 10, 
      sortBy: "endDate", 
      sortOrder: "desc" 
    })
  );

  const history = data.items;
  const totalCycles = data.total;

  // --- Data Prep for Charts ---
  
  // 1. Mortality Trend (Reverse to show oldest -> newest left to right)
  const mortalityTrendData = [...history].reverse().map(h => ({
    name: h.farmerName,
    rate: parseFloat(((h.mortality / (h.doc)) * 100).toFixed(1)),
    date: new Date(h.endDate).toLocaleDateString()
  }));

  // 2. Feed Efficiency (FCR Approximation)
  // Feed consumed per bird. Lower is better.
  const efficiencyData = [...history].reverse().map(h => {
    const liveBirds = (h.doc) - h.mortality;
    const feedPerBird = liveBirds > 0 ? (h.finalIntake / liveBirds) : 0;
    return {
      name: h.farmerName,
      feedPerBird: parseFloat(feedPerBird.toFixed(3)) // 3 decimal places for precision
    };
  });
  
  // 3. Aggregate Stats
  const avgMortality = history.length > 0 
    ? (history.reduce((acc, h) => acc + (h.mortality / (h.doc)), 0) / history.length * 100).toFixed(2)
    : "0.00";

  // Find lowest mortality rate safely
  const bestMortality = history.length > 0 
    ? Math.min(...history.map(h => (h.mortality / (h.doc)) * 100)).toFixed(1)
    : "0.0";

  return (
    <div className="space-y-6 pt-2">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Cycles Closed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
                <HistoryIcon className="h-5 w-5 text-primary" />
                {totalCycles}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Lifetime production runs</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Hist. Mortality</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgMortality}%</div>
            <p className="text-xs text-muted-foreground mt-1">Across last {history.length} cycles</p>
          </CardContent>
        </Card>

        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Best Cycle Record</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                    {bestMortality}% Loss
                </div>
                <p className="text-xs text-muted-foreground mt-1">Lowest recorded mortality</p>
            </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        
        {/* Mortality Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                <TrendingDown className="h-4 w-4 text-emerald-500" /> Mortality Trend
            </CardTitle>
            <CardDescription>Mortality rate (%) over last 10 cycles</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mortalityTrendData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false}
                    tick={{fill: '#6b7280'}}
                    dy={10}
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#6b7280'}}
                    unit="%"
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Line 
                      type="monotone" 
                      dataKey="rate" 
                      stroke="#2563eb" 
                      strokeWidth={2}
                      dot={{ r: 4, fill: "#2563eb", strokeWidth: 2, stroke: "#fff" }}
                      activeDot={{ r: 6, fill: "#2563eb" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Feed Efficiency Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="h-4 w-4 text-amber-500" /> Feed Efficiency
            </CardTitle>
            <CardDescription>Bags of feed consumed per bird (Avg)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={efficiencyData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="name" 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#6b7280'}}
                    dy={10}
                  />
                  <YAxis 
                    fontSize={12} 
                    tickLine={false} 
                    axisLine={false} 
                    tick={{fill: '#6b7280'}}
                  />
                  <Tooltip 
                    cursor={{fill: 'transparent'}}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar 
                    dataKey="feedPerBird" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};