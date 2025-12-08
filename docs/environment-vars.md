# Environment Variables Documentation

## Build Environment Variables

Managed via Vercel Project Settings.

### Client-Side Variables (NEXT_PUBLIC_*)

* **NEXT_PUBLIC_GOOGLE_MAPS_KEY** - Exposed to client for Google Maps API integration (Places Autocomplete, Distance Matrix).

* **NEXT_PUBLIC_PAYFAST_MERCHANT_ID** - PayFast merchant ID, exposed to client for payment integration.

* **NEXT_PUBLIC_PAYFAST_MERCHANT_KEY** - PayFast merchant key, exposed to client for payment integration (if required by PayFast API version).

* **NEXT_PUBLIC_PAYFAST_URL** - PayFast API endpoint URL (sandbox: `https://sandbox.payfast.co.za`, production: `https://www.payfast.co.za`).

* **NEXT_PUBLIC_SUPABASE_URL** - Supabase project URL, exposed to client for database access.

* **NEXT_PUBLIC_SUPABASE_ANON_KEY** - Supabase anonymous key, exposed to client for database access with Row Level Security (RLS).

* **NEXT_PUBLIC_APP_URL** - Application base URL (e.g., `https://yourdomain.com` or `http://localhost:3000` for development). Used for PayFast return URLs.

### Server-Side Variables

* **DATABASE_URL** (or **DATABASE_URI** as fallback) - Server only. PostgreSQL connection string from Supabase project settings. Format: `postgresql://[user]:[password]@[host]:[port]/[database]`. **NEVER exposed to client.**

* **PAYLOAD_SECRET** - Server only. Secret key for PayloadCMS authentication and encryption. Must be at least 16 characters (32+ recommended for production). **NEVER exposed to client.**

* **PAYFAST_PASSPHRASE** - Server only. Used for generating PayFast payment signatures. **NEVER exposed to client.**                                            

* **PAYFAST_MERCHANT_KEY** - PayFast merchant key (server-side only, if different from client-side key).                                                        

* **SUPABASE_SERVICE_ROLE_KEY** - Server only. Used for server-side database operations and authentication. Bypasses RLS policies. **NEVER exposed to client.**                              

* **RESEND_API_KEY** - Server only. Resend API key for sending transactional emails (booking confirmations). **NEVER exposed to client.**                       

* **RESEND_FROM_EMAIL** - Server only. Email address to send confirmation emails from (e.g., `noreply@vestroo.com`). Must be verified in Resend account.        

### Additional Configuration

* **Database Connection:** Configured via `DATABASE_URL` environment variable. Connection pooling and timeout settings are configured in `payload.config.ts`.                                                         
* **PayloadCMS Configuration:** Defined in `payload.config.ts` with environment-specific settings.

