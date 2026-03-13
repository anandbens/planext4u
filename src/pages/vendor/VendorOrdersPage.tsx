import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const orders = [
  { id: "ORD-1842", customer: "Rahul Sharma", items: "Wireless Headphones Pro", total: 2750, status: "placed", time: "2 min ago" },
  { id: "ORD-1840", customer: "Priya Patel", items: "Bluetooth Speaker × 2", total: 3598, status: "accepted", time: "25 min ago" },
  { id: "ORD-1838", customer: "Amit Kumar", items: "USB-C Hub", total: 1299, status: "in_progress", time: "1 hr ago" },
  { id: "ORD-1835", customer: "Sneha Reddy", items: "LED Desk Lamp × 3", total: 2697, status: "delivered", time: "3 hrs ago" },
  { id: "ORD-1832", customer: "Vikram Singh", items: "Wireless Headphones Pro", total: 2499, status: "completed", time: "5 hrs ago" },
  { id: "ORD-1830", customer: "Meera Joshi", items: "Bluetooth Speaker", total: 1799, status: "cancelled", time: "1 day ago" },
];

const statusStyle: Record<string, string> = {
  placed: "bg-primary/10 text-primary", accepted: "bg-info/10 text-info",
  in_progress: "bg-warning/10 text-warning", delivered: "bg-success/10 text-success",
  completed: "bg-success/10 text-success", cancelled: "bg-destructive/10 text-destructive",
};

export default function VendorOrdersPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-sm border-b border-border/50">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" asChild><Link to="/vendor"><ArrowLeft className="h-5 w-5" /></Link></Button>
          <h1 className="font-semibold">Orders</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <Tabs defaultValue="all">
          <TabsList className="mb-4">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="new">New (1)</TabsTrigger>
            <TabsTrigger value="active">Active (2)</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
          </TabsList>
          <TabsContent value="all" className="space-y-3">
            {orders.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold">{o.id}</p>
                      <Badge className={`${statusStyle[o.status]} border-0 text-[10px]`}>{o.status.replace("_", " ")}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{o.customer} • {o.time}</p>
                  </div>
                  <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground">{o.items}</p>
                {o.status === "placed" && (
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" className="h-7 text-xs">Accept</Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">Reject</Button>
                  </div>
                )}
                {o.status === "accepted" && <Button size="sm" className="h-7 text-xs mt-3">Mark In Progress</Button>}
                {o.status === "in_progress" && <Button size="sm" className="h-7 text-xs mt-3">Mark Ready / Delivered</Button>}
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="new" className="space-y-3">
            {orders.filter((o) => o.status === "placed").map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold">{o.id}</p>
                    <p className="text-xs text-muted-foreground">{o.customer}</p>
                  </div>
                  <p className="text-sm font-bold">₹{o.total.toLocaleString()}</p>
                </div>
                <p className="text-xs text-muted-foreground">{o.items}</p>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" className="h-7 text-xs">Accept</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive">Reject</Button>
                </div>
              </Card>
            ))}
          </TabsContent>
          <TabsContent value="active"><p className="text-sm text-muted-foreground">Active orders shown here</p></TabsContent>
          <TabsContent value="completed"><p className="text-sm text-muted-foreground">Completed orders shown here</p></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
