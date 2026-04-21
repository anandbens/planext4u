/**
 * Multi-currency formatting utilities.
 * Reads the active country from CountryContext / cached snapshot.
 * Falls back to INR if no country is loaded.
 */

export interface CountryConfig {
  code: string;
  name: string;
  currency_code: string;
  currency_symbol: string;
  currency_position: "prefix" | "suffix";
  decimal_places: number;
  decimal_separator: string;
  thousands_separator: string;
  locale_code: string;
  tax_label: string;
  tax_inclusive: boolean;
  default_tax_rate: number;
  phone_prefix: string;
  flag_emoji?: string | null;
}

export const DEFAULT_COUNTRY: CountryConfig = {
  code: "IN",
  name: "India",
  currency_code: "INR",
  currency_symbol: "₹",
  currency_position: "prefix",
  decimal_places: 2,
  decimal_separator: ".",
  thousands_separator: ",",
  locale_code: "en-IN",
  tax_label: "GST",
  tax_inclusive: false,
  default_tax_rate: 18,
  phone_prefix: "+91",
  flag_emoji: "🇮🇳",
};

let _activeCountry: CountryConfig = DEFAULT_COUNTRY;

/** Set globally (called by CountryProvider after fetch). */
export function setActiveCountry(c: CountryConfig) {
  _activeCountry = { ...DEFAULT_COUNTRY, ...c };
}

/** Read the currently active country config (sync, used outside React). */
export function getActiveCountry(): CountryConfig {
  return _activeCountry;
}

/** Currency symbol shortcut. */
export function getCurrencySymbol(): string {
  return _activeCountry.currency_symbol;
}

/** Currency code shortcut (INR / NGN / USD). */
export function getCurrencyCode(): string {
  return _activeCountry.currency_code;
}

/**
 * Format a number as currency for the active country.
 * @param amount numeric value (use 0 for falsy)
 * @param opts.showSymbol include the symbol (default true)
 * @param opts.compact use 1.2K / 1.5L style (Indian/intl)
 * @param opts.decimals override decimal places
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  opts: { showSymbol?: boolean; compact?: boolean; decimals?: number; country?: CountryConfig } = {}
): string {
  const c = opts.country ?? _activeCountry;
  const n = Number(amount ?? 0);
  if (!isFinite(n)) return opts.showSymbol === false ? "0" : `${c.currency_symbol}0`;

  const decimals = opts.decimals ?? c.decimal_places;

  let formatted: string;
  if (opts.compact) {
    try {
      formatted = new Intl.NumberFormat(c.locale_code, {
        notation: "compact",
        maximumFractionDigits: 1,
      }).format(n);
    } catch {
      formatted = n.toFixed(decimals);
    }
  } else {
    try {
      formatted = new Intl.NumberFormat(c.locale_code, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(n);
    } catch {
      formatted = n.toFixed(decimals);
    }
  }

  if (opts.showSymbol === false) return formatted;
  return c.currency_position === "suffix"
    ? `${formatted}${c.currency_symbol}`
    : `${c.currency_symbol}${formatted}`;
}

/** Tax label for active country (e.g. "GST", "VAT", "Sales Tax"). */
export function getTaxLabel(): string {
  return _activeCountry.tax_label;
}

/** Default tax rate (%) for active country. */
export function getDefaultTaxRate(): number {
  return _activeCountry.default_tax_rate;
}
