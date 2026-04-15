import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package, ClipboardList, Star, BarChart3, Users, ChevronRight,
  Sparkles, Settings2, Pencil, Trash2, Plus, Check, Save, X,
  Home, Calendar, CalendarDays, CalendarClock, Receipt, Building2, Truck, ShoppingCart, Bell, FileText,
  Phone, Zap, DollarSign, Globe, Wrench, Droplet, Archive,
  Lock, Coffee, AlertCircle, BookOpen, Camera, ShoppingBag,
  ArrowRight, Eye, EyeOff, TrendingUp, AlertTriangle, CircleDollarSign, ShieldCheck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { DashboardApp, InventoryItem, InvoiceWithDetails } from "@shared/schema";
import { itemImages } from "@/lib/itemData";

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Package, ClipboardList, Star, BarChart3, Users, Home, Calendar, CalendarDays, CalendarClock, Receipt, Building2,
  Truck, ShoppingCart, Bell, FileText, Phone, Zap, DollarSign, Globe,
  Wrench, Droplet, Archive, Lock, Coffee, AlertCircle, BookOpen, Camera,
  Settings2, Sparkles, ShieldCheck,
};

const ICON_NAMES = Object.keys(ICON_MAP);

// ─── Color presets ─────────────────────────────────────────────────────────────

const BG_COLORS = [
  "#E8F4FD", "#FFF8E1", "#F3E5F5", "#E8F5E9", "#FBE9E7",
  "#E3F2FD", "#FCE4EC", "#F9FBE7", "#E0F7FA", "#EDE7F6",
  "#FFF3E0", "#E8EAF6", "#F1F8E9", "#FFF9C4", "#EFEBE9",
];

const ICON_COLORS = [
  "#2196F3", "#F59E0B", "#9C27B0", "#4CAF50", "#FF5722",
  "#E91E63", "#00BCD4", "#FF9800", "#3F51B5", "#009688",
  "#795548", "#607D8B", "#F44336", "#8BC34A", "#673AB7",
];

// ─── Stock helpers ────────────────────────────────────────────────────────────

function isLowStock(item: InventoryItem): boolean {
  if (item.stock === 0) return true;
  if (item.lowStockThreshold !== null && item.lowStockThreshold !== undefined) {
    return item.stock <= item.lowStockThreshold;
  }
  return item.stock / item.maxStock <= 0.25;
}

function stockLevel(item: InventoryItem): "critical" | "low" | "ok" {
  if (item.stock === 0) return "critical";
  const pct = item.stock / item.maxStock;
  if (pct <= 0.10) return "critical";
  return "low";
}

// ─── Low Stock Module (Liquid Glass) ──────────────────────────────────────────

