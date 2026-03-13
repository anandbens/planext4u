import { Link } from "react-router-dom";
import { ArrowLeft, Package, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const orders = [
  { id: "ORD-001", date: "Mar 13, 2026", total: 2750, status: "In Progress", items: [{ title: "Wireless Headphones", qty: 1, emoji: "🎧" }], vendor: "TechMart" },
  { id: "ORD-002", date: "Mar 11, 2026", total: 1798, status: "Delivered", items: [{ title: "Cotton T-Shirt Pack", qty: 2, emoji: "👕" }], vendor: "FashionHub" },
  { id: "ORD-003", date: "Mar 8, 2026", total: 6344, status: "Completed", items: [{ title: "Smart Watch Pro", qty: 1, emoji: "⌚" }], vendor: "GadgetWorld" },
  { id: "ORD-004", date: "Mar 5, 2026", total: 599, status: "Cancelled", items: [{ title: "Organic Honey", qty: 1, emoji: "🍯" }], vendor: "GreenGrocer" },
];

const statusColor: Record<string, string> = {
  "In Progress": "bg-info/10 text-info",
  "Delivered": "bg-success/10 text-success",
  "Completed": "bg-success/10 text-success",
  "Cancelled": "bg-destructive/10 text-destructive",
};

export default function CustomerOrdersPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/app"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">My Orders</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-3">
        {orders.map((o) => (
          <Card key={o.id} className="p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">{o.id}</p>
                <p className="text-xs text-muted-foreground">{o.date} • {o.vendor}</p>
              </div>
              <Badge className={statusColor[o.status] + " border-0"}>{o.status}</Badge>
            </div>
            {o.items.map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-10 w-10 bg-secondary/30 rounded-lg flex items-center justify-center text-lg">{item.emoji}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">Qty: {item.qty}</p>
                </div>
                <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
              </div>
            ))}
          </Card>
        ))}
      </main>
    </div>
  );
}
