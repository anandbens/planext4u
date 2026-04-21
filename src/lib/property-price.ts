/**
 * Property price formatter with hybrid logic:
 *  - When active country is India (IN): use Cr / L / K notation (familiar to IN users)
 *  - For all other countries: use standard Intl compact (1.2M, 5K) via active locale
 *
 * Use this for real-estate / Homes module pricing only. For regular product /
 * service / order amounts, use `useCurrency().format(amount, { compact })`.
 */
import { getActiveCountry, formatCurrency } from "./currency";

export function formatPropertyPrice(price: number | null | undefined): string {
  const n = Number(price ?? 0);
  if (!isFinite(n)) return formatCurrency(0);

  const c = getActiveCountry();

  // India → keep Crore / Lakh familiarity
  if (c.code === "IN") {
    const sym = c.currency_symbol;
    if (n >= 10000000) return `${sym}${(n / 10000000).toFixed(1)} Cr`;
    if (n >= 100000) return `${sym}${(n / 100000).toFixed(1)} L`;
    if (n >= 1000) return `${sym}${(n / 1000).toFixed(0)}K`;
    return formatCurrency(n, { decimals: 0 });
  }

  // Other countries → Intl compact
  return formatCurrency(n, { compact: true, decimals: 0 });
}
