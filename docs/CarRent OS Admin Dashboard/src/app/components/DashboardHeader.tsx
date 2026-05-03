import { Bell, Search, Wifi, WifiOff, Activity, User } from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

export function DashboardHeader() {
  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
      {/* Left section */}
      <div className="flex items-center space-x-4">
        <h1 className="text-2xl font-semibold text-foreground">Dashboard</h1>
        <Badge variant="secondary" className="bg-success/10 text-success border-success/20">
          <Activity className="w-3 h-3 mr-1" />
          System Online
        </Badge>
      </div>

      {/* Search bar */}
      <div className="flex-1 max-w-md mx-8">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input 
            placeholder="Search vehicles, bookings, customers..." 
            className="pl-10 bg-input-background border-border"
          />
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-4">
        {/* System Status */}
        <div className="flex items-center space-x-2">
          <Wifi className="w-4 h-4 text-success" />
          <span className="text-sm text-muted-foreground">GPS Online</span>
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 w-5 h-5 p-0 flex items-center justify-center text-xs"
          >
            3
          </Badge>
        </Button>

        {/* User Profile */}
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium">Sarah Chen</p>
            <p className="text-xs text-muted-foreground">Fleet Manager</p>
          </div>
          <Avatar>
            <AvatarImage src="https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}