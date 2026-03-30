import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Calculator } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { CustomerLayout } from "@/components/customer/CustomerLayout";

function formatPrice(price: number): string {
  if (price >= 10000000) return `₹${(price / 10000000).toFixed(2)} Cr`;
  if (price >= 100000) return `₹${(price / 100000).toFixed(2)} L`;
  return `₹${price.toLocaleString("en-IN")}`;
}

export default function PropertyEMIPage() {
  const navigate = useNavigate();
  const [loanAmount, setLoanAmount] = useState([5000000]);
  const [rate, setRate] = useState([8.5]);
  const [tenure, setTenure] = useState([20]);

  const P = loanAmount[0];
  const r = rate[0] / 12 / 100;
  const n = tenure[0] * 12;
  const emi = r > 0 ? Math.round((P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)) : 0;
  const totalPayment = emi * n;
  const totalInterest = totalPayment - P;
  const principalPct = Math.round((P / totalPayment) * 100);

  return (
    <CustomerLayout>
      <div className="max-w-lg mx-auto pb-24 md:pb-6">
        <div className="px-4 py-3 flex items-center gap-3 border-b border-border/30">
          <button onClick={() => navigate(-1)} className="h-9 w-9 rounded-full border border-border/50 flex items-center justify-center">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-base font-bold">EMI Calculator</h1>
        </div>
        <div className="px-4 py-6 space-y-6">
          <Card className="p-5 space-y-5">
            <div>
              <p className="text-sm font-medium mb-2">Loan Amount: {formatPrice(loanAmount[0])}</p>
              <Slider value={loanAmount} onValueChange={setLoanAmount} min={100000} max={100000000} step={100000} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Interest Rate: {rate[0]}%</p>
              <Slider value={rate} onValueChange={setRate} min={5} max={20} step={0.1} />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Tenure: {tenure[0]} years</p>
              <Slider value={tenure} onValueChange={setTenure} min={1} max={30} step={1} />
            </div>
          </Card>

          <Card className="p-5 text-center">
            <Calculator className="h-8 w-8 text-primary mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Your Monthly EMI</p>
            <p className="text-3xl font-bold text-primary">₹{emi.toLocaleString("en-IN")}</p>
            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Principal</p>
                <p className="text-sm font-bold">{formatPrice(P)}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Interest</p>
                <p className="text-sm font-bold">{formatPrice(totalInterest)}</p>
              </div>
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-[10px] text-muted-foreground">Total</p>
                <p className="text-sm font-bold">{formatPrice(totalPayment)}</p>
              </div>
            </div>
            {/* Simple bar chart */}
            <div className="mt-4">
              <div className="flex h-4 rounded-full overflow-hidden">
                <div className="bg-primary" style={{ width: `${principalPct}%` }} />
                <div className="bg-warning" style={{ width: `${100 - principalPct}%` }} />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-muted-foreground">
                <span>Principal ({principalPct}%)</span>
                <span>Interest ({100 - principalPct}%)</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </CustomerLayout>
  );
}