function LowStockModule({ onNavigateKiosk }: { onNavigateKiosk: () => void }) {
  const { data: items = [], isLoading } = useQuery<InventoryItem[]>({
    queryKey: ["/api/items"],
    refetchInterval: 30_000,
  });

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editStock, setEditStock] = useState<string>("");
  const { toast } = useToast();

  const updateMutation = useMutation({
    mutationFn: async ({ id, stock }: { id: number; stock: number }) => {
      const res = await apiRequest("PATCH", `/api/items/${id}`, { id, stock });
      return res.json() as Promise<InventoryItem>;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(["/api/items"], (old: InventoryItem[] | undefined) =>
        old ? old.map(i => i.id === updated.id ? updated : i) : old
      );
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      setEditingId(null);
      toast({ title: "Stock Updated", description: `${updated.name} set to ${updated.stock}/${updated.maxStock}.` });
    },
    onError: () => {
      toast({ title: "Update Failed", description: "Could not update stock.", variant: "destructive" });
    },
  });

  const lowItems = items
    .filter((item) => item.visible && isLowStock(item))
    .sort((a, b) => (a.stock / a.maxStock) - (b.stock / b.maxStock));

  const hasCritical = lowItems.some((i) => stockLevel(i) === "critical");

  return (
    <div className="relative z-10 flex flex-col flex-1 min-h-0 mt-5">
      {/* White card */}
      <div
        className="flex flex-col flex-1 min-h-0 rounded-3xl overflow-hidden relative"
        style={{
          background: "rgba(255,255,255,0.88)",
          border: "1px solid rgba(147,197,253,0.35)",
          boxShadow: "0 8px 32px rgba(96,165,250,0.12), 0 2px 8px rgba(0,0,0,0.06)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Card header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(147,197,253,0.20)" }}
        >
          <div>
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.10em] font-semibold mb-0.5">
              Order Summary
            </p>
            <h3 className="text-slate-800 text-[18px] font-semibold tracking-tight">Items to Restock</h3>
          </div>

          {/* Count pill */}
          <div
            className="px-3 py-1.5 rounded-full text-xs font-bold tabular-nums"
            style={{
              background: isLoading
                ? "rgba(148,163,184,0.12)"
                : lowItems.length > 0
                  ? hasCritical
                    ? "rgba(255,59,48,0.10)"
                    : "rgba(255,149,0,0.10)"
                  : "rgba(52,199,89,0.10)",
              border: isLoading
                ? "1px solid rgba(148,163,184,0.20)"
                : lowItems.length > 0
                  ? hasCritical ? "1px solid rgba(255,59,48,0.25)" : "1px solid rgba(255,149,0,0.25)"
                  : "1px solid rgba(52,199,89,0.30)",
              color: isLoading ? "#94A3B8"
                : lowItems.length > 0
                  ? hasCritical ? "#EF4444" : "#F97316"
                  : "#16A34A",
            }}
            data-testid="low-stock-count"
          >
            {isLoading ? "—" : `${lowItems.length} item${lowItems.length !== 1 ? "s" : ""}`}
          </div>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-[52px] rounded-2xl animate-pulse bg-slate-100" />
              ))}
            </div>
          ) : lowItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                style={{ background: "rgba(52,199,89,0.10)", border: "1px solid rgba(52,199,89,0.20)" }}
              >
                <Check className="w-5 h-5 text-green-500" />
              </div>
              <p className="text-slate-700 text-base font-semibold">All stocked up!</p>
              <p className="text-slate-400 text-sm mt-1 leading-relaxed">No items need restocking.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {lowItems.map((item) => {
                const isOut    = item.stock === 0;
                const needed   = item.maxStock - item.stock;

                // Colors
                const imgBg        = isOut ? "#FEE2E2" : "#FFF7ED";
                const rowBorder    = isOut ? "rgba(239,68,68,0.22)" : "rgba(249,115,22,0.18)";
                const statusBg     = isOut ? "rgba(239,68,68,0.12)" : "rgba(249,115,22,0.10)";
                const statusBorder = isOut ? "rgba(239,68,68,0.35)" : "rgba(249,115,22,0.30)";
                const statusColor  = isOut ? "#DC2626" : "#EA580C";
                const qtyBg        = isOut ? "rgba(239,68,68,0.08)" : "rgba(249,115,22,0.08)";
                const qtyBorder    = isOut ? "rgba(239,68,68,0.20)" : "rgba(249,115,22,0.20)";
                const qtyColor     = isOut ? "#B91C1C" : "#C2410C";

                const isEditing = editingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl group"
                    style={{ border: `1px solid ${rowBorder}` }}
                    data-testid={`low-stock-item-${item.id}`}
                  >
                    {isEditing ? (
                      /* ── Inline edit mode ── */
                      <div className="flex items-center gap-3 p-3">
                        <img
                          src={itemImages[item.id]}
                          alt={item.name}
                          className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
                          style={{ backgroundColor: imgBg }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-semibold text-slate-800 truncate leading-snug mb-2">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1.5 flex-1">
                              <input
                                type="text"
                                inputMode="numeric"
                                autoFocus
                                className="w-16 px-2 py-1 rounded-lg text-sm font-bold text-center border focus:outline-none focus:ring-2 focus:ring-blue-300"
                                style={{ background: qtyBg, border: `1px solid ${qtyBorder}`, color: qtyColor }}
                                value={editStock}
                                onChange={(e) => setEditStock(e.target.value.replace(/[^0-9]/g, ""))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    const v = Math.min(parseInt(editStock) || 0, item.maxStock);
                                    updateMutation.mutate({ id: item.id, stock: v });
                                  } else if (e.key === "Escape") {
                                    setEditingId(null);
                                  }
                                }}
                                data-testid={`input-dashboard-edit-stock-${item.id}`}
                              />
                              <span className="text-[13px] text-slate-400 font-medium">/ {item.maxStock}</span>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingId(null)}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                                data-testid={`button-dashboard-edit-cancel-${item.id}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => {
                                  const v = Math.min(parseInt(editStock) || 0, item.maxStock);
                                  updateMutation.mutate({ id: item.id, stock: v });
                                }}
                                disabled={updateMutation.isPending}
                                className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-colors"
                                style={{ background: "linear-gradient(135deg, #3B82F6, #2563EB)" }}
                                data-testid={`button-dashboard-edit-save-${item.id}`}
                              >
                                <Save className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* ── Normal view mode ── */
                      <div className="flex items-center gap-3 p-3">
                        {/* Image */}
                        <img
                          src={itemImages[item.id]}
                          alt={item.name}
                          className="w-14 h-14 object-contain rounded-lg flex-shrink-0"
                          style={{ backgroundColor: imgBg }}
                        />

                        {/* Name + status pill */}
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] font-semibold text-slate-800 truncate leading-snug">
                            {item.name}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wide"
                              style={{ background: statusBg, border: `1px solid ${statusBorder}`, color: statusColor }}
                            >
                              {isOut ? "Out of Stock" : "Low Stock"}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {isOut ? "Sin Stock · Ordenar" : `Stock Bajo · ${item.stock}/${item.maxStock}`}
                            </span>
                          </div>
                        </div>

                        {/* Stock count + edit button */}
                        <div className="flex-shrink-0 flex flex-col items-center gap-1">
                          <div
                            className="px-3 py-1.5 rounded-lg text-[13px] font-bold tabular-nums"
                            style={{ background: qtyBg, border: `1px solid ${qtyBorder}`, color: qtyColor }}
                          >
                            {item.stock}/{item.maxStock}
                          </div>
                          <button
                            onClick={() => {
                              setEditingId(item.id);
                              setEditStock(String(item.stock));
                            }}
                            className="w-full flex items-center justify-center gap-1 text-[11px] text-slate-400 hover:text-blue-500 transition-colors"
                            data-testid={`button-dashboard-edit-open-${item.id}`}
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            edit
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer button */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(147,197,253,0.20)" }}
        >
          <button
            onClick={onNavigateKiosk}
            data-testid="button-go-to-kiosk"
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #3B82F6, #2563EB)",
              boxShadow: "0 4px 14px rgba(59,130,246,0.35)",
            }}
          >
            <ShoppingBag className="w-4 h-4" />
            Open Supply Kiosk
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Clock ─────────────────────────────────────────────────────────────────────

function Clock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <div className="text-right">
      <div className="text-lg font-semibold tabular-nums text-foreground">
        {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
      </div>
      <div className="text-xs text-muted-foreground">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

// ─── App Form Modal ────────────────────────────────────────────────────────────

type AppFormData = {
  name: string;
  description: string;
  icon: string;
  color: string;
  iconColor: string;
  route: string;
  available: boolean;
};

const DEFAULT_FORM: AppFormData = {
  name: "",
  description: "",
  icon: "Package",
  color: "#E8F4FD",
  iconColor: "#2196F3",
  route: "/",
  available: false,
};

function AppFormModal({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: AppFormData;
  onSave: (data: AppFormData) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<AppFormData>(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial, open]);

  const set = (field: keyof AppFormData, value: string | boolean) =>
    setForm((f) => ({ ...f, [field]: value }));

  const PreviewIcon = ICON_MAP[form.icon] ?? Package;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit App" : "Add App"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border border-black/5"
              style={{ backgroundColor: form.color }}
            >
              <PreviewIcon className="w-7 h-7" style={{ color: form.iconColor }} />
            </div>
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                placeholder="App name"
                data-testid="input-app-name"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Description</Label>
            <Input
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short description"
              data-testid="input-app-description"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-1 block">Route (URL path)</Label>
            <Input
              value={form.route}
              onChange={(e) => set("route", e.target.value)}
              placeholder="/kiosk"
              data-testid="input-app-route"
            />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Icon</Label>
            <div className="grid grid-cols-8 gap-1.5">
              {ICON_NAMES.map((name) => {
                const IconComp = ICON_MAP[name];
                const selected = form.icon === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => set("icon", name)}
                    data-testid={`icon-option-${name.toLowerCase()}`}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${
                      selected
                        ? "border-foreground/40 bg-foreground/5"
                        : "border-transparent hover:border-black/10 hover:bg-black/5"
                    }`}
                    title={name}
                  >
                    <IconComp className="w-4 h-4 text-foreground/70" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Background color</Label>
            <div className="flex flex-wrap gap-2">
              {BG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("color", c)}
                  data-testid={`bg-color-${c.replace("#", "")}`}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    form.color === c ? "border-foreground/60 scale-110" : "border-transparent hover:border-black/20"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground mb-2 block">Icon color</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => set("iconColor", c)}
                  data-testid={`icon-color-${c.replace("#", "")}`}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    form.iconColor === c ? "border-foreground/60 scale-110" : "border-transparent hover:border-black/20"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-foreground">Active</div>
              <div className="text-xs text-muted-foreground">Users can tap this app to open it</div>
            </div>
            <Switch
              checked={form.available}
              onCheckedChange={(v) => set("available", v)}
              data-testid="switch-app-available"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={saving}
              data-testid="button-cancel-app"
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={() => onSave(form)}
              disabled={saving || !form.name.trim()}
              data-testid="button-save-app"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice Analytics ────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtShort = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CFG: Record<InvoiceStatus, { label: string; bg: string; text: string; border: string }> = {
  draft:   { label: "Draft",   bg: "rgba(148,163,184,0.10)", text: "#64748B", border: "rgba(148,163,184,0.25)" },
  sent:    { label: "Sent",    bg: "rgba(59,130,246,0.10)",  text: "#2563EB", border: "rgba(59,130,246,0.25)" },
  paid:    { label: "Paid",    bg: "rgba(34,197,94,0.10)",   text: "#16A34A", border: "rgba(34,197,94,0.25)" },
  overdue: { label: "Overdue", bg: "rgba(239,68,68,0.10)",   text: "#DC2626", border: "rgba(239,68,68,0.25)" },
};

function InvoiceAnalytics({ onNavigate }: { onNavigate: (path: string) => void }) {
  const { data: invoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({
    queryKey: ["/api/invoices"],
  });
  const { data: clients = [] } = useQuery<{ id: number }[]>({
    queryKey: ["/api/clients"],
  });

  const totalInvoiced = invoices.reduce((s, inv) => s + (inv.total ?? 0), 0);
  const totalPaid = invoices.filter(i => i.status === "paid").reduce((s, i) => s + (i.total ?? 0), 0);
  const totalOverdue = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + (i.total ?? 0), 0);
  const totalOutstanding = invoices.filter(i => i.status === "sent" || i.status === "draft").reduce((s, i) => s + (i.total ?? 0), 0);

  const countPaid = invoices.filter(i => i.status === "paid").length;
  const countOverdue = invoices.filter(i => i.status === "overdue").length;
  const countOutstanding = invoices.filter(i => i.status === "sent" || i.status === "draft").length;

  const paidPct = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
  const outstandingPct = totalInvoiced > 0 ? (totalOutstanding / totalInvoiced) * 100 : 0;
  const overduePct = totalInvoiced > 0 ? (totalOverdue / totalInvoiced) * 100 : 0;

  const recentInvoices = [...invoices]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  const statCards = [
    {
      label: "Total Invoiced",
      value: totalInvoiced,
      count: invoices.length,
      icon: CircleDollarSign,
      iconBg: "rgba(59,130,246,0.10)",
      iconColor: "#2563EB",
      testId: "stat-total-invoiced",
    },
    {
      label: "Paid",
      value: totalPaid,
      count: countPaid,
      icon: Check,
      iconBg: "rgba(34,197,94,0.10)",
      iconColor: "#16A34A",
      testId: "stat-paid",
    },
    {
      label: "Outstanding",
      value: totalOutstanding,
      count: countOutstanding,
      icon: TrendingUp,
      iconBg: "rgba(249,115,22,0.10)",
      iconColor: "#EA580C",
      testId: "stat-outstanding",
    },
    {
      label: "Overdue",
      value: totalOverdue,
      count: countOverdue,
      icon: AlertTriangle,
      iconBg: "rgba(239,68,68,0.10)",
      iconColor: "#DC2626",
      testId: "stat-overdue",
    },
  ];

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.10em] font-semibold text-muted-foreground mb-0.5">
            Invoice Overview
          </p>
          <h2 className="text-base font-semibold text-foreground">Financial Summary</h2>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {clients.length} client{clients.length !== 1 ? "s" : ""} · {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => onNavigate("/invoicing")}
          data-testid="button-go-to-invoicing"
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          View All <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="flex items-center gap-3 p-3 rounded-xl bg-[#FAFAFA] border border-black/5"
              data-testid={card.testId}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: card.iconBg }}
              >
                <Icon className="w-4 h-4" style={{ color: card.iconColor }} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground truncate">{card.label}</p>
                {isLoading ? (
                  <div className="h-4 w-16 rounded bg-black/8 animate-pulse mt-0.5" />
                ) : (
                  <p className="text-sm font-semibold text-foreground tabular-nums">
                    {fmt(card.value)}
                  </p>
                )}
                {!isLoading && (
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    {card.count} invoice{card.count !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Status breakdown bar */}
      {!isLoading && invoices.length > 0 && (
        <div className="mb-3">
          <div className="flex rounded-full overflow-hidden h-2 bg-black/5">
            <div
              className="h-full bg-green-500 transition-all"
              style={{ width: `${paidPct}%` }}
              title={`Paid: ${paidPct.toFixed(0)}%`}
            />
            <div
              className="h-full bg-orange-400 transition-all"
              style={{ width: `${outstandingPct}%` }}
              title={`Outstanding: ${outstandingPct.toFixed(0)}%`}
            />
            <div
              className="h-full bg-red-500 transition-all"
              style={{ width: `${overduePct}%` }}
              title={`Overdue: ${overduePct.toFixed(0)}%`}
            />
          </div>
          <div className="flex gap-4 mt-1.5">
            {[
              { label: "Paid", color: "bg-green-500", pct: paidPct },
              { label: "Outstanding", color: "bg-orange-400", pct: outstandingPct },
              { label: "Overdue", color: "bg-red-500", pct: overduePct },
            ].map(({ label, color, pct }) => (
              <div key={label} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
                <span className="text-[10px] text-muted-foreground">{label} {pct.toFixed(0)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent invoices */}
      {(isLoading || recentInvoices.length > 0) && (
        <div>
          <p className="text-[11px] uppercase tracking-[0.10em] font-semibold text-muted-foreground mb-2">
            Recent Invoices
          </p>
          <div className="flex flex-col gap-1.5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-12 rounded-xl bg-black/5 animate-pulse" />
                ))
              : recentInvoices.map((inv) => {
                  const cfg = STATUS_CFG[inv.status as InvoiceStatus] ?? STATUS_CFG.draft;
                  return (
                    <div
                      key={inv.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-[#FAFAFA] border border-black/5 hover-elevate cursor-pointer"
                      onClick={() => onNavigate(`/invoicing/invoices/${inv.id}`)}
                      data-testid={`recent-invoice-${inv.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-foreground truncate">
                            {inv.client?.name ?? "Unknown"}
                          </p>
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex-shrink-0"
                            style={{ background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.text }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {inv.invoiceNumber} · Due {fmtShort(inv.dueDate)}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">
                        {fmt(inv.total ?? 0)}
                      </p>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {!isLoading && invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Receipt className="w-8 h-8 text-muted-foreground/30 mb-2" />
          <p className="text-sm text-muted-foreground">No invoices yet</p>
          <button
            onClick={() => onNavigate("/invoicing")}
            className="text-xs text-blue-500 hover:text-blue-600 mt-1"
            data-testid="button-create-first-invoice"
          >
            Create your first invoice
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Dashboard ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<DashboardApp | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const { data: apps = [], isLoading } = useQuery<DashboardApp[]>({
    queryKey: ["/api/dashboard-apps"],
  });

  const createMutation = useMutation({
    mutationFn: (data: AppFormData) =>
      apiRequest("POST", "/api/dashboard-apps", { ...data, sortOrder: apps.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-apps"] });
      setModalOpen(false);
      toast({ title: "App added" });
    },
    onError: () => toast({ title: "Failed to add app", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: AppFormData & { id: number }) =>
      apiRequest("PATCH", `/api/dashboard-apps/${data.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-apps"] });
      setModalOpen(false);
      setEditingApp(null);
      toast({ title: "App updated" });
    },
    onError: () => toast({ title: "Failed to update app", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/dashboard-apps/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard-apps"] });
      setDeletingId(null);
      toast({ title: "App removed" });
    },
    onError: () => toast({ title: "Failed to remove app", variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, available }: { id: number; available: boolean }) =>
      apiRequest("PATCH", `/api/dashboard-apps/${id}`, { available }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/dashboard-apps"] }),
    onError: () => toast({ title: "Failed to update visibility", variant: "destructive" }),
  });

  function openAdd() {
    setEditingApp(null);
    setModalOpen(true);
  }

  function openEdit(app: DashboardApp, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingApp(app);
    setModalOpen(true);
  }

  function handleDelete(app: DashboardApp, e: React.MouseEvent) {
    e.stopPropagation();
    if (deletingId === app.id) {
      deleteMutation.mutate(app.id);
    } else {
      setDeletingId(app.id);
    }
  }

  function handleSave(data: AppFormData) {
    if (editingApp) {
      updateMutation.mutate({ ...data, id: editingApp.id });
    } else {
      createMutation.mutate(data);
    }
  }

  const saving = createMutation.isPending || updateMutation.isPending;

  const modalInitial: AppFormData = editingApp
    ? {
        name: editingApp.name,
        description: editingApp.description,
        icon: editingApp.icon,
        color: editingApp.color,
        iconColor: editingApp.iconColor,
        route: editingApp.route,
        available: editingApp.available,
      }
    : DEFAULT_FORM;

  return (
    <div className="h-screen flex overflow-hidden select-none bg-[#F7F7F8]">
      {/* ── Left panel — Light / Baby Blue ───────────────────────────────── */}
      <div
        className="hidden md:flex w-[38%] flex-shrink-0 flex-col p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(155deg, #EEF6FF 0%, #DDEEFF 40%, #E8F4FB 70%, #F5FAFF 100%)" }}
      >
        {/* Soft blue blob — top-left */}
        <div className="absolute pointer-events-none" style={{
          top: "-20%", left: "-15%", width: "75%", height: "65%",
          background: "radial-gradient(circle, rgba(147,197,253,0.50) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        {/* Lighter blue blob — center-right */}
        <div className="absolute pointer-events-none" style={{
          top: "25%", right: "-15%", width: "60%", height: "55%",
          background: "radial-gradient(circle, rgba(186,230,255,0.55) 0%, transparent 70%)",
          filter: "blur(36px)",
        }} />
        {/* Very pale sky blob — bottom */}
        <div className="absolute pointer-events-none" style={{
          bottom: "-10%", left: "20%", width: "65%", height: "50%",
          background: "radial-gradient(circle, rgba(224,242,254,0.70) 0%, transparent 70%)",
          filter: "blur(32px)",
        }} />

        {/* Brand pill */}
        <div className="relative z-10 flex-shrink-0">
          <div
            className="inline-flex items-center gap-2.5 px-3 py-2 rounded-2xl"
            style={{
              background: "rgba(255,255,255,0.70)",
              border: "1px solid rgba(147,197,253,0.40)",
              boxShadow: "0 2px 12px rgba(96,165,250,0.12), inset 0 1px 0 rgba(255,255,255,0.90)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #60A5FA, #3B82F6)",
                boxShadow: "0 0 10px rgba(96,165,250,0.45)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-slate-700 text-sm font-semibold tracking-tight">Cleanex</span>
              <span className="text-slate-400 text-[11px] ml-1.5">Operations</span>
            </div>
          </div>
        </div>

        {/* Low-stock module */}
        <LowStockModule onNavigateKiosk={() => navigate("/kiosk")} />
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Mobile brand bar */}
        <div
          className="md:hidden flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #EEF6FF 0%, #DDEEFF 100%)", borderBottom: "1px solid rgba(147,197,253,0.30)" }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #60A5FA, #3B82F6)" }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-slate-700 font-semibold text-sm tracking-tight">Cleanex</span>
          <span className="text-slate-400 text-xs ml-1">Operations Platform</span>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-black/5 gap-4">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Select App</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a tool to get started</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Clock />
            <button
              onClick={() => { setEditMode((v) => !v); setDeletingId(null); }}
              data-testid="button-toggle-edit-mode"
              className={`ml-2 w-9 h-9 rounded-xl flex items-center justify-center border transition-all ${
                editMode
                  ? "bg-foreground text-background border-foreground"
                  : "border-black/10 text-muted-foreground hover:border-black/20 hover:bg-black/5"
              }`}
              title={editMode ? "Done editing" : "Edit dashboard"}
            >
              {editMode ? <Check className="w-4 h-4" /> : <Settings2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* App list */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-2xl">

          {/* App grid divider */}
          <div className="flex items-center gap-3 mb-3">
            <div className="flex-1 h-px bg-black/5" />
            <p className="text-[11px] uppercase tracking-[0.10em] font-semibold text-muted-foreground">
              Quick Access
            </p>
            <div className="flex-1 h-px bg-black/5" />
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-[68px] rounded-xl bg-black/5 animate-pulse" />
              ))
            ) : (
              apps.map((app) => {
                const Icon = ICON_MAP[app.icon] ?? Package;
                const isDeleting = deletingId === app.id;

                return (
                  <div
                    key={app.id}
                    className={`flex items-center gap-4 p-4 rounded-xl border border-black/5 bg-[#FAFAFA] transition-all ${
                      !editMode && app.available ? "hover-elevate cursor-pointer" : ""
                    } ${!editMode && !app.available ? "opacity-50" : ""}`}
                    onClick={() => !editMode && app.available && navigate(app.route)}
                    data-testid={`app-tile-${app.id}`}
                    role={!editMode && app.available ? "button" : undefined}
                  >
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: app.color }}
                    >
                      <Icon className="w-6 h-6" style={{ color: app.iconColor }} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground">{app.name}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{app.description}</div>
                    </div>

                    {editMode ? (
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); toggleMutation.mutate({ id: app.id, available: !app.available }); }}
                          data-testid={`button-toggle-app-${app.id}`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                            app.available
                              ? "border-black/10 text-muted-foreground hover:border-black/20 hover:bg-black/5"
                              : "border-amber-200 bg-amber-50 text-amber-500 hover:bg-amber-100"
                          }`}
                          title={app.available ? "Hide app" : "Show app"}
                          disabled={toggleMutation.isPending}
                        >
                          {app.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={(e) => openEdit(app, e)}
                          data-testid={`button-edit-app-${app.id}`}
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-black/10 text-muted-foreground hover:border-black/20 hover:bg-black/5 transition-all"
                          title="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(app, e)}
                          data-testid={`button-delete-app-${app.id}`}
                          className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-all ${
                            isDeleting
                              ? "border-red-300 bg-red-50 text-red-500"
                              : "border-black/10 text-muted-foreground hover:border-red-200 hover:text-red-400 hover:bg-red-50"
                          }`}
                          title={isDeleting ? "Click again to confirm delete" : "Delete"}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        {!app.available && (
                          <span className="text-[10px] font-semibold text-muted-foreground bg-black/5 px-2 py-0.5 rounded-full">
                            Hidden
                          </span>
                        )}
                        <ChevronRight
                          className={`w-4 h-4 ${app.available ? "text-muted-foreground/40" : "text-muted-foreground/20"}`}
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}

            {editMode && (
              <button
                onClick={openAdd}
                data-testid="button-add-app"
                className="flex items-center gap-4 p-4 rounded-xl border-2 border-dashed border-black/10 text-muted-foreground hover:border-black/20 hover:bg-black/5 transition-all w-full"
              >
                <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-black/5 flex-shrink-0">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Add App</span>
              </button>
            )}

            {editMode && deletingId !== null && (
              <div className="flex items-center gap-2 px-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tap the red trash icon again to confirm deletion.{" "}
                  <button className="underline" onClick={() => setDeletingId(null)}>Cancel</button>
                </p>
              </div>
            )}
          </div>
          </div>
        </div>

        <div className="px-6 py-3 border-t border-black/5 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            Cleanex &bull; Cleaning Operations Platform
          </p>
        </div>
      </div>

      {/* ── Add / Edit modal ─────────────────────────────────────────────── */}
      <AppFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingApp(null); }}
        initial={modalInitial}
        onSave={handleSave}
        saving={saving}
      />
    </div>
  );
}
