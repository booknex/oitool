import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest, getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import {
  Building2, Users, DollarSign, TrendingUp, Plus, Pencil, Trash2,
  X, Check, Phone, Mail, ArrowUpRight,
  BadgeCheck, Clock, AlertCircle, Ban, RefreshCw,
  LogOut, Shield, Search,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, type TooltipProps,
} from "recharts";
import { type ValueType, type NameType } from "recharts/types/component/DefaultTooltipContent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { SaasAffiliate, SaasCompanyWithAffiliate } from "@shared/schema";

// ─── Constants ────────────────────────────────────────────────────────────────

const PLANS = [
  { value: "starter",    label: "Starter",    price: 99,  badge: "bg-slate-100 text-slate-700" },
  { value: "pro",        label: "Pro",        price: 199, badge: "bg-blue-100 text-blue-700" },
  { value: "enterprise", label: "Enterprise", price: 399, badge: "bg-violet-100 text-violet-700" },
] as const;

const STATUSES = [
  { value: "trial",     label: "Trial",     icon: Clock,       badge: "bg-amber-100 text-amber-700"    },
  { value: "active",    label: "Active",    icon: BadgeCheck,  badge: "bg-emerald-100 text-emerald-700" },
  { value: "paused",    label: "Paused",    icon: AlertCircle, badge: "bg-orange-100 text-orange-700"   },
  { value: "cancelled", label: "Cancelled", icon: Ban,         badge: "bg-red-100 text-red-700"         },
] as const;

