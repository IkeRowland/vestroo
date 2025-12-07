# Front-End Component Guide

## Component Breakdown & Implementation Details

### Component Naming & Organization

* **PascalCase** for component files (BookingWidget.tsx).
* Co-locate feature-specific components in `src/features/{feature}/components`.

### Key Component: BookingWizard

* **Purpose:** The core revenue driver. Orchestrates the multi-step booking flow.
* **Source:** `src/features/booking/components/BookingWizard.tsx`
* **State:** Connects to `useBookingStore` (Zustand).
* **Structure:**
  * Renders a **Stepper** (Visual progress indicator).
  * Renders the current **Step Component** (Search, Quote, Details, Payment) based on the route or internal state.
  * Manages transitions using framer-motion.

### Key Component: AddressAutocomplete

* **Purpose:** Google Maps Places Autocomplete input for Origin/Destination.
* **Source:** `src/components/ui/AddressAutocomplete.tsx`
* **Props:** `onSelect: (place: PlaceResult) => void`, `label: string`.
* **Implementation:** Wraps `use-places-autocomplete` library (or native Google Maps Script) to provide a controlled input that returns geocoded data.

## Component Library

* **Shadcn/UI** (built on Radix Primitives) is the definitive component library.
* Provides accessible, unstyled primitives that we style with Tailwind.
* Primitives located in `src/components/ui/` (Atoms/Molecules).
* Feature-specific business components in `src/features/...` (Organisms).

