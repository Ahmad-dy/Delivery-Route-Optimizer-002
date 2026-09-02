# ADR-002: Separation of Buyer Master Entity and Delivery List Operational Entity

## Context
In logistics distribution, buyers are long-term commercial entities with permanent physical coordinates, whereas delivery lists represent daily, volatile order transactions generated from an ERP or warehouse Excel spreadsheet.

## Decision
We enforce a strict physical and conceptual separation:
- `Buyer` entity contains ONLY: `buyerCode`, `buyerName`, `latitude`, and `longitude`.
- `DeliveryList` entity contains: `listNumber`, `buyerCode`, `buyerName`, and `weightKg`.

## Consequences
### Positive:
- Master data purity: The Buyer database is never polluted with order weights, driver names, or daily shipment numbers.
- Resilience: If a buyer has multiple orders on the same day or zero orders on a given day, the master database remains completely stable.
- The `buyerCode` acts as a clean, immutable foreign key bridging the operational spreadsheet with verified GPS coordinates.