type StatusVal = (typeof STATUSES)[number]["value"];
type PlanVal   = (typeof PLANS)[number]["value"];

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
      <Icon className="w-3 h-3" />{s.label}
    </span>
  );
}
function PlanPill({ plan }: { plan: string }) {
  const p = PLANS.find(x => x.value === plan) ?? PLANS[0];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${p.badge}`}>
      {p.label} <span className="opacity-60">{fmt$(p.price)}/mo</span>
    </span>
  );
}

// ─── Company Modal ─────────────────────────────────────────────────────────────

function CompanyModal({ open, company, affiliates, onClose }: {
  open: boolean;
  company?: SaasCompanyWithAffiliate | null;
  affiliates: SaasAffiliate[];
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!company;
  const [name, setName]         = useState(company?.name ?? "");
  const [ownerName, setOwner]   = useState(company?.ownerName ?? "");
  const [email, setEmail]       = useState(company?.email ?? "");
  const [phone, setPhone]       = useState(company?.phone ?? "");
  const [plan, setPlan]         = useState<PlanVal>((company?.plan as PlanVal) ?? "starter");
  const [status, setStatus]     = useState<StatusVal>((company?.status as StatusVal) ?? "trial");
  const [mrr, setMrr]           = useState(String(company?.mrr ?? ""));
  const [trialEnds, setTrialEnd]= useState(
    company?.trialEndsAt ? new Date(company.trialEndsAt).toISOString().slice(0, 10) : ""
  );
  const [affiliateId, setAffId] = useState<string>(company?.affiliateId ? String(company.affiliateId) : "__none__");
  const [notes, setNotes]       = useState(company?.notes ?? "");

  function reset() {
    setName(""); setOwner(""); setEmail(""); setPhone("");
    setPlan("starter"); setStatus("trial"); setMrr(""); setTrialEnd(""); setAffId("__none__"); setNotes("");
  }
  function handleClose() { if (!isEdit) reset(); onClose(); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(), ownerName: ownerName.trim(), email: email.trim(), phone: phone.trim(),
        plan, status, mrr: Number(mrr) || 0,
        trialEndsAt: trialEnds || null,
        affiliateId: (affiliateId && affiliateId !== "__none__") ? Number(affiliateId) : null,
        notes: notes.trim(),
      };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/saas/companies/${company.id}`, { id: company.id, ...payload });
        return res.json();
      }
      const res = await apiRequest("POST", "/api/saas/companies", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      toast({ title: isEdit ? "Company updated" : "Company created" });
      handleClose();
    },
    onError: () => toast({ title: "Error saving company", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Company" : "Add Company"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Update this company's details and subscription." : "Add a new company account."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Company Name *</Label>
              <Input data-testid="input-ops-company-name" placeholder="Acme Cleaning Co." value={name} onChange={e => setName(e.target.value)} autoFocus />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Owner Name</Label>
              <Input data-testid="input-ops-owner" placeholder="Jane Smith" value={ownerName} onChange={e => setOwner(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input data-testid="input-ops-email" type="email" placeholder="jane@acme.com" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone</Label>
              <Input data-testid="input-ops-phone" type="tel" placeholder="(555) 000-0000" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>

          <div className="border-t pt-3 space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription</p>
            <div className="grid grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Plan</Label>
                <Select value={plan} onValueChange={v => setPlan(v as PlanVal)}>
                  <SelectTrigger data-testid="select-ops-plan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label} ({fmt$(p.price)}/mo)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Status</Label>
                <Select value={status} onValueChange={v => setStatus(v as StatusVal)}>
                  <SelectTrigger data-testid="select-ops-status"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">MRR ($)</Label>
                <Input data-testid="input-ops-mrr" type="number" min="0" placeholder="99" value={mrr} onChange={e => setMrr(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Trial End Date</Label>
                <Input data-testid="input-ops-trial-end" type="date" value={trialEnds} onChange={e => setTrialEnd(e.target.value)} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Referring Affiliate</Label>
                <Select value={affiliateId} onValueChange={setAffId}>
                  <SelectTrigger data-testid="select-ops-affiliate"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {affiliates.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea data-testid="input-ops-notes" rows={2} placeholder="Optional notes…" value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={handleClose} disabled={save.isPending}>Cancel</Button>
          <Button data-testid="button-ops-save-company" disabled={!name.trim() || save.isPending} onClick={() => save.mutate()} className="bg-indigo-600 text-white">
            {save.isPending ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" />Saving…</> : isEdit ? "Save Changes" : "Add Company"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Affiliate Modal ───────────────────────────────────────────────────────────

function AffiliateModal({ open, affiliate, onClose }: {
  open: boolean;
  affiliate?: SaasAffiliate | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const isEdit = !!affiliate;
  const [form, setForm] = useState({
    name: affiliate?.name ?? "",
    email: affiliate?.email ?? "",
    phone: affiliate?.phone ?? "",
    commissionRate: String(affiliate?.commissionRate ?? "20"),
    status: affiliate?.status ?? "active",
    accessCode: affiliate?.accessCode ?? "",
    notes: affiliate?.notes ?? "",
  });
  function field(k: keyof typeof form, v: string) { setForm(f => ({ ...f, [k]: v })); }

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form, commissionRate: parseFloat(form.commissionRate) || 20 };
      if (isEdit) {
        const res = await apiRequest("PATCH", `/api/saas/affiliates/${affiliate!.id}`, payload);
        return res.json();
      }
      const res = await apiRequest("POST", "/api/saas/affiliates", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/affiliates"] });
      toast({ title: isEdit ? "Affiliate updated" : "Affiliate added" });
      onClose();
    },
    onError: () => toast({ title: "Error", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Affiliate" : "Add Affiliate"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 pt-1">
          <div className="grid gap-1.5">
            <Label className="text-xs">Full Name *</Label>
            <Input data-testid="input-ops-aff-name" value={form.name} onChange={e => field("name", e.target.value)} placeholder="Jane Smith" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Email</Label>
              <Input data-testid="input-ops-aff-email" value={form.email} onChange={e => field("email", e.target.value)} placeholder="jane@example.com" />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Phone</Label>
              <Input data-testid="input-ops-aff-phone" value={form.phone} onChange={e => field("phone", e.target.value)} placeholder="(555) 000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs">Commission %</Label>
              <Input data-testid="input-ops-aff-commission" type="number" min="0" max="100" step="0.5" value={form.commissionRate} onChange={e => field("commissionRate", e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={v => field("status", v)}>
                <SelectTrigger data-testid="select-ops-aff-status"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">
              Access Code <span className="font-normal text-gray-400 ml-1">(used to log into affiliate portal)</span>
            </Label>
            <Input data-testid="input-ops-aff-code" value={form.accessCode} onChange={e => field("accessCode", e.target.value)} placeholder="e.g. JANE2024" autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Notes</Label>
            <Textarea data-testid="input-ops-aff-notes" rows={2} value={form.notes} onChange={e => field("notes", e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button data-testid="button-ops-save-aff" disabled={!form.name.trim() || save.isPending} onClick={() => save.mutate()} className="bg-indigo-600 text-white">
            {save.isPending ? <><RefreshCw className="w-4 h-4 animate-spin mr-1" />Saving…</> : isEdit ? "Save Changes" : "Add Affiliate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── MRR Tooltip ──────────────────────────────────────────────────────────────

function MRRTooltip({ active, payload, label }: TooltipProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-0.5">{label}</p>
      <p className="text-indigo-600 font-bold">{fmt$(Number(payload[0].value))}<span className="text-xs text-gray-400 font-normal ml-1">MRR</span></p>
    </div>
  );
}

// ─── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({ companies, affiliates }: {
  companies: SaasCompanyWithAffiliate[];
  affiliates: SaasAffiliate[];
}) {
  const totalMRR      = companies.reduce((s, c) => s + Number(c.mrr), 0);
  const arr           = totalMRR * 12;
  const activeCount   = companies.filter(c => c.status === "active").length;
  const trialCount    = companies.filter(c => c.status === "trial").length;
  const avgMRR        = activeCount > 0 ? totalMRR / activeCount : 0;
  const totalAccounts = companies.length;
  const activeAffs    = affiliates.filter(a => a.status === "active").length;
  const totalPayout   = affiliates.reduce((s, a) => {
    const mrrGen = companies.filter(c => c.affiliateId === a.id).reduce((x, c) => x + Number(c.mrr), 0);
    return s + mrrGen * (Number(a.commissionRate) / 100);
  }, 0);

  // Build last-12-months cumulative MRR data
  const monthlyData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      const endOfMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const label = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
      const mrr = companies
        .filter(c => c.status !== "cancelled" && new Date(c.createdAt) <= endOfMonth)
        .reduce((s, c) => s + Number(c.mrr), 0);
      return { month: label, mrr };
    });
  }, [companies]);

  const kpis = [
    { label: "Total MRR",        value: fmt$(totalMRR),    sub: "monthly recurring",          icon: DollarSign, bg: "bg-emerald-50", ic: "text-emerald-600" },
    { label: "ARR",              value: fmt$(arr),          sub: "annualized revenue",         icon: TrendingUp,  bg: "bg-blue-50",    ic: "text-blue-600"    },
    { label: "Active Accounts",  value: String(activeCount),sub: `of ${totalAccounts} total`, icon: BadgeCheck,  bg: "bg-violet-50",  ic: "text-violet-600"  },
    { label: "Trials",           value: String(trialCount), sub: "in free trial",              icon: Clock,       bg: "bg-amber-50",   ic: "text-amber-600"   },
    { label: "Avg MRR",          value: fmt$(avgMRR),       sub: "per active account",         icon: ArrowUpRight,bg: "bg-rose-50",    ic: "text-rose-600"    },
    { label: "Affiliates",       value: `${activeAffs}/${affiliates.length}`, sub: "active / total", icon: Users, bg: "bg-indigo-50", ic: "text-indigo-600"  },
    { label: "Affiliate Payout", value: fmt$(totalPayout),  sub: "est. monthly payout",       icon: DollarSign,  bg: "bg-orange-50",  ic: "text-orange-600"  },
  ];

  return (
    <div className="space-y-6">
      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
        {kpis.map(k => (
          <Card key={k.label}>
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide leading-tight">{k.label}</span>
                <div className={`w-7 h-7 rounded-lg ${k.bg} flex items-center justify-center shrink-0`}>
                  <k.icon className={`w-3.5 h-3.5 ${k.ic}`} />
                </div>
              </div>
              <p className="text-xl font-extrabold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly MRR chart */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
            <div>
              <p className="text-sm font-bold text-gray-800 uppercase tracking-wide">Monthly Recurring Revenue</p>
              <p className="text-xs text-gray-400 mt-0.5">Cumulative MRR · last 12 months</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-indigo-600">{fmt$(totalMRR)}</p>
              <p className="text-xs text-gray-400">current MRR</p>
            </div>
          </div>
          {companies.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No company data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyData} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={v => v === 0 ? "$0" : `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                />
                <Tooltip content={<MRRTooltip />} cursor={{ fill: "rgba(99,102,241,0.06)" }} />
                <Bar dataKey="mrr" name="MRR" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Companies Tab ────────────────────────────────────────────────────────────

function CompaniesTab({ companies, affiliates, isLoading }: {
  companies: SaasCompanyWithAffiliate[];
  affiliates: SaasAffiliate[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>("all");
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editCompany, setEditCompany] = useState<SaasCompanyWithAffiliate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [confirmId, setConfirmId] = useState<number | null>(null);

  const trialCount     = companies.filter(c => c.status === "trial").length;
  const cancelledCount = companies.filter(c => c.status === "cancelled").length;

  const filtered = useMemo(() => {
    let list = companies;
    if (filter !== "all") list = list.filter(c => c.status === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || c.ownerName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q));
    }
    return [...list].sort((a, b) => Number(b.mrr) - Number(a.mrr));
  }, [companies, filter, search]);

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/saas/companies/${id}`);
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] });
      toast({ title: "Company deleted" });
      setConfirmId(null); setDeleteId(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const quickUpdate = useMutation({
    mutationFn: async ({ id, patch }: { id: number; patch: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/saas/companies/${id}`, { id, ...patch });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/saas/companies"] }),
    onError: () => toast({ title: "Update failed", variant: "destructive" }),
  });

  function handleDeleteClick(id: number) {
    if (deleteId === id) { setConfirmId(id); }
    else { setDeleteId(id); setTimeout(() => setDeleteId(i => i === id ? null : i), 3000); }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button data-testid="button-ops-add-company" onClick={() => { setEditCompany(null); setShowModal(true); }} className="bg-indigo-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Company
        </Button>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {STATUS_FILTERS.map(f => (
            <button key={f} data-testid={`ops-filter-${f}`} onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded-md text-xs font-medium capitalize transition-colors ${filter === f ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              {f === "all" ? `All (${companies.length})` : f}
              {f === "trial" && trialCount > 0 && <span className="ml-1 bg-amber-400 text-white rounded-full text-[10px] px-1">{trialCount}</span>}
              {f === "cancelled" && cancelledCount > 0 && <span className="ml-1 bg-red-400 text-white rounded-full text-[10px] px-1">{cancelledCount}</span>}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <Input data-testid="input-ops-search" placeholder="Search companies…" value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-8 text-sm" />
        </div>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Building2 className="w-8 h-8 opacity-30" /><p className="text-sm">No companies found</p>
              <Button size="sm" variant="outline" onClick={() => { setEditCompany(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Add first company</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Company", "Plan", "Status", "MRR", "Affiliate", "Trial Ends", "Joined", ""].map(h => (
                      <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide ${h === "MRR" ? "text-right" : "text-left"}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map(c => (
                    <tr key={c.id} data-testid={`ops-row-company-${c.id}`} className="hover:bg-gray-50/60 transition-colors group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-400 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-none">{c.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{c.ownerName || c.email || "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={c.plan} onValueChange={val => quickUpdate.mutate({ id: c.id, patch: { plan: val } })}>
                          <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 w-auto [&>svg]:hidden" data-testid={`ops-plan-${c.id}`}>
                            <PlanPill plan={c.plan} />
                          </SelectTrigger>
                          <SelectContent>
                            {PLANS.map(p => <SelectItem key={p.value} value={p.value}>{p.label} — {fmt$(p.price)}/mo</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <Select value={c.status} onValueChange={val => quickUpdate.mutate({ id: c.id, patch: { status: val } })}>
                          <SelectTrigger className="border-0 bg-transparent p-0 h-auto shadow-none focus:ring-0 w-auto [&>svg]:hidden" data-testid={`ops-status-${c.id}`}>
                            <StatusPill status={c.status} />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-semibold text-gray-900">{fmt$(c.mrr)}</span>
                        <span className="text-xs text-gray-400">/mo</span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{c.affiliate?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {c.status === "trial" && c.trialEndsAt ? (
                          <span className={new Date(c.trialEndsAt) < new Date() ? "text-red-500 font-medium" : ""}>{fmtDate(c.trialEndsAt)}</span>
                        ) : "—"}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">{fmtDate(c.createdAt)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end invisible group-hover:visible">
                          <Button size="icon" variant="ghost" data-testid={`ops-edit-company-${c.id}`}
                            onClick={() => { setEditCompany(c); setShowModal(true); }}><Pencil className="w-3.5 h-3.5 text-gray-400" /></Button>
                          <Button size="icon" variant="ghost" data-testid={`ops-delete-company-${c.id}`}
                            onClick={() => handleDeleteClick(c.id)}
                            className={deleteId === c.id ? "text-red-500 bg-red-50" : ""}>
                            <Trash2 className={`w-3.5 h-3.5 ${deleteId === c.id ? "text-red-500" : "text-gray-400"}`} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50/80 border-t border-gray-200">
                    <td className="px-4 py-3 text-xs font-semibold text-gray-600" colSpan={3}>{filtered.length} companies</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-900">{fmt$(filtered.reduce((s, c) => s + Number(c.mrr), 0))}<span className="text-xs text-gray-400 font-normal">/mo</span></td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <CompanyModal open={showModal} company={editCompany} affiliates={affiliates} onClose={() => { setShowModal(false); setEditCompany(null); }} />
      <Dialog open={confirmId !== null} onOpenChange={v => { if (!v) { setConfirmId(null); setDeleteId(null); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Company</DialogTitle><DialogDescription>This permanently removes the company and all its data. This cannot be undone.</DialogDescription></DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setConfirmId(null); setDeleteId(null); }}>Cancel</Button>
            <Button className="bg-red-600 text-white" disabled={deleteMut.isPending} onClick={() => { if (confirmId) deleteMut.mutate(confirmId); }} data-testid="button-ops-confirm-delete">
              {deleteMut.isPending ? "Deleting…" : "Delete Company"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Affiliates Tab ───────────────────────────────────────────────────────────

function AffiliatesTab({ affiliates, companies, isLoading }: {
  affiliates: SaasAffiliate[];
  companies: SaasCompanyWithAffiliate[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editAff, setEditAff] = useState<SaasAffiliate | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const deleteMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/saas/affiliates/${id}`);
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saas/affiliates"] });
      toast({ title: "Affiliate deleted" });
      setDeleteId(null);
    },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const mrrFor = (id: number) => companies.filter(c => c.affiliateId === id).reduce((s, c) => s + Number(c.mrr), 0);
  const countFor = (id: number) => companies.filter(c => c.affiliateId === id).length;
  const payoutFor = (a: SaasAffiliate) => mrrFor(a.id) * (Number(a.commissionRate) / 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button data-testid="button-ops-add-affiliate" onClick={() => { setEditAff(null); setShowModal(true); }} className="bg-indigo-600 text-white">
          <Plus className="w-4 h-4 mr-1" /> Add Affiliate
        </Button>
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
          <ArrowUpRight className="w-4 h-4 text-blue-500 shrink-0" />
          Affiliate login: <a href="/portal" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline ml-1">{window.location.origin}/portal</a>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400"><RefreshCw className="w-5 h-5 animate-spin mr-2" />Loading…</div>
          ) : affiliates.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-gray-400">
              <Users className="w-8 h-8 opacity-30" /><p className="text-sm">No affiliates yet</p>
              <Button size="sm" variant="outline" onClick={() => { setEditAff(null); setShowModal(true); }}><Plus className="w-3.5 h-3.5 mr-1" />Add first affiliate</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left">
                    {["Affiliate", "Status", "Commission", "Accounts", "MRR Generated", "Est. Payout", "Access Code", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {affiliates.map(a => (
                    <tr key={a.id} data-testid={`ops-row-affiliate-${a.id}`} className="hover:bg-gray-50/60 group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {a.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 leading-none">{a.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {a.email && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Mail className="w-2.5 h-2.5" />{a.email}</span>}
                              {a.phone && <span className="text-xs text-gray-400 flex items-center gap-0.5"><Phone className="w-2.5 h-2.5" />{a.phone}</span>}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${a.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{a.commissionRate}%</td>
                      <td className="px-4 py-3 text-gray-600">{countFor(a.id)}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{fmt$(mrrFor(a.id))}<span className="text-xs text-gray-400">/mo</span></td>
                      <td className="px-4 py-3 font-semibold text-emerald-700">{fmt$(payoutFor(a))}<span className="text-xs font-normal text-gray-400">/mo</span></td>
                      <td className="px-4 py-3">
                        <code className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">{a.accessCode || "—"}</code>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end invisible group-hover:visible">
                          <Button size="icon" variant="ghost" data-testid={`ops-edit-aff-${a.id}`} onClick={() => { setEditAff(a); setShowModal(true); }}><Pencil className="w-3.5 h-3.5 text-gray-400" /></Button>
                          {deleteId === a.id ? (
                            <>
                              <Button size="icon" variant="destructive" disabled={deleteMut.isPending} onClick={() => deleteMut.mutate(a.id)} data-testid={`ops-confirm-delete-aff-${a.id}`}><Check className="w-3.5 h-3.5" /></Button>
                              <Button size="icon" variant="ghost" onClick={() => setDeleteId(null)}><X className="w-3.5 h-3.5" /></Button>
                            </>
                          ) : (
                            <Button size="icon" variant="ghost" data-testid={`ops-delete-aff-${a.id}`} onClick={() => setDeleteId(a.id)}><Trash2 className="w-3.5 h-3.5 text-gray-400" /></Button>
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

      <AffiliateModal open={showModal} affiliate={editAff} onClose={() => { setShowModal(false); setEditAff(null); }} />
    </div>
  );
}

// ─── Login Page ───────────────────────────────────────────────────────────────

export function AdminPortalLogin() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data: meCheck, isLoading } = useQuery<{ email: string } | null>({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0,
  });

  const login = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/login", { email: email.trim(), password });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Login failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/me"] });
      navigate("/ops/dashboard");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Login failed";
      toast({ title: "Login failed", description: msg, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) return;
    login.mutate();
  }

  useEffect(() => {
    if (!isLoading && meCheck) navigate("/ops/dashboard");
  }, [isLoading, meCheck]);

  if (isLoading || meCheck) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Cleanex</h1>
          <p className="text-indigo-300 text-sm mt-1">Admin Portal</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-7">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-5">Access the admin control panel</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-1.5">
              <Label htmlFor="ops-email" className="text-sm">Email Address</Label>
              <Input
                id="ops-email"
                data-testid="input-ops-login-email"
                type="email"
                placeholder="admin@cleanex.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ops-pass" className="text-sm">Password</Label>
              <Input
                id="ops-pass"
                data-testid="input-ops-login-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              data-testid="button-ops-login"
              disabled={!email || !password || login.isPending}
              className="w-full bg-indigo-600 text-white font-semibold"
            >
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>
        </div>
        <p className="text-center text-xs text-indigo-400">
          Not an admin?{" "}
          <button onClick={() => navigate("/portal")} className="underline text-indigo-300">Affiliate portal</button>
          {" · "}
          <button onClick={() => navigate("/")} className="underline text-indigo-300">Back to home</button>
        </p>
      </div>
    </div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────────────────────────

type Tab = "overview" | "companies" | "affiliates";

export function AdminPortalDashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("overview");

  const { data: me, isLoading: meLoading } = useQuery<{ email: string } | null>({
    queryKey: ["/api/admin/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0,
  });

  const { data: companies = [], isLoading: loadingCompanies } = useQuery<SaasCompanyWithAffiliate[]>({
    queryKey: ["/api/saas/companies"],
    enabled: !!me,
  });

  const { data: affiliates = [], isLoading: loadingAffiliates } = useQuery<SaasAffiliate[]>({
    queryKey: ["/api/saas/affiliates"],
    enabled: !!me,
  });

  const logout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/logout", {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.clear();
      navigate("/ops");
    },
    onError: () => toast({ title: "Logout failed", variant: "destructive" }),
  });

  // Redirect to login if not authenticated — must be BEFORE any early returns
  useEffect(() => {
    if (!meLoading && !me) navigate("/ops");
  }, [meLoading, me]);

  if (meLoading || !me) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <RefreshCw className="w-6 h-6 animate-spin text-indigo-600" />
    </div>
  );

  const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "overview",   label: "Overview",   icon: TrendingUp  },
    { id: "companies",  label: "Companies",  icon: Building2   },
    { id: "affiliates", label: "Affiliates", icon: Users       },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="h-14 flex items-center justify-between gap-4">
            {/* Logo + tabs */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900 leading-none">Admin Portal</p>
                  <p className="text-xs text-gray-400">{me.email}</p>
                </div>
              </div>
              <nav className="hidden sm:flex items-center gap-1">
                {TABS.map(t => (
                  <button
                    key={t.id}
                    data-testid={`ops-tab-${t.id}`}
                    onClick={() => setTab(t.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      tab === t.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <t.icon className="w-4 h-4" />{t.label}
                    {t.id === "companies" && <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">{companies.length}</span>}
                    {t.id === "affiliates" && <span className="ml-1 text-xs bg-gray-200 text-gray-600 rounded-full px-1.5">{affiliates.length}</span>}
                  </button>
                ))}
              </nav>
            </div>
            {/* Sign out */}
            <Button variant="ghost" size="sm" data-testid="button-ops-signout" onClick={() => logout.mutate()} disabled={logout.isPending} className="text-gray-500">
              <LogOut className="w-4 h-4 mr-1.5" />Sign Out
            </Button>
          </div>
          {/* Mobile tabs */}
          <div className="flex sm:hidden gap-1 pb-2">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium ${tab === t.id ? "bg-indigo-50 text-indigo-700" : "text-gray-500"}`}>
                <t.icon className="w-3.5 h-3.5" />{t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {tab === "overview" && <OverviewTab companies={companies} affiliates={affiliates} />}
        {tab === "companies" && <CompaniesTab companies={companies} affiliates={affiliates} isLoading={loadingCompanies} />}
        {tab === "affiliates" && <AffiliatesTab affiliates={affiliates} companies={companies} isLoading={loadingAffiliates} />}
      </main>
    </div>
  );
}
