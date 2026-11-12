-- ============================================================================
-- CLAYJAR PRINT STUDIO — HARDENED SUPABASE POSTGRESQL SCHEMA, RLS & SECURE RPCS
-- Security Architecture:
-- 1. Zero public PII exposure: `anon` has NO direct SELECT/INSERT/UPDATE grants
--    on `profiles`, `inquiries_quotations`, `orders`, `chat_tickets`, or `chat_messages`.
-- 2. Role escalation prevention: `private.handle_new_user()` ignores user-supplied
--    `raw_user_meta_data` for roles; self-update policy locks `role` and `is_active`.
-- 3. Server-side price integrity: Online orders and quotation conversions compute
--    unit rates, bulk tiers, multipliers, surcharges, and VAT inside PostgreSQL.
-- 4. Cryptographic non-enumerable Reference Numbers (`ORD-YYYY-XXXXXXXX`,
--    `QT-YYYY-XXXXXXXX`, `TKT-XXXXXXXX`) + per-ticket `access_token` for guest chat.
-- 5. Strict input validation constraints (`https://` URLs only, bounded lengths,
--    non-negative monetary values) and `SET search_path = ''` on all DEFINER functions.
-- ============================================================================

create extension if not exists "pgcrypto";

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

-- Cryptographic Reference Number helper (uses core CSPRNG gen_random_uuid)
create or replace function private.generate_ref_code(
  p_prefix text,
  p_include_year boolean default true
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clean_prefix text;
  v_token text;
  v_year text;
begin
  v_clean_prefix := upper(regexp_replace(coalesce(nullif(trim(p_prefix), ''), 'REF'), '[^A-Za-z0-9]', '', 'g'));
  if v_clean_prefix = '' then
    v_clean_prefix := 'REF';
  end if;
  v_token := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  if p_include_year then
    v_year := extract(year from now())::int::text;
    return v_clean_prefix || '-' || v_year || '-' || v_token;
  end if;
  return v_clean_prefix || '-' || v_token;
end;
$$;

revoke all on function private.generate_ref_code(text, boolean) from public;

-- 1. APPLICATION SETTINGS (Super Admin Controlled)
create table if not exists public.app_settings (
  id int primary key default 1 check (id = 1),
  shop_name text not null default 'Clayjar Print Studio',
  tagline text not null default 'Commercial Printing, Custom Packaging & Large Format Production',
  currency_code text not null default 'PHP',
  currency_symbol text not null default '₱',
  tax_rate numeric(5,2) not null default 12.00 check (tax_rate >= 0 and tax_rate <= 100),
  quotation_validity_days int not null default 14 check (quotation_validity_days >= 1 and quotation_validity_days <= 365),
  order_prefix text not null default 'ORD',
  quote_prefix text not null default 'QT',
  ticket_prefix text not null default 'TKT',
  contact_email text not null default 'hello@clayjar.com.ph',
  contact_phone text not null default '+63 (02) 8555-0194',
  shop_address text not null default 'Metro Manila, Philippines',
  business_hours text not null default 'Mon – Sat, 8:30 AM – 6:30 PM',
  payment_instructions text not null default '50% downpayment required to initiate production. Bank transfer (BDO / BPI) or GCash accepted. Include your Reference Number in the payment note.',
  auto_assign_tickets boolean not null default false,
  max_active_chats_per_employee int not null default 5 check (max_active_chats_per_employee >= 1 and max_active_chats_per_employee <= 50),
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
create index if not exists idx_profiles_email_lower on public.profiles (lower(email));

-- Auto-create profile on signup: NEVER read role from raw_user_meta_data
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
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(new.email, '@', 1)), 200),
    lower(trim(new.email)),
    left(nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''), 50),
    left(nullif(trim(coalesce(new.raw_user_meta_data->>'company_name', '')), ''), 200),
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

-- Private RBAC helper functions
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
  min_order_qty int not null default 1 check (min_order_qty >= 1),
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
  unit_price numeric(12,2) not null check (unit_price >= 0),
  bulk_100_price numeric(12,2) check (bulk_100_price is null or bulk_100_price >= 0),
  bulk_500_price numeric(12,2) check (bulk_500_price is null or bulk_500_price >= 0),
  setup_fee numeric(12,2) not null default 0 check (setup_fee >= 0),
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
  quantity int not null default 1 check (quantity >= 1 and quantity <= 10000000),
  custom_dimensions text,
  artwork_url text,
  notes text,
  target_date date,
  status text not null default 'pending_review' check (
    status in ('pending_review', 'quoted', 'negotiating', 'approved', 'converted_to_order', 'declined')
  ),
  quoted_unit_price numeric(12,2) check (quoted_unit_price is null or quoted_unit_price >= 0),
  quoted_setup_fee numeric(12,2) default 0 check (quoted_setup_fee is null or quoted_setup_fee >= 0),
  quoted_discount numeric(12,2) default 0 check (quoted_discount is null or quoted_discount >= 0),
  quoted_total numeric(12,2) check (quoted_total is null or quoted_total >= 0),
  staff_remarks text,
  valid_until date,
  handled_by uuid references public.profiles(id) on delete set null,
  handled_by_name text,
  converted_order_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_inquiries_customer_id on public.inquiries_quotations (customer_id);
