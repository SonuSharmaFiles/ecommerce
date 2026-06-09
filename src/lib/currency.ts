import { CURRENCY_META, type Currency, DEFAULT_CURRENCY } from "@/lib/constants";
import { redis, withCache } from "@/lib/redis";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

type RateMap = Record<Currency, number>;

const FALLBACK_RATES: RateMap = {
  USD: 1, EUR: 0.92, GBP: 0.79, AUD: 1.52, CAD: 1.37, INR: 83.20, NPR: 133.50,
};

export async function getExchangeRates(): Promise<RateMap> {
  return withCache("rates:current", 60 * 60, async () => {
    try {
      const supabase = createSupabaseAdmin();
      const { data } = await supabase
        .from("exchange_rates")
        .select("quote_currency, rate")
        .eq("base_currency", "USD");
      const map = { ...FALLBACK_RATES };
      for (const row of data ?? []) {
        map[row.quote_currency as Currency] = Number(row.rate);
      }
      return map;
    } catch {
      return FALLBACK_RATES;
    }
  });
}

export async function convertPrice(amount: number, from: Currency, to: Currency): Promise<number> {
  if (from === to) return amount;
  const rates = await getExchangeRates();
  const usd = amount / (rates[from] || 1);
  return usd * (rates[to] || 1);
}

export function formatPrice(
  amount: number,
  currency: Currency = DEFAULT_CURRENCY,
  locale?: string
): string {
  const meta = CURRENCY_META[currency];
  return new Intl.NumberFormat(locale ?? meta.locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export async function refreshRatesFromExternalAPI(): Promise<RateMap | null> {
  const key = process.env.EXCHANGE_RATES_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://api.exchangerate.host/live?access_key=${key}&source=USD`,
      { next: { revalidate: 0 } }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as { quotes?: Record<string, number> };
    const map: RateMap = { ...FALLBACK_RATES };
    for (const [k, v] of Object.entries(json.quotes ?? {})) {
      const code = k.replace(/^USD/, "") as Currency;
      if (code in FALLBACK_RATES) map[code] = v;
    }
    map.USD = 1;
    await redis.set("rates:current", JSON.stringify(map), { ex: 60 * 60 * 24 });

    const supabase = createSupabaseAdmin();
    await Promise.all(
      Object.entries(map).map(([currency, rate]) =>
        supabase.from("exchange_rates").upsert({
          base_currency: "USD",
          quote_currency: currency,
          rate,
          fetched_at: new Date().toISOString(),
        })
      )
    );
    return map;
  } catch {
    return null;
  }
}
