import { useState } from "react";
import { Car, BarChart3, Users, Calendar, Settings, Package, Wrench, Building2, Home } from "lucide-react";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger } from "./components/ui/sidebar";
import { Dashboard } from "./components/Dashboard";
import { CarsManagement } from "./components/CarsManagement";
import { BrandsManagement } from "./components/BrandsManagement";
import { CategoriesManagement } from "./components/CategoriesManagement";
import { SpecificationsManagement } from "./components/SpecificationsManagement";
import { BookingsManagement } from "./components/BookingsManagement";
import { CustomersManagement } from "./components/CustomersManagement";
import { AdminSettings } from "./components/AdminSettings";

const menuItems = [
  { title: "Dashboard", icon: Home, id: "dashboard" },
  { title: "Cars", icon: Car, id: "cars" },
  { title: "Brands", icon: Building2, id: "brands" },
  { title: "Categories", icon: Package, id: "categories" },
  { title: "Specifications", icon: Wrench, id: "specifications" },
  { title: "Bookings", icon: Calendar, id: "bookings" },
  { title: "Customers", icon: Users, id: "customers" },
  { title: "Analytics", icon: BarChart3, id: "analytics" },
  { title: "Settings", icon: Settings, id: "settings" },
];

export default function App() {
  const [activeSection, setActiveSection] = useState("dashboard");

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard":
        return <Dashboard />;
      case "cars":
        return <CarsManagement />;
      case "brands":
        return <BrandsManagement />;
      case "categories":
        return <CategoriesManagement />;
      case "specifications":
        return <SpecificationsManagement />;
      case "bookings":
        return <BookingsManagement />;
      case "customers":
        return <CustomersManagement />;
      case "analytics":
        return <Dashboard />;
      case "settings":
        return <AdminSettings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar variant="inset">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Car Rental Admin</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveSection(item.id)}
                        isActive={activeSection === item.id}
                      >
                        <item.icon />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>
        
        <main className="flex-1 flex flex-col min-h-screen">
          <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
            <div className="container flex h-14 items-center px-4">
              <SidebarTrigger />
              <div className="ml-4">
                <h1 className="text-lg font-semibold">Car Rental Admin Panel</h1>
              </div>
            </div>
          </header>
          
          <div className="flex-1 p-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}