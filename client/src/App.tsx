import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Dashboard from "@/pages/dashboard";
import Kiosk from "@/pages/kiosk";
import Reviews from "@/pages/reviews";
import CalendarPage from "@/pages/calendar";
import Invoicing from "@/pages/invoicing";
import SaasAdmin from "@/pages/saas";
import { AffiliateLogin, AffiliateDashboard } from "@/pages/affiliate-portal";
import Analytics from "@/pages/analytics";
import NotFound from "@/pages/not-found";
import { ArrowLeft } from "lucide-react";

function BackButton() {
  const [location] = useLocation();
  if (location === "/") return null;
  return (
    <button
      onClick={() => window.history.back()}
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
      <Route path="/" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
      <Route path="/reviews" component={Reviews} />
      <Route path="/calendar" component={CalendarPage} />
      <Route path="/invoicing" component={Invoicing} />
      <Route path="/invoicing/customers/:id" component={Invoicing} />
      <Route path="/invoicing/invoices/:id" component={Invoicing} />
      <Route path="/saas" component={SaasAdmin} />
      <Route path="/portal" component={AffiliateLogin} />
      <Route path="/portal/dashboard" component={AffiliateDashboard} />
      <Route path="/analytics" component={Analytics} />
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
