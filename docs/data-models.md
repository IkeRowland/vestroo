# Data Models

## Core Entities

### 1. Route (Point-to-Point)

* **Purpose:** Defines a sellable shuttle service between two points.
* **Schema (Payload Collection):**

```typescript
export interface Route {
  id: string;
  origin_name: string;      // e.g., "OR Tambo Airport"
  destination_name: string; // e.g., "Sandton City"
  base_price: number;
  is_active: boolean;
  slug: string;             // Auto-generated for SEO: "or-tambo-to-sandton"
  seo_content: RichText;    // Custom content for the landing page
}
```

### 2. VehicleType

* **Purpose:** Defines vehicle types available for booking with pricing multipliers and capacity information.
* **Schema (Payload Collection):**

```typescript
export interface VehicleType {
  id: string;
  name: string;                    // e.g., "Premium Sedan", "8-Seater Van"
  slug: string;                    // Auto-generated URL-safe identifier
  price_multiplier: number;        // Multiplier applied to route base_price (minimum 0.1)
  passenger_capacity: number;      // Maximum number of passengers (minimum 1)
  luggage_capacity: number;        // Maximum number of luggage pieces (minimum 0)
  is_active: boolean;              // Flag to activate/deactivate the vehicle type
  image_url?: string;              // Optional URL to vehicle image for display
  created_at: Date;
  updated_at: Date;
}
```

### 3. PricingRule

* **Purpose:** Defines dynamic pricing adjustments based on route, vehicle type, date/time factors.
* **Schema (Payload Collection):**

```typescript
export interface PricingRule {
  id: string;
  name: string;                   // e.g., "Peak Hours", "Weekend Surcharge"
  route_id?: string;              // Optional: Specific route (Relation to Routes, null = all routes)
  vehicle_type_id?: string;       // Optional: Specific vehicle type (Relation to VehicleTypes, null = all types)
  price_modifier_percent: number; // Percentage adjustment (e.g., 20 for +20%, -10 for -10%, range: -50 to 200)
  day_of_week?: string;           // Optional: Specific day(s) ("all" | "monday" | "tuesday" | ... | "sunday")
  start_time?: string;            // Optional: Start time in HH:mm format (e.g., "08:00")
  end_time?: string;              // Optional: End time in HH:mm format (e.g., "18:00")
  start_date?: Date;              // Optional: Rule start date (for seasonal/holiday pricing)
  end_date?: Date;                // Optional: Rule end date (for seasonal/holiday pricing)
  priority: number;                // Rule priority/order (lower number = higher priority, minimum 1)
  is_active: boolean;              // Flag to activate/deactivate the rule
  created_at: Date;
  updated_at: Date;
}
```

### 4. Booking

* **Purpose:** Records a traveler's reservation.
* **Schema:**

```typescript
export interface Booking {
  id: string;
  user_id: string (Relation to Users);
  route_id: string (Relation to Routes);
  vehicle_type_id: string (Relation to VehicleTypes);
  status: 'pending' | 'paid' | 'confirmed' | 'completed' | 'cancelled';
  passenger_count: number;
  pickup_datetime: Date;
  flight_number?: string;
  total_amount: number;
  payment_reference: string;
}
```

## Marketing Content (PayloadCMS Globals)

### 5. Homepage Global

* **Purpose:** Singleton content for the homepage/landing page. Editable by administrators via PayloadCMS admin interface.
* **Schema (Payload Global):**

```typescript
export interface Homepage {
  hero_title: string;              // Main headline for homepage hero section (required)
  hero_subtitle: string;            // Supporting text below headline (required)
  hero_cta_text: string;            // Call-to-action button text (required, default: "Book Now")
  value_propositions?: Array<{      // List of key value propositions/benefits (optional)
    title: string;
    description: string;
    icon?: string;                  // Icon identifier or name (optional)
  }>;
  trust_indicators?: RichText;      // Trust badges, certifications, or social proof (optional)
  meta_title?: string;              // SEO meta title (optional)
  meta_description?: string;        // SEO meta description (optional)
}
```

* **Access Control:** Public read access, admin-only update access
* **Frontend:** Rendered at `/` (root page)

### 6. About Us Global

* **Purpose:** Singleton content for the About Us page. Editable by administrators via PayloadCMS admin interface.
* **Schema (Payload Global):**

```typescript
export interface AboutUs {
  page_title: string;               // Main page heading (required)
  content: RichText;                // Main content area - company history, mission, values (required)
  team_section?: RichText;          // Team member information (optional)
  stats?: Array<{                   // Key statistics to display (optional)
    label: string;
    value: string;
  }>;
  meta_title?: string;              // SEO meta title (optional)
  meta_description?: string;        // SEO meta description (optional)
}
```

* **Access Control:** Public read access, admin-only update access
* **Frontend:** Rendered at `/about`

### 7. Contact Global

* **Purpose:** Singleton content for the Contact page. Editable by administrators via PayloadCMS admin interface.
* **Schema (Payload Global):**

```typescript
export interface Contact {
  page_title: string;               // Main page heading (required)
  content: RichText;                // Introduction text or instructions (required)
  contact_info: {                   // Contact details group (required)
    phone: string;                  // Primary phone number (required)
    email: string;                  // Contact email address (required, validated as email format)
    address: string;                // Physical address (required)
    office_hours?: string;          // Business hours information (optional)
  };
  contact_form_enabled: boolean;    // Toggle to show/hide contact form (default: true)
  meta_title?: string;              // SEO meta title (optional)
  meta_description?: string;        // SEO meta description (optional)
}
```

* **Access Control:** Public read access, admin-only update access
* **Frontend:** Rendered at `/contact`
* **Validation Rules:**
  - All text fields marked as required must not be empty
  - Email field validates email format automatically
  - PayloadCMS admin UI displays user-friendly error messages

### Global Field Types and Validation

* **RichText Fields:** Use PayloadCMS Lexical Editor for formatted content (headings, paragraphs, lists, links, embedded media)
* **Required Fields:** Marked with `required: true` - PayloadCMS enforces validation
* **Email Fields:** Use `type: 'email'` for automatic email format validation
* **Array Fields:** Support nested fields (e.g., value_propositions, stats)
* **Group Fields:** Organize related fields (e.g., contact_info)

### ISR and Revalidation

All marketing pages use Incremental Static Regeneration (ISR) with:
- **Caching:** `unstable_cache` with 3600s (1 hour) revalidation time
- **On-demand Revalidation:** `revalidatePath` triggered in Global `afterChange` hooks when content is updated
- **Performance:** Sub-100ms load times where possible
- **SEO:** Static HTML generation for optimal SEO

