import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin";
import { AdminPortalLogin, AdminPortalDashboard } from "@/pages/ops-portal";
import Kiosk from "@/pages/kiosk";
import Reviews from "@/pages/reviews";
import CalendarPage from "@/pages/calendar";
import Invoicing from "@/pages/invoicing";
import SaasAdmin from "@/pages/saas";
import { AffiliateLogin, AffiliateDashboard } from "@/pages/affiliate-portal";
import Analytics from "@/pages/analytics";
import Support from "@/pages/support";
import NotFound from "@/pages/not-found";
import { ArrowLeft } from "lucide-react";

const NO_BACK_ROUTES = ["/", "/dashboard", "/portal", "/admin", "/saas", "/ops", "/ops/dashboard"];

function BackButton() {
  const [location, navigate] = useLocation();
  if (NO_BACK_ROUTES.includes(location)) return null;

  function getBackPath(loc: string): string {
    if (/^\/invoicing\/invoices\/\d+/.test(loc)) return "/invoicing";
    if (/^\/invoicing\/customers\/\d+/.test(loc)) return "/invoicing";
    if (/^\/invoicing/.test(loc)) return "/dashboard";
    if (/^\/portal\/dashboard/.test(loc)) return "/portal";
    return "/dashboard";
  }

  return (
    <button
      onClick={() => navigate(getBackPath(location))}
      data-testid="button-back"
      className="fixed top-4 left-4 z-50 flex items-center justify-center w-9 h-9 rounded-xl border border-black/10 bg-white/80 text-muted-foreground shadow-sm backdrop-blur-sm hover:bg-white hover:border-black/20 transition-all"
      title="Go back"
    >
      <ArrowLeft className="w-4 h-4" />
    </button>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/invoicing" component={Invoicing} />
      <Route path="/invoicing/customers/:id" component={Invoicing} />
      <Route path="/invoicing/invoices/:id" component={Invoicing} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/saas" component={SaasAdmin} />
      <Route path="/portal" component={AffiliateLogin} />
      <Route path="/portal/dashboard" component={AffiliateDashboard} />
      <Route path="/ops" component={AdminPortalLogin} />
      <Route path="/ops/dashboard" component={AdminPortalDashboard} />
      <Route path="/analytics" component={Analytics} />
      <Route path="/support" component={Support} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BackButton />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