create index if not exists idx_inquiries_customer_email on public.inquiries_quotations (lower(customer_email));
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
  subtotal numeric(12,2) not null default 0 check (subtotal >= 0),
  tax_amount numeric(12,2) not null default 0 check (tax_amount >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  total_amount numeric(12,2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(12,2) not null default 0 check (amount_paid >= 0),
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
create index if not exists idx_orders_customer_email on public.orders (lower(customer_email));
create index if not exists idx_orders_production_status on public.orders (production_status, created_at desc);

-- 6. CUSTOMER CHAT & TICKETING QUEUE
create table if not exists public.chat_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number text not null unique,
  access_token text not null default replace(gen_random_uuid()::text, '-', ''),
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

alter table public.chat_tickets
  add column if not exists access_token text not null default replace(gen_random_uuid()::text, '-', '');

create index if not exists idx_chat_tickets_queue on public.chat_tickets (status, priority, queued_at);
create index if not exists idx_chat_tickets_customer_id on public.chat_tickets (customer_id);
create index if not exists idx_chat_tickets_customer_email on public.chat_tickets (lower(customer_email));

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.chat_tickets(id) on delete cascade,
  sender_role text not null check (sender_role in ('customer', 'employee', 'system')),
  sender_name text not null,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_chat_messages_ticket_id on public.chat_messages (ticket_id, created_at);

-- Idempotent defensive CHECK constraints for existing tables
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'chk_inquiry_artwork_https'
  ) then
    alter table public.inquiries_quotations
      add constraint chk_inquiry_artwork_https
      check (artwork_url is null or (char_length(artwork_url) <= 1000 and artwork_url ~* '^https://'));
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'chk_chat_message_length'
  ) then
    alter table public.chat_messages
      add constraint chk_chat_message_length
      check (char_length(trim(message)) between 1 and 4000);
  end if;
end $$;

-- ============================================================================
-- TABLE GRANTS & STRICT ROW LEVEL SECURITY (ZERO PUBLIC PII EXPOSURE)
-- ============================================================================
revoke all on public.profiles, public.inquiries_quotations, public.orders, public.chat_tickets, public.chat_messages from anon;
revoke all on public.inquiries_quotations, public.orders, public.chat_tickets, public.chat_messages from authenticated;

grant select on public.app_settings, public.products, public.product_sizes to anon, authenticated;
grant update on public.app_settings to authenticated;
grant insert, update, delete on public.products, public.product_sizes to authenticated;
grant select, update on public.profiles to authenticated;
grant select, insert, update on public.inquiries_quotations, public.orders, public.chat_tickets to authenticated;
grant select, insert on public.chat_messages to authenticated;

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
  using (
    exists (
      select 1 from public.products p
      where p.id = product_sizes.product_id
        and (p.is_active = true or (select private.is_staff()))
    )
  );

drop policy if exists "Super admin manage product sizes" on public.product_sizes;
create policy "Super admin manage product sizes"
  on public.product_sizes for all
  to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

-- PROFILES POLICIES (Prevent self-role escalation & public user enumeration)
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

-- INQUIRIES & QUOTATIONS POLICIES (Locked to Staff or Verified Owner)
drop policy if exists "Anyone can create inquiry" on public.inquiries_quotations;
drop policy if exists "Read inquiries" on public.inquiries_quotations;
drop policy if exists "Staff or owner update inquiries" on public.inquiries_quotations;
drop policy if exists "Owner or staff read inquiries" on public.inquiries_quotations;
drop policy if exists "Staff insert inquiries" on public.inquiries_quotations;
drop policy if exists "Staff update inquiries" on public.inquiries_quotations;

