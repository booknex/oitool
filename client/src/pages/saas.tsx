import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Building2, Users, DollarSign, TrendingUp, Plus, Pencil, Trash2,
  ChevronLeft, X, Check, Phone, Mail, Calendar, ArrowUpRight,
  BadgeCheck, Clock, AlertCircle, Ban, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { SaasAffiliate, SaasCompanyWithAffiliate } from "@shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS: Record<string, { label: string; price: number; color: string }> = {
  starter:    { label: "Starter",    price: 99,  color: "bg-slate-100 text-slate-700" },
  pro:        { label: "Pro",        price: 199, color: "bg-blue-100 text-blue-700" },
  enterprise: { label: "Enterprise", price: 399, color: "bg-violet-100 text-violet-700" },
};

const STATUSES: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  trial:     { label: "Trial",     icon: Clock,       color: "bg-amber-100 text-amber-700" },
  active:    { label: "Active",    icon: BadgeCheck,  color: "bg-green-100 text-green-700" },
  paused:    { label: "Paused",    icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  cancelled: { label: "Cancelled", icon: Ban,         color: "bg-red-100 text-red-700" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt$(n: number | string) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

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

function PlanBadge({ plan }: { plan: string }) {
  const p = PLANS[plan] ?? PLANS.starter;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.color}`}>
      {p.label}
    </span>
  );
}

// ─── Affiliate Modal ──────────────────────────────────────────────────────────

interface AffiliateModalProps {
  open: boolean;
  affiliate?: SaasAffiliate | null;
  onClose: () => void;
}

function AffiliateModal({ open, affiliate, onClose }: AffiliateModalProps) {
  const { toast } = useToast();
  const isEdit = !!affiliate;
  const [form, setForm] = useState({
    name: affiliate?.name ?? "",
    email: affiliate?.email ?? "",
    phone: affiliate?.phone ?? "",
    commissionRate: affiliate?.commissionRate ?? "20",
    status: affiliate?.status ?? "active",
    accessCode: affiliate?.accessCode ?? "",
    notes: affiliate?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        ...form,
        commissionRate: parseFloat(form.commissionRate) || 20,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/saas/affiliates/${affiliate!.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/saas/affiliates", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/affiliates"] });
      toast({ title: isEdit ? "Affiliate updated" : "Affiliate added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save affiliate", variant: "destructive" }),
  });

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Affiliate" : "Add Affiliate"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Full Name *</Label>
            <Input data-testid="input-affiliate-name" value={form.name} onChange={e => field("name", e.target.value)} placeholder="Jane Smith" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input data-testid="input-affiliate-email" value={form.email} onChange={e => field("email", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input data-testid="input-affiliate-phone" value={form.phone} onChange={e => field("phone", e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Commission %</Label>
              <Input
                data-testid="input-affiliate-commission"
                type="number" min="0" max="100" step="0.5"
                value={form.commissionRate}
                onChange={e => field("commissionRate", e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => field("status", v)}>
                <SelectTrigger data-testid="select-affiliate-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>
              Access Code
              <span className="ml-1 text-xs text-gray-400 font-normal">(affiliate uses this to log into their portal)</span>
            </Label>
            <Input
              data-testid="input-affiliate-access-code"
              value={form.accessCode}
              onChange={e => field("accessCode", e.target.value)}
              placeholder="e.g. JANE2024"
              autoComplete="off"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea data-testid="input-affiliate-notes" value={form.notes} onChange={e => field("notes", e.target.value)} rows={2} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="button-save-affiliate" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Add Affiliate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Company Modal ────────────────────────────────────────────────────────────

interface CompanyModalProps {
  open: boolean;
  company?: SaasCompanyWithAffiliate | null;
  affiliates: SaasAffiliate[];
  onClose: () => void;
}

function CompanyModal({ open, company, affiliates, onClose }: CompanyModalProps) {
  const { toast } = useToast();
  const isEdit = !!company;

  const defaultTrial = new Date(Date.now() + 14 * 86400 * 1000).toISOString().slice(0, 10);

  const [form, setForm] = useState({
    name: company?.name ?? "",
    ownerName: company?.ownerName ?? "",
    email: company?.email ?? "",
    phone: company?.phone ?? "",
    status: company?.status ?? "trial",
    plan: company?.plan ?? "starter",
    mrr: company?.mrr ?? "0",
    affiliateId: company?.affiliateId ? String(company.affiliateId) : "none",
    trialEndsAt: company?.trialEndsAt ? new Date(company.trialEndsAt).toISOString().slice(0, 10) : defaultTrial,
    notes: company?.notes ?? "",
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        ownerName: form.ownerName,
        email: form.email,
        phone: form.phone,
        status: form.status,
        plan: form.plan,
        mrr: parseFloat(form.mrr) || 0,
        affiliateId: form.affiliateId === "none" ? null : parseInt(form.affiliateId, 10),
        trialEndsAt: form.trialEndsAt || null,
        notes: form.notes,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/saas/companies/${company!.id}`, payload);
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/saas/companies", payload);
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      toast({ title: isEdit ? "Company updated" : "Company added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Failed to save company", variant: "destructive" }),
  });

  function field(key: keyof typeof form, value: string) {
    setForm(f => ({ ...f, [key]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Company Name *</Label>
              <Input data-testid="input-company-name" value={form.name} onChange={e => field("name", e.target.value)} placeholder="Sparkle Clean Co." />
            </div>
            <div className="grid gap-1.5">
              <Label>Owner Name</Label>
              <Input data-testid="input-company-owner" value={form.ownerName} onChange={e => field("ownerName", e.target.value)} placeholder="John Doe" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Email</Label>
              <Input data-testid="input-company-email" value={form.email} onChange={e => field("email", e.target.value)} placeholder="owner@company.com" />
            </div>
            <div className="grid gap-1.5">
              <Label>Phone</Label>
              <Input data-testid="input-company-phone" value={form.phone} onChange={e => field("phone", e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => field("status", v)}>
                <SelectTrigger data-testid="select-company-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Plan</Label>
              <Select value={form.plan} onValueChange={v => field("plan", v)}>
                <SelectTrigger data-testid="select-company-plan">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="starter">Starter — $99</SelectItem>
                  <SelectItem value="pro">Pro — $199</SelectItem>
                  <SelectItem value="enterprise">Enterprise — $399</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>MRR ($)</Label>
              <Input
                data-testid="input-company-mrr"
                type="number" min="0" step="1"
                value={form.mrr}
                onChange={e => field("mrr", e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Trial Ends</Label>
              <Input data-testid="input-company-trial" type="date" value={form.trialEndsAt} onChange={e => field("trialEndsAt", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Referred by</Label>
              <Select value={form.affiliateId} onValueChange={v => field("affiliateId", v)}>
                <SelectTrigger data-testid="select-company-affiliate">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {affiliates.map(a => (
                    <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea data-testid="input-company-notes" value={form.notes} onChange={e => field("notes", e.target.value)} rows={2} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button data-testid="button-save-company" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            {isEdit ? "Save Changes" : "Add Company"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SaasAdmin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<"companies" | "affiliates">("companies");

  // Company state
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [editCompany, setEditCompany] = useState<SaasCompanyWithAffiliate | null>(null);
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);

  // Affiliate state
  const [showAffiliateModal, setShowAffiliateModal] = useState(false);
  const [editAffiliate, setEditAffiliate] = useState<SaasAffiliate | null>(null);
  const [deleteAffiliateId, setDeleteAffiliateId] = useState<number | null>(null);

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<SaasCompanyWithAffiliate[]>({
    queryKey: ["/api/saas/companies"],
  });

  const { data: affiliates = [], isLoading: loadingAffiliates } = useQuery<SaasAffiliate[]>({
    queryKey: ["/api/saas/affiliates"],
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/saas/companies/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      setDeleteCompanyId(null);
      toast({ title: "Company removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove company", variant: "destructive" }),
  });

  const deleteAffiliate = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/saas/affiliates/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/affiliates"] });
      setDeleteAffiliateId(null);
      toast({ title: "Affiliate removed" });
    },
    onError: () => toast({ title: "Error", description: "Failed to remove affiliate", variant: "destructive" }),
  });

  // ─── KPI calculations ───────────────────────────────────────────────────────

  const totalMRR = companies.reduce((s, c) => s + Number(c.mrr), 0);
  const activeCount = companies.filter(c => c.status === "active").length;
  const trialCount = companies.filter(c => c.status === "trial").length;
  const activeAffiliates = affiliates.filter(a => a.status === "active").length;

  const mrrByAffiliate = (affiliateId: number) =>
    companies.filter(c => c.affiliateId === affiliateId).reduce((s, c) => s + Number(c.mrr), 0);

  const companiesForAffiliate = (affiliateId: number) =>
    companies.filter(c => c.affiliateId === affiliateId).length;

  const commissionForAffiliate = (aff: SaasAffiliate) => {
    const mrr = mrrByAffiliate(aff.id);
    return mrr * (Number(aff.commissionRate) / 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-3">
            <Button
              data-testid="button-back-dashboard"
              variant="ghost" size="icon"
              onClick={() => navigate("/")}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900 leading-none">SaaS Admin</h1>
                <p className="text-xs text-gray-500">Accounts &amp; Affiliates</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {tab === "companies" ? (
              <Button data-testid="button-add-company" onClick={() => { setEditCompany(null); setShowCompanyModal(true); }}>
                <Plus className="w-4 h-4" />
                Add Company
              </Button>
            ) : (
              <Button data-testid="button-add-affiliate" onClick={() => { setEditAffiliate(null); setShowAffiliateModal(true); }}>
                <Plus className="w-4 h-4" />
                Add Affiliate
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Revenue</span>
                <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                  <DollarSign className="w-4 h-4 text-green-600" />
                </div>
              </div>
              <p data-testid="stat-mrr" className="text-2xl font-bold text-gray-900">{fmt$(totalMRR)}</p>
              <p className="text-xs text-gray-400 mt-1">Total MRR</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Accounts</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
              </div>
              <p data-testid="stat-active-accounts" className="text-2xl font-bold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-400 mt-1">{trialCount} in trial</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Accounts</span>
                <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-violet-600" />
                </div>
              </div>
              <p data-testid="stat-total-accounts" className="text-2xl font-bold text-gray-900">{companies.length}</p>
              <p className="text-xs text-gray-400 mt-1">All time</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Affiliates</span>
                <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Users className="w-4 h-4 text-amber-600" />
                </div>
              </div>
              <p data-testid="stat-affiliates" className="text-2xl font-bold text-gray-900">{activeAffiliates}</p>
              <p className="text-xs text-gray-400 mt-1">{affiliates.length} total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-gray-200 gap-1">
          <button
            data-testid="tab-companies"
            onClick={() => setTab("companies")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "companies"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Companies ({companies.length})
          </button>
          <button
            data-testid="tab-affiliates"
            onClick={() => setTab("affiliates")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              tab === "affiliates"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Affiliates ({affiliates.length})
          </button>
        </div>

        {/* ─── Companies Tab ──────────────────────────────────────────────────── */}

        {tab === "companies" && (
          <Card>
            <CardContent className="p-0">
              {loadingCompanies ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : companies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Building2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No companies yet — add your first account</p>
                  <Button variant="outline" onClick={() => { setEditCompany(null); setShowCompanyModal(true); }}>
                    <Plus className="w-4 h-4" /> Add Company
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Company</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Affiliate</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial Ends</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {companies.map(company => (
                        <tr
                          key={company.id}
                          data-testid={`row-company-${company.id}`}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-900">{company.name}</p>
                              {company.ownerName && (
                                <p className="text-xs text-gray-400">{company.ownerName}</p>
                              )}
                              {company.email && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3" />{company.email}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <StatusBadge status={company.status} />
                          </td>
                          <td className="px-4 py-3">
                            <PlanBadge plan={company.plan} />
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {fmt$(Number(company.mrr))}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {company.affiliate?.name ?? <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3 text-gray-500 text-xs">
                            {company.trialEndsAt
                              ? new Date(company.trialEndsAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                              : <span className="text-gray-300">—</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                data-testid={`button-edit-company-${company.id}`}
                                size="icon" variant="ghost"
                                onClick={() => { setEditCompany(company); setShowCompanyModal(true); }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {deleteCompanyId === company.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    data-testid={`button-confirm-delete-company-${company.id}`}
                                    size="icon" variant="destructive"
                                    disabled={deleteCompany.isPending}
                                    onClick={() => deleteCompany.mutate(company.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => setDeleteCompanyId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  data-testid={`button-delete-company-${company.id}`}
                                  size="icon" variant="ghost"
                                  className="text-gray-400 hover:text-red-500"
                                  onClick={() => setDeleteCompanyId(company.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ─── Affiliates Tab ─────────────────────────────────────────────────── */}

        {tab === "affiliates" && (
          <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
            <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
            <span>
              Affiliate login portal: <a href="/portal" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">{window.location.origin}/portal</a>
              &nbsp;— share this URL with your affiliates along with their email and access code.
            </span>
          </div>
          <Card>
            <CardContent className="p-0">
              {loadingAffiliates ? (
                <div className="flex items-center justify-center py-20 text-gray-400">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading…
                </div>
              ) : affiliates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                  <Users className="w-10 h-10 opacity-30" />
                  <p className="text-sm">No affiliates yet — add your first sales rep</p>
                  <Button variant="outline" onClick={() => { setEditAffiliate(null); setShowAffiliateModal(true); }}>
                    <Plus className="w-4 h-4" /> Add Affiliate
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-left">
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Affiliate</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Commission</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Accounts</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR Generated</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Est. Payout</th>
                        <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Access Code</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {affiliates.map(aff => (
                        <tr
                          key={aff.id}
                          data-testid={`row-affiliate-${aff.id}`}
                          className="border-b border-gray-50 hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div>
                              <p className="font-semibold text-gray-900">{aff.name}</p>
                              {aff.email && (
                                <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                  <Mail className="w-3 h-3" />{aff.email}
                                </p>
                              )}
                              {aff.phone && (
                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                  <Phone className="w-3 h-3" />{aff.phone}
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              aff.status === "active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-500"
                            }`}>
                              {aff.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-gray-700">
                            {Number(aff.commissionRate).toFixed(0)}%
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 text-gray-600">
                              <Building2 className="w-3.5 h-3.5" />
                              {companiesForAffiliate(aff.id)}
                            </div>
                          </td>
                          <td className="px-4 py-3 font-semibold text-gray-800">
                            {fmt$(mrrByAffiliate(aff.id))}
                          </td>
                          <td className="px-4 py-3 font-semibold text-green-700">
                            {fmt$(commissionForAffiliate(aff))}
                            <span className="text-xs text-gray-400 font-normal">/mo</span>
                          </td>
                          <td className="px-4 py-3">
                            {aff.accessCode
                              ? <code className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-mono">{aff.accessCode}</code>
                              : <span className="text-xs text-gray-300 italic">not set</span>}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1 justify-end">
                              <Button
                                data-testid={`button-edit-affiliate-${aff.id}`}
                                size="icon" variant="ghost"
                                onClick={() => { setEditAffiliate(aff); setShowAffiliateModal(true); }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              {deleteAffiliateId === aff.id ? (
                                <div className="flex items-center gap-1">
                                  <Button
                                    data-testid={`button-confirm-delete-affiliate-${aff.id}`}
                                    size="icon" variant="destructive"
                                    disabled={deleteAffiliate.isPending}
                                    onClick={() => deleteAffiliate.mutate(aff.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                  <Button size="icon" variant="ghost" onClick={() => setDeleteAffiliateId(null)}>
                                    <X className="w-4 h-4" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  data-testid={`button-delete-affiliate-${aff.id}`}
                                  size="icon" variant="ghost"
                                  className="text-gray-400 hover:text-red-500"
                                  onClick={() => setDeleteAffiliateId(aff.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
          </div>
        )}
      </div>

      {/* Modals */}
      <CompanyModal
        open={showCompanyModal}
        company={editCompany}
        affiliates={affiliates}
        onClose={() => { setShowCompanyModal(false); setEditCompany(null); }}
      />
      <AffiliateModal
        open={showAffiliateModal}
        affiliate={editAffiliate}
        onClose={() => { setShowAffiliateModal(false); setEditAffiliate(null); }}
      />
    </div>
  );
}
