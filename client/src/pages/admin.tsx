import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  DollarSign, TrendingUp, Users, Clock, XCircle,
  Plus, Trash2, Pencil, Search, ChevronLeft,
  BadgeCheck, AlertCircle, Ban, RefreshCw,
  Sparkles, ArrowUpRight, CheckCircle2, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { SaasCompanyWithAffiliate } from "@shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS = [
  { value: "starter",    label: "Starter",    price: 99,  badge: "bg-slate-100 text-slate-700" },
  { value: "pro",        label: "Pro",        price: 199, badge: "bg-blue-100 text-blue-700" },
  { value: "enterprise", label: "Enterprise", price: 399, badge: "bg-violet-100 text-violet-700" },
] as const;

const STATUSES = [
  { value: "trial",     label: "Trial",     icon: Clock,       badge: "bg-amber-100 text-amber-700"   },
  { value: "active",    label: "Active",    icon: BadgeCheck,  badge: "bg-emerald-100 text-emerald-700" },
  { value: "paused",    label: "Paused",    icon: AlertCircle, badge: "bg-orange-100 text-orange-700"  },
  { value: "cancelled", label: "Cancelled", icon: Ban,         badge: "bg-red-100 text-red-700"       },
] as const;

type StatusValue = (typeof STATUSES)[number]["value"];
type PlanValue   = (typeof PLANS)[number]["value"];

const STATUS_FILTERS = ["all", "trial", "active", "paused", "cancelled"] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt$(n: number | string) {
  return "$" + Number(n).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  const s = STATUSES.find(x => x.value === status) ?? STATUSES[0];
  const Icon = s.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${s.badge}`}>
      <Icon className="w-3 h-3" /> {s.label}
    </span>
  );
}

function PlanPill({ plan }: { plan: string }) {
  const p = PLANS.find(x => x.value === plan) ?? PLANS[0];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${p.badge}`}>
      {p.label} &nbsp;<span className="opacity-60">{fmt$(p.price)}/mo</span>
    </span>
  );
}

// ─── Create / Edit Account Modal ──────────────────────────────────────────────

interface AccountModalProps {
  open: boolean;
  company?: SaasCompanyWithAffiliate | null;
  onClose: () => void;
}

