import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function RiderLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      if (!data.user) throw new Error("Login failed");
      // verify rider role
      const { data: role } = await supabase.from('user_roles').select('role').eq('user_id', data.user.id).eq('role', 'rider' as any).maybeSingle();
      if (!role) { await supabase.auth.signOut(); throw new Error("This account is not registered as a rider."); }
      toast.success("Welcome rider"); navigate('/rider');
    } catch (err: any) {
      toast.error(err.message || "Could not log in");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/20 p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="text-center">
          <h1 className="text-xl font-bold">Rider Sign In</h1>
          <p className="text-xs text-muted-foreground mt-1">Deliver with P4U</p>
        </div>
        <form onSubmit={onLogin} className="space-y-3">
          <div><Label>Email</Label><Input type="email" value={email} onChange={e => setEmail(e.target.value)} required /></div>
          <div><Label>Password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required /></div>
          <Button type="submit" disabled={loading} className="w-full">{loading ? "Signing in…" : "Sign In"}</Button>
        </form>
        <p className="text-center text-xs text-muted-foreground">Need a rider account? Contact P4U admin.</p>
      </Card>
    </div>
  );
}
