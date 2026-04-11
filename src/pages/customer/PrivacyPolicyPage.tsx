import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";

export default function PrivacyPolicyPage() {
  const { data: page, isLoading } = useQuery({
    queryKey: ["cms-page", "privacy-policy"],
    queryFn: async () => {
      const { data } = await supabase.from("cms_pages").select("*").eq("slug", "privacy-policy").eq("status", "active").single();
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="flex items-center gap-3 px-4 pb-3 border-b bg-card sticky top-0 z-10 safe-area-top">
        <Link to="/app/login" className="p-1"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-lg font-bold">Privacy Policy</h1>
      </div>
      <div className="max-w-2xl mx-auto p-6 prose prose-sm dark:prose-invert">
        {isLoading ? (
          <div className="space-y-3">{Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-4 w-full" />)}</div>
        ) : page ? (
          <div dangerouslySetInnerHTML={{ __html: page.content }} />
        ) : (
          <p className="text-muted-foreground">Content not available</p>
        )}
      </div>
    </div>
  );
}
