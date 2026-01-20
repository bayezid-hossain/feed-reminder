import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const StatCard = ({ title, value, subtext, icon: Icon, alert = false }:{
    title: string;
    value: string | number;
    subtext: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    alert?: boolean;
}) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${alert ? "text-red-500" : "text-muted-foreground"}`} />
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${alert ? "text-red-600" : ""}`}>{value}</div>
      <p className="text-xs text-muted-foreground">{subtext}</p>
    </CardContent>
  </Card>
);