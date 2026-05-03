import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Search, Edit, Eye, Users, UserCheck, UserX, Star } from "lucide-react";

const mockCustomers = [
  {
    id: "CUST001",
    firstName: "John",
    lastName: "Smith", 
    email: "john.smith@email.com",
    phone: "+1-555-0123",
    dateOfBirth: "1990-05-15",
    licenseNumber: "DL123456789",
    licenseExpiry: "2026-05-15",
    address: "123 Main St, New York, NY 10001",
    joinDate: "2023-01-15",
    totalBookings: 5,
    totalSpent: 1420,
    status: "Active",
    membershipTier: "Gold",
    lastBooking: "2024-01-10"
  },
  {
    id: "CUST002",
    firstName: "Sarah", 
    lastName: "Wilson",
    email: "sarah.wilson@email.com", 
    phone: "+1-555-0456",
    dateOfBirth: "1985-08-22",
    licenseNumber: "DL987654321",
    licenseExpiry: "2025-08-22",
    address: "456 Oak Ave, Los Angeles, CA 90210",
    joinDate: "2023-03-22",
    totalBookings: 8,
    totalSpent: 2340,
    status: "Active",
    membershipTier: "Platinum",
    lastBooking: "2024-01-08"
  },
  {
    id: "CUST003",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike.johnson@email.com",
    phone: "+1-555-0789", 
    dateOfBirth: "1992-12-03",
    licenseNumber: "DL456789123",
    licenseExpiry: "2027-12-03",
    address: "789 Pine St, Chicago, IL 60601",
    joinDate: "2024-01-12",
    totalBookings: 1,
    totalSpent: 105,
    status: "Active",
    membershipTier: "Silver",
    lastBooking: "2024-01-25"
  },
  {
    id: "CUST004",
    firstName: "Emily",
    lastName: "Davis",
    email: "emily.davis@email.com",
    phone: "+1-555-0321",
    dateOfBirth: "1988-07-11",
    licenseNumber: "DL321654987", 
    licenseExpiry: "2025-07-11",
    address: "321 Elm St, Miami, FL 33101",
    joinDate: "2023-06-14",
    totalBookings: 12,
    totalSpent: 3850,
    status: "Active",
    membershipTier: "Platinum",
    lastBooking: "2024-01-18"
  },
  {
    id: "CUST005",
    firstName: "David",
    lastName: "Brown",
    email: "david.brown@email.com",
    phone: "+1-555-0654",
    dateOfBirth: "1995-03-28",
    licenseNumber: "DL789123456",
    licenseExpiry: "2028-03-28", 
    address: "654 Maple Dr, Seattle, WA 98101",
    joinDate: "2023-11-28",
    totalBookings: 3,
    totalSpent: 670,
    status: "Active",
    membershipTier: "Gold",
    lastBooking: "2024-01-05"
  },
  {
    id: "CUST006",
    firstName: "Lisa",
    lastName: "Anderson", 
    email: "lisa.anderson@email.com",
    phone: "+1-555-0987",
    dateOfBirth: "1991-09-14",
    licenseNumber: "DL654321789",
    licenseExpiry: "2024-09-14",
    address: "987 Cedar Ln, Boston, MA 02101",
    joinDate: "2022-09-14",
    totalBookings: 2,
    totalSpent: 280,
    status: "Inactive",
    membershipTier: "Silver",
    lastBooking: "2023-11-20"
  }
];

export function CustomersManagement() {
  const [customers, setCustomers] = useState(mockCustomers);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || customer.status === statusFilter;
    const matchesTier = tierFilter === "all" || customer.membershipTier === tierFilter;
    return matchesSearch && matchesStatus && matchesTier;
  });

  const getStatusBadge = (status) => {
    const variants = {
      "Active": "default",
      "Inactive": "secondary",
      "Suspended": "destructive"
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const getTierBadge = (tier) => {
    const colors = {
      "Silver": "bg-gray-100 text-gray-800",
      "Gold": "bg-yellow-100 text-yellow-800", 
      "Platinum": "bg-purple-100 text-purple-800"
    };
    return (
      <Badge className={colors[tier]}>
        <Star className="h-3 w-3 mr-1" />
        {tier}
      </Badge>
    );
  };

  const CustomerDetails = ({ customer }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Personal Information</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Name:</span> {customer.firstName} {customer.lastName}</div>
              <div><span className="font-medium">Email:</span> {customer.email}</div>
              <div><span className="font-medium">Phone:</span> {customer.phone}</div>
              <div><span className="font-medium">Date of Birth:</span> {customer.dateOfBirth}</div>
              <div><span className="font-medium">Address:</span> {customer.address}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">License Information</h4>
            <div className="space-y-2">
              <div><span className="font-medium">License Number:</span> {customer.licenseNumber}</div>
              <div><span className="font-medium">Expiry Date:</span> {customer.licenseExpiry}</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Account Information</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Customer ID:</span> {customer.id}</div>
              <div><span className="font-medium">Join Date:</span> {customer.joinDate}</div>
              <div><span className="font-medium">Status:</span> {getStatusBadge(customer.status)}</div>
              <div><span className="font-medium">Membership:</span> {getTierBadge(customer.membershipTier)}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Rental History</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Total Bookings:</span> {customer.totalBookings}</div>
              <div><span className="font-medium">Total Spent:</span> ${customer.totalSpent.toLocaleString()}</div>
              <div><span className="font-medium">Last Booking:</span> {customer.lastBooking}</div>
              <div><span className="font-medium">Avg. Booking Value:</span> ${Math.round(customer.totalSpent / customer.totalBookings)}</div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Button variant="outline">View Booking History</Button>
        <Button variant="outline">Send Message</Button>
        <Select 
          value={customer.status} 
          onValueChange={(value) => {
            setCustomers(customers.map(c => 
              c.id === customer.id ? { ...c, status: value } : c
            ));
            setSelectedCustomer({ ...customer, status: value });
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Inactive">Inactive</SelectItem>
            <SelectItem value="Suspended">Suspended</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Customers Management</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-xs text-muted-foreground">Registered customers</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Platinum Members</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.membershipTier === "Platinum").length}
            </div>
            <p className="text-xs text-muted-foreground">Top tier customers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Customer Value</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${Math.round(customers.reduce((sum, c) => sum + c.totalSpent, 0) / customers.length)}
            </div>
            <p className="text-xs text-muted-foreground">Lifetime value</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer Database</CardTitle>
          <CardDescription>Manage customer information and rental history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter by tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                <SelectItem value="Silver">Silver</SelectItem>
                <SelectItem value="Gold">Gold</SelectItem>
                <SelectItem value="Platinum">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Membership</TableHead>
                  <TableHead>Bookings</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{customer.firstName} {customer.lastName}</div>
                        <div className="text-sm text-muted-foreground">{customer.id}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{customer.email}</div>
                        <div className="text-sm text-muted-foreground">{customer.phone}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getTierBadge(customer.membershipTier)}
                        <div className="text-xs text-muted-foreground">Since {customer.joinDate}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{customer.totalBookings}</div>
                        <div className="text-xs text-muted-foreground">Last: {customer.lastBooking}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">${customer.totalSpent.toLocaleString()}</div>
                    </TableCell>
                    <TableCell>{getStatusBadge(customer.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedCustomer(customer)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Customer Details - {customer.firstName} {customer.lastName}</DialogTitle>
                              <DialogDescription>
                                View and manage customer information
                              </DialogDescription>
                            </DialogHeader>
                            {selectedCustomer && <CustomerDetails customer={selectedCustomer} />}
                          </DialogContent>
                        </Dialog>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}