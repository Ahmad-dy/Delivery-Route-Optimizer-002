# Technical Architecture Blueprint: Delivery List Distribution & Route Optimization Web App

## 1. Executive Summary & Objective

The **Delivery List Distribution & Route Optimization Web App** is a specialized, production-grade operational tool designed for distribution dispatchers and logistics coordinators. The system streamlines daily logistics by marrying permanent master data (Buyers, Drivers, Global Depot) with volatile operational data (Daily Excel Delivery Lists), performing intelligent capacitated vehicle routing (CVRP) with dual-objective scoring (70% distance minimization, 30% load balancing), providing interactive map visualization, supporting real-time manual adjustments with instant constraint re-validation, and exporting dispatch manifests in Excel and PDF formats.

---

## 2. Technology Stack & Runtime Profile

| Layer | Technology | Rationale & Architectural Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TypeScript (Vite) | High-performance reactive rendering with strict type safety |
| **Styling & UI Kit** | Tailwind CSS + shadcn/ui + Lucide Icons | Clean, high-contrast, accessible dispatcher design system |
| **Animation & Feedback** | Motion (`motion/react`) | Fluid UI transitions, drawer interactions, and modal animations |
| **State Management** | Modular Zustand Stores / React Context | Clean separation of persistent master data from ephemeral operational state |
| **Cloud Database & Auth**| Firebase Authentication & Cloud Firestore | Real-time master data synchronization, role-ready security rules |
| **Mapping Engine** | Google Maps JavaScript API (Web SDK) | Dynamic multi-driver route visualization, interactive depot/stop geocoding |
| **Road Routing Engine** | Google Routes API (REST / Compute Routes) | Real-world driving distances, durations, and high-precision polyline geometries |
| **Excel Parser & Generator** | `xlsx` / `exceljs` (isolated parser module) | Client-side spreadsheet parsing, validation, and multi-sheet export |
| **PDF Generation** | `@react-pdf/renderer` or `pdfmake` / `jspdf` | High-fidelity printable route sheets, driver delivery slips, manifests |

---

## 3. High-Level System Architecture

The application adopts a **Clean, Modular, Layered Architecture** with strict dependency inversion:

```
┌───────────────────────────────────────────────────────────────────────────┐
│                           PRESENTATION LAYER (UI)                         │
│   - Dispatcher Dashboard       - Excel Import Wizard    - Master Data UI  │
│   - Interactive Route Map      - Route Review & Editor  - Export Dialogs  │
└─────────────────────────────────────┬─────────────────────────────────────┘
                                      │ (Dispatches Use Cases / Hooks)
┌─────────────────────────────────────▼─────────────────────────────────────┐
│                           APPLICATION LAYER (Use Cases)                   │
│   - ProcessExcelImportUseCase  - OptimizeRoutesUseCase  - MoveStopUseCase │
│   - ReorderRouteStopsUseCase   - ConfirmDispatchUseCase - ExportReportUseCase
└───────────────────┬─────────────────────────────────┬─────────────────────┘
                    │                                 │
┌───────────────────▼─────────────────┐   ┌───────────▼─────────────────────┐
│           DOMAIN LAYER              │   │      INFRASTRUCTURE & ADAPTERS  │
│  - Core Entities (Buyer, Driver,    │   │  - Firebase Firestore Service   │
│    List, Stop, Route, Depot)        │   │  - Google Routes API Adapter    │
│  - Value Objects & Invariants       │   │  - Excel Parser & Generator     │
│  - Business Rules & Error Model     │   │  - PDF Report Generator         │
│  - Optimization Engine Interfaces   │   │  - Local Cache & State Store    │
└─────────────────────────────────────┘   └─────────────────────────────────┘
```

