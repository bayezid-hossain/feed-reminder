import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Farmer } from "@/modules/farmers/types";
export const PerformanceInsights = ({topPerformers}:{topPerformers: Farmer[]}) => {
    return <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
            <CardDescription>
              Lowest mortality rates (Efficiency)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topPerformers.map((farmer) => {
                 const doc = parseInt(farmer.doc);
                 const rate = ((farmer.mortality / doc) * 100);
                 return (
                   <div key={farmer.id} className="flex items-center justify-between">
                     <div className="flex items-center gap-3">
                       <div className="h-9 w-9 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-xs">
                         A+
                       </div>
                       <div className="space-y-1">
                         <p className="text-sm font-medium leading-none">{farmer.name}</p>
                         <p className="text-xs text-muted-foreground">Age: {farmer.age}</p>
                       </div>
                     </div>
                     <div className="text-right">
                        <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-100">
                          {rate.toFixed(2)}% Loss
                        </Badge>
                     </div>
                   </div>
                 )
              })}
            </div>
          </CardContent>
        </Card>
}