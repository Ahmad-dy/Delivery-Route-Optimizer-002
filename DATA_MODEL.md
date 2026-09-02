# Domain Data Model Specification: Delivery List Distribution & Route Optimization

## 1. Architectural Distinction: Master Data vs. Operational Data

A foundational architectural requirement is the strict physical and conceptual separation between **Permanent Master Data** and **Volatile Operational Data**:

```
┌─────────────────────────────────────────────────────────┐
│              PERMANENT MASTER DATA (Firestore)          │
│  - Buyers (Buyer Code, Buyer Name, Latitude, Longitude) │
│  - Drivers (Driver ID, Name, Nominal Capacity, Status)  │
│  - Global Depot (Coordinates, Facility Name)            │
│  - System Settings (Scoring Weights, Tolerance Buffers) │
└────────────────────────────┬────────────────────────────┘
                             │ (Referenced by Key: buyerCode, driverId)
                             ▼
┌─────────────────────────────────────────────────────────┐
│              OPERATIONAL DATA (Excel & Session)         │
│  - Daily Delivery Lists (List Number, Weight, Buyer)    │
│  - Aggregated Physical Stops (Grouped by Buyer Code)    │
│  - Driver Assigned Routes (Stop Sequences, Metrics)     │
│  - Unassigned / Oversized Triage Lists                  │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Domain Entities & Schemas

### 2.1. Buyer (Permanent Master Data)
Represents a permanent customer/client account registered in the business. The Buyer entity is strictly minimal:

```typescript
export interface Buyer {
  readonly buyerCode: string;       // Unique Primary Key (e.g., "BY-1042")
  readonly buyerName: string;       // Registered Business/Client Name
  readonly latitude: number;        // Valid WGS84 Latitude (-90.0 to 90.0)
  readonly longitude: number;       // Valid WGS84 Longitude (-180.0 to 180.0)
}
```

#### Domain Invariants & Rules:
- `buyerCode` is globally unique and immutable once created.
- `latitude` and `longitude` must be strictly valid numbers representing physical coordinates.
- **Minimal Master Entity**: The Buyer master entity contains **ONLY** `buyerCode`, `buyerName`, `latitude`, and `longitude`. All operational or extra administrative metadata (such as order histories, address strings, phone numbers, or notes) are strictly excluded from the core Buyer master record.
- **Master Data Purity**: The Buyer entity MUST NOT contain any operational attributes (e.g., `listNumber`, `orderWeight`, `assignedDriver`, `routeSequence`, or `dailyNotes`).

---

### 2.2. Driver (Master Data / Fleet Configuration)
Represents a delivery driver available in the dispatcher's fleet.

```typescript
export interface Driver {
  readonly driverId: string;             // Unique Driver ID (e.g., "DRV-001")
  readonly driverName: string;           // Full Name of the driver
  readonly maximumLoadKg: number;        // Nominal vehicle load capacity (> 0)
  readonly active: boolean;              // Working status for current shift (true/false)
  readonly phone?: string;               // Optional driver phone number
  readonly vehiclePlate?: string;        // Optional vehicle registration plate
}
```

#### Derived Properties & Calculation Rules:
- **Nominal Capacity ($C_{nom}$)**: `maximumLoadKg` (e.g., 2000 kg).
- **Maximum Allowed Capacity ($C_{max}$)**:
  $$\text{maximumAllowedLoadKg} = \text{maximumLoadKg} \times 1.10$$
  *Example*: A 2000 kg vehicle has an operational ceiling of $2000 \times 1.10 = 2200 \text{ kg}$.
- **Active Invariant**: Only drivers with `active === true` are eligible to participate in route optimization and stop assignments.

---

### 2.3. Delivery List / Order (Operational Data from Excel)
Represents an individual delivery order/shipment listed in the uploaded daily Excel spreadsheet.

```typescript
export interface DeliveryList {
  readonly listNumber: string;      // Unique shipment identifier within the operation
  readonly buyerCode: string;       // Matching foreign key to Buyer master data
  readonly buyerName: string;       // Buyer name as entered in the Excel file
  readonly weightKg: number;        // Cargo weight in kilograms (> 0)
  readonly rowIndex?: number;       // Original row index in Excel spreadsheet
  readonly notes?: string;          // Optional special delivery instructions
}
```

#### Domain Invariants & Rules:
- `listNumber` must be non-empty and strictly unique within the uploaded daily dataset.
- `weightKg` must be a positive numeric value ($> 0$). Zero or negative weights are strictly invalid.
- **Strict No-Splitting Rule**: A Delivery List is an indivisible physical shipping unit. It must be assigned entirely to one driver or remain unassigned. It can never be divided between multiple drivers.
- **Name Preservation Rule**: The Excel `buyerName` is preserved for operational display and dispatch manifests, even if it slightly differs in spelling from the Firestore Buyer master record.

---

### 2.4. Delivery Stop (Aggregated Physical Delivery Location)
Represents a single physical delivery visit to a specific buyer. A Stop aggregates all individual delivery lists destined for that same buyer for the day.

```typescript
export interface DeliveryStop {
  readonly stopId: string;                 // Unique Stop ID (derived from buyerCode)
  readonly buyerCode: string;             // Target Buyer Code
  readonly buyerName: string;             // Operational Display Name
  readonly latitude: number;              // Verified Delivery Latitude
  readonly longitude: number;             // Verified Delivery Longitude
  readonly lists: readonly DeliveryList[];// All delivery lists consolidated at this stop
  readonly totalWeightKg: number;         // Sum of weights of all associated lists
  readonly listCount: number;             // Number of consolidated lists
}
```

#### Stop Aggregation Example:
| Input Delivery List | Buyer Code | Weight (kg) |
| :--- | :--- | :--- |
| List #1001 | `BUYER-500` | 300 kg |
| List #1002 | `BUYER-500` | 400 kg |
| List #1003 | `BUYER-500` | 200 kg |

$$\Downarrow \text{ Aggregation Engine } \Downarrow$$

$$\text{DeliveryStop}(\text{Buyer: BUYER-500}, \text{Total Weight} = 300 + 400 + 200 = \mathbf{900\text{ kg}}, \text{Lists} = [1001, 1002, 1003])$$

##### Derived Properties & Standardized Weight Formulas:
- **Stop Weight**:
  $$\text{Stop Weight: } w(S_i) = \sum_{l \in \text{lists}} \text{weightKg}(l)$$
- **Stop Atomicity Rule**:
  A Delivery Stop is strictly **atomic**. All consolidated delivery lists for this buyer are assigned as an indivisible unit to a single driver or remain unassigned. Under no circumstances may a Stop be divided across drivers.

---

### 2.5. Depot (Global Logistics Facility)
Represents the fixed central distribution center/warehouse where all delivery routes originate and terminate.

```typescript
export interface Depot {
  readonly depotId: string;         // Unique identifier (default: "DEPOT_GLOBAL")
  readonly name: string;             // Facility name (e.g., "Central Logistics Hub")
  readonly latitude: number;         // Depot Latitude
  readonly longitude: number;        // Depot Longitude
  readonly address?: string;         // Physical Street Address
}
```

#### Invariants:
- A single global depot location applies to all drivers and all routes in the current operation.
- Every route begins at Depot ($S_0$) and concludes at Depot ($S_{end}$).

---

### 2.6. Route (Driver Assigned Route Sequence)
Represents the complete scheduled delivery journey assigned to a specific driver.

```typescript
export interface Route {
  readonly driverId: string;                   // Assigned Driver ID
  readonly driverName: string;                 // Assigned Driver Name
  readonly orderedStops: readonly DeliveryStop[]; // Ordered sequence of atomic delivery stops
  readonly totalWeightKg: number;              // Driver Weight: Sum of all assigned stop weights
  readonly capacityKg: number;                 // Driver Nominal Capacity (100%)
  readonly maximumAllowedCapacityKg: number;   // Driver Hard Capacity Limit (110%)
  readonly utilizationPercent: number;         // (totalWeightKg / capacityKg) * 100
  readonly totalDistanceMeters: number;        // Real road driving distance (meters)
  readonly totalDurationSeconds: number;       // Estimated road driving duration (seconds)
  readonly optimizationScore?: number;         // Route-specific quality score
  readonly polyline?: string;                  // Google encoded route polyline for map rendering
  readonly isManuallyModified: boolean;        // Flag indicating dispatcher manual modification
}
```

#### Capacity Constraint & Utilization Invariant:
- **Driver Weight Formula**:
  $$\text{totalWeightKg} = \sum_{S_i \in \text{orderedStops}} w(S_i)$$
- **Driver Utilization Formula**:
  $$\text{utilizationPercent} = \left( \frac{\text{totalWeightKg}}{\text{capacityKg}} \right) \times 100\%$$
- **Hard Capacity Invariant**:
  $$\text{totalWeightKg} \le \text{maximumAllowedCapacityKg} \quad (\text{i.e. } \le 1.10 \times \text{capacityKg})$$
Any state where $\text{totalWeightKg} > \text{maximumAllowedCapacityKg}$ is **strictly invalid** and rejected by the domain kernel.

---

### 2.7. DistributionResult / OptimizationResult
Represents the complete operational state of the daily delivery plan.

```typescript
export interface OptimizationTelemetry {
  readonly initialDistanceMeters: number;
  readonly finalDistanceMeters: number;
  readonly initialLoadVariance: number;
  readonly finalLoadVariance: number;
  readonly finalOptimizationScore: number;
  readonly totalDurationSeconds: number;
  readonly iterationCount: number;
  readonly executionDurationMs: number;
  readonly activeDriversUsed: number;
  readonly unassignedStopsCount: number;
  readonly unassignedListsCount: number;
}