### Architectural Principles:
1. **Strict Business Logic Isolation**: Zero domain or optimization logic inside React components.
2. **Pluggable Routing Service**: The optimization engine interacts solely with an abstract `IRoutingService` interface. The underlying routing provider (Google Routes API, local matrix cache, or mock provider) can be swapped without affecting the optimization engine or UI.
3. **Master vs. Operational Separation**: Permanent master data (Buyers, Drivers, Depot) lives in Cloud Firestore. Volatile operational data (Excel lists, generated stops, optimization proposals) resides in memory/session state until explicitly confirmed.
4. **Resilience & Graceful Degradation**: Missing GPS or unmatched buyers never abort an entire import operation; valid records proceed while invalid rows enter actionable triage workflows.

---

## 4. Complete Project Directory Structure

```
delivery-route-optimizer/
├── docs/
│   ├── adr/                                # Architecture Decision Records (ADRs)
│   │   ├── ADR-001-firebase-master-data.md
│   │   ├── ADR-002-buyer-and-list-separation.md
│   │   ├── ADR-003-single-physical-stop-per-buyer.md
│   │   ├── ADR-004-google-road-routing-over-euclidean.md
│   │   ├── ADR-005-70-30-optimization-objective-weighting.md
│   │   ├── ADR-006-ten-percent-capacity-hard-operational-limit.md
│   │   ├── ADR-007-optional-active-driver-usage.md
│   │   └── ADR-008-strict-no-list-splitting.md
│   ├── ARCHITECTURE.md                     # High-level architecture blueprint
│   ├── DATA_MODEL.md                       # Core domain entities & relationships
│   ├── FIRESTORE_SCHEMA.md                 # Database schema, indexes & rules
│   ├── OPTIMIZATION_SPEC.md                # 70/30 CVRP algorithm specification
│   ├── ROUTING_SPEC.md                     # Google Routes API & matrix specification
│   ├── EXCEL_IMPORT_SPEC.md                # Excel parsing & validation pipeline
│   ├── SECURITY_SPEC.md                    # Security, auth & API protection
│   └── TESTING_STRATEGY.md                 # 18 test scenarios & test harness
├── public/
│   └── assets/                             # Static assets, logos, map markers
├── src/
│   ├── app/                                # Application Use Cases & Orchestrators
│   │   ├── use-cases/
│   │   │   ├── ProcessExcelImportUseCase.ts
│   │   │   ├── OptimizeRoutesUseCase.ts
│   │   │   ├── MoveStopUseCase.ts
│   │   │   ├── ReorderRouteUseCase.ts
│   │   │   └── ExportDispatchUseCase.ts
│   │   └── state/                          # State management stores
│   │       ├── useMasterDataStore.ts       # Buyers, Drivers, Depot, Settings
│   │       ├── useOperationalStore.ts      # Active Excel, Stops, Optimization Result
│   │       └── useUiStore.ts               # Selected driver, active map filters, modals
│   ├── domain/                             # Pure Domain Models & Business Invariants
│   │   ├── entities/
│   │   │   ├── Buyer.ts
│   │   │   ├── Driver.ts
│   │   │   ├── DeliveryList.ts
│   │   │   ├── DeliveryStop.ts
│   │   │   ├── Depot.ts
│   │   │   ├── Route.ts
│   │   │   └── DistributionResult.ts
│   │   ├── errors/
│   │   │   ├── DomainError.ts
│   │   │   ├── ErrorCodes.ts
│   │   │   └── ErrorMessages.ts            # Bilingual mapping (Arabic UI / English Log)
│   │   ├── rules/
│   │   │   ├── CapacityRules.ts
│   │   │   ├── StopAggregationRules.ts
│   │   │   └── ValidationRules.ts
│   │   └── value-objects/
│   │       ├── Coordinates.ts
│   │       ├── Weight.ts
│   │       └── OptimizationScore.ts
│   ├── services/                           # Infrastructure Implementations & Adapters
│   │   ├── firebase/                       # Firestore & Auth Adapters
│   │   │   ├── config.ts
│   │   │   ├── buyerRepository.ts
│   │   │   ├── driverRepository.ts
│   │   │   └── settingsRepository.ts
│   │   ├── routing/                        # Google Routes API & Matrix Engine
│   │   │   ├── IRoutingService.ts          # Core Abstraction Interface
│   │   │   ├── GoogleRoutesService.ts      # Live Google API Implementation
│   │   │   ├── RouteMatrixCache.ts         # In-memory & IndexedDB Matrix Cache
│   │   │   └── PolylineDecoder.ts          # Geometry decoding utilities
│   │   ├── optimization/                   # Algorithmic Optimization Engine
│   │   │   ├── IOptimizationEngine.ts
│   │   │   ├── ScoringEngine.ts            # 70% Distance + 30% Load Balance
│   │   │   ├── ClusterEngine.ts            # Geographic Stop Clustering
│   │   │   ├── RouteOrderEngine.ts         # 2-opt / Insertion Route Sequencing
│   │   │   └── OptimizationEngineImpl.ts   # Core CVRP Orchestrator
│   │   ├── excel/                          # Excel Parsing & Generation
│   │   │   ├── ExcelParser.ts
│   │   │   ├── ExcelValidator.ts
│   │   │   ├── ExcelNormalizer.ts
│   │   │   └── ExcelExporter.ts
│   │   └── export/                         # PDF & Dispatch Manifest Generator
│   │       ├── PdfManifestGenerator.ts
│   │       └── DriverSlipGenerator.ts
│   ├── presentation/                       # React Presentation Components
│   │   ├── components/
│   │   │   ├── common/                     # Reusable UI widgets, alerts, badges
│   │   │   ├── layout/                     # Header, navigation, status bar
│   │   │   ├── master-data/                # Buyer & Driver management tables/forms
│   │   │   ├── import/                     # Excel dropzone, validation review, GPS fix
│   │   │   ├── map/                        # Google Map wrapper, markers, polyline layer
│   │   │   ├── routes/                     # Driver route cards, stop lists, move dialog
│   │   │   ├── metrics/                    # Global & Driver-level KPI dashboards
│   │   │   └── export/                     # Export buttons, preview modals
│   │   ├── hooks/                          # Custom React Hooks
│   │   │   ├── useGoogleMap.ts
│   │   │   ├── useDriverRoutes.ts
│   │   │   └── useValidationFeedback.ts
│   │   └── pages/                          # Primary Application Views
│   │       ├── DashboardPage.tsx
│   │       ├── MasterDataPage.tsx
│   │       ├── ImportPage.tsx
│   │       └── RouteOptimizationPage.tsx
│   ├── lib/                                # Utilities & Helpers
│   │   ├── utils.ts                        # Tailwind cn() utility
│   │   ├── formatters.ts                   # Distance (km/m), duration (h/m), weight (kg)
│   │   └── colorPalette.ts                 # Dynamic driver color generator
│   ├── types/                              # Global TypeScript Type Definitions
│   │   ├── index.ts
│   │   ├── excel.types.ts
│   │   ├── routing.types.ts
│   │   └── optimization.types.ts
│   ├── App.tsx                             # Application Shell & Router
│   ├── index.css                           # Global Styles & Tailwind Directives
│   └── main.tsx                            # React Entry Point
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 5. End-to-End Operational Lifecycle

The daily dispatcher workflow follows a strictly controlled 8-step pipeline:

```
[ Step 1: Master Data Preparation ]
  - Verify Buyers in Firestore (Buyer Code, Name, Valid Lat/Lng)
  - Configure Active Drivers & Nominal Capacities (kg)
  - Configure Global Depot GPS Location
               │
               ▼
