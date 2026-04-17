import { Card } from "@/components/ui/card";
import { Banknote, CreditCard, Landmark, Smartphone, Wallet, Calendar } from "lucide-react";

export type FoodPaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "emi" | "cod";

const METHODS: Array<{ id: FoodPaymentMethod; label: string; sub: string; Icon: typeof Banknote }> = [
  { id: "upi", label: "UPI", sub: "GPay, PhonePe, Paytm & more", Icon: Smartphone },
  { id: "card", label: "Credit / Debit Card", sub: "Visa, Mastercard, RuPay, Amex", Icon: CreditCard },
  { id: "netbanking", label: "Netbanking", sub: "All major banks", Icon: Landmark },
  { id: "wallet", label: "Wallets", sub: "Paytm, Mobikwik, Freecharge", Icon: Wallet },
  { id: "emi", label: "EMI", sub: "No-cost & standard EMI on cards", Icon: Calendar },
  { id: "cod", label: "Cash on Delivery", sub: "Pay the rider on receipt", Icon: Banknote },
];

interface Props {
  value: FoodPaymentMethod;
  onChange: (m: FoodPaymentMethod) => void;
  allowCod?: boolean;
}

export function PaymentMethodPicker({ value, onChange, allowCod = true }: Props) {
  const methods = allowCod ? METHODS : METHODS.filter(m => m.id !== "cod");
  return (
    <Card className="p-3 space-y-2">
      <h3 className="text-sm font-semibold">Payment method</h3>
      <div className="space-y-2">
        {methods.map(m => {
          const Icon = m.Icon;
          const active = value === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => onChange(m.id)}
              className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition ${
                active ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
              }`}
            >
              <div className={`h-9 w-9 rounded-md flex items-center justify-center ${active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">{m.label}</p>
                <p className="text-[11px] text-muted-foreground">{m.sub}</p>
              </div>
              <div className={`h-4 w-4 rounded-full border-2 ${active ? "border-primary bg-primary" : "border-border"}`} />
            </button>
          );
        })}
      </div>
    </Card>
  );
}
