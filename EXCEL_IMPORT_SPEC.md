# Excel Import Pipeline & Validation Specification

## 1. Import Pipeline Architecture

The Excel ingestion pipeline processes client spreadsheets through a strictly controlled 9-stage sequence. Raw spreadsheet rows are never directly passed to the routing or optimization engines; instead, data flows through isolated parsing, normalization, validation, matching, and confirmation layers.

```
┌──────────────┐
│  1. UPLOAD   │  Drag-and-drop or file selector (.xlsx, .xls, .csv)
└──────┬───────┘
       ▼
┌──────────────┐
│   2. PARSE   │  Read binary buffer via Excel parser; extract raw cell grid
└──────┬───────┘
       ▼
┌──────────────┐
│ 3. NORMALIZE │  Map column headers (flexible aliases), strip whitespace, sanitize
└──────┬───────┘
       ▼
┌──────────────┐
│ 4. VALIDATE  │  Syntax, positive weight (>0), duplicate list numbers
└──────┬───────┘
       ▼
┌──────────────┐
│5. MATCH BDB  │  Match buyerCode against Cloud Firestore Buyer Master
└──────┬───────┘
       ▼
┌──────────────┐
│6. CHECK GPS  │  Verify verified latitude/longitude coordinates exist
└──────┬───────┘
       ▼
┌──────────────┐
│7. PREVIEW UI │  Display validation breakdown: Valid, Unmatched, Missing GPS, Errors
└──────┬───────┘
       ▼
┌──────────────┐
│ 8. USER CONF │  Dispatcher reviews summary, fixes GPS on map, confirms import
└──────┬───────┘
       ▼
┌──────────────┐
│ 9. OP DATA   │  Consolidate into DeliveryStops & initialize optimization state
└──────────────┘
```

---

## 2. Spreadsheet Header & Column Mapping

The system supports standard column configurations and flexible aliases (both English and Arabic):

| Canonical Field | Expected Aliases (EN / AR) | Data Type | Required | Sample Value |
| :--- | :--- | :--- | :--- | :--- |
| `listNumber` | List No, Order No, List Number, رقم القائمة, رقم الفاتورة | `string` | **Yes** | `"LST-9021"` |
| `buyerCode` | Buyer Code, Customer Code, Account No, كود المشتري, رمز العميل | `string` | **Yes** | `"BY-1042"` |
| `buyerName` | Buyer Name, Customer Name, اسم المشتري, اسم العميل | `string` | **Yes** | `"Al-Amal Store"` |
| `weightKg` | Weight, Weight (KG), Cargo Weight, الوزن, الوزن كغم | `number` | **Yes** | `450.5` |
| `notes` | Notes, Remarks, Instructions, ملاحظات | `string` | No | `"Gate 2 delivery"` |

*Note*: Unexpected or additional columns in the uploaded file are gracefully ignored and do not cause import failure.

---

## 3. Multi-Tier Validation Rules & Categories

Each parsed row is evaluated against hierarchical validation rules and assigned one of three status levels:

```
                      ┌───────────────────────────┐
                      │    ROW EVALUATION TIER    │
                      └─────────────┬─────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
   [ 🔴 ERROR ]               [ 🟡 WARNING ]             [ 🟢 VALID ]
- Empty / missing List No  - UNMATCHED BUYER          - Syntax valid
- Duplicate List Number    - LOCATION REQUIRED        - Buyer matched
- Weight <= 0 or NaN       - Minor name discrepancy   - Valid GPS
- Missing Buyer Code       (Can proceed to triage)    (Eligible for CVRP)
(Blocks offending row)
```

### 3.1. Syntax & Structural Validations (Error Category)
- **`ERR_EMPTY_LIST_NUMBER`**: List Number is missing or whitespace only.
- **`ERR_DUPLICATE_LIST_NUMBER`**: The same List Number appears more than once in the uploaded file.
- **`ERR_INVALID_WEIGHT`**: Weight is null, zero, negative, or not a parseable number.
- **`ERR_EMPTY_BUYER_CODE`**: Buyer Code field is blank.

### 3.2. Master Data Matching & Business Rules
- **`UNMATCHED_BUYER` (Warning)**:
  - Occurs when `buyerCode` is not found in the Firestore `buyers` collection.
  - **Behavior**: Does NOT abort the import. All valid rows continue normally. Offending rows are tagged and placed in the Unmatched Buyer triage table.
- **`LOCATION_REQUIRED` (Warning)**:
  - Occurs when `buyerCode` exists in Firestore, but `latitude` or `longitude` is null, zero, or invalid.
  - **Behavior**: Does NOT abort the import. The dispatcher can click the "Set Location on Map" button directly in the UI to geocode the buyer. Once saved, the buyer immediately transitions to Valid status.

---

## 4. The Buyer Name Rule

1. **Buyer Code is the Primary Matching Key**: Matching between the operational spreadsheet and the database is performed exclusively using `buyerCode`.
2. **Preservation of Excel Buyer Name**:
   - The operational display, route summary, and driver manifests preserve and display the `buyerName` extracted from the Excel spreadsheet.
   - If the Excel name differs slightly from the database record (e.g., `"Al-Amal Market"` vs. `"Al-Amal Supermarket LLC"`), the record is **NOT** rejected.
   - The system never silently overwrites or replaces the Excel name.

---

## 5. Triage & Interactive Remediation UI

The Pre-Optimization Import Review screen gives dispatchers full transparency and interactive remediation tools:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        IMPORT VALIDATION SUMMARY                       │
│  Total Rows: 150  │  🟢 Valid: 142  │  🟡 Warnings: 6  │  🔴 Errors: 2 │
├────────────────────────────────────────────────────────────────────────┤
│ 🔴 Critical Errors (2 rows - Excluded):                                │
│   • Row 14: List #1042 - Weight is 0 kg (Invalid Weight)               │
│   • Row 89: List #1088 - Duplicate List Number                         │
├────────────────────────────────────────────────────────────────────────┤
│ 🟡 Actionable Warnings:                                                │
│   • Row 33: List #1033 - Buyer [BY-9999] not found in Database         │
│     [ Action: Create Buyer | Skip List ]                               │
│   • Row 45: List #1045 - Buyer [BY-1050] missing GPS coordinates       │
│     [ Action: 📍 Pin Location on Google Map ]                          │
├────────────────────────────────────────────────────────────────────────┤
│ [ Button: Proceed to Route Optimization with 142 Valid Orders ]        │
└────────────────────────────────────────────────────────────────────────┘
```
