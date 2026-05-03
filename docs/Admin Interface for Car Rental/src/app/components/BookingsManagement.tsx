import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Plus, Search, Edit, Eye, Calendar, DollarSign, Clock, CheckCircle } from "lucide-react";

const mockBookings = [
  {
    id: "BK001",
    customerName: "John Smith",
    customerEmail: "john.smith@email.com",
    customerPhone: "+1-555-0123",
    carModel: "Toyota Camry",
    carYear: 2023,
    startDate: "2024-01-15",
    endDate: "2024-01-20",
    totalDays: 5,
    dailyRate: 45,
    totalAmount: 225,
    status: "Active",
    bookingDate: "2024-01-10",
    pickupLocation: "Downtown Office",
    returnLocation: "Airport Branch",
    notes: "Customer requested GPS navigation"
  },
  {
    id: "BK002", 
    customerName: "Sarah Wilson",
    customerEmail: "sarah.wilson@email.com",
    customerPhone: "+1-555-0456",
    carModel: "BMW X5",
    carYear: 2022,
    startDate: "2024-01-08",
    endDate: "2024-01-12",
    totalDays: 4,
    dailyRate: 89,
    totalAmount: 356,
    status: "Completed",
    bookingDate: "2024-01-03",
    pickupLocation: "Airport Branch",
    returnLocation: "Airport Branch",
    notes: ""
  },
  {
    id: "BK003",
    customerName: "Mike Johnson", 
    customerEmail: "mike.johnson@email.com",
    customerPhone: "+1-555-0789",
    carModel: "Honda Civic",
    carYear: 2023,
    startDate: "2024-01-25",
    endDate: "2024-01-28",
    totalDays: 3,
    dailyRate: 35,
    totalAmount: 105,
    status: "Pending",
    bookingDate: "2024-01-12",
    pickupLocation: "Downtown Office",
    returnLocation: "Downtown Office",
    notes: "First-time customer"
  },
  {
    id: "BK004",
    customerName: "Emily Davis",
    customerEmail: "emily.davis@email.com", 
    customerPhone: "+1-555-0321",
    carModel: "Mercedes C-Class",
    carYear: 2023,
    startDate: "2024-01-18",
    endDate: "2024-01-22",
    totalDays: 4,
    dailyRate: 75,
    totalAmount: 300,
    status: "Active",
    bookingDate: "2024-01-14",
    pickupLocation: "Mall Location",
    returnLocation: "Downtown Office",
    notes: "Corporate booking"
  },
  {
    id: "BK005",
    customerName: "David Brown",
    customerEmail: "david.brown@email.com",
    customerPhone: "+1-555-0654",
    carModel: "Nissan Altima", 
    carYear: 2022,
    startDate: "2024-01-05",
    endDate: "2024-01-08",
    totalDays: 3,
    dailyRate: 40,
    totalAmount: 120,
    status: "Completed",
    bookingDate: "2023-12-28",
    pickupLocation: "Airport Branch",
    returnLocation: "Mall Location",
    notes: "Extended rental from previous booking"
  }
];

export function BookingsManagement() {
  const [bookings, setBookings] = useState(mockBookings);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedBooking, setSelectedBooking] = useState(null);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.carModel.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const variants = {
      "Active": "default",
      "Completed": "secondary",
      "Pending": "outline",
      "Cancelled": "destructive"
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const updateBookingStatus = (bookingId, newStatus) => {
    setBookings(bookings.map(booking => 
      booking.id === bookingId ? { ...booking, status: newStatus } : booking
    ));
  };

  const BookingDetails = ({ booking }) => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Customer Information</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Name:</span> {booking.customerName}</div>
              <div><span className="font-medium">Email:</span> {booking.customerEmail}</div>
              <div><span className="font-medium">Phone:</span> {booking.customerPhone}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Rental Details</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Car:</span> {booking.carModel} ({booking.carYear})</div>
              <div><span className="font-medium">Daily Rate:</span> ${booking.dailyRate}</div>
              <div><span className="font-medium">Total Days:</span> {booking.totalDays}</div>
              <div><span className="font-medium">Total Amount:</span> ${booking.totalAmount}</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Dates & Locations</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Start Date:</span> {booking.startDate}</div>
              <div><span className="font-medium">End Date:</span> {booking.endDate}</div>
              <div><span className="font-medium">Pickup:</span> {booking.pickupLocation}</div>
              <div><span className="font-medium">Return:</span> {booking.returnLocation}</div>
            </div>
          </div>
          
          <div>
            <h4 className="font-medium mb-2">Booking Information</h4>
            <div className="space-y-2">
              <div><span className="font-medium">Booking ID:</span> {booking.id}</div>
              <div><span className="font-medium">Booking Date:</span> {booking.bookingDate}</div>
              <div><span className="font-medium">Status:</span> {getStatusBadge(booking.status)}</div>
              {booking.notes && <div><span className="font-medium">Notes:</span> {booking.notes}</div>}
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2 pt-4">
        <Select 
          value={booking.status} 
          onValueChange={(value) => updateBookingStatus(booking.id, value)}
        >
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Active">Active</SelectItem>
            <SelectItem value="Completed">Completed</SelectItem>
            <SelectItem value="Cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Bookings Management</h2>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bookings.length}</div>
            <p className="text-xs text-muted-foreground">All time bookings</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Rentals</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === "Active").length}
            </div>
            <p className="text-xs text-muted-foreground">Currently rented</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {bookings.filter(b => b.status === "Pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${bookings.reduce((sum, booking) => sum + booking.totalAmount, 0).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">From all bookings</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
          <CardDescription>Manage car rental bookings and reservations</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search bookings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Vehicle</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id}>
                    <TableCell className="font-medium">{booking.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.customerName}</div>
                        <div className="text-sm text-muted-foreground">{booking.customerEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{booking.carModel}</div>
                        <div className="text-sm text-muted-foreground">{booking.carYear}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="text-sm">{booking.startDate}</div>
                        <div className="text-sm">to {booking.endDate}</div>
                        <div className="text-xs text-muted-foreground">({booking.totalDays} days)</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">${booking.totalAmount}</div>
                        <div className="text-xs text-muted-foreground">${booking.dailyRate}/day</div>
                      </div>
                    </TableCell>
                    <TableCell>{getStatusBadge(booking.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setSelectedBooking(booking)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Booking Details - {booking.id}</DialogTitle>
                              <DialogDescription>
                                View and manage booking information
                              </DialogDescription>
                            </DialogHeader>
                            {selectedBooking && <BookingDetails booking={selectedBooking} />}
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