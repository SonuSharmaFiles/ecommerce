/**
 * Seed sample data: 1 admin user, 3 categories, 2 brands, 12 products with images & variants.
 * Usage: `npm run db:seed`
 * Requires:
 *   - SUPABASE_SERVICE_ROLE_KEY in env
 *   - ADMIN_BOOTSTRAP_EMAIL (will be promoted to super_admin)
 */
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key, { auth: { persistSession: false } });

const CATEGORIES = [
  { slug: "audio", name: "Audio", description: "Headphones, earbuds, speakers" },
  { slug: "smart-home", name: "Smart home", description: "Lights, hubs, automation" },
  { slug: "wearables", name: "Wearables", description: "Watches, fitness trackers" },
];

const BRANDS = [
  { slug: "auralis", name: "Auralis" },
  { slug: "lumio", name: "Lumio" },
];

const PRODUCTS = [
  { slug: "wireless-earbuds-pro", title: "Wireless Earbuds Pro", price: 89, compare_at: 129, sd: "Premium noise-cancelling wireless earbuds with 30h battery.", img: "https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800", flags: { is_featured: true, is_best_seller: true } },
  { slug: "studio-headphones-x1", title: "Studio Headphones X1", price: 199, compare_at: 249, sd: "Reference-grade over-ear headphones for studio.", img: "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=800", flags: { is_featured: true } },
  { slug: "portable-speaker-mini", title: "Portable Speaker Mini", price: 49, sd: "Compact Bluetooth speaker with rich, room-filling sound.", img: "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=800", flags: { is_new_arrival: true } },
  { slug: "smart-led-strip-32ft", title: "Smart LED Strip 32ft", price: 39, compare_at: 59, sd: "RGB color-changing LED strip with music sync.", img: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800", flags: { is_on_sale: true, is_best_seller: true } },
  { slug: "smart-bulb-pack-4", title: "Smart Bulb Pack (4)", price: 35, sd: "Voice-controlled smart bulbs with 16M colors.", img: "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800", flags: { is_new_arrival: true } },
  { slug: "video-doorbell-pro", title: "Video Doorbell Pro", price: 149, sd: "1080p HD video doorbell with two-way talk.", img: "https://images.unsplash.com/photo-1558002038-1055907df827?w=800", flags: { is_featured: true } },
  { slug: "fitness-tracker-active", title: "Fitness Tracker Active", price: 79, sd: "All-day activity, heart rate, and sleep tracking.", img: "https://images.unsplash.com/photo-1575311373937-040b8e1fd5b6?w=800", flags: { is_best_seller: true } },
  { slug: "smartwatch-series-7", title: "Smartwatch Series 7", price: 299, compare_at: 349, sd: "Always-on display, GPS, and 7-day battery.", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800", flags: { is_featured: true, is_on_sale: true } },
  { slug: "noise-isolating-buds", title: "Noise-Isolating Buds", price: 29, sd: "Affordable buds with excellent passive isolation.", img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=800", flags: { is_new_arrival: true } },
  { slug: "smart-plug-bundle", title: "Smart Plug Bundle (4)", price: 39, sd: "Control any outlet with your phone or voice.", img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800", flags: {} },
  { slug: "outdoor-bluetooth-speaker", title: "Outdoor Bluetooth Speaker", price: 119, sd: "Waterproof, dustproof, drop-resistant.", img: "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800", flags: { is_featured: true } },
  { slug: "kids-smart-watch", title: "Kids Smart Watch", price: 89, sd: "GPS tracker, two-way calling, and games.", img: "https://images.unsplash.com/photo-1551193430-31cf41ad7af2?w=800", flags: { is_new_arrival: true } },
];

async function main() {
  console.log("Seeding categories…");
  await supabase.from("categories").upsert(CATEGORIES, { onConflict: "slug" });

  console.log("Seeding brands…");
  await supabase.from("brands").upsert(BRANDS, { onConflict: "slug" });

  const { data: catRows } = await supabase.from("categories").select("id, slug").in("slug", CATEGORIES.map((c) => c.slug));
  const { data: brandRows } = await supabase.from("brands").select("id, slug");

  console.log("Seeding products…");
  for (let i = 0; i < PRODUCTS.length; i++) {
    const p = PRODUCTS[i];
    const brand = brandRows![i % brandRows!.length];
    const { data: existing } = await supabase.from("products").select("id").eq("slug", p.slug).maybeSingle();
    let productId = existing?.id;
    if (!productId) {
      const { data } = await supabase.from("products").insert({
        slug: p.slug, title: p.title,
        short_description: p.sd, description: `<p>${p.sd}</p>`,
        base_price: p.price, compare_at_price: p.compare_at ?? null,
        cost_price: p.price * 0.55,
        currency: "USD", status: "active",
        brand_id: brand.id,
        is_featured: !!p.flags?.is_featured,
        is_best_seller: !!p.flags?.is_best_seller,
        is_new_arrival: !!p.flags?.is_new_arrival,
        is_on_sale: !!p.flags?.is_on_sale,
        published_at: new Date().toISOString(),
      }).select("id").single();
      productId = data!.id;
    }
    await supabase.from("product_images").upsert(
      [{ product_id: productId, url: p.img, is_primary: true, position: 0 }],
      { onConflict: "product_id,url" as never }
    );
    await supabase.from("product_categories").upsert(
      [{ product_id: productId, category_id: catRows![i % catRows!.length].id }],
      { onConflict: "product_id,category_id" as never }
    );
  }

  const adminEmail = process.env.ADMIN_BOOTSTRAP_EMAIL;
  if (adminEmail) {
    console.log("Promoting admin:", adminEmail);
    await supabase.from("profiles").update({ role: "super_admin" }).eq("email", adminEmail);
  } else {
    console.log("Skip admin promotion (set ADMIN_BOOTSTRAP_EMAIL to a real user's email)");
  }

  console.log("Done.");
}

main().catch((err) => { console.error(err); process.exit(1); });
