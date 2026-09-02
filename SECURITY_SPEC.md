# Security Architecture, Access Control & API Protection Specification

## 1. Authentication & Identity Foundation

The application uses **Firebase Authentication** as its primary identity provider, supporting secure token-based session management, passwordless or email/password credentialing, and role-based claim propagation.

```
┌────────────────────────────────────────────────────────┐
│               CLIENT APPLICATION (Browser)             │
│  - Firebase Auth SDK (JWT Token / Refresh Tokens)      │
│  - RBAC State Decorator (Admin, Dispatcher, Viewer)    │
└───────────────────────────┬────────────────────────────┘
                            │ (Bearer Token with Firestore Requests)
┌───────────────────────────▼────────────────────────────┐
│              CLOUD FIRESTORE SECURITY RULES            │
│  - Granular CRUD permission evaluation per collection   │
│  - Invariant enforcement (Data types, capacity bounds) │
└────────────────────────────────────────────────────────┘
```

---

## 2. Access Control Model & Future Extension Point

### 2.1. Current Scope: Authenticated Dispatcher Access
In the current operational build, authentication verifies that the user is an authorized employee/dispatcher. Once authenticated:
- The user has full operational access to master data (`buyers`, `drivers`, `settings`) and the daily optimization pipeline.
- All domain validations and safety checks are enforced both in application code and in Firestore security rules.

### 2.2. Future Role Extension Point
Role-based access control (RBAC) is architecturally designed as a future enterprise extension point without requiring schema changes:
- **`ADMIN`**: System administrator with user management privileges.
- **`DISPATCHER`**: Daily logistics operator (default role for current build).
- **`VIEWER`**: Read-only stakeholder for monitoring and audit.

---

## 3. Production Cloud Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper Functions
    function isAuthenticated() {
      return request.auth != null;
    }

    // 1. Users Collection
    match /users/{userId} {
      allow read, write: if isAuthenticated();
    }

    // 2. Buyers Master Collection (Minimal: buyerCode, buyerName, latitude, longitude)
    match /buyers/{buyerCode} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() &&
        request.resource.data.buyerCode is string &&
        request.resource.data.buyerName is string &&
        request.resource.data.latitude is number &&
        request.resource.data.longitude is number &&
        request.resource.data.latitude >= -90.0 && request.resource.data.latitude <= 90.0 &&
        request.resource.data.longitude >= -180.0 && request.resource.data.longitude <= 180.0;
      allow delete: if isAuthenticated();
    }

    // 3. Drivers Collection
    match /drivers/{driverId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated() &&
        request.resource.data.driverName is string &&
        request.resource.data.maximumLoadKg is number &&
        request.resource.data.maximumLoadKg > 0 &&
        request.resource.data.active is bool;
      allow delete: if isAuthenticated();
    }

    // 4. Global Settings Collection
    match /settings/{settingId} {
      allow read, write: if isAuthenticated();
    }

    // 5. Operations & Historical Archive (Future Extension)
    match /operations/{operationId} {
      allow read, write: if isAuthenticated();
    }
  }
}
```

---

## 4. Google Maps & API Key Security

To ensure third-party API credentials are securely managed and protected from unauthorized external scraping or quota theft:

1. **Environment Variables**:
   - `VITE_GOOGLE_MAPS_API_KEY`: Client-side Maps JavaScript API key.
   - `GOOGLE_ROUTES_API_KEY`: Server-side / restricted Routes API key.
   - Declared in `.env.example`.
2. **Google Cloud Console API Key Restrictions**:
   - **Application Restriction**: Restricted to HTTP Referrers matching the production and development host URLs:
     - `https://*.run.app/*`
     - `http://localhost:3000/*`
   - **API Scope Restrictions**: The key is strictly constrained to the required APIs only:
     - *Maps JavaScript API*
     - *Routes API*
     - *Geocoding API*
3. **Budget Alerts & Quotas**:
   - GCP Cloud billing budget alerts configured to notify administrators upon reaching quota thresholds.
