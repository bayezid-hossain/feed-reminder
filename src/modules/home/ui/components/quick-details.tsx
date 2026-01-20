import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Farmer } from "@/modules/farmers/types";

export const QuickDetails = ({ farmers }: { farmers: Farmer[] }) => {
  return (
    <Card className="col-span-3">
            <CardHeader >
                <CardTitle>Flock Health</CardTitle>
                <CardDescription>Live vs Dead distribution</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {farmers.slice(0, 5).map(f => {
                        const total = parseInt(f.doc);
                        const alive = total - f.mortality;
                        const health = (alive / total) * 100;
                        return (
                            <div key={f.id} className="space-y-1">
                                <div className="flex justify-between text-xs">
                                    <span>{f.name}</span>
                                    <span className="text-muted-foreground">{health.toFixed(1)}% Alive</span>
                                </div>
                                <Progress value={health} className="h-2" />
                            </div>
                        )
                    })}
                </div>
            </CardContent>
        </Card>
  )}