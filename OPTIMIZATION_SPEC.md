# Optimization Engine Specification: Capacitated Vehicle Routing & Load Balancing (CVRP)

## 1. Problem Formulation & Classification

The optimization challenge is modeled as a **Multi-Vehicle Capacitated Vehicle Routing Problem with Driver Capacity Tolerance and Dual-Objective Balancing (CVRP-DT)**.

### Mathematical Entities & Standardized Formulas:
- **Depot**: $S_0$ with coordinates $(\text{lat}_0, \text{lng}_0)$.
- **Delivery Stops**: Set of physical stops $V = \{S_1, S_2, \dots, S_N\}$, where each stop $S_i$ represents a unique Buyer with aggregated demand weight:
  $$\text{Stop Weight: } w(S_i) = \sum_{l \in \text{Lists}(S_i)} \text{weightKg}(l)$$
- **Active Fleet of Drivers**: $K = \{d_1, d_2, \dots, d_M\}$ where each active driver $d_j$ has:
  - Nominal Capacity: $C_{nom, j} = \text{maximumLoadKg}_j$
  - Maximum Allowed Capacity (110%): $C_{max, j} = 1.10 \times C_{nom, j}$
  - **Fleet Total Capacity**: Evaluated as the driver-specific summation $\sum_{d_j \in K} C_{max, j}$.
- **Driver Assigned Weight & Utilization**:
  - **Driver Weight**:
    $$W_j = \sum_{S_i \in \text{Route}(d_j)} w(S_i) = \sum_{S_i \in \text{Route}(d_j)} \sum_{l \in \text{Lists}(S_i)} \text{weightKg}(l)$$
  - **Driver Utilization Percentage**:
    $$\text{Utilization}_j (\%) = \left( \frac{W_j}{C_{nom, j}} \right) \times 100\%$$
- **Routing Cost Matrices (Provider-Independent `IRoutingService`)**:
  - Road Distance Matrix: $D(u, v) \ge 0$ (in meters)
  - Road Duration Matrix: $T(u, v) \ge 0$ (in seconds)

---

## 2. Hard Inviolable Constraints

Every valid optimization output and manual dispatch plan must satisfy the following **inviolable constraints**:

1. **Hard Stop Atomicity & Single-Driver Assignment**:
   - A physical Stop $S_i$ (aggregating all delivery lists for that buyer) is **strictly atomic**.
   - All lists grouped under $S_i$ MUST be assigned together to exactly one driver or remain entirely unassigned.
   - **Never split a Stop between drivers**:
     $$\forall S_i \in V, \quad \sum_{j=1}^M x_{i, j} \le 1 \quad (x_{i, j} \in \{0, 1\})$$
2. **Strict Driver Capacity Ceiling (110% per driver)**:
   - Total weight assigned to driver $d_j$ must never exceed that specific driver's maximum allowed capacity:
     $$W_j \le C_{max, j} = 1.10 \times C_{nom, j}$$
   - *Under no circumstances may $W_j > C_{max, j}$.*
3. **Active Drivers Only**: Stops may only be assigned to drivers whose operational status is `active`:
   $$\forall d_j \in \text{AssignedFleet}, \quad \text{active}(d_j) = \text{true}$$
4. **Strict Delivery List Integrity**: Individual delivery lists within an aggregated stop cannot be partitioned or partially delivered.
5. **Depot Origin & Return**: Every driver route strictly begins and concludes at the global Depot $S_0$.
6. **Multi-Region Capability**: Drivers can serve stops across multiple geographical clusters if capacity and routing efficiency dictate.
7. **Single Physical Stop per Buyer Invariant**: Within one distribution operation, each Buyer must produce exactly one physical Stop (aggregating all delivery lists for that buyer), and that Stop can be assigned to only one driver.

---

## 3. Provider-Independent Routing Interface (`IRoutingService`)

The optimization engine is decoupled from underlying mapping infrastructure and relies strictly on the generic routing port `IRoutingService`:

```typescript
export interface IRoutingService {
  calculateMatrix(
    origins: GeoPoint[],
    destinations: GeoPoint[]
  ): Promise<RouteMatrixResult>;
  
  calculateRoutePolyline(
    waypoints: GeoPoint[]
  ): Promise<RoutePolylineResult>;
}
```

### 3.1. Strict Handling of Routing Failures
- The optimizer calls `IRoutingService.calculateMatrix()`.
- If the routing provider encounters an error and no valid, complete cached road data is available:
  - The optimization engine **MUST NOT** substitute straight-line (Euclidean/Haversine) distances or "Haversine × factor" approximations to produce a final optimization result.
  - The engine aborts calculation and returns `status: "ROUTING_UNAVAILABLE"`.
  - The UI presents a clear Arabic alert with a retry action.

---

