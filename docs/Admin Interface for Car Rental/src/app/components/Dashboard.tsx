import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Car, Users, Calendar, DollarSign, TrendingUp, Clock } from "lucide-react";

const revenueData = [
  { month: "Jan", revenue: 45000, bookings: 180 },
  { month: "Feb", revenue: 52000, bookings: 210 },
  { month: "Mar", revenue: 48000, bookings: 195 },
  { month: "Apr", revenue: 61000, bookings: 245 },
  { month: "May", revenue: 55000, bookings: 220 },
  { month: "Jun", revenue: 67000, bookings: 270 },
];

const carCategoryData = [
  { name: "Economy", value: 35, color: "#0088FE" },
  { name: "Compact", value: 25, color: "#00C49F" },
  { name: "SUV", value: 20, color: "#FFBB28" },
  { name: "Luxury", value: 15, color: "#FF8042" },
  { name: "Sports", value: 5, color: "#8884d8" },
];

const recentBookings = [
  { id: "BK001", customer: "John Smith", car: "Toyota Camry", status: "Active", amount: "$320" },
  { id: "BK002", customer: "Sarah Wilson", car: "BMW X5", status: "Completed", amount: "$850" },
  { id: "BK003", customer: "Mike Johnson", car: "Honda Civic", status: "Pending", amount: "$280" },
  { id: "BK004", customer: "Emily Davis", car: "Mercedes C-Class", status: "Active", amount: "$620" },
  { id: "BK005", customer: "David Brown", car: "Nissan Altima", status: "Completed", amount: "$340" },
];

export function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Dashboard Overview</h2>
        <Badge variant="secondary">Last updated: 2 minutes ago</Badge>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cars</CardTitle>
            <Car className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12</span> from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+23%</span> from last week
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+18%</span> from last month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$67,000</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+8.2%</span> from last month
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue & Bookings Trend</CardTitle>
            <CardDescription>Monthly performance over the last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="revenue" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Car Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Fleet Distribution</CardTitle>
            <CardDescription>Cars by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={carCategoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {carCategoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Latest car rental bookings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-medium">{booking.customer}</p>
                  <p className="text-sm text-muted-foreground">{booking.car} • {booking.id}</p>
                </div>
                <div className="flex items-center space-x-4">
                  <Badge 
                    variant={
                      booking.status === "Active" ? "default" :
                      booking.status === "Completed" ? "secondary" : "outline"
                    }
                  >
                    {booking.status}
                  </Badge>
                  <span className="font-medium">{booking.amount}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}