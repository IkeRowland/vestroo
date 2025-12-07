# Front-End API Interaction

## API Interaction Layer

### Server Actions

Instead of a traditional `apiClient.ts` calling REST endpoints, we use **Next.js Server Actions** for type-safe, direct backend logic invocation.

* **calculateQuote(data: SearchParams)**
  * **Input:** Origin/Dest Coordinates, Pax.
  * **Logic:** Calls Google Distance Matrix API → Queries PayloadCMS for Base Rates → Returns Price.
  * **Output:** `Promise<QuoteResult | Error>`

* **createBooking(data: BookingState)**
  * **Input:** Full booking state from Zustand.
  * **Logic:** Validates data → Creates record in Supabase (status: 'pending') → Generates PayFast Signature.
  * **Output:** `Promise<{ bookingId: string, payFastData: any }>`

## Data Flow

Next.js Server Actions → Payload Local API → Supabase (Postgres)