## 4. Dual-Objective Function (70% Distance / 30% Load Balance)

The objective function balances global road distance minimization across the entire fleet (70%) with equitable driver workload distribution (30%).

### 4.1. Objective 1: Global Fleet Road Distance Minimization ($f_{dist}$)
The optimization engine minimizes the **total aggregate road driving distance across all active driver routes**, rather than making greedy or isolated local choices:
$$f_{dist} = \sum_{d_j \in K_{used}} \text{RouteDistance}(d_j) = \sum_{d_j \in K_{used}} \left( D(S_0, S_{j, 1}) + \sum_{k=1}^{n_j - 1} D(S_{j, k}, S_{j, k+1}) + D(S_{j, n_j}, S_0) \right)$$
- **Global Evaluation**: Stop assignment and route formation evaluate the holistic impact on total fleet distance $\sum D$.
- **Duration as Information Metric**: Route duration ($T$) is calculated via `IRoutingService` for driver shift planning and manifest reporting, but is strictly an informational telemetry metric and is not part of the 70/30 optimization cost function.

### 4.2. Objective 2: Fleet Load Balance / Disparity ($f_{load}$)
Load balancing evaluates the equity of vehicle workload utilization based on nominal capacity ($C_{nom, j}$):
$$U_j = \frac{W_j}{C_{nom, j}}$$
Where $U_j$ is the utilization ratio of driver $d_j$. The load disparity metric is the peak utilization difference across utilized drivers:
$$f_{load} = \text{loadDisparity} = \max_{j \in K_{used}}(U_j) - \min_{j \in K_{used}}(U_j)$$
*(If $|K_{used}| \le 1$, $f_{load} = 0$)*.

*Note*: Load balancing is measured against **Nominal Capacity (100%)**, ensuring the optimizer targets balanced standard utilization.

### 4.3. Score Normalization & Combined Fitness Function
Because distance (meters) and load disparity operate on different scales, they are normalized into bounded, unitless $[0, 1]$ indices:

- **Normalized Road Distance**:
  $$\tilde{f}_{dist} = \frac{\text{totalDistanceMeters}}{\text{referenceDistanceMeters}}$$
  Where $\text{referenceDistanceMeters}$ is the deterministic baseline calculated from the initial heuristic solution.

- **Normalized Load Balance**:
  Since the operational capacity ceiling is 110% ($1.10$), the maximum theoretical disparity between an active vehicle at full buffer ($1.10$) and an empty vehicle ($0.0$) is $1.10$. Dividing by $1.10$ and clamping maps the disparity strictly to the $[0, 1]$ interval:
  $$\tilde{f}_{load} = \min\left(\max\left(\frac{f_{load}}{1.10}, 0\right), 1.0\right)$$

The combined multi-objective cost function to minimize is:
$$\text{Cost} = w_{dist} \cdot \tilde{f}_{dist} + w_{load} \cdot \tilde{f}_{load}$$
$$\text{Default Weights: } w_{dist} = 0.70, \quad w_{load} = 0.30 \quad (w_{dist} + w_{load} = 1.00)$$

---

## 5. Optimization Quality & Telemetry Metrics

For every optimization execution, the engine measures and records formal quality and performance telemetry:

| Metric Name | Field Name | Description |
| :--- | :--- | :--- |
| **Initial Solution Distance** | `initialDistanceMeters` | Total road distance of initial heuristic solution before 2-Opt/metaheuristic refinement. |
| **Final Solution Distance** | `finalDistanceMeters` | Final optimized road distance across all assigned routes. |
| **Initial Load Imbalance** | `initialLoadVariance` | Peak load disparity ($\max(U) - \min(U)$) among drivers before inter-route swaps. |
| **Final Load Imbalance** | `finalLoadVariance` | Peak load disparity ($\max(U) - \min(U)$) among drivers after 70/30 multi-objective optimization. |
| **Combined Score** | `finalOptimizationScore` | Normalized weighted fitness score ($0.00 - 1.00$). |
| **Total Estimated Duration** | `totalDurationSeconds` | Aggregate road travel time across all routes (informational metric). |
| **Optimization Iterations** | `iterationCount` | Total iterations executed during clustering and 2-Opt/local search phases. |
| **Execution Duration** | `executionDurationMs` | Total runtime of the solver in milliseconds. |
| **Utilized Drivers** | `activeDriversUsed` | Number of active drivers assigned at least one stop ($|K_{used}|$). |
| **Unassigned Stops** | `unassignedStopsCount` | Total physical stops left unallocated due to capacity bottlenecks. |
| **Unassigned Lists** | `unassignedListsCount` | Total delivery lists left unallocated. |

---

## 6. Algorithmic Architecture & Multi-Stage Metaheuristic Pipeline

