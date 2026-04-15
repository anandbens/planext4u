import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";

interface LoginPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message?: string;
}

export function LoginPromptDialog({ open, onOpenChange, message }: LoginPromptDialogProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogTitle className="text-center">Sign in Required</DialogTitle>
        <DialogDescription className="text-center text-sm text-muted-foreground">
          {message || "Please sign in to your account to continue with this action."}
        </DialogDescription>
        <div className="flex flex-col gap-3 mt-4">
          <Button className="w-full gap-2" onClick={() => navigate("/app/login")}>
            <LogIn className="h-4 w-4" /> Sign In
          </Button>
          <Button variant="outline" className="w-full gap-2" onClick={() => navigate("/app/register")}>
            <UserPlus className="h-4 w-4" /> Create Account
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
