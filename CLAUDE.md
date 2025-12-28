# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pastel24h Manager is a point-of-sale (PDV) and shift management system for a 24-hour pastelaria (Brazilian pastry shop). It handles employee shifts, cash register operations, product sales, and financial reconciliation with support for multiple payment methods (cash, PIX, Stone, PagBank).

## Development Commands

```bash
npm install      # Install dependencies
npm run dev      # Start Vite dev server on port 3000
npm run build    # Build for production
npm run preview  # Preview production build
```

**Environment:** Set `GEMINI_API_KEY` in `.env.local` (used for AI Studio integration).

## Architecture

### Frontend (React 19 + Vite)
- **Entry point:** `index.tsx` - Sets up routing with role-based access control
- **Auth context:** `context/AuthContext.tsx` - Firebase Auth with role fetching from Firestore
- **Two user roles:**
  - `admin` → `/admin` route → `pages/AdminDashboard.tsx`
  - `employee` → `/employee` route → `pages/EmployeeDashboard.tsx`

### Backend (Firebase Cloud Functions)
- **Location:** `functions/src/index.ts`
- **Key functions:**
  - `closeShift` - Handles shift closing with cumulative card machine value calculations
  - `createUser` - Admin-only user creation (Firebase Auth + Firestore profile)
  - `updateShift` - Admin corrections to closed shifts
  - `onShiftRecordCreated/Deleted` - Firestore triggers that aggregate cash sales to parent shift

### Firebase Services
- **Auth:** Firebase Authentication (email/password)
- **Database:** Firestore with collections: `users`, `products`, `shifts`, `configurations`
- **Rules:** `firestore.rules` - Role-based access (admin vs employee)

### Path Alias
`@/*` maps to project root (configured in `tsconfig.json` and `vite.config.ts`).

## Key Business Logic

### Shift Closing (Critical)
The card machine values (Stone, PagBank) are entered as **cumulative daily totals**. The system calculates the actual shift amount by subtracting the previous shift's cumulative value from the same day.

### Cash Divergence
`divergence = finalCashCount - (initialCash + salesCash - withdrawals)`
- Divergences > R$1.00 require a justification reason

### Data Flow
1. Employee opens shift with initial cash count
2. Sales recorded as subcollection `shifts/{shiftId}/records/{recordId}`
3. Firestore trigger aggregates cash sales to `salesCash` on parent shift
4. On close, Cloud Function calculates real card values and divergence

## Styling
Uses Tailwind CSS with a dark slate theme (slate-950 background, emerald-500 accent). No separate CSS files - styles are inline via Tailwind classes.
