import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const users = [
      { email: "admin@planext4u.com", password: "P4u@Admin2026", name: "Super Admin", role: "admin" as const },
      { email: "finance@planext4u.com", password: "P4u@Finance2026", name: "Finance Manager", role: "finance" as const },
      { email: "sales@planext4u.com", password: "P4u@Sales2026", name: "Sales Executive", role: "sales" as const },
      { email: "vendor@planext4u.com", password: "P4u@Vendor2026", name: "Ravi Kumar", role: "vendor" as const, vendor_id: "VND-001" },
      { email: "customer@planext4u.com", password: "P4u@Customer2026", name: "Rahul Sharma", role: "customer" as const, customer_id: "USR-001" },
    ];

    const results = [];

    for (const u of users) {
      // Check if user already exists
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email);
      
      let userId: string;
      
      if (existing) {
        userId = existing.id;
        results.push({ email: u.email, status: "already_exists", id: userId });
      } else {
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { name: u.name },
        });
        if (createError) {
          results.push({ email: u.email, status: "error", error: createError.message });
          continue;
        }
        userId = newUser.user.id;
        results.push({ email: u.email, status: "created", id: userId });
      }

      // Upsert profile
      await supabaseAdmin.from("profiles").upsert({
        id: userId,
        name: u.name,
        email: u.email,
      }, { onConflict: "id" });

      // Upsert role
      await supabaseAdmin.from("user_roles").upsert({
        user_id: userId,
        role: u.role,
        vendor_id: (u as any).vendor_id || null,
        customer_id: (u as any).customer_id || null,
      }, { onConflict: "user_id,role" });
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
