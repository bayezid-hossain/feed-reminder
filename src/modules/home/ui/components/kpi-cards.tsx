import { Farmer } from "@/modules/farmers/types";
import { AlertTriangle, Bird, Layers, TrendingUp } from "lucide-react";
import { StatCard } from "./stat-card";

export const KpiCards = ( { totalBirds, totalFeedStock, lowStockFarmers, avgMortality }:{
    totalBirds: number;
    totalFeedStock: number;
    lowStockFarmers: Farmer[];
    avgMortality: string;
}) => {
  return <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard 
            title="Total Live Birds" 
            value={totalBirds.toLocaleString()} 
            subtext="Across all active cycles" 
            icon={Bird} 
          />
          <StatCard 
            title="Feed Stock Level" 
            value={`${totalFeedStock.toFixed(1)} Bags`} 
            subtext="Total inventory in sheds" 
            icon={Layers} 
          />
          <StatCard 
            title="Low Stock Alerts" 
            value={lowStockFarmers.length} 
            subtext="Farmers needing refill" 
            icon={AlertTriangle} 
            alert={lowStockFarmers.length > 0}
          />
          <StatCard 
            title="Avg. Mortality" 
            value={`${avgMortality}%`} 
            subtext="Current fleet health" 
            icon={TrendingUp} 
          />
        </div>
}