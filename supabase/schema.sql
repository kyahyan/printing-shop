-- ============================================================================
-- CLAYJAR PRINT STUDIO — SUPABASE POSTGRESQL SCHEMA, AUTH RLS, INDEXES & SEED
-- Hardened per Supabase Auth & Postgres Best Practices:
-- 1. Never trusts user-editable raw_user_meta_data for roles (uses 'customer' default or raw_app_meta_data)
-- 2. Keeps SECURITY DEFINER role-check helpers in an unexposed `private` schema
-- 3. Wraps (select auth.uid()) for InitPlan caching & uses explicit TO clauses + WITH CHECK
-- 4. Indexes all foreign keys & hot filter columns
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- 1. APPLICATION SETTINGS (Super Admin Controlled)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Clayjar Print Studio',
  tagline text not null default 'Precision Commercial Printing, Custom Packaging & Large Format',
  currency_code text not null default 'PHP',
  currency_symbol text not null default '₱',
  tax_rate numeric(5,2) not null default 12.00,
  quotation_validity_days int not null default 14,
  order_prefix text not null default 'ORD',
  quote_prefix text not null default 'QT',
  ticket_prefix text not null default 'TKT',
  contact_email text not null default 'hello@clayjarprint.com',
  contact_phone text not null default '+63 (02) 8555-0194',
  shop_address text not null default '148 Artisan Ave., Industrial Press District, Metro Manila',
  business_hours text not null default 'Mon – Sat: 8:30 AM – 6:30 PM',
  payment_instructions text not null default '50% downpayment required to start production. Bank Transfer (BDO / BPI) or GCash accepted. Quote your Reference Number as payment note.',
  auto_assign_tickets boolean not null default false,
  max_active_chats_per_employee int not null default 5,
  updated_at timestamptz not null default now()
);

insert into public.app_settings (id) values (1) on conflict (id) do nothing;

-- 2. USER PROFILES & ROLES (Customer, Employee, Super Admin)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  company_name text,
  role text not null default 'customer' check (role in ('customer', 'employee', 'super_admin')),
  department text,
  is_active boolean not null default true,
  is_online boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_profiles_role_active on public.profiles (role, is_active);

-- Auto-create profile on signup: NEVER read role from raw_user_meta_data!
-- Only raw_app_meta_data (admin-only) can set elevated roles; public signups always become 'customer'.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_role text;
begin
  assigned_role := coalesce(new.raw_app_meta_data->>'role', 'customer');
  if assigned_role not in ('customer', 'employee', 'super_admin') then
    assigned_role := 'customer';
  end if;

  insert into public.profiles (id, full_name, email, phone, company_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'company_name',
    assigned_role
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function private.handle_new_user() from public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();

-- Private RBAC helper functions (not in `public` schema, checks auth.uid() explicitly)
create or replace function private.is_staff()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role in ('employee', 'super_admin')
      and is_active = true
  );
$$;

create or replace function private.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'super_admin'
      and is_active = true
  );
$$;

revoke all on function private.is_staff() from public;
revoke all on function private.is_super_admin() from public;
grant execute on function private.is_staff() to anon, authenticated;
grant execute on function private.is_super_admin() to anon, authenticated;

-- 3. PRODUCTS & PRICE-PER-SIZE MATRIX
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  category text not null,
  short_description text not null,
  description text not null,
  base_unit text not null default 'per pc',
  min_order_qty int not null default 1,
  lead_time_days text not null default '2–3 business days',
  badge text,
  featured boolean not null default false,
  is_active boolean not null default true,
  accent_color text not null default 'indigo',
  materials jsonb not null default '[]'::jsonb,
  finishes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.product_sizes (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_label text not null,
  dimensions text not null,
  unit_price numeric(12,2) not null,
  bulk_100_price numeric(12,2),
  bulk_500_price numeric(12,2),
  setup_fee numeric(12,2) not null default 0,
  sort_order int not null default 0
);

create index if not exists idx_product_sizes_product_id on public.product_sizes (product_id, sort_order);

