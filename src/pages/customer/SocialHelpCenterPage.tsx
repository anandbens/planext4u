import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronRight, Search, MessageCircle, Flag, Mail } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SocialLayout from "@/components/social/SocialLayout";

const FAQS = [
  { q: "How do I make my account private?", a: "Go to Settings → Privacy → Toggle 'Private Account'. Only approved followers will see your content." },
  { q: "How do I report a post or user?", a: "Tap the three-dot menu (⋯) on any post or profile page and select 'Report'. Choose the appropriate reason." },
  { q: "How do I change my username?", a: "Go to Edit Profile → Username. Note: you can change your username once every 30 days." },
  { q: "Why can't I send messages?", a: "Direct messages require both users to follow each other (mutual following). Make sure the other person follows you back." },
  { q: "How do I delete my account?", a: "Go to Settings → Account Ownership & Control → Delete Account. Account deletion is permanent after 30 days." },
  { q: "How do I recover my password?", a: "On the login screen, tap 'Forgot Password'. Enter your email and we'll send a reset link." },
  { q: "How do reels work?", a: "Reels are short video/photo content. Tap the '+' icon → Create → select Reel. You can add captions, hashtags, and tag products." },
  { q: "How do I earn rewards?", a: "Engage with the platform — post content, refer friends, and complete orders on the Shop to earn P4U Wallet points." },
];

export default function SocialHelpCenterPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [showReport, setShowReport] = useState(false);
  const [reportText, setReportText] = useState("");
  const [sending, setSending] = useState(false);

  const filtered = FAQS.filter(f => f.q.toLowerCase().includes(search.toLowerCase()) || f.a.toLowerCase().includes(search.toLowerCase()));

  const submitReport = async () => {
    if (!reportText.trim()) { toast.error("Please describe your issue"); return; }
    setSending(true);
    // In production, this would submit to a support ticket table
    setTimeout(() => {
      toast.success("Your report has been submitted. Our team will get back to you shortly.");
      setReportText("");
      setShowReport(false);
      setSending(false);
    }, 800);
  };

  const content = (
    <div className="pb-28 md:pb-8">
      <header className="sticky top-0 z-40 bg-card border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">Help Center</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search help articles..." className="pl-9 bg-muted/50 border-0" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <button onClick={() => setShowReport(true)} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/30 bg-card hover:bg-muted/50 transition-colors">
            <Flag className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-center">Report Issue</span>
          </button>
          <button onClick={() => toast.info("Live chat coming soon")} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/30 bg-card hover:bg-muted/50 transition-colors">
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-center">Live Chat</span>
          </button>
          <button onClick={() => { window.location.href = "mailto:support@planext4u.com"; }} className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border/30 bg-card hover:bg-muted/50 transition-colors">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <span className="text-[11px] font-medium text-center">Email Us</span>
          </button>
        </div>

        {/* FAQs */}
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Frequently Asked Questions</h3>
          <div className="bg-card rounded-xl border border-border/30 divide-y divide-border/20">
            {filtered.map((faq, i) => (
              <div key={i}>
                <button className="w-full flex items-center justify-between px-4 py-3 text-sm text-left hover:bg-muted/30 transition-colors" onClick={() => setExpandedIdx(expandedIdx === i ? null : i)}>
                  <span className="font-medium flex-1 pr-2">{faq.q}</span>
                  {expandedIdx === i ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                </button>
                {expandedIdx === i && (
                  <div className="px-4 pb-3">
                    <p className="text-sm text-muted-foreground">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className="px-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">No results found</p>
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowReport(true)}>Report an Issue</Button>
              </div>
            )}
          </div>
        </div>

        {/* Report Issue Form */}
        {showReport && (
          <div className="bg-card rounded-xl border border-border/30 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Report an Issue</h3>
              <button onClick={() => setShowReport(false)} className="text-xs text-muted-foreground">Cancel</button>
            </div>
            <Textarea value={reportText} onChange={(e) => setReportText(e.target.value)} placeholder="Describe your issue in detail..." className="resize-none" rows={4} />
            <Button className="w-full" disabled={sending || !reportText.trim()} onClick={submitReport}>
              {sending ? "Submitting..." : "Submit Report"}
            </Button>
          </div>
        )}

        {/* Contact Info */}
        <div className="bg-card rounded-xl border border-border/30 p-4">
          <h3 className="text-sm font-bold mb-2">Contact Support</h3>
          <div className="space-y-1 text-sm text-muted-foreground">
            <p>Email: <span className="text-primary">support@planext4u.com</span></p>
            <p>Phone: <span className="text-primary">+91-9787176868</span></p>
            <p className="text-xs">Available Mon-Sat, 9 AM - 6 PM IST</p>
          </div>
        </div>
      </div>
    </div>
  );

  return <SocialLayout hideSidebar>{content}</SocialLayout>;
}
