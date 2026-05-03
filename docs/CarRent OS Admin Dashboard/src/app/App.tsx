import { DashboardSidebar } from './components/DashboardSidebar';
import { DashboardHeader } from './components/DashboardHeader';
import { KPICards } from './components/KPICards';
import { FleetOverview } from './components/FleetOverview';
import { UtilizationHeatmap } from './components/UtilizationHeatmap';
import { BookingTimeline } from './components/BookingTimeline';
import { AlertsPanel } from './components/AlertsPanel';

export default function App() {
  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <DashboardSidebar />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <DashboardHeader />
        
        {/* Dashboard Content */}
        <main className="flex-1 p-6 space-y-6 overflow-auto">
          {/* KPI Cards */}
          <KPICards />
          
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Left Column - Fleet & Bookings */}
            <div className="xl:col-span-2 space-y-6">
              <FleetOverview />
              <BookingTimeline />
            </div>
            
            {/* Right Column - Alerts */}
            <div className="space-y-6">
              <AlertsPanel />
            </div>
          </div>
          
          {/* Bottom Section - Analytics */}
          <UtilizationHeatmap />
        </main>
      </div>
    </div>
  );
}