[ Step 2: Excel File Ingestion ]
  - Dispatcher uploads operational delivery spreadsheet (.xlsx / .xls)
  - File parsed into raw tabular records (List Number, Buyer Code, Buyer Name, Weight)
               │
               ▼
[ Step 3: Normalization & Multi-Tier Validation ]
  - Structure & Data Type checks
  - Uniqueness of List Numbers
  - Match Buyer Code against Firestore Master
  - Validate GPS Coordinates (flag missing/invalid GPS)
  - Non-blocking error tagging: UNMATCHED BUYER, LOCATION REQUIRED, OVERSIZED
               │
               ▼
[ Step 4: Stop Aggregation ]
  - Group valid lists by unique Buyer Code
  - Aggregate: Total Stop Weight = Σ(List Weights)
  - Retain distinct list numbers within Stop entity
               │
               ▼
[ Step 5: Road Distance Matrix Computation ]
  - Query Google Routes API for real road distances & durations
  - Depot ↔ Stops and Stop_i ↔ Stop_j NxN Matrix
  - Store in memory cache to avoid redundant API billing
               │
               ▼
[ Step 6: Multi-Vehicle Capacitated Optimization (CVRP) ]
  - Hard constraint enforcement: Active drivers only, ≤110% capacity, no list split
  - Multi-objective minimization: 70% road distance + 30% load balancing
  - Generate proposed Route per participating driver
               │
               ▼
