import { describe, it, expect, beforeEach } from "vitest";
import { formatPropertyPrice } from "./property-price";
import { setActiveCountry, DEFAULT_COUNTRY, type CountryConfig } from "./currency";

const IN: CountryConfig = { ...DEFAULT_COUNTRY };

const NG: CountryConfig = {
  code: "NG",
  name: "Nigeria",
  currency_code: "NGN",
  currency_symbol: "₦",
  currency_position: "prefix",
  decimal_places: 2,
  decimal_separator: ".",
  thousands_separator: ",",
  locale_code: "en-NG",
  tax_label: "VAT",
  tax_inclusive: false,
  default_tax_rate: 7.5,
  phone_prefix: "+234",
  flag_emoji: "🇳🇬",
};

const US: CountryConfig = {
  code: "US",
  name: "United States",
  currency_code: "USD",
  currency_symbol: "$",
  currency_position: "prefix",
  decimal_places: 2,
  decimal_separator: ".",
  thousands_separator: ",",
  locale_code: "en-US",
  tax_label: "Sales Tax",
  tax_inclusive: false,
  default_tax_rate: 0,
  phone_prefix: "+1",
  flag_emoji: "🇺🇸",
};

describe("formatPropertyPrice — India (IN)", () => {
  beforeEach(() => setActiveCountry(IN));

  it("formats >= 1 Cr in Crores", () => {
    expect(formatPropertyPrice(15000000)).toBe("₹1.5 Cr");
    expect(formatPropertyPrice(25000000)).toBe("₹2.5 Cr");
  });

  it("formats >= 1 Lakh in Lakhs", () => {
    expect(formatPropertyPrice(500000)).toBe("₹5.0 L");
    expect(formatPropertyPrice(1250000)).toBe("₹12.5 L");
  });

  it("formats >= 1K in K", () => {
    expect(formatPropertyPrice(50000)).toBe("₹50K");
    expect(formatPropertyPrice(9999)).toMatch(/₹/);
  });

  it("handles null/undefined/invalid", () => {
    expect(formatPropertyPrice(null)).toMatch(/₹/);
    expect(formatPropertyPrice(undefined)).toMatch(/₹/);
    expect(formatPropertyPrice(NaN)).toMatch(/₹/);
  });
});

describe("formatPropertyPrice — non-IN countries (compact Intl)", () => {
  it("Nigeria uses NGN compact notation, no Cr/L", () => {
    setActiveCountry(NG);
    const out = formatPropertyPrice(15000000);
    expect(out).not.toContain("Cr");
    expect(out).not.toContain(" L");
    expect(out).toMatch(/15M|15 ?M/i);
  });

  it("US uses USD compact notation", () => {
    setActiveCountry(US);
    const out = formatPropertyPrice(2500000);
    expect(out).not.toContain("Cr");
    expect(out).not.toContain(" L");
    expect(out).toMatch(/\$/);
    expect(out).toMatch(/2\.5M/i);
  });

  it("US thousands use K not L", () => {
    setActiveCountry(US);
    const out = formatPropertyPrice(50000);
    expect(out).not.toContain(" L");
    expect(out).toMatch(/50K/i);
  });
});
