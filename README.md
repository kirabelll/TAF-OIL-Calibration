# TAF OIL ETHIOPIA — Petroleum Calibration & Transhipment System

Modern full-stack **Next.js (App Router)** & **SQLite** application replacing the legacy MS Access system (`frmmaindimension`, `tblTruckHeader`, `tblTruckSubCalibration`, `RPTtempdebitnote`).

---

## Features

- **ASTM 54B/D Mathematical Engine**: High-precision port of standard density & volume conversion algorithms (`DensityCalc`) calculating:
  - Density at 15°C and VCF at 15°C
  - Density at 20°C and VCF at 20°C
  - Total mass in metric tonnes
- **Interactive Transhipment Order UI**:
  - Screenshot presets: Photo 1 (`FDC-99995`) and Photo 2 (`A40983`)
  - Real-time truck selection with automatic plate, trailer, carrier, driver name, licence, capacity, and compartment count population
  - 5-Compartment Dip Calculator with live linear interpolation
  - Metered discharge calculations (Meter Line 1 & 2, Drained litres)
  - Live loss evaluation, 2-branch debit volume thresholding (Branch 1 &le; 150 L with 0.5 L buffer vs. Branch 2 &gt; 150 L full loss)
- **Official Printable Debit Note Voucher**:
  - Print-ready format (`@media print`) matching the legacy MS Access voucher
  - Detailed breakdown of origin vs discharge measurements, allowable tolerance, net shortage, and total payable amount in ETB
  - Sage 300 GL accounting journal codes (`Dr 122010-100` Transporter Receivables, `Cr 161022` Inventory Loss Recovery)
  - Signature and authorization blocks
- **Database Tables & Lookups Inspector (`/tables`)**:
  - Full management of `truck_headers`, `truck_calibrations`, `allowable_loss_products`, `transfer_orders`, and `debit_notes`
  - ASTM 54B/D 361-grid lookup tables inspector (`density_correct_20` and `factor_correct_20`)
  - Add single calibration point & Bulk import tools
  - Manual Debit Note generator

---

## Quick Start

### 1. Requirements
- Node.js 18+ (tested on Node.js 24)
- npm or pnpm

### 2. Run the Application

You can simply double-click:
- **`start_server.bat`**: Launches the web browser and starts the Next.js server at `http://localhost:3000`

Or run via terminal:

```bash
# Install dependencies (if not already installed)
npm install

# Start development server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Build

```bash
npm run build
npm run start
```

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/calculate` | Evaluates real-time density, VCF, and loss calculations |
| `POST` | `/api/calculate-dip` | Computes compartment litres from dip mm via interpolation |
| `GET` | `/api/trucks` | Returns list of trucks with calibration points |
| `GET` | `/api/trucks/[plate]` | Returns single truck details and calibrations |
| `GET` / `POST` | `/api/transfer-orders` | Fetch orders or store a new transhipment order |
| `GET` | `/api/transfer-orders/[id]` | Fetch order by ID or TO number |
| `POST` | `/api/truck-calibrations` | Add single or bulk calibration data |
| `DELETE`| `/api/truck-calibrations/[id]` | Remove a calibration point |
| `POST` | `/api/debit-notes/manual` | Creates a manual debit note |
| `GET` | `/api/products` | Returns petroleum product tariffs & allowable loss rates |

---

## Project Structure

```
├── data/
│   └── taf_oil.sqlite           # Local zero-configuration SQLite database
├── src/
│   ├── app/
│   │   ├── api/                 # Next.js Route Handlers
│   │   ├── debit-note/          # Printable Debit Note Voucher routes
│   │   ├── tables/              # Database Tables Inspector
│   │   ├── globals.css          # Tailwind CSS styling
│   │   ├── layout.tsx           # Root layout
│   │   └── page.tsx             # Transhipment Order UI
│   └── lib/
│       ├── db.ts                # Better-SQLite3 database connection & auto-seeding
│       ├── density-calc.ts      # ASTM 54B/D calculation algorithm
│       ├── transfer-order-calc.ts# Business loss & debit note rules
│       └── truck-dip-calc.ts    # Dip linear interpolation engine
└── laravel_backup/              # Preserved legacy Laravel files
```
