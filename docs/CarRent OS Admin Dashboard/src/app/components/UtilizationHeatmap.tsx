import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { ResponsiveContainer, Cell, Tooltip, PieChart, Pie, BarChart, Bar, XAxis, YAxis } from 'recharts';

const utilizationData = [
  { name: 'Economy', value: 45, color: '#3b82f6' },
  { name: 'Compact', value: 30, color: '#10b981' },
  { name: 'Luxury', value: 15, color: '#f59e0b' },
  { name: 'SUV', value: 10, color: '#ef4444' }
];

const hourlyData = [
  { hour: '6AM', utilization: 20 },
  { hour: '8AM', utilization: 65 },
  { hour: '10AM', utilization: 85 },
  { hour: '12PM', utilization: 95 },
  { hour: '2PM', utilization: 75 },
  { hour: '4PM', utilization: 90 },
  { hour: '6PM', utilization: 80 },
  { hour: '8PM', utilization: 45 },
  { hour: '10PM', utilization: 25 }
];

export function UtilizationHeatmap() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Fleet Category Distribution */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Fleet Category Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={utilizationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {utilizationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, 'Utilization']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {utilizationData.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm text-muted-foreground">{item.name}</span>
                <span className="text-sm font-medium ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Hourly Utilization */}
      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Hourly Utilization</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <XAxis 
                  dataKey="hour" 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 12 }}
                  tickLine={{ stroke: '#e2e8f0' }}
                  domain={[0, 100]}
                />
                <Tooltip 
                  formatter={(value) => [`${value}%`, 'Utilization']}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="utilization" 
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}