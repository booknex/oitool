import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Building2, Users, DollarSign, TrendingUp, LogOut, RefreshCw,
  BadgeCheck, Clock, AlertCircle, Ban, Mail, Phone,
  Sparkles, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { SaasAffiliate, SaasCompanyWithAffiliate } from "@shared/schema";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PortalData {
  affiliate: SaasAffiliate;
  stats: {
    totalCompanies: number;
    activeCompanies: number;
    trialCompanies: number;
    totalMRR: number;
    commission: number;
  };
  companies: SaasCompanyWithAffiliate[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const STATUSES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trial:     { label: "Trial",     icon: Clock,       color: "bg-amber-100 text-amber-700" },
  active:    { label: "Active",    icon: BadgeCheck,  color: "bg-green-100 text-green-700" },
  paused:    { label: "Paused",    icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelled", icon: Ban,         color: "bg-red-100 text-red-700" },
};

const PLAN_LABELS: Record<string, string> = {
  starter: "Starter", pro: "Pro", enterprise: "Enterprise",
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES[status] ?? STATUSES.trial;
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.color}`}>
      <Icon className="w-3 h-3" />
      {s.label}
    </span>
  );
}

// ─── Create Sub-Account Modal ─────────────────────────────────────────────────

interface CreateSubAccountModalProps {
  open: boolean;
  onClose: () => void;
}

function CreateSubAccountModal({ open, onClose }: CreateSubAccountModalProps) {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("United States");
  const [zip, setZip] = useState("");
  const [state, setState] = useState("");
  const [website, setWebsite] = useState("");

  function reset() {
    setFirstName(""); setLastName(""); setEmail(""); setPhone("");
    setBusinessName(""); setAddress(""); setCity(""); setCountry("United States");
    setZip(""); setState(""); setWebsite("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  const canSubmit = firstName.trim() && lastName.trim() && email.trim() && businessName.trim();

  const create = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliate/companies", {
        name: businessName.trim(),
        ownerName: `${firstName.trim()} ${lastName.trim()}`.trim(),
        email: email.trim(),
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        country: country.trim(),
        zip: zip.trim(),
        website: website.trim(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
      toast({ title: "Account created", description: `${businessName.trim()} has been added to your accounts.` });
      handleClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to create account";
      toast({ title: "Could not create account", description: msg, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    create.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader className="pb-1">
          <DialogTitle>Create Sub-Account</DialogTitle>
          <DialogDescription>
            Register a new cleaning company under your affiliate account.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">

          {/* Account Section */}
          <div className="border border-gray-200 rounded-md px-4 py-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">Account</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="sub-first" className="text-xs">First Name <span className="text-rose-500">*</span></Label>
                <Input id="sub-first" data-testid="input-sub-first-name" placeholder="Jane" value={firstName} onChange={e => setFirstName(e.target.value)} autoFocus className="h-8 text-sm" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sub-last" className="text-xs">Last Name <span className="text-rose-500">*</span></Label>
                <Input id="sub-last" data-testid="input-sub-last-name" placeholder="Smith" value={lastName} onChange={e => setLastName(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="sub-email" className="text-xs">Email <span className="text-rose-500">*</span></Label>
                <Input id="sub-email" data-testid="input-sub-account-email" type="email" placeholder="jane@acme.com" value={email} onChange={e => setEmail(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sub-phone" className="text-xs">Phone Number</Label>
                <Input id="sub-phone" data-testid="input-sub-account-phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
          </div>

          {/* General Information Section */}
          <div className="border border-gray-200 rounded-md px-4 py-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500">General Information</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="sub-biz" className="text-xs">Business Name <span className="text-rose-500">*</span></Label>
                <Input id="sub-biz" data-testid="input-sub-account-name" placeholder="Acme Cleaning Co." value={businessName} onChange={e => setBusinessName(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sub-website" className="text-xs">Website</Label>
                <Input id="sub-website" data-testid="input-sub-account-website" type="url" placeholder="https://acme.com" value={website} onChange={e => setWebsite(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="sub-address" className="text-xs">Street Address</Label>
              <Input id="sub-address" data-testid="input-sub-account-address" placeholder="1234 Main St" value={address} onChange={e => setAddress(e.target.value)} className="h-8 text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1">
                <Label htmlFor="sub-city" className="text-xs">City</Label>
                <Input id="sub-city" data-testid="input-sub-account-city" placeholder="Port Richey" value={city} onChange={e => setCity(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sub-state" className="text-xs">State / Region</Label>
                <Input id="sub-state" data-testid="input-sub-account-state" placeholder="Florida" value={state} onChange={e => setState(e.target.value)} className="h-8 text-sm" />
              </div>
              <div className="grid gap-1">
                <Label htmlFor="sub-zip" className="text-xs">Zip / Postal</Label>
                <Input id="sub-zip" data-testid="input-sub-account-zip" placeholder="34668" value={zip} onChange={e => setZip(e.target.value)} className="h-8 text-sm" />
              </div>
            </div>
            <div className="grid gap-1">
              <Label htmlFor="sub-country" className="text-xs">Country</Label>
              <Input id="sub-country" data-testid="input-sub-account-country" placeholder="United States" value={country} onChange={e => setCountry(e.target.value)} className="h-8 text-sm" />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={create.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              data-testid="button-sub-account-submit"
              disabled={!canSubmit || create.isPending}
              className="bg-rose-600 text-white"
            >
              {create.isPending
                ? <><RefreshCw className="w-4 h-4 animate-spin" /> Creating…</>
                : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

function LoginPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [accessCode, setAccessCode] = useState("");

  const login = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliate/login", { email, accessCode });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate/me"] });
      navigate("/portal/dashboard");
    },
    onError: (e: Error) => toast({ title: "Login failed", description: e.message, variant: "destructive" }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !accessCode.trim()) return;
    login.mutate();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-rose-600 mb-4 shadow-xl">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Cleanex</h1>
          <p className="text-slate-400 mt-1">Affiliate Partner Portal</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-2xl border-0 bg-white">
          <CardContent className="p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Welcome back</h2>
            <p className="text-sm text-gray-500 mb-6">Sign in to your affiliate dashboard</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-1.5">
                <Label htmlFor="portal-email">Email Address</Label>
                <Input
                  id="portal-email"
                  data-testid="input-affiliate-login-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="portal-code">Access Code</Label>
                <Input
                  id="portal-code"
                  data-testid="input-affiliate-login-code"
                  type="password"
                  placeholder="Your unique access code"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value)}
                  autoComplete="current-password"
                />
              </div>
              <Button
                data-testid="button-affiliate-login"
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 text-white mt-2"
                disabled={!email.trim() || !accessCode.trim() || login.isPending}
              >
                {login.isPending
                  ? <><RefreshCw className="w-4 h-4 animate-spin" /> Signing in…</>
                  : "Sign In"}
              </Button>
            </form>

            <p className="text-xs text-gray-400 text-center mt-6">
              Don't have an access code? Contact your Cleanex account manager.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

function DashboardPage({ data }: { data: PortalData }) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const logout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/affiliate/logout", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ["/api/affiliate/me"] });
      navigate("/portal");
    },
    onError: () => toast({ title: "Error logging out", variant: "destructive" }),
  });

  const { affiliate, stats, companies } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-gray-900 leading-none">Cleanex Partner</h1>
              <p className="text-xs text-gray-500">Affiliate Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-gray-800">{affiliate.name}</p>
              <p className="text-xs text-gray-400">{affiliate.email}</p>
            </div>
            <Button
              data-testid="button-affiliate-logout"
              variant="outline" size="sm"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Hello, {affiliate.name.split(" ")[0]}</h2>
          <p className="text-gray-500 mt-1">Here's how your accounts are performing this month.</p>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Est. Payout</span>
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p data-testid="portal-stat-commission" className="text-2xl font-bold text-gray-900">{fmt$(stats.commission)}</p>
              <p className="text-xs text-gray-400 mt-1">{Number(affiliate.commissionRate).toFixed(0)}% commission</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">MRR Generated</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p data-testid="portal-stat-mrr" className="text-2xl font-bold text-gray-900">{fmt$(stats.totalMRR)}</p>
              <p className="text-xs text-gray-400 mt-1">Monthly recurring</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Accounts</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <p data-testid="portal-stat-active" className="text-2xl font-bold text-gray-900">{stats.activeCompanies}</p>
              <p className="text-xs text-gray-400 mt-1">{stats.trialCompanies} in trial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Referred</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p data-testid="portal-stat-total" className="text-2xl font-bold text-gray-900">{stats.totalCompanies}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </CardContent>
          </Card>
        </div>

        {/* Affiliate Info Card */}
        <div className="grid sm:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Your Account</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                    <Users className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Name</p>
                    <p className="text-sm font-medium text-gray-800">{affiliate.name}</p>
                  </div>
                </div>
                {affiliate.email && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Mail className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-800">{affiliate.email}</p>
                    </div>
                  </div>
                )}
                {affiliate.phone && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-gray-500" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-sm font-medium text-gray-800">{affiliate.phone}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Commission Structure</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">Rate</span>
                  <span className="text-lg font-bold text-rose-600">{Number(affiliate.commissionRate).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b border-gray-50">
                  <span className="text-sm text-gray-500">MRR you generated</span>
                  <span className="text-sm font-semibold text-gray-800">{fmt$(stats.totalMRR)}/mo</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-500">Your estimated payout</span>
                  <span className="text-sm font-bold text-green-600">{fmt$(stats.commission)}/mo</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Companies Table */}
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Referred Accounts</h3>
            <Button
              data-testid="button-create-sub-account"
              className="bg-rose-600 text-white"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="w-4 h-4" />
              Create Sub-Account
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              {companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Building2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No accounts yet — start referring cleaning companies!</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Your Cut</th>
                        <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial Ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(c => {
                        const myCut = Number(c.mrr) * (Number(affiliate.commissionRate) / 100);
                        return (
                          <tr
                            key={c.id}
                            data-testid={`portal-row-company-${c.id}`}
                            className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-5 py-3">
                              <div>
                                <p className="font-semibold text-gray-900">{c.name}</p>
                                {c.ownerName && <p className="text-xs text-gray-400">{c.ownerName}</p>}
                              </div>
                            </td>
                            <td className="px-5 py-3">
                              <StatusBadge status={c.status} />
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-600">
                              {PLAN_LABELS[c.plan] ?? c.plan}
                            </td>
                            <td className="px-5 py-3 font-semibold text-gray-800">
                              {fmt$(Number(c.mrr))}
                            </td>
                            <td className="px-5 py-3 font-semibold text-green-700">
                              {fmt$(myCut)}<span className="text-xs text-gray-400 font-normal">/mo</span>
                            </td>
                            <td className="px-5 py-3 text-xs text-gray-500">
                              {c.trialEndsAt
                                ? new Date(c.trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                                : <span className="text-gray-300">—</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    {companies.length > 0 && (
                      <tfoot>
                        <tr className="bg-gray-50">
                          <td colSpan={3} className="px-5 py-3 text-xs font-semibold text-gray-500">TOTAL</td>
                          <td className="px-5 py-3 text-sm font-bold text-gray-900">{fmt$(stats.totalMRR)}</td>
                          <td className="px-5 py-3 text-sm font-bold text-green-700">{fmt$(stats.commission)}/mo</td>
                          <td />
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <CreateSubAccountModal open={showCreateModal} onClose={() => setShowCreateModal(false)} />
    </div>
  );
}

// ─── Router wrapper ───────────────────────────────────────────────────────────

export function AffiliateLogin() {
  const [, navigate] = useLocation();

  const { data, isLoading } = useQuery<PortalData>({
    queryKey: ["/api/affiliate/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && data) {
      navigate("/portal/dashboard");
    }
    // navigate is stable in wouter — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, data]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
      </div>
    );
  }

  if (data) return null;

  return <LoginPage />;
}

export function AffiliateDashboard() {
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<PortalData>({
    queryKey: ["/api/affiliate/me"],
    retry: false,
  });

  useEffect(() => {
    if (!isLoading && isError) {
      navigate("/portal");
    }
    // navigate is stable in wouter — intentionally omitted from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, isError]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
      </div>
    );
  }

  if (!data) return null;

  return <DashboardPage data={data} />;
}
