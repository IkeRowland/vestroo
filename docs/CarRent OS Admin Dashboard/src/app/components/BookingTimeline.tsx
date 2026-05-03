import { Calendar, Clock, User, Car, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';

const bookingData = [
  {
    id: 'BK-001',
    customer: 'John Martinez',
    vehicle: 'Mercedes C-Class',
    startTime: '09:00 AM',
    endTime: '05:00 PM',
    location: 'Downtown Branch',
    status: 'Active',
    duration: '8h'
  },
  {
    id: 'BK-002',
    customer: 'Sarah Johnson',
    vehicle: 'BMW X5',
    startTime: '11:30 AM',
    endTime: '02:30 PM',
    location: 'Airport Terminal',
    status: 'Active',
    duration: '3h'
  },
  {
    id: 'BK-003',
    customer: 'Mike Chen',
    vehicle: 'Tesla Model S',
    startTime: '02:00 PM',
    endTime: '09:00 PM',
    location: 'City Center',
    status: 'Scheduled',
    duration: '7h'
  },
  {
    id: 'BK-004',
    customer: 'Emma Davis',
    vehicle: 'Mercedes-AMG GT',
    startTime: '06:00 PM',
    endTime: '10:00 PM',
    location: 'Downtown Branch',
    status: 'Scheduled',
    duration: '4h'
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Active':
      return 'bg-success/10 text-success border-success/20';
    case 'Scheduled':
      return 'bg-primary/10 text-primary border-primary/20';
    case 'Completed':
      return 'bg-muted text-muted-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function BookingTimeline() {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5" />
            Today's Bookings
          </div>
          <Button variant="outline" size="sm">
            View Calendar
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {bookingData.map((booking, index) => (
            <div key={booking.id} className="flex items-center space-x-4 p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
              <div className="flex-shrink-0">
                <Badge variant="secondary" className="text-xs">
                  {booking.id}
                </Badge>
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <span className="font-medium text-sm">{booking.customer}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">{booking.vehicle}</span>
                    </div>
                  </div>
                  <Badge className={`text-xs ${getStatusColor(booking.status)}`}>
                    {booking.status}
                  </Badge>
                </div>
                
                <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{booking.startTime} - {booking.endTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{booking.location}</span>
                  </div>
                  <span>Duration: {booking.duration}</span>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <Button variant="ghost" size="sm">
                  View Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}