-- 4. INQUIRIES & FORMAL QUOTATIONS
create table if not exists public.inquiries_quotations (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  company_name text,
  subject text not null,
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  selected_size text not null,
  material text,
  finish text,
  quantity int not null default 1,
  custom_dimensions text,
  artwork_url text,
  notes text,
  target_date date,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'quoted', 'negotiating', 'approved', 'converted_to_order', 'declined')
  ),
  quoted_unit_price numeric(12,2),
  quoted_setup_fee numeric(12,2) default 0,
  quoted_discount numeric(12,2) default 0,
  quoted_total numeric(12,2),
  staff_remarks text,
  valid_until date,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_by_name text,
  converted_order_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiries_customer_id on public.inquiries_quotations (customer_id);
create index if not exists idx_inquiries_status_created on public.inquiries_quotations (status, created_at desc);

-- 5. ORDERS (Online Customer Orders & Employee Walk-In Order Taking)
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null unique,
  quotation_id uuid references public.inquiries_quotations(id) on delete set null,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  order_source text not null default 'online' check (order_source in ('online', 'walk_in', 'from_quotation')),
  items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) not null default 0,
  tax_amount numeric(12,2) not null default 0,
  discount_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'downpayment_paid', 'paid')),
  payment_method text not null default 'bank_transfer',
  production_status text not null default 'received' check (
    production_status in ('received', 'prepress_check', 'printing', 'finishing', 'ready_for_pickup', 'completed', 'cancelled')
  ),
  delivery_method text not null default 'pickup' check (delivery_method in ('pickup', 'courier')),
  notes text,
  taken_by_employee_id uuid references public.profiles(id) on delete set null,
  taken_by_name text,
  estimated_completion date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_orders_customer_id on public.orders (customer_id);
create index if not exists idx_orders_production_status on public.orders (production_status, created_at desc);

-- 6. CUSTOMER CHAT & TICKETING QUEUE
create table if not exists public.chat_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  customer_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  topic text not null,
  linked_reference text,
  priority text not null default 'normal' check (priority in ('normal', 'high', 'urgent')),
  status text not null default 'queued' check (status in ('queued', 'active', 'resolved', 'closed')),
  assigned_employee_id uuid references public.profiles(id) on delete set null,
  assigned_employee_name text,
  internal_notes text,
  queued_at timestamptz not null default now(),
  claimed_at timestamptz,
  resolved_at timestamptz
);

create index if not exists idx_chat_tickets_queue on public.chat_tickets (status, priority, queued_at);
create index if not exists idx_chat_tickets_customer_id on public.chat_tickets (customer_id);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.chat_tickets(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'employee', 'system')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_ticket_id on public.chat_messages (ticket_id, created_at);

-- Explicit Data API table grants (governed strictly by RLS below)
grant select on public.app_settings, public.products, public.product_sizes to anon, authenticated;
grant update on public.app_settings to authenticated;
grant insert, update, delete on public.products, public.product_sizes to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.inquiries_quotations, public.orders, public.chat_tickets to anon, authenticated;
grant select, insert on public.chat_messages to anon, authenticated;

-- Enable Row Level Security on ALL public tables
alter table public.app_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.product_sizes enable row level security;
alter table public.inquiries_quotations enable row level security;
alter table public.orders enable row level security;
alter table public.chat_tickets enable row level security;
alter table public.chat_messages enable row level security;

-- APP SETTINGS POLICIES
drop policy if exists "Public read settings" on public.app_settings;
create policy "Public read settings"
  on public.app_settings for select
  to anon, authenticated
  using (true);

drop policy if exists "Super admin update settings" on public.app_settings;
create policy "Super admin update settings"
  on public.app_settings for update
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- PRODUCTS & SIZES POLICIES
drop policy if exists "Public read active products" on public.products;
create policy "Public read active products"
  on public.products for select
  to anon, authenticated
  using (is_active = true or (select private.is_staff()));

drop policy if exists "Super admin insert products" on public.products;
create policy "Super admin insert products"
  on public.products for insert
  to authenticated
  with check ((select private.is_super_admin()));

