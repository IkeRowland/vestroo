import { MapPin, Fuel, Users, MoreVertical, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ImageWithFallback } from './figma/ImageWithFallback';

const fleetData = [
  {
    id: 'VH-001',
    model: 'Mercedes-Benz C-Class',
    year: '2023',
    status: 'Available',
    location: 'Downtown Branch',
    fuel: 85,
    passengers: 5,
    image: 'https://images.unsplash.com/photo-1722088353797-854b8600d97a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxsdXh1cnklMjBjYXIlMjBzZWRhbnxlbnwxfHx8fDE3NTQ2NjQ3OTl8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gpsOnline: true
  },
  {
    id: 'VH-002',
    model: 'BMW X5',
    year: '2023',
    status: 'Booked',
    location: 'Airport Terminal',
    fuel: 92,
    passengers: 7,
    image: 'https://images.unsplash.com/photo-1554626268-27c59b023e5e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxCTVclMjBTVVYlMjBibGFja3xlbnwxfHx8fDE3NTQ2NjQ4MDN8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gpsOnline: true
  },
  {
    id: 'VH-003',
    model: 'Tesla Model S',
    year: '2024',
    status: 'Maintenance',
    location: 'Service Center',
    fuel: 67,
    passengers: 5,
    image: 'https://images.unsplash.com/photo-1453491945771-a1e904948959?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxUZXNsYSUyMGVsZWN0cmljJTIwY2FyfGVufDF8fHx8MTc1NDY2NDgwNnww&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gpsOnline: false
  },
  {
    id: 'VH-004',
    model: 'Mercedes-AMG GT',
    year: '2023',
    status: 'Available',
    location: 'City Center',
    fuel: 78,
    passengers: 2,
    image: 'https://images.unsplash.com/photo-1624314676242-3bebabc0fd1a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxNZXJjZWRlcyUyMHNwb3J0cyUyMGNhcnxlbnwxfHx8fDE3NTQ2NjQ4MTB8MA&ixlib=rb-4.1.0&q=80&w=1080&utm_source=figma&utm_medium=referral',
    gpsOnline: true
  }
];

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Available':
      return 'bg-success/10 text-success border-success/20';
    case 'Booked':
      return 'bg-warning/10 text-warning border-warning/20';
    case 'Maintenance':
      return 'bg-destructive/10 text-destructive border-destructive/20';
    default:
      return 'bg-muted text-muted-foreground';
  }
};

export function FleetOverview() {
  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Fleet Overview
          <Button variant="outline" size="sm">
            View All Vehicles
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {fleetData.map((vehicle) => (
            <Card key={vehicle.id} className="border border-border hover:shadow-md transition-shadow">
              <div className="relative">
                <ImageWithFallback
                  src={vehicle.image}
                  alt={vehicle.model}
                  className="w-full h-32 object-cover rounded-t-lg"
                />
                <div className="absolute top-2 right-2">
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 bg-white/80 hover:bg-white">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </div>
                <div className="absolute top-2 left-2">
                  <Badge variant="secondary" className="text-xs">
                    {vehicle.id}
                  </Badge>
                </div>
              </div>
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div>
                    <h4 className="font-medium text-sm">{vehicle.model}</h4>
                    <p className="text-xs text-muted-foreground">{vehicle.year}</p>
                  </div>
                  
                  <Badge className={`text-xs ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status}
                  </Badge>
                  
                  <div className="flex items-center text-xs text-muted-foreground">
                    <MapPin className="w-3 h-3 mr-1" />
                    {vehicle.location}
                  </div>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center">
                      <Fuel className="w-3 h-3 mr-1 text-muted-foreground" />
                      <span>{vehicle.fuel}%</span>
                    </div>
                    <div className="flex items-center">
                      <Users className="w-3 h-3 mr-1 text-muted-foreground" />
                      <span>{vehicle.passengers}</span>
                    </div>
                    <div className="flex items-center">
                      {vehicle.gpsOnline ? (
                        <div className="w-2 h-2 bg-success rounded-full" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 text-warning" />
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}