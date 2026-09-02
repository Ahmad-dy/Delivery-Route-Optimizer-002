# ADR-001: Use of Cloud Firestore for Master Data Management

## Context
The delivery distribution platform manages two distinct categories of information: permanent business master data (Buyers, Drivers, Global Depot, System Configurations) and volatile, daily operational shipments (Excel lists, generated stops, optimization proposals).

## Decision
We utilize **Google Cloud Firestore** as the primary persistent database for master data collections (`buyers`, `drivers`, `settings`, `users`), while keeping daily operational optimization states ephemeral in client-side state until confirmed.

## Consequences
### Positive:
- Real-time synchronization across dispatcher browser sessions.
- Flexible JSON-like document modeling with strict security rule enforcement.
- Out-of-the-box integration with Firebase Authentication for Role-Based Access Control (RBAC).
- Cost-effective scale-to-zero model with zero relational database provisioning latency.

### Negative / Trade-offs:
- Complex multi-collection transactions require careful client-side orchestration.
- Mitigated by decoupling operational state from database writes until the final confirmation step.
