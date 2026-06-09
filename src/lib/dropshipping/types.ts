export interface SupplierProduct {
  externalId: string;
  title: string;
  description: string;
  imageUrls: string[];
  basePrice: number;
  currency: string;
  weightGrams?: number;
  variants: {
    externalId: string;
    title: string;
    options: Record<string, string>;
    price: number;
    inventoryQuantity: number;
    imageUrl?: string;
  }[];
  attributes: { name: string; value: string }[];
  shippingFrom?: string;
}

export interface SupplierTracking {
  trackingNumber: string;
  carrier: string;
  status: string;
  events: { at: string; description: string; location?: string }[];
  trackingUrl?: string;
}

export interface SupplierOrderResult {
  externalOrderId: string;
  status: string;
  costTotal: number;
  currency: string;
  raw: unknown;
}

export interface SupplierAdapter {
  name: string;
  isConfigured(): boolean;
  searchProducts(query: string, page?: number): Promise<SupplierProduct[]>;
  getProduct(externalId: string): Promise<SupplierProduct | null>;
  syncPricesAndStock(externalIds: string[]): Promise<Record<string, { price: number; stock: number }>>;
  placeOrder(args: {
    orderId: string;
    items: { externalProductId: string; externalVariantId?: string; quantity: number }[];
    shippingAddress: {
      name: string;
      line1: string;
      line2?: string;
      city: string;
      state?: string;
      postalCode: string;
      country: string;
      phone?: string;
    };
  }): Promise<SupplierOrderResult>;
  getTracking(externalOrderId: string): Promise<SupplierTracking | null>;
}
