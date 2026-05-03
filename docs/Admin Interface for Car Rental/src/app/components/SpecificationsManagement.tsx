import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Plus, Search, Edit, Trash2, Wrench, Gauge, Fuel, Settings } from "lucide-react";

const mockSpecifications = [
  {
    id: "1",
    name: "Engine Power",
    category: "Engine",
    dataType: "number",
    unit: "HP",
    description: "Engine horsepower rating",
    isRequired: true,
    defaultValue: "",
    options: []
  },
  {
    id: "2",
    name: "Fuel Economy",
    category: "Performance",
    dataType: "number", 
    unit: "MPG",
    description: "Miles per gallon fuel efficiency",
    isRequired: true,
    defaultValue: "",
    options: []
  },
  {
    id: "3",
    name: "Transmission Type",
    category: "Drivetrain",
    dataType: "select",
    unit: "",
    description: "Type of transmission system",
    isRequired: true,
    defaultValue: "Automatic",
    options: ["Automatic", "Manual", "CVT", "Semi-Automatic"]
  },
  {
    id: "4",
    name: "Drive Type",
    category: "Drivetrain",
    dataType: "select",
    unit: "",
    description: "Vehicle drive configuration",
    isRequired: true,
    defaultValue: "FWD",
    options: ["FWD", "RWD", "AWD", "4WD"]
  },
  {
    id: "5", 
    name: "Safety Rating",
    category: "Safety",
    dataType: "select",
    unit: "stars",
    description: "NHTSA safety rating",
    isRequired: false,
    defaultValue: "5",
    options: ["1", "2", "3", "4", "5"]
  },
  {
    id: "6",
    name: "Bluetooth",
    category: "Technology",
    dataType: "boolean",
    unit: "",
    description: "Bluetooth connectivity available",
    isRequired: false,
    defaultValue: "true",
    options: []
  },
  {
    id: "7",
    name: "GPS Navigation",
    category: "Technology", 
    dataType: "boolean",
    unit: "",
    description: "Built-in GPS navigation system",
    isRequired: false,
    defaultValue: "false",
    options: []
  },
  {
    id: "8",
    name: "Cargo Space",
    category: "Interior",
    dataType: "number",
    unit: "cubic feet",
    description: "Cargo area volume",
    isRequired: false,
    defaultValue: "",
    options: []
  }
];

const specCategories = [
  "Engine", "Performance", "Drivetrain", "Safety", "Technology", "Interior", "Exterior", "Comfort"
];

const dataTypes = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes/No" },
  { value: "select", label: "Select List" }
];

