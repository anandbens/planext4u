import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Image, Layout, Menu, Link2, Plus, GripVertical } from "lucide-react";

const banners = [
  { id: 1, title: "Summer Sale 2026", priority: 1, status: "active", dates: "Mar 1 – Mar 31" },
  { id: 2, title: "New Arrivals", priority: 2, status: "active", dates: "Mar 1 – Apr 30" },
  { id: 3, title: "Diwali Special", priority: 3, status: "inactive", dates: "Oct 15 – Nov 15" },
];

export default function CMSPage() {
  return (
    <AdminLayout>
      <div className="page-header">
        <h1 className="page-title">Content Management</h1>
        <p className="page-description">Manage banners, carousel, mega menu, and homepage sections</p>
      </div>

      <Tabs defaultValue="banners" className="space-y-4">
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="banners" className="gap-2"><Image className="h-4 w-4" /> Banners</TabsTrigger>
          <TabsTrigger value="sections" className="gap-2"><Layout className="h-4 w-4" /> Sections</TabsTrigger>
          <TabsTrigger value="menu" className="gap-2"><Menu className="h-4 w-4" /> Mega Menu</TabsTrigger>
          <TabsTrigger value="footer" className="gap-2"><Link2 className="h-4 w-4" /> Footer</TabsTrigger>
        </TabsList>

        <TabsContent value="banners">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Homepage Banners</h3>
            <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Add Banner</Button>
          </div>
          <div className="space-y-3">
            {banners.map((b) => (
              <div key={b.id} className="bg-card rounded-xl border border-border/50 p-4 flex items-center gap-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                <div className="h-16 w-28 rounded-lg bg-secondary/50 flex items-center justify-center">
                  <Image className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{b.title}</p>
                  <p className="text-xs text-muted-foreground">Priority: {b.priority} · {b.dates}</p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${b.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                  {b.status}
                </span>
                <Button variant="outline" size="sm">Edit</Button>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sections">
          <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-muted-foreground text-sm">Configure homepage sections: featured products, top categories, promotional banners, and more. Connect to your API to manage section content dynamically.</p>
          </div>
        </TabsContent>

        <TabsContent value="menu">
          <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-muted-foreground text-sm">Configure mega menu categories and subcategories for the customer website navigation.</p>
          </div>
        </TabsContent>

        <TabsContent value="footer">
          <div className="bg-card rounded-xl border border-border/50 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
            <p className="text-muted-foreground text-sm">Manage footer links, social media links, and copyright text.</p>
          </div>
        </TabsContent>
      </Tabs>
    </AdminLayout>
  );
}