[ Step 7: Interactive Dispatcher Review & Manual Fine-Tuning ]
  - Interactive Google Map rendering with colored polylines and numbered stops
  - Driver route cards with capacity progress bars (Nominal vs 110% buffer)
  - Drag-and-drop / manual stop re-assignment (re-evaluates destination capacity)
  - Manual stop re-sequencing (triggers targeted route distance/time recalculation)
               │
               ▼
[ Step 8: Confirmation & Export ]
  - Dispatcher approves final delivery plan
  - Export full summary and driver-specific delivery sheets (Excel & PDF)
```

---

## 6. Error & Notification Model

All system errors are classified into strict categories. System logs and technical telemetry retain complete English debug details, while the UI delivers bilingual, user-friendly messages with primary Arabic localization for dispatchers:

| Error Category | Technical Identifier | Arabic UI Message | Actionable UI Flow |
| :--- | :--- | :--- | :--- |
| **Validation** | `DUPLICATE_LIST_NUMBER` | رقم القائمة مكرر في ملف الإكسل | Highlight offending rows in Excel preview |
| **Validation** | `INVALID_WEIGHT` | وزن الشحنة غير صالح (يجب أن يكون أكبر من 0) | Highlight invalid cell in red |
| **Buyer Matching** | `UNMATCHED_BUYER` | رمز المشتري غير مسجل في قاعدة البيانات | Allow continuing; list marked Unassigned |
| **Geocoding** | `LOCATION_REQUIRED` | إحداثيات الموقع الجغرافي للمشتري مفقودة | Open Google Map picker to set location |
| **Capacity** | `OVERSIZED_LIST` | وزن القائمة يتجاوز السعة القصوى لجميع السائقين | Show red alert badge; exclude from optimization |
| **Capacity** | `CAPACITY_EXCEEDED` | تم تجاوز سعة السائق المسموحة (بما في ذلك 10%) | Block manual move; explain capacity overflow |
| **Routing** | `ROUTING_API_ERROR` | تعذر حساب مسار الطريق من خرائط جوجل | Retry request or fallback to cached matrix |
| **Authentication**| `AUTH_REQUIRED` | يجب تسجيل الدخول للوصول إلى النظام | Redirect to secure login screen |
| **Permission** | `PERMISSION_DENIED` | ليس لديك صلاحية لتعديل بيانات الماستر | Disable action buttons; show permission notice |

---

## 7. Next Stage Transition

This architectural blueprint sets the concrete technical foundations for all subsequent project stages:
- **Stage 2**: Domain & Data Model Implementation + Core Interfaces.
- **Stage 3**: Excel Import Engine & Validation Pipeline.
- **Stage 4**: Routing Service & Google Maps Matrix Integration.
- **Stage 5**: 70/30 Capacitated Optimization Algorithm Engine.
- **Stage 6**: Interactive Dispatcher UI & Map Visualizer.
- **Stage 7**: Manual Override & Dynamic Recalculation Engine.
- **Stage 8**: Excel & PDF Export Generation Engine.