export interface UnassignedList {
  readonly list: DeliveryList;
  readonly reason: 'UNMATCHED_BUYER' | 'LOCATION_REQUIRED' | 'INSUFFICIENT_FLEET_CAPACITY' | 'MANUALLY_UNASSIGNED';
  readonly details: string;
}

export interface OversizedList {
  readonly list: DeliveryList;
  readonly requiredWeightKg: number;
  readonly maxFleetCapacityKg: number;
  readonly differenceKg: number;
}

export interface DistributionResult {
  readonly operationId: string;
  readonly timestamp: string;
  readonly status: 'OPTIMIZED' | 'MANUALLY_EDITED' | 'CONFIRMED' | 'ROUTING_UNAVAILABLE';
  readonly routes: readonly Route[];
  readonly unassignedLists: readonly UnassignedList[];
  readonly oversizedLists: readonly OversizedList[];
  readonly globalMetrics: {
    readonly activeDriversCount: number;
    readonly participatingDriversCount: number;
    readonly totalListsCount: number;
    readonly assignedListsCount: number;
    readonly totalStopsCount: number;
    readonly totalAssignedWeightKg: number;
    readonly totalUnassignedWeightKg: number;
    readonly totalFleetNominalCapacityKg: number;
    readonly totalFleetMaxAllowedCapacityKg: number;
  };
  readonly telemetry: OptimizationTelemetry;
  readonly warnings: readonly string[];
}
```

---

## 3. Data Flow & Transformation Pipeline

```
[ Excel File ]
  │ (Contains raw rows: List Number, Buyer Code, Buyer Name, Weight)
  ▼
[ Excel Parser & Validator ]
  │ (Ensures data types, weight > 0, unique list numbers)
  ▼
[ Normalized Delivery Lists ] ──── (Match buyerCode) ────► [ Firestore Buyer Master ]
  │                                                                 │
  │ (Verified GPS: Latitude / Longitude) ◄──────────────────────────┘
  ▼
[ Group by Buyer Code ]
  │ (Aggregate multi-lists into single physical Stop, sum weights)
  ▼
[ Physical Delivery Stops ] ──── (Retrieve Distance Matrix) ───► [ Google Routes API ]
  │                                                                     │
  │ (Road Distance & Duration Matrix) ◄─────────────────────────────────┘
  ▼
[ CVRP Optimization Engine ] ◄─── (Active Drivers & 110% Capacity Constraints)
  │
  ▼
[ Optimized Routes & Distribution Result ]
  │
  ├──► [ Interactive Google Map Visualization ]
  ├──► [ Dispatcher Manual Fine-Tuning & Re-balancing ]
  └──► [ Final Excel & PDF Manifest Export ]
```
