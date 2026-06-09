import { cjAdapter } from "./cj";
import { autoDSAdapter } from "./autods";
import type { SupplierAdapter } from "./types";

const ADAPTERS: Record<string, SupplierAdapter> = {
  cj: cjAdapter,
  autods: autoDSAdapter,
};

export function getAdapter(provider: string): SupplierAdapter | null {
  return ADAPTERS[provider] ?? null;
}

export function listAdapters() {
  return Object.values(ADAPTERS).map((a) => ({
    name: a.name,
    configured: a.isConfigured(),
  }));
}

export * from "./types";
