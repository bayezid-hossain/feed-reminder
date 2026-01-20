import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
interface FeedData {
  name: string;
  bags: number;
}
export const FeedConsumptionChart = ({ feedChartData }:{ feedChartData: FeedData[] }) => {
    return <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Feed Consumption Overview</CardTitle>
            <CardDescription>Cumulative bags consumed by top flocks</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={feedChartData}>
                <XAxis 
                  dataKey="name" 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="#888888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false} 
                  tickFormatter={(value) => `${value}`} 
                />
                <Tooltip 
                  cursor={{fill: 'transparent'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar 
                  dataKey="bags" 
                  fill="currentColor" 
                  radius={[4, 4, 0, 0]} 
                  className="fill-primary" 
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
}