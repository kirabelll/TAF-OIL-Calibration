# Project Instructions: TAF-OIL-Calibration

## Overview
This application is a full-stack Next.js 16 (App Router) project with Node.js built-in SQLite (`node:sqlite`). It replaces the legacy MS Access and Laravel systems for petroleum transhipment order calculations, ASTM 54B/D volume correction factors (VCF), compartment dip linear interpolations, and printable debit notes.

## Tech Stack
- **Framework**: Next.js 16 (App Router, Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Node.js built-in `node:sqlite` (`data/taf_oil.sqlite`)
- **Package Manager**: pnpm

## Key Commands
- Start development server: `pnpm dev`
- Build for production: `pnpm build`
- Start production server: `pnpm start`

## Architecture
- `src/lib/density-calc.ts`: Exact ASTM 54B/D calculation algorithm for density and VCF at 15°C and 20°C.
- `src/lib/transfer-order-calc.ts`: Transhipment order shortage volume, contract allowance, and 2-branch debit volume thresholding.
- `src/lib/truck-dip-calc.ts`: Truck compartment dip linear interpolation & extrapolation.
- `src/lib/db.ts`: SQLite database singleton, schema creation, auto-seeding, and typed queries.
- `src/app/page.tsx`: Transhipment Order UI.
- `src/app/debit-note/[id]/page.tsx`: Printable Debit Note Voucher.
- `src/app/tables/page.tsx`: Database Tables & Lookups Inspector.
- `src/app/api/`: REST API route handlers.
