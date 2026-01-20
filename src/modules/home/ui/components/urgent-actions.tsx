import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Farmer } from "@/modules/farmers/types"
import { AlertTriangle, Wheat } from "lucide-react"
import { FeedAlertRow } from "./feed-alert-row"

export const UrgentActions = ( {lowStockFarmers} :{lowStockFarmers: Farmer[]}) => {
    return <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  Feed Needed Urgently
                </CardTitle>
                <CardDescription>
                  Farms with less than 3 bags remaining.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lowStockFarmers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Wheat className="h-8 w-8 mb-2 opacity-20" />
                      <p>No feed alerts. Everyone is stocked up!</p>
                    </div>
                  ) : (
                    lowStockFarmers.map(farmer => (
                      <FeedAlertRow key={farmer.id} farmer={farmer} />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
}