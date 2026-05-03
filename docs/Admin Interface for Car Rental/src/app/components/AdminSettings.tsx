import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Textarea } from "./ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Separator } from "./ui/separator";
import { Badge } from "./ui/badge";
import { Settings, Shield, Bell, Mail, Database, MapPin, DollarSign } from "lucide-react";

export function AdminSettings() {
  const [settings, setSettings] = useState({
    // General Settings
    companyName: "CarRental Pro",
    contactEmail: "admin@carrental.com",
    contactPhone: "+1-555-0123",
    address: "123 Business Ave, City, State 12345",
    timezone: "America/New_York",
    currency: "USD",
    
    // Business Settings
    minRentalAge: 21,
    maxRentalDays: 30,
    advanceBookingDays: 90,
    depositPercentage: 20,
    lateFeePerDay: 25,
    cancellationDeadlineHours: 24,
    
    // Notification Settings
    emailNotifications: true,
    smsNotifications: false,
    newBookingAlert: true,
    paymentAlert: true,
    maintenanceAlert: true,
    customerWelcomeEmail: true,
    bookingConfirmationEmail: true,
    reminderEmail: true,
    
    // Security Settings
    requireEmailVerification: true,
    requirePhoneVerification: false,
    twoFactorAuth: false,
    passwordComplexity: "medium",
    sessionTimeout: 120,
    
    // Locations
    locations: [
      { id: 1, name: "Downtown Office", address: "123 Main St", phone: "+1-555-0001", active: true },
      { id: 2, name: "Airport Branch", address: "Airport Terminal 1", phone: "+1-555-0002", active: true },
      { id: 3, name: "Mall Location", address: "456 Shopping Mall", phone: "+1-555-0003", active: true }
    ]
  });

  const handleSave = (section) => {
    // In a real app, this would save to the backend
    console.log(`Saving ${section} settings:`, settings);
    alert(`${section} settings saved successfully!`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2>System Settings</h2>
        <Button onClick={() => handleSave("all")}>
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="business">Business</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                General Settings
              </CardTitle>
              <CardDescription>
                Configure basic company and system information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Company Name</Label>
                  <Input
                    id="companyName"
                    value={settings.companyName}
                    onChange={(e) => setSettings({...settings, companyName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={settings.contactEmail}
                    onChange={(e) => setSettings({...settings, contactEmail: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={settings.contactPhone}
                    onChange={(e) => setSettings({...settings, contactPhone: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select value={settings.timezone} onValueChange={(value) => setSettings({...settings, timezone: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Company Address</Label>
                <Textarea
                  id="address"
                  value={settings.address}
                  onChange={(e) => setSettings({...settings, address: e.target.value})}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="currency">Default Currency</Label>
                <Select value={settings.currency} onValueChange={(value) => setSettings({...settings, currency: value})}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={() => handleSave("general")}>
                Save General Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="business" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Business Rules
              </CardTitle>
              <CardDescription>
                Configure rental policies and business logic
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="minRentalAge">Minimum Rental Age</Label>
                  <Input
                    id="minRentalAge"
                    type="number"
                    value={settings.minRentalAge}
                    onChange={(e) => setSettings({...settings, minRentalAge: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxRentalDays">Maximum Rental Days</Label>
                  <Input
                    id="maxRentalDays"
                    type="number"
                    value={settings.maxRentalDays}
                    onChange={(e) => setSettings({...settings, maxRentalDays: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="advanceBookingDays">Advance Booking Limit (Days)</Label>
                  <Input
                    id="advanceBookingDays"
                    type="number"
                    value={settings.advanceBookingDays}
                    onChange={(e) => setSettings({...settings, advanceBookingDays: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="depositPercentage">Security Deposit (%)</Label>
                  <Input
                    id="depositPercentage"
                    type="number"
                    value={settings.depositPercentage}
                    onChange={(e) => setSettings({...settings, depositPercentage: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateFeePerDay">Late Fee (per day)</Label>
                  <Input
                    id="lateFeePerDay"
                    type="number"
                    value={settings.lateFeePerDay}
                    onChange={(e) => setSettings({...settings, lateFeePerDay: parseInt(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cancellationDeadlineHours">Cancellation Deadline (Hours)</Label>
                  <Input
                    id="cancellationDeadlineHours"
                    type="number"
                    value={settings.cancellationDeadlineHours}
                    onChange={(e) => setSettings({...settings, cancellationDeadlineHours: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave("business")}>
                Save Business Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <CardDescription>
                Configure how and when notifications are sent
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">General Notifications</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email Notifications</Label>
                      <div className="text-sm text-muted-foreground">Enable email notifications</div>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, emailNotifications: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>SMS Notifications</Label>
                      <div className="text-sm text-muted-foreground">Enable SMS notifications</div>
                    </div>
                    <Switch
                      checked={settings.smsNotifications}
                      onCheckedChange={(checked) => setSettings({...settings, smsNotifications: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Admin Alerts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Booking Alert</Label>
                      <div className="text-sm text-muted-foreground">Alert when new bookings are made</div>
                    </div>
                    <Switch
                      checked={settings.newBookingAlert}
                      onCheckedChange={(checked) => setSettings({...settings, newBookingAlert: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Payment Alert</Label>
                      <div className="text-sm text-muted-foreground">Alert for payment transactions</div>
                    </div>
                    <Switch
                      checked={settings.paymentAlert}
                      onCheckedChange={(checked) => setSettings({...settings, paymentAlert: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Maintenance Alert</Label>
                      <div className="text-sm text-muted-foreground">Alert for vehicle maintenance</div>
                    </div>
                    <Switch
                      checked={settings.maintenanceAlert}
                      onCheckedChange={(checked) => setSettings({...settings, maintenanceAlert: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h4 className="font-medium">Customer Emails</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Welcome Email</Label>
                      <div className="text-sm text-muted-foreground">Send welcome email to new customers</div>
                    </div>
                    <Switch
                      checked={settings.customerWelcomeEmail}
                      onCheckedChange={(checked) => setSettings({...settings, customerWelcomeEmail: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Booking Confirmation</Label>
                      <div className="text-sm text-muted-foreground">Send booking confirmation emails</div>
                    </div>
                    <Switch
                      checked={settings.bookingConfirmationEmail}
                      onCheckedChange={(checked) => setSettings({...settings, bookingConfirmationEmail: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Reminder Email</Label>
                      <div className="text-sm text-muted-foreground">Send rental reminders</div>
                    </div>
                    <Switch
                      checked={settings.reminderEmail}
                      onCheckedChange={(checked) => setSettings({...settings, reminderEmail: checked})}
                    />
                  </div>
                </div>
              </div>

              <Button onClick={() => handleSave("notifications")}>
                Save Notification Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Settings
              </CardTitle>
              <CardDescription>
                Configure security and authentication settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h4 className="font-medium">User Verification</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Email Verification</Label>
                      <div className="text-sm text-muted-foreground">Users must verify email before booking</div>
                    </div>
                    <Switch
                      checked={settings.requireEmailVerification}
                      onCheckedChange={(checked) => setSettings({...settings, requireEmailVerification: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Require Phone Verification</Label>
                      <div className="text-sm text-muted-foreground">Users must verify phone number</div>
                    </div>
                    <Switch
                      checked={settings.requirePhoneVerification}
                      onCheckedChange={(checked) => setSettings({...settings, requirePhoneVerification: checked})}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Two-Factor Authentication</Label>
                      <div className="text-sm text-muted-foreground">Enable 2FA for admin accounts</div>
                    </div>
                    <Switch
                      checked={settings.twoFactorAuth}
                      onCheckedChange={(checked) => setSettings({...settings, twoFactorAuth: checked})}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="passwordComplexity">Password Complexity</Label>
                  <Select value={settings.passwordComplexity} onValueChange={(value) => setSettings({...settings, passwordComplexity: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - Minimum 6 characters</SelectItem>
                      <SelectItem value="medium">Medium - 8+ chars, mixed case</SelectItem>
                      <SelectItem value="high">High - 12+ chars, symbols, numbers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="sessionTimeout">Session Timeout (minutes)</Label>
                  <Input
                    id="sessionTimeout"
                    type="number"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({...settings, sessionTimeout: parseInt(e.target.value)})}
                  />
                </div>
              </div>

              <Button onClick={() => handleSave("security")}>
                Save Security Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Rental Locations
              </CardTitle>
              <CardDescription>
                Manage pickup and return locations
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                {settings.locations.map((location) => (
                  <div key={location.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{location.name}</span>
                        {location.active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{location.address}</div>
                      <div className="text-sm text-muted-foreground">{location.phone}</div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={location.active}
                        onCheckedChange={(checked) => {
                          const newLocations = settings.locations.map(loc =>
                            loc.id === location.id ? { ...loc, active: checked } : loc
                          );
                          setSettings({ ...settings, locations: newLocations });
                        }}
                      />
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>

              <Button onClick={() => handleSave("locations")}>
                Add New Location
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}