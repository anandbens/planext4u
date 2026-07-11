import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export interface BankDetails {
  account_name: string;
  account_number: string;
  account_type: string;
  ifsc: string;
  bank: string;
  branch: string;
  branch_address: string;
  upi_id?: string;
}

const FALLBACK: BankDetails = {
  account_name: "PLANEXT4U ALL SOLUTIONS INDIA PRIVATE LIMITED",
  account_number: "20430210003619",
  account_type: "CAA",
  ifsc: "UCBA0002043",
  bank: "UCO Bank",
  branch: "COIMBATORE MCC",
  branch_address: "671/449 Avinashi Road, Coimbatore, Tamil Nadu 641004",
  upi_id: "",
};

export function useBankDetails() {
  const [data, setData] = useState<BankDetails>(FALLBACK);
  useEffect(() => {
    (async () => {
      try {
        const { data: row } = await supabase
          .from("platform_variables")
          .select("value")
          .eq("key", "company_bank_details")
          .maybeSingle();
        if (row?.value) {
          const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
          setData({ ...FALLBACK, ...parsed });
        }
      } catch {
        /* keep fallback */
      }
    })();
  }, []);
  return data;
}

export default function BankDetailsCard({ compact = false }: { compact?: boolean }) {
  const b = useBankDetails();

  const Row = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex items-center gap-2">
        <span className="font-semibold text-sm text-right">{value || "—"}</span>
        {value ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => {
              navigator.clipboard.writeText(value);
              toast.success(`${label} copied`);
            }}
          >
            <Copy className="w-3 h-3" />
          </Button>
        ) : null}
      </div>
    </div>
  );

  return (
    <Card className={compact ? "" : "premium-card"}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="w-4 h-4 text-primary" />
          Company Bank Details
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <Row label="Account Name" value={b.account_name} />
        <Row label="Account Number" value={b.account_number} />
        <Row label="Account Type" value={b.account_type} />
        <Row label="IFSC" value={b.ifsc} />
        <Row label="Bank" value={b.bank} />
        <Row label="Branch" value={b.branch} />
        <Row label="Branch Address" value={b.branch_address} />
        {b.upi_id ? <Row label="UPI ID" value={b.upi_id} /> : null}
      </CardContent>
    </Card>
  );
}
