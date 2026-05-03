import { AlertTriangle, Clock, TrendingDown, Shield, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const alertsData = [
  {
    id: 'ALT-001',
    type: 'theft-risk',
    title: 'Potential Theft Risk',
    message: 'Vehicle VH-003 (Tesla Model S) has been stationary for 2+ hours in high-risk area',
    severity: 'high',
    timestamp: '5 minutes ago',
    icon: Shield
  },
  {
    id: 'ALT-002',
    type: 'overdue',
    title: 'Overdue Return',
    message: 'Booking BK-142 was due 3 hours ago. Customer: Alex Thompson',
    severity: 'high',
    timestamp: '3 hours ago',
    icon: Clock
  },
  {
    id: 'ALT-003',
    type: 'inventory',
    title: 'Low Inventory Alert',
    message: 'Only 2 economy vehicles available for weekend bookings',
    severity: 'medium',
    timestamp: '1 hour ago',
    icon: TrendingDown
  },
  {
    id: 'ALT-004',
    type: 'maintenance',
    title: 'Maintenance Due',
    message: 'Vehicle VH-007 (BMW X3) requires scheduled maintenance in 2 days',
    severity: 'low',
    timestamp: '2 hours ago',
    icon: AlertTriangle
  }
];

const getSeverityColor = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    case 'medium':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'low':
      return 'bg-muted text-muted-foreground border-border';
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
};

const getSeverityIcon = (severity: string) => {
  switch (severity) {
    case 'high':
      return 'text-destructive';
    case 'medium':
      return 'text-warning';
    case 'low':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
};

export function AlertsPanel() {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5" />
            System Alerts
          </div>
          <Badge variant="destructive" className="text-xs">
            {alertsData.filter(alert => alert.severity === 'high').length} Critical
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {alertsData.map((alert) => (
            <div key={alert.id} className="flex items-start space-x-3 p-3 border border-border rounded-lg">
              <div className={`p-2 rounded-lg ${getSeverityColor(alert.severity)}`}>
                <alert.icon className={`w-4 h-4 ${getSeverityIcon(alert.severity)}`} />
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-sm">{alert.title}</h4>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">{alert.message}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                  <Badge className={`text-xs ${getSeverityColor(alert.severity)}`}>
                    {alert.severity.toUpperCase()}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 pt-4 border-t border-border">
          <Button variant="outline" className="w-full" size="sm">
            View All Alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}