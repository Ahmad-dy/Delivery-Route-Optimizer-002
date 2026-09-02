# ADR-004: Mandatory Use of Google Road Routing API Over Euclidean/Haversine Distance

## Context
Geometric straight-line calculations (such as Haversine formulas) assume an unobstructed plane. In urban and regional logistics, road networks, one-way streets, river bridges, divided highways, and traffic restrictions create major divergences between straight-line distance and actual road distance.

## Decision
The route optimization engine must rely exclusively on **real road-driving distances and travel durations** provided by the **Google Routes API**. Haversine calculations are strictly forbidden as the primary optimization metric.

## Consequences
### Positive:
- Generated routes are realistic, drivable, and respect actual road infrastructure.
- Accurate time duration estimates allow dispatchers to plan realistic driver shift schedules.
- Polyline geometries can be directly rendered onto the interactive Google Map without visual mismatch.

### Mitigations for API Latency / Quotas & Failure Policy:
- Multi-tier memory and IndexedDB `RouteMatrixCache` caches computed coordinate pairs with versioning and parameter completeness validation.
- If Google Routes API fails, the system retries with exponential backoff and utilizes valid cached road data if available.
- If no valid road data is available, the system halts final optimization with `ROUTING_UNAVAILABLE` and displays an actionable Arabic warning with retry. Degraded straight-line/Haversine approximations are strictly forbidden from producing a final optimization result.
