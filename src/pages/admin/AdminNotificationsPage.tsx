import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell, Send, Users, Store, Globe } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function AdminNotificationsPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [targetType, setTargetType] = useState<string>("all");
  const [specificIds, setSpecificIds] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<Array<{ title: string; body: string; target: string; sent: number; time: string }>>([]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }

    setSending(true);
    try {
      let userIds: string[] | undefined;

      if (targetType === "specific") {
        userIds = specificIds.split(",").map((id) => id.trim()).filter(Boolean);
        if (userIds.length === 0) {
          toast.error("Enter at least one user ID");
          setSending(false);
          return;
        }
      } else if (targetType === "all" || targetType === "customers" || targetType === "vendors") {
        // Fetch user IDs based on target type
        const roleFilter = targetType === "vendors" ? "vendor" : targetType === "customers" ? "customer" : undefined;
        
        if (roleFilter) {
          const { data: roles } = await supabase
            .from("user_roles" as any)
            .select("user_id")
            .eq("role", roleFilter);
          userIds = (roles as any[])?.map((r) => r.user_id) || [];
        } else {
          // All users with push tokens
          const { data: devices } = await supabase
            .from("user_devices")
            .select("user_id")
            .neq("push_token", "");
          userIds = [...new Set((devices || []).map((d) => d.user_id))];
        }
      }

      const data: Record<string, string> = {};
      if (deepLink.trim()) {
        data.deep_link = deepLink.trim();
      }

      const { data: result, error } = await supabase.functions.invoke("send-push-notification", {
        body: { user_ids: userIds, title: title.trim(), body: body.trim(), data },
      });

      if (error) throw error;

      const sent = result?.sent || 0;
      toast.success(`Notification sent to ${sent} device(s)`);
      setHistory((prev) => [
        { title, body, target: targetType, sent, time: new Date().toLocaleString() },
        ...prev,
      ]);
      setTitle("");
      setBody("");
      setDeepLink("");
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="Push Notifications">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Send Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Target Audience</Label>
              <Select value={targetType} onValueChange={setTargetType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"><div className="flex items-center gap-2"><Globe className="h-4 w-4" /> All Users</div></SelectItem>
                  <SelectItem value="customers"><div className="flex items-center gap-2"><Users className="h-4 w-4" /> Customers Only</div></SelectItem>
                  <SelectItem value="vendors"><div className="flex items-center gap-2"><Store className="h-4 w-4" /> Vendors Only</div></SelectItem>
                  <SelectItem value="specific">Specific Users</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "specific" && (
              <div>
                <Label>User IDs (comma-separated)</Label>
                <Input
                  value={specificIds}
                  onChange={(e) => setSpecificIds(e.target.value)}
                  placeholder="user-id-1, user-id-2"
                />
              </div>
            )}

            <div>
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Notification title" />
            </div>

            <div>
              <Label>Body</Label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Notification message" rows={3} />
            </div>

            <div>
              <Label>Deep Link (optional)</Label>
              <Input value={deepLink} onChange={(e) => setDeepLink(e.target.value)} placeholder="/app/orders or /app/product/123" />
            </div>

            <Button onClick={handleSend} disabled={sending} className="w-full gap-2">
              <Send className="h-4 w-4" /> {sending ? "Sending..." : "Send Notification"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Sends</CardTitle>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="text-muted-foreground text-sm">No notifications sent this session.</p>
            ) : (
              <div className="space-y-3">
                {history.map((h, i) => (
                  <div key={i} className="border rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{h.title}</span>
                      <Badge variant="outline">{h.sent} sent</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{h.body}</p>
                    <p className="text-xs text-muted-foreground">Target: {h.target} • {h.time}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
