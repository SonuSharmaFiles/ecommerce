import type {
  SupplierAdapter, SupplierProduct, SupplierTracking, SupplierOrderResult,
} from "./types";

const CJ_API = "https://developers.cjdropshipping.com/api2.0/v1";

interface TokenCache { token: string; expiresAt: number }
let tokenCache: TokenCache | null = null;

async function getToken(): Promise<string | null> {
  const email = process.env.CJ_DROPSHIPPING_EMAIL;
  const key = process.env.CJ_DROPSHIPPING_API_KEY;
  if (!email || !key) return null;
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;
  const res = await fetch(`${CJ_API}/authentication/getAccessToken`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: key }),
  });
  if (!res.ok) return null;
  const json = await res.json();
  tokenCache = {
    token: json.data?.accessToken ?? "",
    expiresAt: Date.now() + (Number(json.data?.accessTokenExpiryDate) || 1000 * 60 * 60 * 24),
  };
  return tokenCache.token;
}

const MOCK_PRODUCTS: SupplierProduct[] = [
  {
    externalId: "CJ-001",
    title: "Wireless Bluetooth Earbuds Pro",
    description: "Premium noise-cancelling wireless earbuds with 30h battery life.",
    imageUrls: ["https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=800"],
    basePrice: 12.5,
    currency: "USD",
    weightGrams: 95,
    variants: [
      { externalId: "CJ-001-BLK", title: "Black", options: { color: "Black" }, price: 12.5, inventoryQuantity: 500 },
      { externalId: "CJ-001-WHT", title: "White", options: { color: "White" }, price: 12.5, inventoryQuantity: 320 },
    ],
    attributes: [
      { name: "Battery", value: "30 hours" },
      { name: "Bluetooth", value: "5.3" },
    ],
    shippingFrom: "CN",
  },
];

export const cjAdapter: SupplierAdapter = {
  name: "cj",
  isConfigured() {
    return Boolean(process.env.CJ_DROPSHIPPING_API_KEY && process.env.CJ_DROPSHIPPING_EMAIL);
  },
  async searchProducts(query: string, page = 1): Promise<SupplierProduct[]> {
    const token = await getToken();
    if (!token) {
      return MOCK_PRODUCTS.filter((p) => p.title.toLowerCase().includes(query.toLowerCase()));
    }
    const url = new URL(`${CJ_API}/product/list`);
    url.searchParams.set("productNameEn", query);
    url.searchParams.set("pageNum", String(page));
    url.searchParams.set("pageSize", "20");
    const res = await fetch(url, { headers: { "CJ-Access-Token": token } });
    if (!res.ok) return [];
    const data = await res.json();
    const list = (data.data?.list ?? []) as Array<{
      pid: string; productNameEn: string; productSku?: string; productImage?: string;
      sellPrice: number; productWeight: number;
    }>;
    return list.map((p) => ({
      externalId: p.pid,
      title: p.productNameEn,
      description: "",
      imageUrls: p.productImage ? [p.productImage] : [],
      basePrice: p.sellPrice,
      currency: "USD",
      weightGrams: p.productWeight,
      variants: [],
      attributes: [],
      shippingFrom: "CN",
    }));
  },
  async getProduct(externalId: string): Promise<SupplierProduct | null> {
    const token = await getToken();
    if (!token) return MOCK_PRODUCTS.find((p) => p.externalId === externalId) ?? null;
    const url = new URL(`${CJ_API}/product/query`);
    url.searchParams.set("pid", externalId);
    const res = await fetch(url, { headers: { "CJ-Access-Token": token } });
    if (!res.ok) return null;
    const data = await res.json();
    const p = data.data;
    if (!p) return null;
    return {
      externalId: p.pid,
      title: p.productNameEn,
      description: p.description ?? "",
      imageUrls: p.productImageSet ?? [],
      basePrice: Number(p.sellPrice ?? 0),
      currency: "USD",
      weightGrams: p.productWeight,
      variants: (p.variants ?? []).map((v: Record<string, unknown>) => ({
        externalId: String(v.vid),
        title: String(v.variantName ?? ""),
        options: {},
        price: Number(v.variantSellPrice ?? 0),
        inventoryQuantity: Number(v.variantStock ?? 0),
        imageUrl: typeof v.variantImage === "string" ? v.variantImage : undefined,
      })),
      attributes: [],
      shippingFrom: "CN",
    };
  },
  async syncPricesAndStock(externalIds: string[]) {
    const out: Record<string, { price: number; stock: number }> = {};
    await Promise.all(
      externalIds.map(async (id) => {
        const p = await this.getProduct(id);
        if (p) out[id] = { price: p.basePrice, stock: p.variants.reduce((s, v) => s + v.inventoryQuantity, 0) };
      })
    );
    return out;
  },
  async placeOrder(args): Promise<SupplierOrderResult> {
    const token = await getToken();
    if (!token) {
      return {
        externalOrderId: `MOCK-${args.orderId}`,
        status: "submitted",
        costTotal: 0,
        currency: "USD",
        raw: { mock: true },
      };
    }
    const res = await fetch(`${CJ_API}/shopping/order/createOrder`, {
      method: "POST",
      headers: { "CJ-Access-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify({
        orderNumber: args.orderId,
        shippingCountryCode: args.shippingAddress.country,
        shippingZip: args.shippingAddress.postalCode,
        shippingCity: args.shippingAddress.city,
        shippingProvince: args.shippingAddress.state ?? "",
        shippingAddress: [args.shippingAddress.line1, args.shippingAddress.line2].filter(Boolean).join(", "),
        shippingCustomerName: args.shippingAddress.name,
        shippingPhone: args.shippingAddress.phone ?? "",
        products: args.items.map((i) => ({
          vid: i.externalVariantId ?? i.externalProductId,
          quantity: i.quantity,
        })),
      }),
    });
    const json = await res.json();
    return {
      externalOrderId: json.data?.orderNumber ?? "",
      status: json.data?.orderStatus ?? "submitted",
      costTotal: Number(json.data?.totalAmount ?? 0),
      currency: "USD",
      raw: json,
    };
  },
  async getTracking(externalOrderId: string): Promise<SupplierTracking | null> {
    const token = await getToken();
    if (!token) {
      return {
        trackingNumber: `MOCK-${externalOrderId}`,
        carrier: "Mock Carrier",
        status: "in_transit",
        events: [{ at: new Date().toISOString(), description: "Shipped (mock)" }],
      };
    }
    const url = new URL(`${CJ_API}/logistic/trackQuery`);
    url.searchParams.set("trackNumber", externalOrderId);
    const res = await fetch(url, { headers: { "CJ-Access-Token": token } });
    if (!res.ok) return null;
    const json = await res.json();
    return {
      trackingNumber: json.data?.trackNumber ?? externalOrderId,
      carrier: json.data?.carrier ?? "Unknown",
      status: json.data?.status ?? "in_transit",
      events: (json.data?.trackingDetails ?? []).map((e: Record<string, string>) => ({
        at: e.date,
        description: e.context,
        location: e.location,
      })),
    };
  },
};
