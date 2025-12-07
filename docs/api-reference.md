# API Reference

## External APIs Consumed

### Google Maps Platform

* **Purpose:** Autocomplete for pickup/drop-off locations and Distance Matrix for quote validation.
* **Authentication:** API Key (Server-side restricted).
* **Key Endpoints:** Places Autocomplete, Distance Matrix.

### PayFast (Onsite)

* **Purpose:** Processing payments without full redirection.
* **Authentication:** Merchant ID + Signature (Server-side generation).
* **Flow:** Application generates a signature → Frontend triggers PayFast Modal → Webhook confirms payment.