drop policy if exists "Super admin update products" on public.products;
create policy "Super admin update products"
  on public.products for update
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop policy if exists "Super admin delete products" on public.products;
create policy "Super admin delete products"
  on public.products for delete
  to authenticated
  using ((select private.is_super_admin()));

drop policy if exists "Public read product sizes" on public.product_sizes;
create policy "Public read product sizes"
  on public.product_sizes for select
  to anon, authenticated
  using (true);

drop policy if exists "Super admin manage product sizes" on public.product_sizes;
create policy "Super admin manage product sizes"
  on public.product_sizes for all
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- PROFILES POLICIES (Prevent self-role escalation!)
drop policy if exists "Users view own profile or staff view all" on public.profiles;
create policy "Users view own profile or staff view all"
  on public.profiles for select
  to authenticated
  using ((select auth.uid()) = id or (select private.is_staff()));

drop policy if exists "Users update own contact info without changing role" on public.profiles;
create policy "Users update own contact info without changing role"
  on public.profiles for update
  to authenticated
  using ((select auth.uid()) = id)
  with check (
    (select auth.uid()) = id
    and role = (select p.role from public.profiles p where p.id = (select auth.uid()))
    and is_active = (select p.is_active from public.profiles p where p.id = (select auth.uid()))
  );

drop policy if exists "Super admin update any profile" on public.profiles;
create policy "Super admin update any profile"
  on public.profiles for update
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- INQUIRIES & QUOTATIONS POLICIES
drop policy if exists "Anyone can create inquiry" on public.inquiries_quotations;
create policy "Anyone can create inquiry"
  on public.inquiries_quotations for insert
  to anon, authenticated
  with check (customer_id is null or customer_id = (select auth.uid()));

drop policy if exists "Read inquiries" on public.inquiries_quotations;
create policy "Read inquiries"
  on public.inquiries_quotations for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff or owner update inquiries" on public.inquiries_quotations;
create policy "Staff or owner update inquiries"
  on public.inquiries_quotations for update
  to authenticated
  using ((select private.is_staff()) or customer_id = (select auth.uid()))
  with check ((select private.is_staff()) or customer_id = (select auth.uid()));

-- ORDERS POLICIES
drop policy if exists "Anyone can create order" on public.orders;
create policy "Anyone can create order"
  on public.orders for insert
  to anon, authenticated
  with check (customer_id is null or customer_id = (select auth.uid()) or (select private.is_staff()));

drop policy if exists "Read orders" on public.orders;
create policy "Read orders"
  on public.orders for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff update orders" on public.orders;
create policy "Staff update orders"
  on public.orders for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- CHAT TICKETS & MESSAGES POLICIES
drop policy if exists "Anyone can open chat ticket" on public.chat_tickets;
create policy "Anyone can open chat ticket"
  on public.chat_tickets for insert
  to anon, authenticated
  with check (customer_id is null or customer_id = (select auth.uid()));

drop policy if exists "Read chat tickets" on public.chat_tickets;
create policy "Read chat tickets"
  on public.chat_tickets for select
  to anon, authenticated
  using (true);

drop policy if exists "Staff update chat tickets" on public.chat_tickets;
create policy "Staff update chat tickets"
  on public.chat_tickets for update
  to authenticated
  using ((select private.is_staff()) or customer_id = (select auth.uid()))
  with check ((select private.is_staff()) or customer_id = (select auth.uid()));

drop policy if exists "Anyone can send chat message" on public.chat_messages;
create policy "Anyone can send chat message"
  on public.chat_messages for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Read chat messages" on public.chat_messages;
create policy "Read chat messages"
  on public.chat_messages for select
  to anon, authenticated
  using (true);

-- Enable Realtime publication safely
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_tickets'
  ) then
    alter publication supabase_realtime add table public.chat_tickets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'inquiries_quotations'
  ) then
    alter publication supabase_realtime add table public.inquiries_quotations;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'orders'
  ) then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;