function AccountModal({ open, company, onClose }: AccountModalProps) {
  const { toast } = useToast();
  const isEdit = !!company;

  const [name, setName]         = useState(company?.name ?? "");
  const [ownerName, setOwner]   = useState(company?.ownerName ?? "");
  const [email, setEmail]       = useState(company?.email ?? "");
  const [phone, setPhone]       = useState(company?.phone ?? "");
  const [plan, setPlan]         = useState<PlanValue>((company?.plan as PlanValue) ?? "starter");
  const [status, setStatus]     = useState<StatusValue>((company?.status as StatusValue) ?? "trial");
  const [mrr, setMrr]           = useState(String(company?.mrr ?? ""));
  const [trialEnds, setTrialEnd]= useState(
    company?.trialEndsAt ? new Date(company.trialEndsAt).toISOString().slice(0, 10) : ""
  );

  // reset when opening fresh
  function reset() {
    setName(""); setOwner(""); setEmail(""); setPhone("");
    setPlan("starter"); setStatus("trial"); setMrr(""); setTrialEnd("");
  }
  function handleClose() { if (!isEdit) reset(); onClose(); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        ownerName: ownerName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        plan,
        status,
        mrr: Number(mrr) || 0,
        trialEndsAt: trialEnds || null,
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/saas/companies/${company.id}`, { id: company.id, ...payload });
        return res.json();
      } else {
        const res = await apiRequest("POST", "/api/saas/companies", { ...payload, notes: "" });
        return res.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      toast({ title: isEdit ? "Account updated" : "Account created" });
      handleClose();
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to save";
      toast({ title: "Error", description: msg, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    save.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Account" : "Create New Account"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update subscription details for this account." : "Add a new company to your subscriber list."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">

          {/* Contact info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="am-name" className="text-xs">Company Name <span className="text-rose-500">*</span></Label>
              <Input id="am-name" data-testid="input-admin-company-name" placeholder="Acme Cleaning Co." value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="am-owner" className="text-xs">Owner Name</Label>
              <Input id="am-owner" data-testid="input-admin-owner" placeholder="Jane Smith" value={ownerName} onChange={e => setOwner(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="am-email" className="text-xs">Email</Label>
              <Input id="am-email" data-testid="input-admin-email" type="email" placeholder="jane@acme.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="am-phone" className="text-xs">Phone</Label>
              <Input id="am-phone" data-testid="input-admin-phone" type="tel" placeholder="+1 (555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="border-t border-gray-100 pt-3 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="am-plan" className="text-xs">Plan</Label>
                <Select value={plan} onValueChange={v => setPlan(v as PlanValue)}>
                  <SelectTrigger id="am-plan" data-testid="select-admin-plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PLANS.map(p => (
                      <SelectItem key={p.value} value={p.value}>{p.label} ({fmt$(p.price)}/mo)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="am-status" className="text-xs">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as StatusValue)}>
                  <SelectTrigger id="am-status" data-testid="select-admin-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => (
                      <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="am-mrr" className="text-xs">MRR ($)</Label>
                <Input id="am-mrr" data-testid="input-admin-mrr" type="number" min="0" placeholder="99" value={mrr} onChange={e => setMrr(e.target.value)} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="am-trial" className="text-xs">Trial End Date</Label>
              <Input id="am-trial" data-testid="input-admin-trial-end" type="date" value={trialEnds} onChange={e => setTrialEnd(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-1">
            <Button type="button" variant="outline" onClick={handleClose} disabled={save.isPending}>Cancel</Button>
            <Button type="submit" data-testid="button-admin-save" disabled={!name.trim() || save.isPending} className="bg-rose-600 text-white">
              {save.isPending ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" /> Saving…</> : isEdit ? "Save Changes" : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [editCompany, setEditCompany] = useState<SaasCompanyWithAffiliate | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const { data: companies = [], isLoading } = useQuery<SaasCompanyWithAffiliate[]>({
    queryKey: ["/api/saas/companies"],
  });

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalMRR       = companies.reduce((s, c) => s + Number(c.mrr), 0);
  const arr            = totalMRR * 12;
  const activeCount    = companies.filter(c => c.status === "active").length;
  const trialCount     = companies.filter(c => c.status === "trial").length;
  const cancelledCount = companies.filter(c => c.status === "cancelled").length;
  const avgMRR         = activeCount > 0 ? totalMRR / activeCount : 0;

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = companies;
    if (filter !== "all") list = list.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        c.ownerName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => Number(b.mrr) - Number(a.mrr));
  }, [companies, filter, search]);

  // ── Delete ────────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/saas/companies/${id}`);
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      toast({ title: "Account deleted" });
      setConfirmDelete(null);
      setDeleteTarget(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  function handleDeleteClick(id: number) {
    if (deleteTarget === id) {
      // second tap — confirm
      setConfirmDelete(id);
    } else {
      setDeleteTarget(id);
      setTimeout(() => setDeleteTarget(null), 3000);
    }
  }

  // ── Quick-update status/plan ──────────────────────────────────────────────
  const quickUpdate = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/saas/companies/${id}`, { id, ...patch });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── Header ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard")} data-testid="button-admin-back">
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <h1 className="text-sm font-bold text-gray-900 leading-none">Admin Dashboard</h1>
                <p className="text-xs text-gray-400">Subscriptions &amp; Billing</p>
              </div>
            </div>
          </div>
          <Button data-testid="button-admin-new-account" onClick={() => { setEditCompany(null); setShowCreate(true); }} className="bg-rose-600 text-white">
            <Plus className="w-4 h-4 mr-1" /> New Account
          </Button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* ── KPI cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* MRR */}
          <Card className="col-span-1">
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total MRR</span>
                <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                </div>
              </div>
              <p data-testid="kpi-mrr" className="text-2xl font-extrabold text-gray-900">{fmt$(totalMRR)}</p>
              <p className="text-xs text-gray-400 mt-0.5">monthly recurring</p>
            </CardContent>
          </Card>
          {/* ARR */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">ARR</span>
                <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                </div>
              </div>
              <p data-testid="kpi-arr" className="text-2xl font-extrabold text-gray-900">{fmt$(arr)}</p>
              <p className="text-xs text-gray-400 mt-0.5">annualized revenue</p>
            </CardContent>
          </Card>
          {/* Active */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active</span>
                <div className="w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
                  <Users className="w-3.5 h-3.5 text-violet-600" />
                </div>
              </div>
              <p data-testid="kpi-active" className="text-2xl font-extrabold text-gray-900">{activeCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">paying accounts</p>
            </CardContent>
          </Card>
          {/* Trials */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Trials</span>
                <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                </div>
              </div>
              <p data-testid="kpi-trials" className="text-2xl font-extrabold text-gray-900">{trialCount}</p>
              <p className="text-xs text-gray-400 mt-0.5">in free trial</p>
            </CardContent>
          </Card>
          {/* Avg MRR */}
          <Card>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Avg MRR</span>
                <div className="w-7 h-7 rounded-lg bg-rose-50 flex items-center justify-center">
                  <ArrowUpRight className="w-3.5 h-3.5 text-rose-600" />
                </div>
              </div>
              <p data-testid="kpi-avg-mrr" className="text-2xl font-extrabold text-gray-900">{fmt$(avgMRR)}</p>
              <p className="text-xs text-gray-400 mt-0.5">per active account</p>
            </CardContent>
          </Card>
        </div>

        {/* ── Table card ── */}
        <Card>
          <CardContent className="p-0">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-gray-100">
              {/* Status filter tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
                {STATUS_FILTERS.map(f => (
                  <button
                    key={f}
                    data-testid={`filter-${f}`}
                    onClick={() => setFilter(f)}
                    className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${
                      filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    {f === "all" ? `All (${companies.length})` : f}
                    {f === "trial" && trialCount > 0 && (
                      <span className="ml-1 bg-amber-400 text-white rounded-full text-[10px] px-1">{trialCount}</span>
                    )}
                    {f === "cancelled" && cancelledCount > 0 && (
                      <span className="ml-1 bg-red-400 text-white rounded-full text-[10px] px-1">{cancelledCount}</span>
                    )}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div className="relative flex-1 min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <Input
                  data-testid="input-admin-search"
                  placeholder="Search accounts…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="pl-8 h-8 text-sm"
                />
              </div>
              <span className="text-xs text-gray-400 ml-auto">{filtered.length} account{filtered.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="flex items-center justify-center py-20 text-gray-400">
                <RefreshCw className="w-5 h-5 animate-spin mr-2" /> Loading accounts…
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
                <Building2 className="w-8 h-8 opacity-30" />
                <p className="text-sm">No accounts found</p>
                <Button size="sm" variant="outline" onClick={() => { setEditCompany(null); setShowCreate(true); }}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Create one
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Plan</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">MRR</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Trial Ends</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtered.map(company => (
                      <tr
                        key={company.id}
                        data-testid={`row-company-${company.id}`}
                        className="hover:bg-gray-50/60 transition-colors group"
                      >
                        {/* Account name */}
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                              {company.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 leading-none">{company.name}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{company.ownerName || company.email || "—"}</p>
                            </div>
                          </div>
                        </td>

                        {/* Plan — quick change */}
                        <td className="px-4 py-3.5">
                          <Select
                            value={company.plan}
                            onValueChange={val => quickUpdate.mutate({ id: company.id, patch: { plan: val } })}
                          >
                            <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 w-auto gap-1 [&>svg]:hidden hover:bg-transparent" data-testid={`select-plan-${company.id}`}>
                              <PlanPill plan={company.plan} />
                            </SelectTrigger>
                            <SelectContent>
                              {PLANS.map(p => (
                                <SelectItem key={p.value} value={p.value}>{p.label} — {fmt$(p.price)}/mo</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* Status — quick change */}
                        <td className="px-4 py-3.5">
                          <Select
                            value={company.status}
                            onValueChange={val => quickUpdate.mutate({ id: company.id, patch: { status: val } })}
                          >
                            <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 w-auto gap-1 [&>svg]:hidden hover:bg-transparent" data-testid={`select-status-${company.id}`}>
                              <StatusPill status={company.status} />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map(s => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>

                        {/* MRR */}
                        <td className="px-4 py-3.5 text-right">
                          <span className="font-semibold text-gray-900">{fmt$(company.mrr)}</span>
                          <span className="text-xs text-gray-400">/mo</span>
                        </td>

                        {/* Trial end */}
                        <td className="px-4 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                          {company.status === "trial" && company.trialEndsAt ? (
                            <span className={`${new Date(company.trialEndsAt) < new Date() ? "text-red-500 font-medium" : ""}`}>
                              {fmtDate(company.trialEndsAt)}
                            </span>
                          ) : "—"}
                        </td>

                        {/* Joined */}
                        <td className="px-4 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                          {fmtDate(company.createdAt)}
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1 justify-end invisible group-hover:visible">
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-edit-${company.id}`}
                              onClick={() => { setEditCompany(company); setShowCreate(true); }}
                              title="Edit account"
                            >
                              <Pencil className="w-3.5 h-3.5 text-gray-400" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              data-testid={`button-delete-${company.id}`}
                              onClick={() => handleDeleteClick(company.id)}
                              title={deleteTarget === company.id ? "Click again to confirm delete" : "Delete account"}
                              className={deleteTarget === company.id ? "text-red-500 bg-red-50" : ""}
                            >
                              {deleteTarget === company.id
                                ? <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                : <Trash2 className="w-3.5 h-3.5 text-gray-400" />}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  {/* Footer totals */}
                  {filtered.length > 0 && (
                    <tfoot>
                      <tr className="bg-gray-50/80 border-t border-gray-200">
                        <td className="px-5 py-3 text-xs font-semibold text-gray-600" colSpan={3}>
                          {filtered.length} account{filtered.length !== 1 ? "s" : ""}
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-gray-900 text-sm">
                          {fmt$(filtered.reduce((s, c) => s + Number(c.mrr), 0))}
                          <span className="text-xs text-gray-400 font-normal">/mo</span>
                        </td>
                        <td colSpan={3} />
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Modals ── */}
      <AccountModal
        open={showCreate}
        company={editCompany}
        onClose={() => { setShowCreate(false); setEditCompany(null); }}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete !== null} onOpenChange={v => { if (!v) setConfirmDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              This will permanently remove the company and all associated data. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmDelete(null); setDeleteTarget(null); }}>Cancel</Button>
            <Button
              data-testid="button-confirm-delete"
              className="bg-red-600 text-white"
              onClick={() => { if (confirmDelete) deleteMutation.mutate(confirmDelete); }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