export function SpecificationsManagement() {
  const [specifications, setSpecifications] = useState(mockSpecifications);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState(null);

  const filteredSpecs = specifications.filter(spec => {
    const matchesSearch = spec.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         spec.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "all" || spec.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const SpecificationForm = ({ specification, onSave, onCancel }) => {
    const [formData, setFormData] = useState(specification || {
      name: "",
      category: "",
      dataType: "text",
      unit: "",
      description: "",
      isRequired: false,
      defaultValue: "",
      options: []
    });

    const [newOption, setNewOption] = useState("");

    const handleSubmit = (e) => {
      e.preventDefault();
      onSave(formData);
    };

    const addOption = () => {
      if (newOption.trim()) {
        setFormData({
          ...formData,
          options: [...formData.options, newOption.trim()]
        });
        setNewOption("");
      }
    };

    const removeOption = (index) => {
      setFormData({
        ...formData,
        options: formData.options.filter((_, i) => i !== index)
      });
    };

    return (
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Specification Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                {specCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="dataType">Data Type</Label>
            <Select value={formData.dataType} onValueChange={(value) => setFormData({...formData, dataType: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select data type" />
              </SelectTrigger>
              <SelectContent>
                {dataTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="unit">Unit (optional)</Label>
            <Input
              id="unit"
              value={formData.unit}
              onChange={(e) => setFormData({...formData, unit: e.target.value})}
              placeholder="e.g., HP, MPG, inches"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Brief description of this specification"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="defaultValue">Default Value</Label>
            <Input
              id="defaultValue"
              value={formData.defaultValue}
              onChange={(e) => setFormData({...formData, defaultValue: e.target.value})}
              placeholder="Default value (optional)"
            />
          </div>
          <div className="flex items-center space-x-2 pt-6">
            <input
              type="checkbox"
              id="isRequired"
              checked={formData.isRequired}
              onChange={(e) => setFormData({...formData, isRequired: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="isRequired">Required Field</Label>
          </div>
        </div>

        {formData.dataType === "select" && (
          <div className="space-y-2">
            <Label>Options (for select lists)</Label>
            <div className="flex space-x-2">
              <Input
                placeholder="Add an option..."
                value={newOption}
                onChange={(e) => setNewOption(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addOption())}
              />
              <Button type="button" onClick={addOption}>Add</Button>
            </div>
            <div className="space-y-1">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                  <span>{option}</span>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm"
                    onClick={() => removeOption(index)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end space-x-2 pt-4">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit">
            {specification ? "Update Specification" : "Add Specification"}
          </Button>
        </div>
      </form>
    );
  };

  const handleDelete = (specId) => {
    setSpecifications(specifications.filter(spec => spec.id !== specId));
  };

  const getCategoryIcon = (category) => {
    switch(category) {
      case "Engine": 
      case "Performance": return <Gauge className="h-4 w-4" />;
      case "Safety": return <Settings className="h-4 w-4" />;
      case "Technology": return <Wrench className="h-4 w-4" />;
      default: return <Wrench className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>Specifications Management</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Specification
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Specification</DialogTitle>
              <DialogDescription>
                Add a new car specification field to your system.
              </DialogDescription>
            </DialogHeader>
            <SpecificationForm 
              onSave={(specData) => {
                const newSpec = { ...specData, id: Date.now().toString() };
                setSpecifications([...specifications, newSpec]);
                setIsAddDialogOpen(false);
              }}
              onCancel={() => setIsAddDialogOpen(false)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Specs</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{specifications.length}</div>
            <p className="text-xs text-muted-foreground">Specification fields</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Required Fields</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {specifications.filter(spec => spec.isRequired).length}
            </div>
            <p className="text-xs text-muted-foreground">Mandatory specifications</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(specifications.map(spec => spec.category)).size}
            </div>
            <p className="text-xs text-muted-foreground">Specification categories</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Select Lists</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {specifications.filter(spec => spec.dataType === "select").length}
            </div>
            <p className="text-xs text-muted-foreground">Dropdown specifications</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Car Specifications</CardTitle>
          <CardDescription>Manage specification fields for car details</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4 mb-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search specifications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {specCategories.map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Specification</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Data Type</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Default Value</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSpecs.map((spec) => (
                  <TableRow key={spec.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{spec.name}</div>
                        <div className="text-sm text-muted-foreground">{spec.description}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {getCategoryIcon(spec.category)}
                        <span>{spec.category}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="bg-muted px-2 py-1 rounded text-sm">
                        {dataTypes.find(type => type.value === spec.dataType)?.label}
                      </span>
                    </TableCell>
                    <TableCell>{spec.unit || "-"}</TableCell>
                    <TableCell>
                      {spec.isRequired ? (
                        <span className="text-red-600 font-medium">Required</span>
                      ) : (
                        <span className="text-muted-foreground">Optional</span>
                      )}
                    </TableCell>
                    <TableCell>{spec.defaultValue || "-"}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSpec(spec)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Edit Specification</DialogTitle>
                              <DialogDescription>
                                Update specification details.
                              </DialogDescription>
                            </DialogHeader>
                            <SpecificationForm 
                              specification={editingSpec}
                              onSave={(specData) => {
                                setSpecifications(specifications.map(s => 
                                  s.id === editingSpec.id ? { ...specData, id: editingSpec.id } : s
                                ));
                                setEditingSpec(null);
                              }}
                              onCancel={() => setEditingSpec(null)}
                            />
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDelete(spec.id)}
                        >
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