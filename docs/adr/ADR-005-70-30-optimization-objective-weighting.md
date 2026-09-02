# ADR-005: Dual-Objective Weighting: 70% Distance Minimization and 30% Load Balancing

## Context
Pure distance minimization often results in a few drivers receiving full capacity loads while other active drivers receive minimal or no work. Conversely, pure load balancing can force vehicles to crisscross long distances across town simply to balance kilograms.

## Decision
The multi-vehicle optimization objective function combines normalized global fleet road distance (70% weight) and normalized vehicle load variance (30% weight):
$$\text{Objective Cost} = 0.70 \times \tilde{f}_{\text{distance}} + 0.30 \times \tilde{f}_{\text{load\_balance}}$$
- **Global Total Distance**: The 70% objective minimizes the aggregate sum of all driver route road distances across the entire fleet ($\sum \text{RouteDistance}$), not individual or greedy local steps.
- **Duration Role**: Total route duration is calculated and reported as an operational metric for dispatcher planning, but is not part of the 70/30 optimization cost function.
- Geographic clustering is used purely as a soft initial seed/heuristic, never as a hard constraint restricting cross-region moves.
Both objectives are configurable via system settings.

## Consequences
### Positive:
- Balances logistics cost efficiency (minimizing fuel and vehicle wear) with workplace fairness and balanced driver shift workloads.
- Normalization ensures neither metric unfairly dominates the mathematical optimization score due to raw numerical unit differences (meters vs. percentage variance).
