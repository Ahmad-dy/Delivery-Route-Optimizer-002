# ADR-006: Ten Percent (10%) Additional Capacity as a Hard Operational Ceiling

## Context
In real-world logistics, vehicles have a rated nominal capacity (e.g., 2000 kg) but frequently possess an operational safety tolerance allowing up to 10% additional weight (e.g., 2200 kg) to prevent stranding a small shipment or requiring an extra truck.

## Decision
- Each driver has a nominal capacity $C_{\text{nom}} = \text{maximumLoadKg}$.
- The system derives a hard operational ceiling:
  $$C_{\text{max}} = C_{\text{nom}} \times 1.10$$
- This 10% is a **REAL operational allowance**, not merely an informational warning.
- **Hard Constraint**: Under no circumstances may an assigned route exceed $C_{\text{max}}$.
- Load balancing calculations ($U = W / C_{\text{nom}}$) continue to evaluate against nominal 100% capacity to avoid systematically overloading vehicles during initial solver passes.

## Consequences
### Positive:
- Provides operational flexibility to absorb fluctuating daily shipment weights without violating transport safety.
- Clear mathematical distinction between ideal target load (100%) and absolute hard constraint (110%).
