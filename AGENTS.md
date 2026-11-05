# TAF OIL Calibration & Transhipment System

## Foundational Context
This application is a full-stack Next.js application running on Node.js 24 with the App Router, TypeScript, and Tailwind CSS.
It uses Node.js's built-in SQLite database engine (`node:sqlite`).

## Conventions
- Follow Next.js App Router conventions (server components by default, client components marked with `'use client'`).
- Use explicit return type declarations and type hints for all TypeScript functions.
- Keep business logic in `src/lib/` (`density-calc.ts`, `transfer-order-calc.ts`, `truck-dip-calc.ts`, `db.ts`).
- Prefer existing components and utilities before creating new ones.
