/**
 * Centralized translator for Supabase/Postgres/network errors into
 * plain-English messages that non-technical admins can understand.
 *
 * Use anywhere you currently do `toast.error(err?.message || "Failed ...")`.
 *
 *   import { friendlyError } from "@/lib/friendly-error";
 *   toast.error(friendlyError(err, "Failed to save vendor"));
 */

type AnyErr = any;

const FK_TABLE_LABELS: Record<string, string> = {
  cities: "city",
  city_id: "city",
  areas: "area",
  area_id: "area",
  countries: "country",
  country_code: "country",
  states: "state",
  state_id: "state",
  districts: "district",
  district_id: "district",
  vendors: "vendor",
  vendor_id: "vendor",
  customers: "customer",
  customer_id: "customer",
  categories: "category",
  category_id: "category",
  products: "product",
  product_id: "product",
  services: "service",
  service_id: "service",
  orders: "order",
  order_id: "order",
  users: "user",
  user_id: "user",
};

const humanize = (key: string) => {
  const k = key.replace(/_id$|_fkey$|_key$/g, "").replace(/_/g, " ").trim();
  return FK_TABLE_LABELS[key] || FK_TABLE_LABELS[k] || k || "field";
};

const extractColumn = (msg: string): string | null => {
  // matches: column "xyz", "xyz" column, key (xyz)= ...
  const m =
    msg.match(/column\s+"?([a-z0-9_]+)"?/i) ||
    msg.match(/key\s*\(([^)]+)\)/i) ||
    msg.match(/"([a-z0-9_]+)"\s+violates/i);
  return m ? m[1].split(",")[0].trim() : null;
};

const extractTable = (msg: string): string | null => {
  const m =
    msg.match(/table\s+"?([a-z0-9_]+)"?/i) ||
    msg.match(/relation\s+"?([a-z0-9_]+)"?/i) ||
    msg.match(/on\s+table\s+"?([a-z0-9_]+)"?/i);
  return m ? m[1] : null;
};

export function friendlyError(err: AnyErr, fallback = "Something went wrong. Please try again."): string {
  if (!err) return fallback;
  if (typeof err === "string") return err;

  const code: string | undefined = err.code || err?.error?.code;
  const status: number | undefined = err.status || err?.error?.status;
  const rawMsg: string = (err.message || err?.error?.message || err.hint || "").toString();
  const details: string = (err.details || "").toString();
  const lower = (rawMsg + " " + details).toLowerCase();

  // --- Network / connectivity ---
  if (rawMsg.toLowerCase().includes("failed to fetch") || rawMsg.toLowerCase().includes("network")) {
    return "Can't reach the server. Please check your internet connection and try again.";
  }
  if (status === 401 || code === "PGRST301" || lower.includes("jwt")) {
    return "Your session has expired. Please sign in again.";
  }
  if (status === 403 || code === "42501" || lower.includes("permission denied") || lower.includes("row-level security") || lower.includes("not authorized")) {
    return "You don't have permission to perform this action. Please contact a super-admin.";
  }
  if (status === 404 || code === "PGRST116") {
    return "The record you're trying to update was not found. It may have been deleted.";
  }
  if (status === 408 || lower.includes("timeout")) {
    return "The request took too long. Please try again.";
  }

  // --- Postgres SQLSTATE codes ---
  switch (code) {
    case "23505": {
      // unique_violation
      const col = extractColumn(rawMsg + " " + details);
      const label = col ? humanize(col) : "value";
      // Try to surface the duplicate value if Postgres provided it
      const valMatch = (rawMsg + " " + details).match(/=\(([^)]+)\)/);
      const val = valMatch ? ` "${valMatch[1]}"` : "";
      return `A record with this ${label}${val} already exists. Please use a different ${label}.`;
    }
    case "23503": {
      // foreign_key_violation
      const col = extractColumn(rawMsg + " " + details);
      const label = col ? humanize(col) : "linked record";
      if (lower.includes("is still referenced") || lower.includes("update or delete")) {
        return `Can't delete this item because it's still being used by other ${label} records. Please remove the references first.`;
      }
      return `The selected ${label} is invalid or no longer exists. Please pick a valid ${label} and try again.`;
    }
    case "23502": {
      // not_null_violation
      const col = extractColumn(rawMsg);
      const label = col ? humanize(col) : "required field";
      return `Please fill in the ${label} — it can't be empty.`;
    }
    case "23514": {
      // check_violation
      const col = extractColumn(rawMsg);
      const label = col ? humanize(col) : "value";
      return `The ${label} doesn't meet the required format or range. Please review and try again.`;
    }
    case "22001": // string_data_right_truncation
      return "One of the values is too long. Please shorten it and try again.";
    case "22003": // numeric_value_out_of_range
      return "A number you entered is out of range. Please check the value.";
    case "22007":
    case "22008":
      return "A date or time value is invalid. Please pick a valid date.";
    case "22P02":
      return "One of the values has an invalid format (for example, a number or UUID). Please check your input.";
    case "23P01":
      return "This change conflicts with an existing record. Please review and try again.";
    case "PGRST204":
      return "One of the fields you tried to save doesn't exist on this record. Please refresh the page and try again.";
    case "PGRST200":
      return "Couldn't link the related records. Please refresh the page and try again.";
  }

  // --- Heuristic message matching (no code present) ---
  if (lower.includes("duplicate key") || lower.includes("unique constraint") || lower.includes("already exists")) {
    const col = extractColumn(rawMsg + " " + details);
    const label = col ? humanize(col) : "entry";
    return `A record with this ${label} already exists. Please use a different ${label}.`;
  }
  if (lower.includes("foreign key")) {
    const col = extractColumn(rawMsg + " " + details);
    const tbl = extractTable(rawMsg + " " + details);
    const label = col ? humanize(col) : tbl ? humanize(tbl) : "linked record";
    return `The selected ${label} is invalid. Please choose a valid ${label} and try again.`;
  }
  if (lower.includes("violates not-null") || lower.includes("null value in column")) {
    const col = extractColumn(rawMsg);
    const label = col ? humanize(col) : "required field";
    return `Please fill in the ${label} — it can't be empty.`;
  }
  if (lower.includes("invalid input syntax") || lower.includes("invalid uuid")) {
    return "One of the values has an invalid format. Please check your input.";
  }
  if (lower.includes("storage") && lower.includes("payload too large")) {
    return "The file you're uploading is too large. Please use a smaller file.";
  }
  if (lower.includes("rate limit") || status === 429) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // --- As a last resort, return the raw message if it looks readable, else the fallback ---
  if (rawMsg && rawMsg.length < 200 && !/^[A-Z0-9_]+$/.test(rawMsg)) {
    return rawMsg;
  }
  return fallback;
}