create policy "Owner or staff read inquiries"
  on public.inquiries_quotations for select
  to authenticated
  using (
    (select private.is_staff())
    or customer_id = (select auth.uid())
    or lower(customer_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

create policy "Staff insert inquiries"
  on public.inquiries_quotations for insert
  to authenticated
  with check ((select private.is_staff()));

create policy "Staff update inquiries"
  on public.inquiries_quotations for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ORDERS POLICIES (Locked to Staff or Verified Owner; online orders use server-priced RPC)
drop policy if exists "Anyone can create order" on public.orders;
drop policy if exists "Read orders" on public.orders;
drop policy if exists "Staff update orders" on public.orders;
drop policy if exists "Owner or staff read orders" on public.orders;
drop policy if exists "Staff create walk-in orders" on public.orders;

create policy "Owner or staff read orders"
  on public.orders for select
  to authenticated
  using (
    (select private.is_staff())
    or customer_id = (select auth.uid())
    or lower(customer_email) = lower(coalesce((select auth.jwt() ->> 'email'), ''))
  );

create policy "Staff create walk-in orders"
  on public.orders for insert
  to authenticated
  with check ((select private.is_staff()));

create policy "Staff update orders"
  on public.orders for update
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- CHAT TICKETS & MESSAGES POLICIES
-- Raw table access restricted to active Staff so `internal_notes` and `access_token`
-- are never exposed to customers or anonymous users. Customers & Guests use scoped RPCs.
drop policy if exists "Anyone can open chat ticket" on public.chat_tickets;
drop policy if exists "Read chat tickets" on public.chat_tickets;
drop policy if exists "Staff update chat tickets" on public.chat_tickets;
drop policy if exists "Staff manage chat tickets" on public.chat_tickets;

create policy "Staff manage chat tickets"
  on public.chat_tickets for all
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

drop policy if exists "Anyone can send chat message" on public.chat_messages;
drop policy if exists "Read chat messages" on public.chat_messages;
drop policy if exists "Staff manage chat messages" on public.chat_messages;

create policy "Staff manage chat messages"
  on public.chat_messages for all
  to authenticated
  using ((select private.is_staff()))
  with check ((select private.is_staff()));

-- ============================================================================
-- SECURE SERVER-SIDE RPC FUNCTIONS (`SECURITY DEFINER`, `search_path = ''`)
-- ============================================================================

-- 1. Public Queue Health Summary (Exposes counts only, zero PII)
create or replace function public.get_public_queue_summary()
returns jsonb
language sql
security definer
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'onlineSpecialists', (
      select count(*)::int from public.profiles
      where role in ('employee', 'super_admin') and is_active = true and is_online = true
    ),
    'queuedTickets', (
      select count(*)::int from public.chat_tickets
      where status = 'queued'
    )
  );
$$;

revoke all on function public.get_public_queue_summary() from public;
grant execute on function public.get_public_queue_summary() to anon, authenticated;

-- 2. Create Public / Customer Quotation Inquiry
create or replace function public.create_public_inquiry(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_company_name text default null,
  p_subject text default '',
  p_product_id uuid default null,
  p_product_name text default 'Custom Print Project',
  p_selected_size text default 'Custom Size',
  p_material text default 'Standard Stock',
  p_finish text default 'Standard Finish',
  p_quantity int default 1,
  p_custom_dimensions text default null,
  p_artwork_url text default null,
  p_notes text default null,
  p_target_date date default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prefix text;
  v_ref text;
  v_uid uuid;
  v_clean_url text;
  v_row public.inquiries_quotations;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) < 2 or char_length(trim(p_customer_name)) > 200 then
    raise exception 'Please provide a valid customer name.';
  end if;
  if trim(coalesce(p_customer_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(trim(p_customer_email)) > 254 then
    raise exception 'Please provide a valid email address.';
  end if;
  if char_length(trim(coalesce(p_customer_phone, ''))) < 5 or char_length(trim(p_customer_phone)) > 50 then
    raise exception 'Please provide a valid contact phone number.';
  end if;
  if coalesce(p_quantity, 0) < 1 or p_quantity > 10000000 then
    raise exception 'Quantity must be between 1 and 10,000,000.';
  end if;

  v_clean_url := nullif(trim(coalesce(p_artwork_url, '')), '');
  if v_clean_url is not null then
    if char_length(v_clean_url) > 1000 or v_clean_url !~* '^https://' then
      raise exception 'Artwork link must be a valid https:// URL.';
    end if;
  end if;

  v_uid := (select auth.uid());
  select quote_prefix into v_prefix from public.app_settings where id = 1;
  v_ref := private.generate_ref_code(coalesce(v_prefix, 'QT'), true);

  insert into public.inquiries_quotations (
    reference_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    company_name,
    subject,
    product_id,
    product_name,
    selected_size,
    material,
    finish,
    quantity,
    custom_dimensions,
    artwork_url,
    notes,
    target_date,
    status
  )
  values (
    v_ref,
    v_uid,
    left(trim(p_customer_name), 200),
    lower(trim(p_customer_email)),
    left(trim(p_customer_phone), 50),
    left(nullif(trim(coalesce(p_company_name, '')), ''), 200),
    left(coalesce(nullif(trim(p_subject), ''), trim(p_product_name) || ' — ' || trim(p_selected_size)), 300),
    p_product_id,
    left(coalesce(nullif(trim(p_product_name), ''), 'Custom Print Project'), 200),
    left(coalesce(nullif(trim(p_selected_size), ''), 'Standard Size'), 150),
    left(coalesce(nullif(trim(p_material), ''), 'Standard Stock'), 150),
    left(coalesce(nullif(trim(p_finish), ''), 'Standard Finish'), 150),
    p_quantity,
    left(nullif(trim(coalesce(p_custom_dimensions, '')), ''), 250),
    v_clean_url,
    left(nullif(trim(coalesce(p_notes, '')), ''), 4000),
    p_target_date,
    'pending_review'
  )
  returning * into v_row;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.create_public_inquiry(text, text, text, text, text, uuid, text, text, text, text, int, text, text, text, date) from public;
grant execute on function public.create_public_inquiry(text, text, text, text, text, uuid, text, text, text, text, int, text, text, text, date) to anon, authenticated;

-- 3. Create Online Order with Authoritative Server-Side Price Calculation
create or replace function public.create_online_order(
  p_customer_name text,
  p_customer_email text,
  p_customer_phone text,
  p_product_id uuid,
  p_size_id uuid,
  p_material text,
  p_finish text,
  p_quantity int,
  p_payment_method text default 'bank_transfer',
  p_delivery_method text default 'pickup',
  p_notes text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_prod public.products;
  v_size public.product_sizes;
  v_settings public.app_settings;
  v_base numeric(12,2);
  v_multiplier numeric(12,4) := 1.0;
  v_finish_add numeric(12,2) := 0.0;
  v_unit_price numeric(12,2);
  v_line_total numeric(12,2);
  v_tax numeric(12,2);
  v_total numeric(12,2);
  v_ref text;
  v_uid uuid;
  v_mat_name text;
  v_fin_name text;
  v_delivery text;
  v_pay_method text;
  v_item jsonb;
  v_order public.orders;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) < 2 or char_length(trim(p_customer_name)) > 200 then
    raise exception 'Please provide a valid customer name.';
  end if;
  if trim(coalesce(p_customer_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please provide a valid email address.';
  end if;
  if char_length(trim(coalesce(p_customer_phone, ''))) < 5 or char_length(trim(p_customer_phone)) > 50 then
    raise exception 'Please provide a valid contact phone number.';
  end if;

  select * into v_prod from public.products where id = p_product_id and is_active = true;
  if not found then
    raise exception 'Selected print product is unavailable.';
  end if;

  select * into v_size from public.product_sizes where id = p_size_id and product_id = v_prod.id;
  if not found then
    raise exception 'Selected size tier does not belong to this product.';
  end if;

  if coalesce(p_quantity, 0) < v_prod.min_order_qty or p_quantity > 10000000 then
    raise exception 'Minimum order quantity for % is %.', v_prod.name, v_prod.min_order_qty;
  end if;

  select * into v_settings from public.app_settings where id = 1;

  -- Server-side volume tier selection
  v_base := v_size.unit_price;
  if p_quantity >= 500 and v_size.bulk_500_price is not null then
    v_base := v_size.bulk_500_price;
  elsif p_quantity >= 100 and v_size.bulk_100_price is not null then
    v_base := v_size.bulk_100_price;
  end if;

  -- Server-side material multiplier lookup
  select coalesce((elem->>'priceMultiplier')::numeric, 1.0), coalesce(elem->>'name', 'Standard Stock')
  into v_multiplier, v_mat_name
  from jsonb_array_elements(v_prod.materials) as elem
  where elem->>'name' = p_material
  limit 1;

  if v_mat_name is null then
    select coalesce((elem->>'priceMultiplier')::numeric, 1.0), coalesce(elem->>'name', 'Standard Stock')
    into v_multiplier, v_mat_name
    from jsonb_array_elements(v_prod.materials) as elem
    limit 1;
    v_multiplier := coalesce(v_multiplier, 1.0);
    v_mat_name := coalesce(v_mat_name, 'Standard Stock');
  end if;

  -- Server-side finishing surcharge lookup
  select coalesce((elem->>'addPerUnit')::numeric, 0.0), coalesce(elem->>'name', 'Standard Finish')
  into v_finish_add, v_fin_name
  from jsonb_array_elements(v_prod.finishes) as elem
  where elem->>'name' = p_finish
  limit 1;

  if v_fin_name is null then
    select coalesce((elem->>'addPerUnit')::numeric, 0.0), coalesce(elem->>'name', 'Standard Finish')
    into v_finish_add, v_fin_name
    from jsonb_array_elements(v_prod.finishes) as elem
    limit 1;
    v_finish_add := coalesce(v_finish_add, 0.0);
    v_fin_name := coalesce(v_fin_name, 'Standard Finish');
  end if;

  v_unit_price := round((v_base * v_multiplier + v_finish_add)::numeric, 2);
  v_line_total := round((v_unit_price * p_quantity + coalesce(v_size.setup_fee, 0))::numeric, 2);
  v_tax := round((v_line_total * coalesce(v_settings.tax_rate, 0) / 100.0)::numeric, 2);
  v_total := round((v_line_total + v_tax)::numeric, 2);

  v_delivery := case when p_delivery_method in ('pickup', 'courier') then p_delivery_method else 'pickup' end;
  v_pay_method := case when p_payment_method in ('gcash_ewallet', 'bank_transfer', 'cash', 'card') then p_payment_method else 'bank_transfer' end;
  v_uid := (select auth.uid());
  v_ref := private.generate_ref_code(coalesce(v_settings.order_prefix, 'ORD'), true);

  v_item := jsonb_build_object(
    'id', 'item-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    'productId', v_prod.id,
    'productName', v_prod.name,
    'sizeLabel', v_size.size_label,
    'material', v_mat_name,
    'finish', v_fin_name,
    'quantity', p_quantity,
    'unitPrice', v_unit_price,
    'setupFee', coalesce(v_size.setup_fee, 0),
    'lineTotal', v_line_total
  );

  insert into public.orders (
    reference_number,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    order_source,
    items,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    amount_paid,
    payment_status,
    payment_method,
    production_status,
    delivery_method,
    notes
  )
  values (
    v_ref,
    v_uid,
    left(trim(p_customer_name), 200),
    lower(trim(p_customer_email)),
    left(trim(p_customer_phone), 50),
    'online',
    jsonb_build_array(v_item),
    v_line_total,
    v_tax,
    0,
    v_total,
    0,
    'unpaid',
    v_pay_method,
    'received',
    v_delivery,
    left(nullif(trim(coalesce(p_notes, '')), ''), 2000)
  )
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.create_online_order(text, text, text, uuid, uuid, text, text, int, text, text, text) from public;
grant execute on function public.create_online_order(text, text, text, uuid, uuid, text, text, int, text, text, text) to anon, authenticated;

-- 4. Exact Reference Lookup (Masks contact PII for non-owners, strips internal_notes)
create or replace function public.lookup_reference_details(p_reference text)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_ref text;
  v_uid uuid;
  v_email text;
  v_is_staff boolean;
  v_order public.orders;
  v_inq public.inquiries_quotations;
  v_tkt public.chat_tickets;
  v_queue_pos int := 0;
  v_out_order jsonb := null;
  v_out_inq jsonb := null;
  v_out_tkt jsonb := null;
  v_privileged boolean;
begin
  v_ref := upper(trim(coalesce(p_reference, '')));
  if char_length(v_ref) < 5 or char_length(v_ref) > 64 then
    return jsonb_build_object('found', false);
  end if;

  v_uid := (select auth.uid());
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));
  v_is_staff := (select private.is_staff());

  -- Check Orders
  select * into v_order from public.orders where upper(reference_number) = v_ref limit 1;
  if found then
    v_privileged := v_is_staff
      or (v_uid is not null and v_order.customer_id = v_uid)
      or (v_email <> '' and lower(v_order.customer_email) = v_email);

    v_out_order := to_jsonb(v_order);
    if not v_privileged then
      v_out_order := v_out_order || jsonb_build_object(
        'customer_email', left(v_order.customer_email, 2) || '***@' || split_part(v_order.customer_email, '@', 2),
        'customer_phone', '***' || right(v_order.customer_phone, 4)
      );
    end if;
  end if;

  -- Check Inquiries / Quotations
  select * into v_inq from public.inquiries_quotations where upper(reference_number) = v_ref limit 1;
  if found then
    v_privileged := v_is_staff
      or (v_uid is not null and v_inq.customer_id = v_uid)
      or (v_email <> '' and lower(v_inq.customer_email) = v_email);

    v_out_inq := to_jsonb(v_inq) - 'artwork_url';
    if v_privileged then
      v_out_inq := to_jsonb(v_inq);
    else
      v_out_inq := v_out_inq || jsonb_build_object(
        'customer_email', left(v_inq.customer_email, 2) || '***@' || split_part(v_inq.customer_email, '@', 2),
        'customer_phone', '***' || right(v_inq.customer_phone, 4)
      );
    end if;
  end if;

  -- Check Chat Tickets (never expose internal_notes or access_token)
  select * into v_tkt from public.chat_tickets where upper(ticket_number) = v_ref limit 1;
  if found then
    if v_tkt.status = 'queued' then
      select coalesce(pos, 1) into v_queue_pos
      from (
        select id, row_number() over (
          order by
            case priority when 'urgent' then 0 when 'high' then 1 else 2 end,
            queued_at asc
        ) as pos
        from public.chat_tickets
        where status = 'queued'
      ) ranked
      where ranked.id = v_tkt.id;
    end if;

    v_out_tkt := jsonb_build_object(
      'id', v_tkt.id,
      'ticket_number', v_tkt.ticket_number,
      'customer_name', v_tkt.customer_name,
      'topic', v_tkt.topic,
      'linked_reference', v_tkt.linked_reference,
      'priority', v_tkt.priority,
      'status', v_tkt.status,
      'assigned_employee_name', v_tkt.assigned_employee_name,
      'queued_at', v_tkt.queued_at,
      'queue_position', v_queue_pos
    );
  end if;

  return jsonb_build_object(
    'found', (v_out_order is not null or v_out_inq is not null or v_out_tkt is not null),
    'order', v_out_order,
    'inquiry', v_out_inq,
    'ticket', v_out_tkt
  );
end;
$$;

revoke all on function public.lookup_reference_details(text) from public;
grant execute on function public.lookup_reference_details(text) to anon, authenticated;

-- 5. Approve Staff Quotation & Convert to Order Server-Side
create or replace function public.accept_quotation_by_reference(
  p_reference text,
  p_payment_method text default 'bank_transfer',
  p_delivery_method text default 'pickup'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inq public.inquiries_quotations;
  v_settings public.app_settings;
  v_unit numeric(12,2);
  v_setup numeric(12,2);
  v_discount numeric(12,2);
  v_subtotal numeric(12,2);
  v_taxable numeric(12,2);
  v_tax numeric(12,2);
  v_total numeric(12,2);
  v_ref text;
  v_item jsonb;
  v_order public.orders;
begin
  select * into v_inq
  from public.inquiries_quotations
  where upper(reference_number) = upper(trim(coalesce(p_reference, '')))
  for update;

  if not found then
    raise exception 'Quotation reference not found.';
  end if;

  if v_inq.status = 'converted_to_order' then
    raise exception 'This quotation has already been converted to Order %.', v_inq.converted_order_ref;
  end if;

  if v_inq.status not in ('quoted', 'approved') or v_inq.quoted_unit_price is null then
    raise exception 'This inquiry does not have an active approved price yet.';
  end if;

  if v_inq.valid_until is not null and v_inq.valid_until < current_date and not (select private.is_staff()) then
    raise exception 'This quotation expired on %. Please request an updated quote.', v_inq.valid_until;
  end if;

  select * into v_settings from public.app_settings where id = 1;

  v_unit := coalesce(v_inq.quoted_unit_price, 0);
  v_setup := coalesce(v_inq.quoted_setup_fee, 0);
  v_discount := coalesce(v_inq.quoted_discount, 0);
  v_subtotal := round((v_unit * v_inq.quantity + v_setup)::numeric, 2);
  v_taxable := greatest(0, v_subtotal - v_discount);
  v_tax := round((v_taxable * coalesce(v_settings.tax_rate, 0) / 100.0)::numeric, 2);
  v_total := round((v_taxable + v_tax)::numeric, 2);
  v_ref := private.generate_ref_code(coalesce(v_settings.order_prefix, 'ORD'), true);

  v_item := jsonb_build_object(
    'id', 'item-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 10),
    'productId', v_inq.product_id,
    'productName', v_inq.product_name,
    'sizeLabel', case
      when v_inq.custom_dimensions is not null and v_inq.custom_dimensions <> ''
      then v_inq.selected_size || ' (' || v_inq.custom_dimensions || ')'
      else v_inq.selected_size
    end,
    'material', coalesce(v_inq.material, 'Standard Stock'),
    'finish', coalesce(v_inq.finish, 'Standard Finish'),
    'quantity', v_inq.quantity,
    'unitPrice', v_unit,
    'setupFee', v_setup,
    'lineTotal', v_subtotal
  );

  insert into public.orders (
    reference_number,
    quotation_id,
    customer_id,
    customer_name,
    customer_email,
    customer_phone,
    order_source,
    items,
    subtotal,
    tax_amount,
    discount_amount,
    total_amount,
    amount_paid,
    payment_status,
    payment_method,
    production_status,
    delivery_method,
    notes,
    taken_by_employee_id,
    taken_by_name,
    estimated_completion
  )
  values (
    v_ref,
    v_inq.id,
    v_inq.customer_id,
    v_inq.customer_name,
    v_inq.customer_email,
    v_inq.customer_phone,
    'from_quotation',
    jsonb_build_array(v_item),
    v_subtotal,
    v_tax,
    v_discount,
    v_total,
    0,
    'unpaid',
    case when p_payment_method in ('gcash_ewallet', 'bank_transfer', 'cash', 'card') then p_payment_method else 'bank_transfer' end,
    'received',
    case when p_delivery_method in ('pickup', 'courier') then p_delivery_method else 'pickup' end,
    trim('Converted from Quotation ' || v_inq.reference_number || '. ' || coalesce(v_inq.notes, '')),
    case when (select private.is_staff()) then (select auth.uid()) else null end,
    case when (select private.is_staff()) then (select p.full_name from public.profiles p where p.id = (select auth.uid())) else null end,
    v_inq.target_date
  )
  returning * into v_order;

  update public.inquiries_quotations
  set status = 'converted_to_order',
      converted_order_ref = v_ref,
      updated_at = now()
  where id = v_inq.id;

  return to_jsonb(v_order);
end;
$$;

revoke all on function public.accept_quotation_by_reference(text, text, text) from public;
grant execute on function public.accept_quotation_by_reference(text, text, text) to anon, authenticated;

-- 6. Open Public / Customer Chat Ticket (Generates secret access_token & auto-assigns if enabled)
create or replace function public.open_public_chat_ticket(
  p_customer_name text,
  p_customer_email text,
  p_topic text,
  p_linked_reference text default null,
  p_priority text default 'normal',
  p_initial_message text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_settings public.app_settings;
  v_tkt_num text;
  v_token text;
  v_priority text;
  v_status text := 'queued';
  v_emp_id uuid := null;
  v_emp_name text := null;
  v_claimed_at timestamptz := null;
  v_uid uuid;
  v_tkt public.chat_tickets;
  v_sys_msg text;
  v_queue_pos int := 0;
begin
  if char_length(trim(coalesce(p_customer_name, ''))) < 2 or char_length(trim(p_customer_name)) > 200 then
    raise exception 'Please provide your name.';
  end if;
  if trim(coalesce(p_customer_email, '')) !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'Please provide a valid email address.';
  end if;
  if char_length(trim(coalesce(p_initial_message, ''))) < 1 or char_length(trim(p_initial_message)) > 4000 then
    raise exception 'Message must be between 1 and 4,000 characters.';
  end if;

  select * into v_settings from public.app_settings where id = 1;
  v_tkt_num := private.generate_ref_code(coalesce(v_settings.ticket_prefix, 'TKT'), false);
  v_token := replace(gen_random_uuid()::text, '-', '');
  v_priority := case when p_priority in ('normal', 'high', 'urgent') then p_priority else 'normal' end;
  v_uid := (select auth.uid());

  -- Server-side auto-assignment if enabled
  if coalesce(v_settings.auto_assign_tickets, false) then
    select p.id, p.full_name
    into v_emp_id, v_emp_name
    from public.profiles p
    where p.role in ('employee', 'super_admin')
      and p.is_active = true
      and p.is_online = true
      and (
        select count(*) from public.chat_tickets ct
        where ct.status = 'active' and ct.assigned_employee_id = p.id
      ) < coalesce(v_settings.max_active_chats_per_employee, 5)
    order by (
      select count(*) from public.chat_tickets ct
      where ct.status = 'active' and ct.assigned_employee_id = p.id
    ) asc, p.created_at asc
    limit 1;

    if v_emp_id is not null then
      v_status := 'active';
      v_claimed_at := now();
    end if;
  end if;

  insert into public.chat_tickets (
    ticket_number,
    access_token,
    customer_id,
    customer_name,
    customer_email,
    topic,
    linked_reference,
    priority,
    status,
    assigned_employee_id,
    assigned_employee_name,
    claimed_at
  )
  values (
    v_tkt_num,
    v_token,
    v_uid,
    left(trim(p_customer_name), 200),
    lower(trim(p_customer_email)),
    left(coalesce(nullif(trim(p_topic), ''), 'General Support'), 200),
    left(nullif(trim(coalesce(p_linked_reference, '')), ''), 64),
    v_priority,
    v_status,
    v_emp_id,
    v_emp_name,
    v_claimed_at
  )
  returning * into v_tkt;

  v_sys_msg := case
    when v_status = 'active' then 'Ticket ' || v_tkt_num || ' created and assigned to ' || v_emp_name || '.'
    else 'Ticket ' || v_tkt_num || ' joined the support queue.' ||
      case when v_tkt.linked_reference is not null then ' Reference: ' || v_tkt.linked_reference || '.' else '' end
  end;

  insert into public.chat_messages (ticket_id, sender_role, sender_name, message)
  values
    (v_tkt.id, 'system', 'System', v_sys_msg),
    (v_tkt.id, 'customer', v_tkt.customer_name, trim(p_initial_message));

  if v_status = 'queued' then
    select coalesce(pos, 1) into v_queue_pos
    from (
      select id, row_number() over (
        order by
          case priority when 'urgent' then 0 when 'high' then 1 else 2 end,
          queued_at asc
      ) as pos
      from public.chat_tickets
      where status = 'queued'
    ) ranked
    where ranked.id = v_tkt.id;
  end if;

  return jsonb_build_object(
    'accessToken', v_token,
    'queuePosition', v_queue_pos,
    'ticket', (
      select jsonb_build_object(
        'id', v_tkt.id,
        'ticket_number', v_tkt.ticket_number,
        'customer_id', v_tkt.customer_id,
        'customer_name', v_tkt.customer_name,
        'customer_email', v_tkt.customer_email,
        'topic', v_tkt.topic,
        'linked_reference', v_tkt.linked_reference,
        'priority', v_tkt.priority,
        'status', v_tkt.status,
        'assigned_employee_id', v_tkt.assigned_employee_id,
        'assigned_employee_name', v_tkt.assigned_employee_name,
        'queued_at', v_tkt.queued_at,
        'claimed_at', v_tkt.claimed_at,
        'resolved_at', v_tkt.resolved_at,
        'chat_messages', coalesce((
          select jsonb_agg(to_jsonb(m) order by m.created_at asc)
          from public.chat_messages m
          where m.ticket_id = v_tkt.id
        ), '[]'::jsonb)
      )
    )
  );
end;
$$;

revoke all on function public.open_public_chat_ticket(text, text, text, text, text, text) from public;
grant execute on function public.open_public_chat_ticket(text, text, text, text, text, text) to anon, authenticated;

-- 7. Get Single Ticket Session (Authorized via Staff, Verified Account Owner, or Guest access_token)
create or replace function public.get_chat_ticket_session(
  p_ticket_id uuid,
  p_access_token text default null
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_tkt public.chat_tickets;
  v_uid uuid;
  v_email text;
  v_authorized boolean;
  v_queue_pos int := 0;
begin
  select * into v_tkt from public.chat_tickets where id = p_ticket_id;
  if not found then
    return null;
  end if;

  v_uid := (select auth.uid());
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));

  v_authorized := (select private.is_staff())
    or (v_uid is not null and v_tkt.customer_id = v_uid)
    or (v_email <> '' and lower(v_tkt.customer_email) = v_email)
    or (p_access_token is not null and p_access_token <> '' and v_tkt.access_token = p_access_token);

  if not v_authorized then
    raise exception 'Unauthorized ticket access.';
  end if;

  if v_tkt.status = 'queued' then
    select coalesce(pos, 1) into v_queue_pos
    from (
      select id, row_number() over (
        order by
          case priority when 'urgent' then 0 when 'high' then 1 else 2 end,
          queued_at asc
      ) as pos
      from public.chat_tickets
      where status = 'queued'
    ) ranked
    where ranked.id = v_tkt.id;
  end if;

  return jsonb_build_object(
    'queuePosition', v_queue_pos,
    'ticket', jsonb_build_object(
      'id', v_tkt.id,
      'ticket_number', v_tkt.ticket_number,
      'customer_id', v_tkt.customer_id,
      'customer_name', v_tkt.customer_name,
      'customer_email', v_tkt.customer_email,
      'topic', v_tkt.topic,
      'linked_reference', v_tkt.linked_reference,
      'priority', v_tkt.priority,
      'status', v_tkt.status,
      'assigned_employee_id', v_tkt.assigned_employee_id,
      'assigned_employee_name', v_tkt.assigned_employee_name,
      'queued_at', v_tkt.queued_at,
      'claimed_at', v_tkt.claimed_at,
      'resolved_at', v_tkt.resolved_at,
      'chat_messages', coalesce((
        select jsonb_agg(to_jsonb(m) order by m.created_at asc)
        from public.chat_messages m
        where m.ticket_id = v_tkt.id
      ), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.get_chat_ticket_session(uuid, text) from public;
grant execute on function public.get_chat_ticket_session(uuid, text) to anon, authenticated;

-- 8. Get Authenticated Customer's Own Tickets (Strips internal_notes & access_token)
create or replace function public.get_my_chat_tickets()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  v_uid uuid;
  v_email text;
begin
  v_uid := (select auth.uid());
  if v_uid is null then
    return '[]'::jsonb;
  end if;
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));

  return coalesce((
    select jsonb_agg(
      jsonb_build_object(
        'id', t.id,
        'ticket_number', t.ticket_number,
        'customer_id', t.customer_id,
        'customer_name', t.customer_name,
        'customer_email', t.customer_email,
        'topic', t.topic,
        'linked_reference', t.linked_reference,
        'priority', t.priority,
        'status', t.status,
        'assigned_employee_id', t.assigned_employee_id,
        'assigned_employee_name', t.assigned_employee_name,
        'queued_at', t.queued_at,
        'claimed_at', t.claimed_at,
        'resolved_at', t.resolved_at,
        'chat_messages', coalesce((
          select jsonb_agg(to_jsonb(m) order by m.created_at asc)
          from public.chat_messages m
          where m.ticket_id = t.id
        ), '[]'::jsonb)
      )
      order by t.queued_at desc
    )
    from public.chat_tickets t
    where t.customer_id = v_uid
       or (v_email <> '' and lower(t.customer_email) = v_email)
  ), '[]'::jsonb);
end;
$$;

revoke all on function public.get_my_chat_tickets() from public, anon;
grant execute on function public.get_my_chat_tickets() to authenticated;

-- 9. Send Customer Message to Authorized Ticket
create or replace function public.send_customer_chat_message(
  p_ticket_id uuid,
  p_access_token text,
  p_message text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tkt public.chat_tickets;
  v_uid uuid;
  v_email text;
  v_authorized boolean;
  v_msg public.chat_messages;
begin
  if char_length(trim(coalesce(p_message, ''))) < 1 or char_length(trim(p_message)) > 4000 then
    raise exception 'Message must be between 1 and 4,000 characters.';
  end if;

  select * into v_tkt from public.chat_tickets where id = p_ticket_id;
  if not found then
    raise exception 'Ticket not found.';
  end if;

  if v_tkt.status in ('resolved', 'closed') then
    raise exception 'This support ticket is already closed.';
  end if;

  v_uid := (select auth.uid());
  v_email := lower(coalesce((select auth.jwt() ->> 'email'), ''));

  v_authorized := (v_uid is not null and v_tkt.customer_id = v_uid)
    or (v_email <> '' and lower(v_tkt.customer_email) = v_email)
    or (p_access_token is not null and p_access_token <> '' and v_tkt.access_token = p_access_token);

  if not v_authorized then
    raise exception 'Unauthorized ticket message.';
  end if;

  insert into public.chat_messages (ticket_id, sender_role, sender_name, message)
  values (v_tkt.id, 'customer', v_tkt.customer_name, trim(p_message))
  returning * into v_msg;

  return to_jsonb(v_msg);
end;
$$;

revoke all on function public.send_customer_chat_message(uuid, text, text) from public;
grant execute on function public.send_customer_chat_message(uuid, text, text) to anon, authenticated;

-- 10. Super Admin RPC to confirm & assign role when provisioning Staff from /admin
create or replace function public.admin_assign_staff_role(
  target_user_id uuid,
  target_full_name text,
  target_phone text,
  target_department text,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.is_super_admin()) then
    raise exception 'Forbidden: Super Admin privileges required.';
  end if;

  if target_role not in ('customer', 'employee', 'super_admin') then
    raise exception 'Invalid role specified.';
  end if;

  update auth.users
  set email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', target_role)
  where id = target_user_id;

  update public.profiles
  set full_name = coalesce(nullif(trim(target_full_name), ''), full_name),
      phone = nullif(trim(coalesce(target_phone, '')), ''),
      department = nullif(trim(coalesce(target_department, '')), ''),
      role = target_role,
      is_active = true,
      is_online = true
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_assign_staff_role(uuid, text, text, text, text) from public, anon;
grant execute on function public.admin_assign_staff_role(uuid, text, text, text, text) to authenticated;

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
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'products'
  ) then
    alter publication supabase_realtime add table public.products;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'app_settings'
  ) then
    alter publication supabase_realtime add table public.app_settings;
  end if;
end $$;
