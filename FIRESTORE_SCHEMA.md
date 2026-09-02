# Cloud Firestore Database Schema Specification

## 1. Persistence Philosophy & Data Scope

This document specifies the schema, collection taxonomy, security constraints, and validation rules for the Cloud Firestore database.

### 1.1. Persistent Master Data vs. Ephemeral Operational Data
- **Persisted Collections (Permanent Master Data)**:
  - `buyers`: Customer records, codes, business names, verified GPS coordinates.
  - `drivers`: Fleet registry, nominal load capacities, phone numbers, shift status.
  - `settings`: Global application settings, global depot location, default optimization parameters.
  - `users`: Dispatchers, managers, and administrative account profiles.
- **In-Memory Operational Data (Current Stage)**:
  - Daily Excel lists, aggregated stops, intermediate matrix caches, and tentative optimization proposals reside in client application memory / Zustand store during the dispatcher's working session.
- **Future Extensibility (Historical Operations)**:
  - Schemas for optional `operations`, `historical_routes`, and `audit_logs` are formally defined below to ensure zero-refactoring architectural readiness when historical archiving is activated in future stages.

---

## 2. Collection Specifications

### 2.1. `buyers` Collection
- **Collection Path**: `/buyers/{buyerCode}`
- **Document ID**: `buyerCode` (Natural unique key, e.g., `BY-1042`)
- **Description**: Minimal master customer directory containing verified delivery locations.

```json
{
  "buyerCode": "BY-1042",
  "buyerName": "Al-Amal Supermarket",
  "latitude": 33.3152,
  "longitude": 44.3661
}
```

| Field Name | Type | Required | Constraints & Validation |
| :--- | :--- | :--- | :--- |
| `buyerCode` | `string` | **Yes** | Primary Key, 2–32 characters, regex: `^[A-Za-z0-9_-]+$` |
| `buyerName` | `string` | **Yes** | 2–128 characters, non-empty |
| `latitude` | `number` | **Yes** | Valid WGS84 latitude range: `[-90.0, 90.0]`, numeric precision |
| `longitude` | `number` | **Yes** | Valid WGS84 longitude range: `[-180.0, 180.0]`, numeric precision |

*Note on Minimal Schema*: The permanent Buyer entity contains strictly the 4 fields above (`buyerCode`, `buyerName`, `latitude`, `longitude`). Additional operational attributes, phone numbers, addresses, or temporary order details are excluded from the Firestore Buyer master document.

---

### 2.2. `drivers` Collection
- **Collection Path**: `/drivers/{driverId}`
- **Document ID**: `driverId` (e.g., `DRV-001` or auto-generated UUID)
- **Description**: Delivery fleet driver registry with capacity parameters.

```json
{
  "driverId": "DRV-001",
  "driverName": "Ahmed Al-Saadi",
  "maximumLoadKg": 2000,
  "active": true,
  "phone": "+9647801234567",
  "vehiclePlate": "B-123456",
  "vehicleModel": "Isuzu NPR 3.5T",
  "notes": "Experienced with downtown routes"
}
```

| Field Name | Type | Required | Constraints & Validation |
| :--- | :--- | :--- | :--- |
| `driverId` | `string` | **Yes** | Primary Key, unique identifier |
| `driverName` | `string` | **Yes** | 2–64 characters |
| `maximumLoadKg` | `number` | **Yes** | $> 0$ (e.g., 500 to 20,000 kg). Nominal capacity. |
| `active` | `boolean` | **Yes** | Controls eligibility in optimization engine |
| `phone` | `string` | No | Driver mobile number |
| `vehiclePlate` | `string` | No | Vehicle registration tag |
| `vehicleModel` | `string` | No | Vehicle make and payload classification |
| `notes` | `string` | No | Operational comments |

---

### 2.3. `settings` Collection
- **Collection Path**: `/settings/global` (Singleton Document)
- **Document ID**: `global`
- **Description**: System-wide configuration, default depot coordinates, and optimization parameters.

```json
{
  "depot": {
    "name": "Central Logistics Hub - Baghdad",
    "latitude": 33.2985,
    "longitude": 44.3820,
    "address": "Industrial Zone, Karrada, Baghdad"
  },
  "optimizationDefaults": {
    "distanceWeightPercent": 70,
    "loadBalanceWeightPercent": 30,
    "capacityTolerancePercent": 10,
    "maxIterations": 1000
  }
}
```

| Field Name | Type | Required | Constraints & Validation |
| :--- | :--- | :--- | :--- |
| `depot.name` | `string` | **Yes** | Descriptive depot facility title |
| `depot.latitude` | `number` | **Yes** | Valid latitude `[-90.0, 90.0]` |
| `depot.longitude` | `number` | **Yes** | Valid longitude `[-180.0, 180.0]` |
| `depot.address` | `string` | No | Physical street address |
| `optimizationDefaults.distanceWeightPercent` | `number` | **Yes** | Range `[0, 100]`, default: 70 |
| `optimizationDefaults.loadBalanceWeightPercent` | `number` | **Yes** | Range `[0, 100]`, default: 30, sum with distance = 100 |
| `optimizationDefaults.capacityTolerancePercent` | `number` | **Yes** | Fixed default: 10 (10% hard operational buffer) |

---

### 2.4. `users` Collection (Authentication & Future Role Extension Point)
- **Collection Path**: `/users/{uid}`
- **Document ID**: `uid` (Firebase Authentication User UID)
- **Description**: Dispatcher authenticated user profile. In the current build scope, authentication secures access to the operational workbench; granular multi-role RBAC (Admin, Viewer, Auditor) is preserved as a future extension point.

```json
{
  "uid": "abc123xyz456",
  "email": "dispatcher@company.com",
  "displayName": "Mustafa Dispatcher",
  "role": "DISPATCHER",
  "isActive": true
}
```

| Field Name | Type | Required | Constraints & Validation |
| :--- | :--- | :--- | :--- |
| `uid` | `string` | **Yes** | Firebase Auth UID |
| `email` | `string` | **Yes** | Valid email address |
| `displayName` | `string` | **Yes** | User full name |
| `role` | `string` | No | Future role classification (Default: `'DISPATCHER'`) |
| `isActive` | `boolean` | **Yes** | Account active status |

---

## 3. Future Extensibility: Historical Operations Schema (Optional Persistence)

When historical archiving is enabled in future releases, confirmed daily distribution runs will map to the following subcollections under `/operations`:

```
/operations/{operationId}
  ├── /routes/{driverId}
  └── /unassigned/{listNumber}
```

```json
// Example: /operations/{operationId}
{
  "operationId": "OP-20260831-01",
  "date": "2026-08-31",
  "confirmedAt": "2026-08-31T14:30:00.000Z",
  "confirmedBy": "uid_dispatcher_01",
  "summary": {
    "totalLists": 142,
    "assignedLists": 139,
    "unassignedLists": 3,
    "totalStops": 88,
    "totalWeightKg": 14500,
    "totalDistanceMeters": 182400,
    "totalDurationSeconds": 19400,
    "participatingDrivers": 7
  }
}
```

---

## 4. Indexing & Query Requirements

1. **`buyers` Collection**:
   - `buyerCode` ASC (Default document ID index)
   - `buyerName` ASC (For search & autocomplete queries)
   - `isActive` ASC, `buyerName` ASC (Composite index for active buyer lookups)
2. **`drivers` Collection**:
   - `active` ASC, `driverName` ASC (Quick retrieval of active drivers during shift initialization)
3. **`users` Collection**:
   - `role` ASC, `isActive` ASC
