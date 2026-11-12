# Printing Shop Web Application (Clayjar Print Studio)

A full-stack commercial printing shop platform built with **Next.js 16 (App Router)**, **HeroUI v3** (`@heroui/react` & `@heroui/styles`), **Tailwind CSS v4**, **Dark/Light Mode** (`next-themes`), and **Supabase** (`@supabase/ssr`, PostgreSQL, Row Level Security & Realtime).

## Key Features

- **Products & Price-Per-Size Catalog (`/products`)**: Click any printing product to inspect exact per-size pricing, `100+` and `500+` bulk discounts, paper/substrate multipliers, lamination options, and an instant price calculator.
- **Inquiries & Custom Quotations (`/quotations`)**: Submit catalog or bespoke print inquiries and receive a unique `QT-YYYY-XXXX` Reference Number.
- **Order & Quotation Reference Tracker (`/track`)**: Real-time lookup for `ORD-...`, `QT-...`, and `TKT-...` references with a 6-stage visual production pipeline and 1-click Quote-to-Order conversion.
- **Customer Accounts (`/account`)**: Sign up and sign in via Supabase Auth to track orders, quotations, and support tickets.
- **Live Customer Chat & Ticketing Queue (`/chat` + Floating Widget)**: Customers join a priority-aware live support queue (`TKT-XXXX`) with real-time queue position updates.
- **Employee Dashboard (`/dashboard`)**: Protected staff workspace for responding to inquiries with formal quotations, taking walk-in/phone counter orders (POS), updating production stages, and claiming queued customer chats.
- **Super Admin Dashboard (`/admin`)**: Protected admin command center for managing Products & Price-Per-Size matrices, Employee roles/accounts, and global Application Settings (shop branding, currency, VAT/tax, quotation validity, payment instructions, and chat queue rules).

## Getting Started

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   Copy `.env.example` to `.env.local` and add your Supabase project URL and publishable key:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

3. **Initialize Supabase Database:**
   Run the SQL scripts inside your Supabase SQL Editor in order:
   1. `supabase/schema.sql` — Tables, Auth trigger, hardened RLS policies, indexes, and Realtime publications.
   2. `supabase/seed.sql` — Initial print shop catalog and price-per-size tiers.

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).
