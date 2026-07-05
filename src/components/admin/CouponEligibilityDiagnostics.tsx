/**
 * CouponEligibilityDiagnostics — admin-only panel to explain, for any customer,
 * exactly which eligibility rule passed or failed for a campaign. Powers "why
 * didn't user X get NAMAKKAL100?" investigations in one click.
 */
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props { campaignId: string }

export function CouponEligibilityDiagnostics({ campaignId }: Props) {
  const [customerId, setCustomerId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const run = async () => {
    if (!campaignId || !customerId.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase.rpc as any)("get_coupon_eligibility_breakdown", {
        _campaign_id: campaignId, _customer_id: customerId.trim(),
      });
      if (error) throw error;
      setResult(data);
      if (!data?.found) toast.error(data?.reason || "Not found");
    } catch (e: any) {
      toast.error(e?.message || "Diagnostic failed");
    } finally { setLoading(false); }
  };

  return (
    <Card className="p-3 space-y-3">
      <div className="flex items-center gap-2">
        <Search className="w-4 h-4 text-primary" />
        <h4 className="font-semibold text-sm">Eligibility Diagnostics</h4>
        <span className="text-[11px] text-muted-foreground">— see why a specific customer did or didn't get this coupon</span>
      </div>
      <div className="flex gap-2">
        <Input placeholder="Customer ID (e.g. CUST-XXXXX)" value={customerId} onChange={e => setCustomerId(e.target.value)} className="h-9" />
        <Button size="sm" onClick={run} disabled={loading || !campaignId}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : "Diagnose"}
        </Button>
      </div>
      {result?.found && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">
            {result.customer_name} · {result.customer_id} vs {result.campaign_name}
          </div>
          <div>
            <Badge variant={result.overall_eligible ? "default" : "destructive"}>
              {result.overall_eligible ? "Eligible" : `${result.fail_count} check(s) failed`}
            </Badge>
          </div>
          <div className="space-y-1">
            {(result.checks || []).map((c: any, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs p-2 rounded border bg-muted/20">
                {c.ok
                  ? <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0 mt-0.5" />
                  : <XCircle className="w-3.5 h-3.5 text-destructive shrink-0 mt-0.5" />}
                <div>
                  <div className="font-medium">{c.check}</div>
                  <div className="text-muted-foreground">{c.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
