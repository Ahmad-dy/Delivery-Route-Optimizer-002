# ADR-003: Aggregation of Multiple Delivery Lists into a Single Physical Delivery Stop

## Context
A commercial buyer may place several distinct orders or invoices in a single daily cycle (e.g., List 1001 for 300 kg and List 1002 for 250 kg). In physical delivery operations, having a driver make multiple separate trips to the same store on the same day is an operational failure.

## Decision
All delivery lists matching the same `buyerCode` within a daily operational import are aggregated into **ONE physical `DeliveryStop`**:
- Total Stop Weight = $\sum \text{List Weights}$
- **Stop Atomicity Invariant**: The physical Stop is strictly atomic. All consolidated delivery lists for the buyer must be assigned as an indivisible unit to a single driver, or remain unassigned. Under no circumstances may a Stop be divided across multiple drivers.
- The driver visits the buyer's physical location exactly once.
- Individual list numbers (e.g., 1001, 1002) and their discrete weights remain preserved inside the Stop's `lists` collection for billing and driver delivery manifests.

## Consequences
### Positive:
- Drastically reduces vehicle miles traveled (VMT), fuel consumption, and unnecessary stop delays.
- Accurately models real-world physical logistics while preserving accounting auditability.
- Simplifies routing matrix computation by calculating distances between distinct physical locations rather than redundant list entries.
