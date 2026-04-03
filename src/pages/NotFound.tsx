import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md">
        <div className="text-8xl font-bold text-primary mb-4">404</div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground mb-8">
          Sorry, the page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="default" className="gap-2">
            <Link to="/app"><Home className="h-4 w-4" /> Go Home</Link>
          </Button>
          <Button asChild variant="outline" className="gap-2" onClick={() => window.history.back()}>
            <span><ArrowLeft className="h-4 w-4" /> Go Back</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
