# Delivery List Distribution & Route Optimization Web App

A production-grade web application for logistics dispatchers to distribute daily Excel delivery lists to active drivers and optimize multi-vehicle delivery routes with real road distances via Google Routes API and Cloud Firestore.

---

## 🎯 Architecture Overview & System Design

This project is architected around a **Clean, Modular, Layered Domain-Driven Design (DDD)** ensuring strict decoupling between user presentation, optimization algorithms, mapping providers, spreadsheet ingestion, and cloud persistence.

```
┌──────────────────────────────────────────────────────────┐
│                      PRESENTATION (UI)                   │
│   React 19 + TypeScript + Vite + Tailwind CSS + Lucide   │
└────────────────────────────┬─────────────────────────────┘
                             │
┌────────────────────────────▼─────────────────────────────┐
│                 APPLICATION (Use Cases & Stores)         │
│   - Excel Import & Validation Use Case                   │
│   - Capacitated Vehicle Routing Use Case                 │
│   - Manual Stop Reassignment & Sequence Use Case         │
│   - Export (Excel / PDF) Manifest Use Case               │
└──────────────┬─────────────────────────────┬─────────────┘
               │                             │
┌──────────────▼─────────────┐ ┌─────────────▼─────────────┐
│        DOMAIN LAYER        │ │   INFRASTRUCTURE ADAPTERS │
│ - Core Entities:           │ │ - Google Routes API       │
│   Buyer, Driver, List,     │ │ - Google Maps JS SDK      │
│   Stop, Route, Depot       │ │ - Cloud Firestore & Auth  │
│ - Business Invariants      │ │ - Excel & PDF Engines     │
│ - 70/30 Dual-Obj Scoring   │ │ - Matrix Caching Engine   │
└────────────────────────────┘ └───────────────────────────┘
```

---

## 📚 Technical Architecture Specifications

All technical specifications produced during **STAGE 1** are documented in detail:

1. [**System Architecture & Blueprint (ARCHITECTURE.md)**](./ARCHITECTURE.md) — System boundaries, layered architecture, directory structure, error model.
2. [**Domain Data Model (DATA_MODEL.md)**](./DATA_MODEL.md) — Master vs. operational entities, stop aggregation, invariants.
3. [**Firestore Database Schema (FIRESTORE_SCHEMA.md)**](./FIRESTORE_SCHEMA.md) — Database collections, document fields, indexes, security rules.
4. [**Optimization Engine Specification (OPTIMIZATION_SPEC.md)**](./OPTIMIZATION_SPEC.md) — Multi-vehicle CVRP, 70/30 distance/load objective function, hard constraints.
5. [**Google Routing Specification (ROUTING_SPEC.md)**](./ROUTING_SPEC.md) — Google Routes API v2, matrix batching, caching, fallback strategy.
6. [**Excel Import & Validation Specification (EXCEL_IMPORT_SPEC.md)**](./EXCEL_IMPORT_SPEC.md) — Ingestion pipeline, multi-tier validation, GPS triage.
7. [**Security Architecture & RBAC (SECURITY_SPEC.md)**](./SECURITY_SPEC.md) — Firebase Auth, RBAC roles, Firestore security rules, API protection.
8. [**Testing Strategy & 19 Scenarios (TESTING_STRATEGY.md)**](./TESTING_STRATEGY.md) — Testing pyramid, mock adapters, 19 critical optimization and failure scenarios.
9. [**Architecture Decision Records (ADRs)**](./docs/adr/) — Complete ADR directory (ADR-001 through ADR-008).

---

## 🛠️ Technology Stack

- **Frontend Core**: React 19, TypeScript, Vite, Tailwind CSS, Motion.
- **UI Components**: shadcn/ui design conventions, Lucide React icons.
- **Backend & Cloud**: Firebase Authentication, Google Cloud Firestore.
- **Routing & Maps**: Google Maps JavaScript API, Google Routes API (Driving mode).
- **File Engines**: `xlsx` (browser-isolated parser), PDF manifest generator.

---

## 🚦 Project Stage Status

- **Stage 1 — Domain Modeling & Architecture Specifications**: ✅ **COMPLETE**
- **Stage 2 — Master Data Management & Excel Import Pipeline**: ✅ **COMPLETE**
- **Stage 3 — Driver Fleet Management & Operations Settings**: ✅ **COMPLETE**
- **Stage 4 — Google Routes & Distance Matrix Engine**: 🔄 **FINAL HARDENING**
- **Stage 5 — Optimization Engine & Driver Assignment**: ⏳ **PENDING AUTHORIZATION**
