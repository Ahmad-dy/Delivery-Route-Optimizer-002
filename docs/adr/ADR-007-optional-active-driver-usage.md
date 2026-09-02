# ADR-007: Optional Active Driver Utilization Policy

## Context
When an operational day has low total shipment volume, forcing all active drivers to receive at least one delivery would require artificially fragmenting routes and sending vehicles on inefficient, overlapping trips.

## Decision
The optimization engine is **NOT required** to utilize every active driver. Active status denotes eligibility to work, but if an operation can be optimally completed with a subset of the active fleet (e.g., 8 out of 12 active drivers), the remaining 4 drivers remain gracefully unallocated (0 assigned stops).

## Consequences
### Positive:
- Reduces overall vehicle dispatches, warehouse loading congestion, and fleet operating costs.
- Prevents artificial route fragmentation.
- Dispatchers retain the ability to manually move stops to unused active drivers if desired.
