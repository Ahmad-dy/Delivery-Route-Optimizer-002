# Quality Assurance & Testing Strategy Specification

## 1. Testing Pyramid & Test Architecture

The quality strategy utilizes a multi-layered automated testing framework to guarantee arithmetic correctness, constraint enforcement, and UI stability across the application:

```
                  ┌───────────────────────────────┐
                  │   End-to-End (E2E) / Playwright│
                  │   Full Dispatch Flow Scenarios │
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │    Integration & Component    │
                  │  React Testing Lib / Mock Auth│
                  └───────────────┬───────────────┘
                                  │
                  ┌───────────────▼───────────────┐
                  │    Pure Domain & Unit Tests   │
                  │ CVRP Engine, Invariants, Excel │
                  └───────────────────────────────┘
```

---

## 2. Comprehensive 19 Optimization & Edge-Case Test Scenarios

The test suite must implement automated test cases covering these **19 critical operational scenarios**:

| # | Scenario Identifier | Inputs & Test Setup | Invariant / Expected Outcome |
| :- | :--- | :--- | :--- |
| **1** | `TEST_ONE_DRIVER` | 1 Active Driver (2000 kg), 4 stops total 1400 kg. | All 4 stops assigned to single driver; route: Depot $\to S_1 \to S_2 \to S_3 \to S_4 \to$ Depot. |
| **2** | `TEST_MULTIPLE_DRIVERS` | 3 Drivers (2000 kg each), 12 stops total 4800 kg. | Stops distributed across 3 drivers; no driver exceeds 2200 kg (110%). |
| **3** | `TEST_DIFFERENT_CAPACITIES`| Driver A (1000 kg), Driver B (3000 kg). Orders of varied weights. | Optimizer allocates larger stop clusters to Driver B according to relative vehicle capacities. |
| **4** | `TEST_EXACT_100_PERCENT` | Driver A (2000 kg). Stops summing to exactly 2000 kg. | Route accepted; utilization displays 100.0%; no warning or violation triggered. |
| **5** | `TEST_BETWEEN_100_AND_110` | Driver A (2000 kg). Stops summing to 2150 kg ($107.5\%$). | Route accepted; utilization displays 107.5%; operational buffer indicator shown. |
| **6** | `TEST_ABOVE_110_PERCENT` | Driver A (2000 kg). Stops summing to 2250 kg ($112.5\%$). | Invariant check blocks allocation; stops exceeding 2200 kg cannot be assigned to this driver. |
| **7** | `TEST_OVERSIZED_LIST` | Single List of 3500 kg. Fleet max allowed capacity is 3300 kg (3000 kg $\times$ 1.10). | List flagged **`OVERSIZED`** with red alert; excluded from optimization; not split. |
| **8** | `TEST_MULTI_LISTS_ONE_BUYER`| List 1 (300 kg), List 2 (400 kg), List 3 (200 kg) all for Buyer `BY-500`. | Consolidated into 1 physical Stop of 900 kg. Route visits `BY-500` once. All 3 list numbers preserved. |
| **9** | `TEST_MULTI_LIST_STOP_EXCEEDS_DRIVER_CAPACITY` | Buyer `BY-700` has List A (1200 kg) and List B (1100 kg) totaling 2300 kg. Driver A max allowed capacity is 2200 kg ($2000 \times 1.10$). Driver B has 3300 kg ($3000 \times 1.10$). | The aggregated Stop (2300 kg) cannot fit in Driver A. The Stop MUST NOT be split. It is assigned as an atomic unit to Driver B or left unassigned if no single driver can accommodate 2300 kg. |
| **10**| `TEST_MULTI_GEO_AREAS` | Stops distributed across North, South, and East city zones. | Active drivers partitioned into geographically coherent clusters minimizing cross-town travel. |
| **11**| `TEST_INSUFFICIENT_CAPACITY`| Total fleet capacity is 5000 kg; total order demand is 7500 kg. | Feasible 5500 kg ($110\%$) assigned; remaining 2000 kg placed in `UNASSIGNED` queue with explanation. |
| **12**| `TEST_UNUSED_ACTIVE_DRIVERS`| 10 Active Drivers (20,000 kg total). Small daily order of 2500 kg. | Optimizer efficiently utilizes 2 drivers; 8 drivers remain gracefully unused (0 stops). |
| **13**| `TEST_MISSING_BUYER_CODE` | Row 5 in Excel has unknown buyer code `BY-9999`. Other 40 rows are valid. | Import succeeds for 40 rows; Row 5 flagged `UNMATCHED BUYER`; assigned to triage queue. |
| **14**| `TEST_MISSING_GPS` | Buyer `BY-102` exists in DB but latitude/longitude is null. | Marked `LOCATION_REQUIRED`; UI provides map picker; after coordinates saved, stop is included. |
| **15**| `TEST_MANUAL_STOP_MOVE` | Move Stop (300 kg) from Driver 1 to Driver 2 (Driver 2 has 500 kg headroom). | Move succeeds; Driver 1 and Driver 2 routes recalculated; other driver routes remain unchanged. |
| **16**| `TEST_INVALID_MANUAL_MOVE` | Move Stop (800 kg) to Driver 2 whose remaining capacity is only 400 kg. | Move **REJECTED** with `CAPACITY_EXCEEDED` error; state rolled back to pre-drag snapshot. |
| **17**| `TEST_MANUAL_ROUTE_REORDER` | Dispatcher drags Stop 4 ahead of Stop 2 in Driver 1's route. | Route sequence updated; road distance and duration delta recalculated and displayed. |
| **18**| `TEST_DEPOT_RETURN` | All generated route geometry polylines. | Polylines start at Depot $(S_0)$ and conclude at Depot $(S_0)$. |
| **19**| `TEST_ROUTING_API_FAILURE` | Google Routes API returns error and no valid cached road data is available. | Optimization halted; status set to `ROUTING_UNAVAILABLE`; red Arabic warning displayed; straight-line distance is NEVER used as fallback for final optimization result. |

---

## 3. Test Harness Execution & Tooling

1. **Unit Testing Framework**: Vitest + Testing Library.
2. **Mock Infrastructure**:
   - `MockRoutingService`: Deterministic distance/duration generator for lightning-fast unit tests.
   - `MockFirestoreRepository`: In-memory master database for isolated test execution.
3. **Continuous Verification**: Automated test runs executed before build validation.
