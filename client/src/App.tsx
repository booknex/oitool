import { Switch, Route, useLocation } from "wouter";
import { queryClient, getQueryFn, apiRequest } from "./lib/queryClient";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LandingPage from "@/pages/landing";
import Dashboard from "@/pages/dashboard";
import AdminDashboard from "@/pages/admin";
import { AdminPortalLogin, AdminPortalDashboard } from "@/pages/ops-portal";
import Kiosk from "@/pages/kiosk";
import CalendarPage from "@/pages/calendar";
import Invoicing from "@/pages/invoicing";
import SaasAdmin from "@/pages/saas";
import { AffiliateLogin, AffiliateDashboard } from "@/pages/affiliate-portal";
import Analytics from "@/pages/analytics";
import Support from "@/pages/support";
import Team from "@/pages/team";
import Scheduling from "@/pages/scheduling";
import NotFound from "@/pages/not-found";
import { ArrowLeft, LogOut, Shield, Users, LayoutDashboard } from "lucide-react";

// ─── Routes where the footer & back button are hidden ────────────────────────

const NO_BACK_ROUTES = ["/", "/dashboard", "/portal", "/admin", "/saas", "/ops", "/ops/dashboard"];
const NO_SESSION_FOOTER_ROUTES = ["/", "/ops", "/portal"];

// ─── Back button ─────────────────────────────────────────────────────────────

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

// ─── Session footer ───────────────────────────────────────────────────────────

interface AdminMe { email: string }
interface AffiliateMe { affiliate: { id: number; name: string; email: string } }

function SessionFooter() {
  const [location, navigate] = useLocation();

  // All hooks must run unconditionally before any early returns
  const adminQuery = useQuery<AdminMe | null>({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30_000,
  });

  const affiliateQuery = useQuery<AffiliateMe | null>({
    queryKey: ["/api/affiliate/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 30_000,
  });

  const adminLogout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/logout"),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/admin/me"] });
      navigate("/ops");
    },
  });

  const affiliateLogout = useMutation({
    mutationFn: () => apiRequest("POST", "/api/affiliate/logout"),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/affiliate/me"] });
      navigate("/portal");
    },
  });

  // Conditional renders AFTER all hooks
  if (NO_SESSION_FOOTER_ROUTES.includes(location)) return null;
  if (adminQuery.isLoading || affiliateQuery.isLoading) return null;

  const admin = adminQuery.data;
  const affiliate = affiliateQuery.data;

  if (!admin && !affiliate) return null;

  const isAdmin = !!admin;
  const isAffiliate = !!affiliate;

  return (
    <div
      data-testid="session-footer"
      className="fixed bottom-0 inset-x-0 z-50 border-t border-slate-200/70 bg-white/85 backdrop-blur-xl shadow-[0_-4px_20px_rgba(15,23,42,0.06)]"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-11 flex items-center justify-between gap-3">

        {/* Left: identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          {isAdmin && (
            <>
              <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-indigo-50 border border-indigo-200/70 px-2.5 py-0.5">
                <Shield className="w-3 h-3 text-indigo-500" />
                <span className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wide">Admin</span>
              </div>
              <span className="text-sm text-slate-600 truncate">{admin.email}</span>
            </>
          )}
          {isAffiliate && !isAdmin && (
            <>
              <div className="flex items-center gap-1.5 shrink-0 rounded-full bg-violet-50 border border-violet-200/70 px-2.5 py-0.5">
                <Users className="w-3 h-3 text-violet-500" />
                <span className="text-[10px] font-semibold text-violet-600 uppercase tracking-wide">Affiliate</span>
              </div>
              <span className="text-sm text-slate-600 truncate">{affiliate.affiliate.name}</span>
            </>
          )}
        </div>

        {/* Center: quick dashboard link (context-aware) */}
        <div className="hidden sm:flex items-center">
          {isAdmin && location !== "/ops/dashboard" && (
            <button
              data-testid="button-footer-ops-dashboard"
              onClick={() => navigate("/ops/dashboard")}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin Dashboard
            </button>
          )}
          {isAffiliate && !isAdmin && location !== "/portal/dashboard" && (
            <button
              data-testid="button-footer-portal-dashboard"
              onClick={() => navigate("/portal/dashboard")}
              className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-slate-700 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Portal Dashboard
            </button>
          )}
        </div>

        {/* Right: logout */}
        <button
          data-testid="button-footer-logout"
          onClick={() => isAdmin ? adminLogout.mutate() : affiliateLogout.mutate()}
          disabled={adminLogout.isPending || affiliateLogout.isPending}
          className="flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-red-500 disabled:opacity-50 transition-colors shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Log out</span>
        </button>

      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/kiosk" component={Kiosk} />
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
      <Route path="/team" component={Team} />
      <Route path="/scheduling" component={Scheduling} />
      <Route component={NotFound} />
    </Switch>
  );
}

// ─── App ─────────────────────────────────────────────────────────────────────

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <BackButton />
        <div className="pb-11">
          <Router />
        </div>
        <SessionFooter />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
