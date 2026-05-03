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
import { Plus, Search, Edit, Trash2, Eye } from "lucide-react";
import { ImageWithFallback } from "./figma/ImageWithFallback";

const mockCars = [
  {
    id: "1",
    make: "Toyota",
    model: "Camry",
    year: 2023,
    category: "Sedan",
    price: 45,
    status: "Available",
    mileage: 15000,
    color: "Silver",
    transmission: "Automatic",
    fuelType: "Gasoline",
    seats: 5,
    image: "car sedan"
  },
  {
    id: "2", 
    make: "BMW",
    model: "X5",
    year: 2022,
    category: "SUV",
    price: 89,
    status: "Rented",
    mileage: 25000,
    color: "Black",
    transmission: "Automatic",
    fuelType: "Gasoline",
    seats: 7,
    image: "luxury suv"
  },
  {
    id: "3",
    make: "Honda",
    model: "Civic",
    year: 2023,
    category: "Compact",
    price: 35,
    status: "Available",
    mileage: 8000,
    color: "Blue",
    transmission: "Manual",
    fuelType: "Gasoline",
    seats: 5,
    image: "compact car"
  },
  {
    id: "4",
    make: "Mercedes",
    model: "C-Class",
    year: 2023,
    category: "Luxury",
    price: 75,
    status: "Maintenance",
    mileage: 12000,
    color: "White",
    transmission: "Automatic",
    fuelType: "Gasoline",
    seats: 5,
    image: "luxury sedan"
  },
  {
    id: "5",
    make: "Nissan",
    model: "Altima",
    year: 2022,
    category: "Sedan",
    price: 40,
    status: "Available",
    mileage: 18000,
    color: "Red",
    transmission: "Automatic",
    fuelType: "Gasoline",
    seats: 5,
    image: "red sedan"
  }
];

export function CarsManagement() {
  const [cars, setCars] = useState(mockCars);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState(null);

  const filteredCars = cars.filter(car => 
    car.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    car.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status) => {
    const variants = {
      "Available": "default",
      "Rented": "secondary", 
      "Maintenance": "destructive"
    };
    return <Badge variant={variants[status]}>{status}</Badge>;
  };

  const CarForm = ({ car, onSave, onCancel }) => {
    const [formData, setFormData] = useState(car || {
      make: "",
      model: "",
      year: new Date().getFullYear(),
      category: "",
      price: "",
      status: "Available",
      mileage: "",
      color: "",
      transmission: "Automatic",
      fuelType: "Gasoline",
      seats: 5,
      description: ""
    });

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="make">Make</Label>
            <Input
              id="make"
              value={formData.make}
              onChange={(e) => setFormData({...formData, make: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Input
              id="model"
              value={formData.model}
              onChange={(e) => setFormData({...formData, model: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              value={formData.year}
              onChange={(e) => setFormData({...formData, year: parseInt(e.target.value)})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Economy">Economy</SelectItem>
                <SelectItem value="Compact">Compact</SelectItem>
                <SelectItem value="Sedan">Sedan</SelectItem>
                <SelectItem value="SUV">SUV</SelectItem>
                <SelectItem value="Luxury">Luxury</SelectItem>
                <SelectItem value="Sports">Sports</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="price">Daily Price ($)</Label>
            <Input
              id="price"
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="mileage">Mileage</Label>
            <Input
              id="mileage"
              type="number"
              value={formData.mileage}
              onChange={(e) => setFormData({...formData, mileage: parseInt(e.target.value)})}
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={formData.color}
              onChange={(e) => setFormData({...formData, color: e.target.value})}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="seats">Seats</Label>
            <Select value={formData.seats?.toString()} onValueChange={(value) => setFormData({...formData, seats: parseInt(value)})}>
              <SelectTrigger>
                <SelectValue placeholder="Select seats" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="7">7</SelectItem>
                <SelectItem value="8">8</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="transmission">Transmission</Label>
            <Select value={formData.transmission} onValueChange={(value) => setFormData({...formData, transmission: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select transmission" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Automatic">Automatic</SelectItem>
                <SelectItem value="Manual">Manual</SelectItem>
                <SelectItem value="CVT">CVT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="fuelType">Fuel Type</Label>
            <Select value={formData.fuelType} onValueChange={(value) => setFormData({...formData, fuelType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select fuel type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gasoline">Gasoline</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Hybrid">Hybrid</SelectItem>
                <SelectItem value="Electric">Electric</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="Rented">Rented</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            placeholder="Additional details about the car..."
            value={formData.description || ""}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {car ? "Update Car" : "Add Car"}
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Cars Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Car
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Car</DialogTitle>
              <DialogDescription>
                Add a new car to your rental fleet.
              </DialogDescription>
            </DialogHeader>
            <CarForm 
              onSave={(carData) => {
                const newCar = { ...carData, id: Date.now().toString() };
                setCars([...cars, newCar]);
                setIsAddDialogOpen(false);
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
          <CardDescription>Manage your car rental fleet</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search cars by make, model, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Car</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Year</TableHead>
                  <TableHead>Price/Day</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mileage</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCars.map((car) => (
                  <TableRow key={car.id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-8 bg-muted rounded overflow-hidden">
                          <ImageWithFallback 
                            src="/placeholder-car.jpg"
                            alt={`${car.make} ${car.model}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <div className="font-medium">{car.make} {car.model}</div>
                          <div className="text-sm text-muted-foreground">{car.color}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{car.category}</TableCell>
                    <TableCell>{car.year}</TableCell>
                    <TableCell>${car.price}</TableCell>
                    <TableCell>{getStatusBadge(car.status)}</TableCell>
                    <TableCell>{car.mileage?.toLocaleString()} mi</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
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