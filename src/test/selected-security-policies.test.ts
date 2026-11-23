import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const queues = readFileSync("drizzle/migrations/0000_pin_selected_email_queue_function_paths.sql", "utf8");
const policies = readFileSync("drizzle/migrations/0001_restrict_selected_private_records_and_file_writes.sql", "utf8");

describe("selected security access rules", () => {
  it.each(["move_to_dlq", "read_email_batch", "enqueue_email", "delete_email"])("pins %s to an empty lookup path", (name) => {
    expect(queues).toMatch(new RegExp(`ALTER FUNCTION public\\.${name}\\([^;]+SET search_path = '';`));
  });

  it.each([
    ["Auth users can insert saved searches", "user_id"],
    ["Authenticated can insert reports", "reporter_id"],
    ["Authenticated can insert visits", "seeker_id"],
    ["Authenticated can insert enquiries", "seeker_id"],
    ["Auth users can insert messages", "sender_id"],
  ])("binds %s to the signed-in owner", (name, column) => {
    const statement = policies.split("\n").find((line) => line.includes(`"${name}"`));
    expect(statement).toContain("TO authenticated WITH CHECK");
    expect(statement).toContain("auth.uid() IS NOT NULL");
    expect(statement).toContain(`${column} = auth.uid()::text`);
    expect(statement).toContain(`${column} = public.get_customer_id(auth.uid())`);
  });

  it.each(["Website queries are publicly readable", "Report log is publicly readable", "System inserts vendor notifications"])("restricts %s to administrators", (name) => {
    const statement = policies.split("\n").find((line) => line.includes(`"${name}"`));
    expect(statement).toContain("TO authenticated");
    expect(statement).toContain("public.is_admin_user(auth.uid())");
  });

  it.each(["Auth update vendor-assets", "Auth delete vendor-assets", "Auth users can delete social videos", "Auth users can upload social videos", "Authenticated users can upload classified images", "Auth upload vendor-assets other"])("binds %s to file ownership", (name) => {
    const statement = policies.split("\n").find((line) => line.includes(`"${name}"`));
    expect(statement).toContain("TO authenticated");
    expect(statement).toContain("owner_id = auth.uid()::text");
    if (name === "Auth update vendor-assets") {
      expect(statement?.match(/owner_id = auth.uid\(\)::text/g)).toHaveLength(2);
    }
  });
});