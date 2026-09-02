# ADR-008: Strict Prohibition of Delivery List Splitting

## Context
In warehouse distribution, an individual Delivery List (invoice / delivery order) represents a discrete legal, physical, and packaging entity. Splitting a single list across multiple trucks leads to invoice discrepancies, lost items, multiple customer receiving interruptions, and customer disputes.

## Decision
A Delivery List is an **indivisible atomic unit**:
- A List must be assigned in its entirety to exactly one driver or remain unassigned.
- Under no circumstances will a list's weight be partitioned across multiple drivers (e.g., a 1500 kg list will never be split into 700 kg for Driver A and 800 kg for Driver B).
- If a single list exceeds the maximum allowed capacity ($C_{\text{max}}$) of every active driver in the fleet, it is immediately tagged as **`OVERSIZED`** with a prominent red alert and excluded from optimization.

## Consequences
### Positive:
- Ensures 100% fidelity with physical warehouse packaging, delivery documentation, and customer invoicing.
- Clear, unambiguous operational triage: oversized orders are highlighted immediately for executive logistics intervention.
