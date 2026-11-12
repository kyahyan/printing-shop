-- ============================================================================
-- CLAYJAR PRINT STUDIO — INITIAL CATALOG, PRICE-PER-SIZE MATRIX & SAMPLE DATA
-- Run this AFTER running `supabase/schema.sql` in the Supabase SQL Editor.
-- ============================================================================

-- 1. SEED PRODUCTS & PRICE-PER-SIZE TIERS
do $$
declare
  p_tarp uuid;
  p_bc uuid;
  p_stk uuid;
  p_fly uuid;
  p_sin uuid;
  p_app uuid;
begin
  -- Tarpaulin & Large Format Banners
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'tarpaulin-large-format-banners',
    'Tarpaulin & Large Format Banners',
    'Large Format',
    'UV-resistant outdoor & event tarpaulins printed at 1440 DPI with optional eyelets or pole pockets.',
    'High-opacity solvent and eco-solvent large format banners engineered for storefronts, trade shows, outdoor billboards, and event backdrops.',
    'per pc', 1, 'Same-day / 1–2 days', 'Best Seller', true, true, 'cyan',
    '[{"name":"10 oz Standard Flex Tarpaulin","priceMultiplier":1.0},{"name":"13 oz Heavy-Duty Outdoor Flex","priceMultiplier":1.25},{"name":"15 oz Blackout Blockout Banner","priceMultiplier":1.45}]'::jsonb,
    '[{"name":"4 Corner Metal Eyelets","addPerUnit":0},{"name":"Eyelets Every 1 Foot + Rope Hem","addPerUnit":35},{"name":"Top & Bottom Wood/PVC Pole Pockets","addPerUnit":45},{"name":"Trimmed Flush to Edge Only","addPerUnit":0}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_tarp;

  delete from public.product_sizes where product_id = p_tarp;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_tarp, 'Small Standee (2ft × 3ft)', '24 × 36 in (6 sq.ft)', 150, 125, 105, 0, 1),
    (p_tarp, 'X-Banner / Pull-Up (2ft × 5ft)', '24 × 60 in (10 sq.ft)', 250, 210, 185, 0, 2),
    (p_tarp, 'Storefront Banner (3ft × 6ft)', '36 × 72 in (18 sq.ft)', 430, 375, 330, 0, 3),
    (p_tarp, 'Event Backdrop (4ft × 8ft)', '48 × 96 in (32 sq.ft)', 760, 660, 590, 0, 4),
    (p_tarp, 'Stage / Billboard (8ft × 12ft)', '96 × 144 in (96 sq.ft)', 2150, 1890, 1690, 150, 5);

  -- Business Cards
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'luxury-business-calling-cards',
    'Premium Business & Calling Cards',
    'Business Essentials',
    '300–350 GSM C2S & specialty textured calling cards sold per box of 100 pcs with matte/velvet lamination.',
    'Make a tactile first impression with precision-trimmed calling cards on heavy cardstock with optional velvet lamination or rounded corners.',
    'per box (100 pcs)', 1, '1–2 business days', 'Popular for Quotes', true, true, 'indigo',
    '[{"name":"300 GSM C2S Matte Board (1-Side)","priceMultiplier":1.0},{"name":"300 GSM C2S Matte Board (Back-to-Back)","priceMultiplier":1.35},{"name":"350 GSM Textured Old Mill / Linen","priceMultiplier":1.55},{"name":"PVC Waterproof Frosted Card","priceMultiplier":2.1}]'::jsonb,
    '[{"name":"No Lamination (Uncoated Crisp)","addPerUnit":0},{"name":"Matte Lamination (2 Sides)","addPerUnit":65},{"name":"Soft-Touch Velvet + Rounded Corners","addPerUnit":120},{"name":"Spot UV + Matte Lamination","addPerUnit":180}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_bc;

  delete from public.product_sizes where product_id = p_bc;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_bc, 'US Standard (3.5 × 2.0 in)', '89 × 51 mm — Box of 100', 280, 230, 195, 0, 1),
    (p_bc, 'Euro Executive (85 × 55 mm)', '3.35 × 2.17 in — Box of 100', 310, 255, 215, 0, 2),
    (p_bc, 'Modern Square (2.5 × 2.5 in)', '65 × 65 mm — Box of 100', 340, 285, 240, 50, 3),
    (p_bc, 'Slim Tag Card (3.5 × 1.5 in)', '89 × 38 mm — Box of 100', 260, 215, 185, 0, 4);

  -- Waterproof Vinyl Stickers
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'die-cut-waterproof-vinyl-stickers',
    'Die-Cut Waterproof Stickers & Labels',
    'Stickers & Packaging',
    'Kiss-cut or die-cut waterproof vinyl bottle labels, product seals, and brand sticker sheets per size.',
    'Tear-proof, freezer-safe, and waterproof PVC vinyl & BOPP product labels contour-cut to any custom shape.',
    'per pc', 50, '2–3 business days', 'Waterproof', true, true, 'magenta',
    '[{"name":"White Waterproof Glossy Vinyl","priceMultiplier":1.0},{"name":"Clear Transparent Vinyl","priceMultiplier":1.15},{"name":"Brushed Silver / Holographic Vinyl","priceMultiplier":1.45},{"name":"Natural Kraft Paper Sticker","priceMultiplier":0.9}]'::jsonb,
    '[{"name":"Gloss UV Protective Topcoat","addPerUnit":0.75},{"name":"Matte Scratch-Resistant Laminate","addPerUnit":0.85},{"name":"Glitter / Sandblast Laminate","addPerUnit":1.5}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_stk;

  delete from public.product_sizes where product_id = p_stk;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_stk, 'Mini Jar Seal (1.5 × 1.5 in)', '38 × 38 mm', 3.50, 2.75, 1.95, 0, 1),
    (p_stk, 'Standard Logo (2 × 2 in)', '50.8 × 50.8 mm', 5.00, 3.90, 2.80, 0, 2),
    (p_stk, 'Bottle / Pouch Label (3 × 3 in)', '76.2 × 76.2 mm', 8.50, 6.75, 4.90, 0, 3),
    (p_stk, 'Coffee Bag / Box Label (4 × 6 in)', '101.6 × 152.4 mm', 15.00, 12.00, 9.25, 0, 4),
    (p_stk, 'Full A4 Kiss-Cut Sticker Sheet', '210 × 297 mm (multi-cut)', 65.00, 48.00, 38.00, 0, 5);

  -- Flyers & Brochures
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'flyers-leaflets-tri-fold-brochures',
    'Flyers, Leaflets & Tri-Fold Brochures',
    'Marketing Collateral',
    'Vibrant offset & digital flyers in A6, DL, A5, A4, and A3 sizes with bulk price breaks.',
    'High-speed digital and offset commercial printing for restaurant menus, real-estate handouts, and folded corporate brochures.',
    'per pc', 100, '2–4 business days', null, true, true, 'amber',
    '[{"name":"120 GSM C2S Glossy Bookpaper (1-Side)","priceMultiplier":1.0},{"name":"120 GSM C2S Glossy (Back-to-Back)","priceMultiplier":1.35},{"name":"157 GSM Heavy Art Paper (Back-to-Back)","priceMultiplier":1.55},{"name":"220 GSM Menu Fold Cardstock","priceMultiplier":1.85}]'::jsonb,
    '[{"name":"Flat Cut (Unfolded)","addPerUnit":0},{"name":"Bi-Fold (Half Crease)","addPerUnit":0.75},{"name":"Tri-Fold / Z-Fold Machine Crease","addPerUnit":1.1}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_fly;

  delete from public.product_sizes where product_id = p_fly;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_fly, 'A6 Pocket Insert', '105 × 148 mm', 3.20, 2.60, 1.65, 0, 1),
    (p_fly, 'DL Slim Menu / Rack Card', '99 × 210 mm', 4.50, 3.60, 2.35, 0, 2),
    (p_fly, 'A5 Half-Sheet Flyer', '148 × 210 mm', 5.50, 4.40, 2.90, 0, 3),
    (p_fly, 'A4 Brochure / Tri-Fold', '210 × 297 mm', 9.50, 7.80, 5.20, 100, 4),
    (p_fly, 'A3 Poster / Spread Menu', '297 × 420 mm', 18.00, 14.50, 10.50, 150, 5);

  -- Sintra Signage
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'sintra-board-rigid-signage',
    'Sintra Board & Rigid Indoor Signage',
    'Signage & Displays',
    '3mm & 5mm PVC Sintra boards mounted with laminated vinyl for menus, wall art, and retail displays.',
    'Lightweight yet rigid PVC foam boards laminated in matte or gloss for café counter menus and easel standees.',
    'per board', 1, '2–3 business days', null, false, true, 'emerald',
    '[{"name":"3mm White Sintra PVC Board","priceMultiplier":1.0},{"name":"5mm Heavy White Sintra Board","priceMultiplier":1.35},{"name":"5mm Matte Black Sintra Board","priceMultiplier":1.45}]'::jsonb,
    '[{"name":"Matte Laminated + Nano Double-Sided Tape","addPerUnit":25},{"name":"Gloss Laminated + Clean Cut","addPerUnit":0},{"name":"Foldable Back Standee Fin Attached","addPerUnit":85}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_sin;

  delete from public.product_sizes where product_id = p_sin;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_sin, 'A4 Countertop Sign', '8.3 × 11.7 in', 195, 155, 130, 0, 1),
    (p_sin, 'A3 Wall / Menu Board', '11.7 × 16.5 in', 350, 285, 245, 0, 2),
    (p_sin, 'Easel Welcome Board (18 × 24 in)', '457 × 610 mm', 680, 560, 490, 0, 3),
    (p_sin, 'Full Display Poster (24 × 36 in)', '610 × 914 mm', 1250, 1050, 920, 0, 4);

  -- Custom Apparel
  insert into public.products (
    slug, name, category, short_description, description, base_unit, min_order_qty,
    lead_time_days, badge, featured, is_active, accent_color, materials, finishes
  ) values (
    'custom-dtf-sublimation-shirts',
    'Custom DTF & Sublimation T-Shirts',
    'Custom Apparel',
    'Combed cotton & dri-fit corporate uniforms, merch tees, and event shirts priced clearly by garment size.',
    'Full-color Direct-to-Film (DTF), silkscreen, or full-sublimation custom apparel for company events and streetwear.',
    'per shirt', 10, '4–6 business days', 'Bulk Discounts', true, true, 'rose',
    '[{"name":"200 GSM CVC Cotton Blend","priceMultiplier":1.0},{"name":"240 GSM Heavyweight Streetwear Cotton","priceMultiplier":1.25},{"name":"Breathable Micro-Cool Dri-Fit","priceMultiplier":1.05}]'::jsonb,
    '[{"name":"Front Chest Logo Only (4 × 4 in DTF)","addPerUnit":0},{"name":"Front Logo + Full A3 Back Graphic","addPerUnit":75},{"name":"Individual Polybag + Size Sticker","addPerUnit":15}]'::jsonb
  )
  on conflict (slug) do update set updated_at = now()
  returning id into p_app;

  delete from public.product_sizes where product_id = p_app;
  insert into public.product_sizes (product_id, size_label, dimensions, unit_price, bulk_100_price, bulk_500_price, setup_fee, sort_order) values
    (p_app, 'Adult XS / S / M', 'Chest 18" – 20"', 290, 240, 205, 0, 1),
    (p_app, 'Adult L / XL', 'Chest 21" – 22.5"', 305, 255, 215, 0, 2),
    (p_app, 'Plus Size 2XL / 3XL', 'Chest 24" – 26"', 345, 290, 250, 0, 3),
    (p_app, 'Honeycomb Collar Polo (S–XL)', 'Corporate Polo Cut', 420, 360, 315, 150, 4);
end $$;

-- ============================================================================
-- HOW TO PROMOTE YOUR OWN ACCOUNT TO SUPER ADMIN OR EMPLOYEE:
-- 1. Sign up once via `/account` in the web app (e.g. admin@clayjarprint.com)
-- 2. Run either query below in your Supabase SQL Editor:
--
--    update public.profiles
--      set role = 'super_admin', department = 'Management & Pricing', is_online = true
--      where email = 'admin@clayjarprint.com';
--
--    update public.profiles
--      set role = 'employee', department = 'Front Desk & Quotations', is_online = true
--      where email = 'marco@clayjarprint.com';
-- ============================================================================

