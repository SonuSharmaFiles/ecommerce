import type {
  SupplierAdapter, SupplierProduct, SupplierTracking, SupplierOrderResult,
} from "./types";

const AUTODS_API = "https://platform-api.autods.com";

function headers() {
  return {
    Authorization: `Bearer ${process.env.AUTODS_API_KEY ?? ""}`,
    "Content-Type": "application/json",
  };
}

const MOCK_PRODUCTS: SupplierProduct[] = [
  {
    externalId: "ADS-100",
    title: "Smart LED Strip Lights 32ft",
    description: "RGB color-changing LED strip with music sync and app control.",
    imageUrls: ["https://images.unsplash.com/photo-1531297484001-80022131f5a1?w=800"],
    basePrice: 9.8,
    currency: "USD",
    weightGrams: 300,
    variants: [
      { externalId: "ADS-100-32", title: "32ft", options: { length: "32ft" }, price: 9.8, inventoryQuantity: 700 },
      { externalId: "ADS-100-65", title: "65ft", options: { length: "65ft" }, price: 17.5, inventoryQuantity: 250 },
    ],
    attributes: [{ name: "App", value: "iOS + Android" }],
    shippingFrom: "CN",
  },
];

export const autoDSAdapter: SupplierAdapter = {
  name: "autods",
  isConfigured() {
    return Boolean(process.env.AUTODS_API_KEY && process.env.AUTODS_STORE_ID);
  },
  async searchProducts(query: string, page = 1): Promise<SupplierProduct[]> {
    if (!this.isConfigured()) {
      return MOCK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    }
    const res = await fetch(
      `${AUTODS_API}/products/marketplace/search?query=${encodeURIComponent(query)}&page=${page}`,
      { headers: headers() }
    );
    if (!res.ok) return [];
    const json = await res.json();
    return (json.products ?? []).map((p: Record<string, unknown>) => ({
      externalId: String(p.id),
      title: String(p.title ?? ""),
      description: String(p.description ?? ""),
      imageUrls: Array.isArray(p.images) ? p.images.map(String) : [],
      basePrice: Number(p.cost ?? 0),
      currency: "USD",
      variants: [],
      attributes: [],
    }));
  },
  async getProduct(externalId: string): Promise<SupplierProduct | null> {
    if (!this.isConfigured()) return MOCK_PRODUCTS.find((p) => p.externalId === externalId) ?? null;
    const res = await fetch(`${AUTODS_API}/products/marketplace/${externalId}`, { headers: headers() });
    if (!res.ok) return null;
    const p = await res.json();
    return {
      externalId: String(p.id),
      title: String(p.title ?? ""),
      description: String(p.description ?? ""),
      imageUrls: Array.isArray(p.images) ? p.images.map(String) : [],
      basePrice: Number(p.cost ?? 0),
      currency: "USD",
      variants: (p.variants ?? []).map((v: Record<string, unknown>) => ({
        externalId: String(v.id),
        title: String(v.title ?? ""),
        options: (v.options as Record<string, string>) ?? {},
        price: Number(v.cost ?? 0),
        inventoryQuantity: Number(v.stock ?? 0),
      })),
      attributes: [],
    };
  },
  async syncPricesAndStock(externalIds: string[]) {
    const out: Record<string, { price: number; stock: number }> = {};
    await Promise.all(externalIds.map(async (id) => {
      const p = await this.getProduct(id);
      if (p) out[id] = { price: p.basePrice, stock: p.variants.reduce((s, v) => s + v.inventoryQuantity, 0) };
    }));
    return out;
  },
  async placeOrder(args): Promise<SupplierOrderResult> {
    if (!this.isConfigured()) {
      return {
        externalOrderId: `MOCK-${args.orderId}`,
        status: "submitted",
        costTotal: 0,
        currency: "USD",
        raw: { mock: true },
      };
    }
    const res = await fetch(`${AUTODS_API}/orders`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({
        store_id: process.env.AUTODS_STORE_ID,
        external_order_id: args.orderId,
        shipping_address: args.shippingAddress,
        items: args.items.map((i) => ({
          product_id: i.externalProductId,
          variant_id: i.externalVariantId,
          quantity: i.quantity,
        })),
      }),
    });
    const json = await res.json();
    return {
      externalOrderId: String(json.order_id ?? args.orderId),
      status: String(json.status ?? "submitted"),
      costTotal: Number(json.total_cost ?? 0),
      currency: String(json.currency ?? "USD"),
      raw: json,
    };
  },
  async getTracking(externalOrderId: string): Promise<SupplierTracking | null> {
    if (!this.isConfigured()) {
      return {
        trackingNumber: `MOCK-${externalOrderId}`,
        carrier: "Mock Carrier",
        status: "in_transit",
        events: [{ at: new Date().toISOString(), description: "Shipped (mock)" }],
      };
    }
    const res = await fetch(`${AUTODS_API}/orders/${externalOrderId}/tracking`, { headers: headers() });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      trackingNumber: String(json.tracking_number ?? ""),
      carrier: String(json.carrier ?? "Unknown"),
      status: String(json.status ?? "in_transit"),
      trackingUrl: json.tracking_url,
      events: (json.events ?? []).map((e: Record<string, string>) => ({
        at: e.timestamp,
        description: e.description,
        location: e.location,
      })),
    };
  },
};
