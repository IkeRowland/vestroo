import { TrendingUp, TrendingDown, DollarSign, Car, Calendar, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const kpiData = [
  {
    title: 'Monthly Revenue',
    value: '$147,250',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-success'
  },
  {
    title: 'Fleet Utilization',
    value: '87.3%',
    change: '+5.2%',
    trend: 'up',
    icon: Car,
    color: 'text-primary'
  },
  {
    title: 'Active Bookings',
    value: '1,247',
    change: '+8.7%',
    trend: 'up',
    icon: Calendar,
    color: 'text-warning'
  },
  {
    title: 'Cost Savings',
    value: '$23,180',
    change: '-2.1%',
    trend: 'down',
    icon: TrendingUp,
    color: 'text-success'
  }
];

export function KPICards() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {kpiData.map((kpi, index) => (
        <Card key={index} className="border border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {kpi.title}
            </CardTitle>
            <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">{kpi.value}</div>
            <div className="flex items-center text-xs text-muted-foreground mt-1">
              {kpi.trend === 'up' ? (
                <TrendingUp className="mr-1 h-3 w-3 text-success" />
              ) : (
                <TrendingDown className="mr-1 h-3 w-3 text-destructive" />
              )}
              <span className={kpi.trend === 'up' ? 'text-success' : 'text-destructive'}>
                {kpi.change}
              </span>
              <span className="ml-1">from last month</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}