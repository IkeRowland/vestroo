# Front-End State Management

## State Management Strategy

* **Global/Session State:** **Zustand**. Used specifically for the **Booking Wizard** to persist user inputs (Pick up, Drop off, Date, Passenger count) across the multi-step flow without URL clutter.
* **Server State:** **React Query** (optional) or native Next.js cache/revalidatePath for fetching data. Given the "Server Actions" architecture, we will primarily rely on **Server Actions** for data mutation and fetching, reducing the need for a heavy client-side fetcher like React Query for the MVP.

## Global Store: useBookingStore (Zustand)

We need to persist the "Draft Booking" as the user moves between pages.

```typescript
interface BookingState {
  // Step 1: Search
  origin: Location | null;
  destination: Location | null;
  date: Date | null;
  passengers: number;
    
  // Step 2: Quote
  selectedVehicleId: string | null;
  quoteAmount: number | null;
    
  // Step 3: Details
  customer: { name: string; email: string; phone: string; flightNumber?: string };
    
  // Actions
  setTripDetails: (details: Partial<BookingState>) => void;
  selectVehicle: (vehicleId: string, amount: number) => void;
  reset: () => void;
}
```

