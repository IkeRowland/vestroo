import { 
  BarChart3, 
  Calendar, 
  Car, 
  CreditCard, 
  LayoutDashboard, 
  Settings, 
  Wrench,
  ChevronRight
} from 'lucide-react';
import { Button } from './ui/button';

const navigationItems = [
  { name: 'Dashboard', icon: LayoutDashboard, active: true },
  { name: 'Bookings', icon: Calendar, active: false },
  { name: 'Fleet', icon: Car, active: false },
  { name: 'Payments', icon: CreditCard, active: false },
  { name: 'Analytics', icon: BarChart3, active: false },
  { name: 'Maintenance', icon: Wrench, active: false },
];

export function DashboardSidebar() {
  return (
    <div className="h-full w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      {/* Logo Section */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sidebar-foreground font-semibold">CarRent OS</h1>
            <p className="text-sidebar-foreground/60 text-xs">Fleet Management</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigationItems.map((item) => (
          <Button
            key={item.name}
            variant={item.active ? "default" : "ghost"}
            className={`w-full justify-start h-11 ${
              item.active 
                ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90" 
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.name}
            {item.active && <ChevronRight className="w-4 h-4 ml-auto" />}
          </Button>
        ))}
      </nav>

      {/* Settings */}
      <div className="p-4 border-t border-sidebar-border">
        <Button 
          variant="ghost" 
          className="w-full justify-start h-11 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Button>
      </div>
    </div>
  );
}