```
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 1: FEASIBILITY & TRIAGE                        │
│ - Identify Oversized Stops (Stop Weight > max(C_max) of active fleet)  │
│ - Filter Unmatched Buyers & Missing GPS Stops                          │
│ - Check Total Demand vs. Available Fleet Capacity                      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               PHASE 2: INITIAL SOLUTION GENERATION (HEURISTIC)         │
│ - Geographic clustering / sweep used ONLY as a soft initial seed       │
│ - CLUSTERS ARE NEVER A HARD CONSTRAINT (Drivers can serve any zone)    │
│ - Seed initial routes respecting W_j <= 1.10 * C_nom, j                │
│ - Record Initial Quality Metrics (initialDistance, initialLoadVariance)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               PHASE 3: INTRA-ROUTE SEQUENCE OPTIMIZATION (2-OPT)       │
│ - For each driver route: Depot -> S_1 -> S_2 -> ... -> S_k -> Depot    │
│ - Optimize stop visit sequence using Road Distance Matrix (TSP 2-Opt)  │
│ - Minimize individual route road distance                              │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│           PHASE 4: GLOBAL MULTI-OBJECTIVE INTER-ROUTE SEARCH           │
│ - Iterative Stop Relocation: Move atomic Stop from Driver A to Driver B│
│ - Iterative Stop Swap: Swap atomic Stops between Driver A and Driver B │
│ - Cross-cluster moves fully allowed if they improve the 70/30 score    │
│ - Re-sequence affected routes with 2-Opt after each candidate move     │
│ - Evaluate global Cost = 0.70 * distance + 0.30 * load_variance        │
│ - Retain best global solution while strictly respecting W_j <= 1.10*C  │
│ - Record Final Quality Metrics & Telemetry                             │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Capacity Edge Cases & Triage Rules

### 7.1. Oversized Stops and Lists (Immediate Hard Flag)
If a physical stop $S_i$ has:
$$w(S_i) > \max_{j \in K} (C_{max, j})$$
The stop and its associated lists are tagged as **`OVERSIZED`**:
- Color: **RED Alert**
- Excluded immediately from the optimization solver.
- UI Diagnostic: Displays Buyer Code, Buyer Name, Aggregated Weight, Fleet Max Allowed Capacity, and the excess weight differential ($\Delta \text{kg}$).

### 7.2. Insufficient Fleet Total Capacity
If $\sum w(S_i) > \sum_{j \in K} C_{max, j}$:
- The optimization engine **does NOT crash or fail**.
- The solver assigns as many feasible atomic stops as possible (prioritizing high-density clusters and valid combinations).
- Unallocated stops/lists are placed into the **`UNASSIGNED`** queue with reason: `"INSUFFICIENT_FLEET_CAPACITY"`.

### 7.3. Fleet Utilization Policy (Unused Active Drivers)
- The optimizer is **not required** to use every active driver.
- If an operation requires only 8 out of 12 active drivers to achieve an optimal 70/30 distribution, the remaining 4 drivers remain gracefully assigned 0 stops (Unused), preventing artificial route fragmentation.

---

## 8. Manual Dispatcher Adjustments & Recalculation Engine

### 8.1. Manual Stop Reassignment (Driver A $\to$ Driver B)
When the dispatcher drags or transfers an atomic Stop $S$ from Driver A to Driver B:
1. **Pre-Flight Validation**:
   $$\text{NewWeight}_B = W_B + w(S)$$
   - If $\text{NewWeight}_B > C_{max, B}$ ($> 110\% C_{nom, B}$):
     - **REJECT OPERATION** with error: `CAPACITY_EXCEEDED`.
     - Display feedback modal explaining destination capacity limit.
2. **Targeted Recalculation**:
   - Update $W_A = W_A - w(S)$ and $W_B = W_B + w(S)$.
   - Recompute road distance and duration for **Driver A's route** and **Driver B's route** only via `IRoutingService`.
   - All other driver routes ($C, D, E\dots$) remain untouched, saving computation.
   - Mark affected routes with `isManuallyModified = true`.

### 8.2. Manual Route Reordering (Stop Sequence Modification)
When the dispatcher reorders the sequence of stops within Driver A's route:
1. Recalculate road distance via `IRoutingService`:
   $$D_{\text{new}} = D(S_0, S_{\pi(1)}) + \sum_{k=1}^{n-1} D(S_{\pi(k)}, S_{\pi(k+1)}) + D(S_{\pi(n)}, S_0)$$
2. Recalculate duration $T_{\text{new}}$.
3. Compute metrics delta: $\Delta D = D_{\text{new}} - D_{\text{orig}}$, $\Delta T = T_{\text{new}} - T_{\text{orig}}$.
4. Display a visual indicator informing the dispatcher of distance/duration changes resulting from manual re-sequencing.
