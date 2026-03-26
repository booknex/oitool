import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package, ClipboardList, Star, BarChart3, Users, ChevronRight,
  Sparkles, Settings2, Pencil, Trash2, Plus, Check,
  Home, Calendar, Truck, ShoppingCart, Bell, FileText,
  Phone, Zap, DollarSign, Globe, Wrench, Droplet, Archive,
  Lock, Coffee, AlertCircle, BookOpen, Camera, ShoppingBag,
  ArrowRight,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { DashboardApp, InventoryItem } from "@shared/schema";

// ─── Icon registry ────────────────────────────────────────────────────────────

const ICON_MAP: Record<string, React.ElementType> = {
  Package, ClipboardList, Star, BarChart3, Users, Home, Calendar,
  Truck, ShoppingCart, Bell, FileText, Phone, Zap, DollarSign, Globe,
  Wrench, Droplet, Archive, Lock, Coffee, AlertCircle, BookOpen, Camera,
  Settings2, Sparkles,
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

  const lowItems = items
    .filter((item) => item.visible && isLowStock(item))
    .sort((a, b) => (a.stock / a.maxStock) - (b.stock / b.maxStock));

  const hasCritical = lowItems.some((i) => stockLevel(i) === "critical");

  return (
    <div className="relative z-10 flex flex-col flex-1 min-h-0 mt-5">
      {/* Outer glass card */}
      <div
        className="flex flex-col flex-1 min-h-0 rounded-3xl overflow-hidden relative"
        style={{
          background: "linear-gradient(145deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.07) 50%, rgba(255,255,255,0.12) 100%)",
          border: "1px solid rgba(255,255,255,0.22)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.25)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Specular highlight stripe at top */}
        <div
          className="absolute top-0 left-6 right-6 h-px rounded-full pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)" }}
        />

        {/* Card header */}
        <div
          className="flex items-center justify-between px-4 pt-4 pb-3 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.10)" }}
        >
          <div>
            <p className="text-white/45 text-[9px] uppercase tracking-[0.12em] font-semibold mb-0.5">
              Order Summary
            </p>
            <h3 className="text-white text-[15px] font-semibold tracking-tight">Items to Restock</h3>
          </div>

          {/* Count pill */}
          <div
            className="px-3 py-1 rounded-full text-[11px] font-bold tabular-nums"
            style={{
              background: isLoading
                ? "rgba(255,255,255,0.08)"
                : lowItems.length > 0
                  ? hasCritical
                    ? "linear-gradient(135deg, rgba(255,59,48,0.45), rgba(255,59,48,0.25))"
                    : "linear-gradient(135deg, rgba(255,149,0,0.45), rgba(255,149,0,0.25))"
                  : "linear-gradient(135deg, rgba(52,199,89,0.40), rgba(52,199,89,0.20))",
              border: isLoading
                ? "1px solid rgba(255,255,255,0.10)"
                : lowItems.length > 0
                  ? hasCritical ? "1px solid rgba(255,59,48,0.50)" : "1px solid rgba(255,149,0,0.45)"
                  : "1px solid rgba(52,199,89,0.45)",
              color: isLoading ? "rgba(255,255,255,0.35)"
                : lowItems.length > 0
                  ? hasCritical ? "#FF6B6B" : "#FFB84D"
                  : "#6EE7A0",
              boxShadow: lowItems.length > 0 && !isLoading
                ? hasCritical
                  ? "0 0 12px rgba(255,59,48,0.25)"
                  : "0 0 12px rgba(255,149,0,0.25)"
                : "none",
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
                <div
                  key={i}
                  className="h-[52px] rounded-2xl animate-pulse"
                  style={{ background: "rgba(255,255,255,0.06)" }}
                />
              ))}
            </div>
          ) : lowItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center px-4">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 relative"
                style={{
                  background: "linear-gradient(135deg, rgba(52,199,89,0.25), rgba(52,199,89,0.10))",
                  border: "1px solid rgba(52,199,89,0.30)",
                  boxShadow: "0 0 20px rgba(52,199,89,0.15)",
                }}
              >
                <Check className="w-5 h-5 text-[#34C759]" />
              </div>
              <p className="text-white/80 text-sm font-semibold">All stocked up!</p>
              <p className="text-white/35 text-xs mt-1 leading-relaxed">No items need restocking.</p>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              {lowItems.map((item) => {
                const level = stockLevel(item);
                const isCrit = level === "critical";
                const needed = item.maxStock - item.stock;
                const pct = Math.round((item.stock / item.maxStock) * 100);

                // iOS system colors
                const dotColor   = isCrit ? "#FF3B30" : "#FF9500";
                const rowBg      = isCrit ? "rgba(255,59,48,0.14)"  : "rgba(255,149,0,0.12)";
                const rowBorder  = isCrit ? "rgba(255,59,48,0.30)"  : "rgba(255,149,0,0.28)";
                const dotGlow    = isCrit ? "0 0 8px rgba(255,59,48,0.9), 0 0 20px rgba(255,59,48,0.45)" : "0 0 8px rgba(255,149,0,0.9), 0 0 20px rgba(255,149,0,0.45)";
                const barColor   = isCrit ? "#FF3B30" : "#FF9500";
                const textAccent = isCrit ? "#FF6B6B" : "#FFB84D";

                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 px-3 py-3 rounded-2xl relative overflow-hidden"
                    style={{
                      background: rowBg,
                      border: `1px solid ${rowBorder}`,
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
                    }}
                    data-testid={`low-stock-item-${item.id}`}
                  >
                    {/* Specular top on row */}
                    <div
                      className="absolute top-0 left-4 right-4 h-px pointer-events-none"
                      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.20), transparent)" }}
                    />

                    {/* Glowing dot */}
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: dotColor, boxShadow: dotGlow }}
                    />

                    {/* Name + bar */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-[12px] font-semibold truncate leading-tight">{item.name}</p>
                      {/* Mini progress bar */}
                      <div className="mt-1.5 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.10)" }}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${barColor}, ${barColor}CC)`,
                            boxShadow: `0 0 6px ${barColor}80`,
                          }}
                        />
                      </div>
                    </div>

                    {/* Stock nums */}
                    <div className="text-right flex-shrink-0 ml-1">
                      <p className="text-[12px] font-bold tabular-nums leading-tight" style={{ color: textAccent }}>
                        {item.stock}<span className="text-white/35 font-normal">/{item.maxStock}</span>
                      </p>
                      <p className="text-white/35 text-[10px] tabular-nums">
                        +{needed} needed
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer — glass pill button */}
        <div
          className="p-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
        >
          <button
            onClick={onNavigateKiosk}
            data-testid="button-go-to-kiosk"
            className="w-full relative flex items-center justify-center gap-2 py-3 rounded-2xl text-[13px] font-semibold text-white transition-all overflow-hidden"
            style={{
              background: "linear-gradient(145deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.10) 100%)",
              border: "1px solid rgba(255,255,255,0.25)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.30)",
            }}
          >
            {/* Button specular */}
            <div
              className="absolute top-0 left-8 right-8 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.60), transparent)" }}
            />
            <ShoppingBag className="w-4 h-4 opacity-90" />
            Open Supply Kiosk
            <ArrowRight className="w-3.5 h-3.5 opacity-75" />
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
      {/* ── Left panel — iOS Liquid Glass ────────────────────────────────── */}
      <div
        className="hidden md:flex w-[38%] flex-shrink-0 flex-col p-6 relative overflow-hidden"
        style={{ background: "linear-gradient(155deg, #0D0B1E 0%, #0A1628 35%, #081C2E 65%, #060E18 100%)" }}
      >
        {/* ── Vivid color blobs (iOS Aurora wallpaper feel) ── */}
        {/* Purple blob — top-left */}
        <div className="absolute pointer-events-none" style={{
          top: "-15%", left: "-10%", width: "70%", height: "70%",
          background: "radial-gradient(circle, rgba(139,92,246,0.55) 0%, rgba(109,40,217,0.25) 40%, transparent 70%)",
          filter: "blur(32px)",
        }} />
        {/* Cyan/teal blob — center-right */}
        <div className="absolute pointer-events-none" style={{
          top: "20%", right: "-15%", width: "65%", height: "55%",
          background: "radial-gradient(circle, rgba(6,182,212,0.45) 0%, rgba(14,116,144,0.20) 45%, transparent 70%)",
          filter: "blur(28px)",
        }} />
        {/* Blue blob — center */}
        <div className="absolute pointer-events-none" style={{
          top: "35%", left: "15%", width: "60%", height: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.35) 0%, transparent 65%)",
          filter: "blur(36px)",
        }} />
        {/* Pink/rose blob — bottom */}
        <div className="absolute pointer-events-none" style={{
          bottom: "-10%", left: "25%", width: "55%", height: "45%",
          background: "radial-gradient(circle, rgba(236,72,153,0.28) 0%, transparent 65%)",
          filter: "blur(30px)",
        }} />
        {/* Very subtle overall overlay to deepen */}
        <div className="absolute inset-0 pointer-events-none"
             style={{ background: "rgba(0,0,0,0.25)" }} />

        {/* Grain texture overlay for depth */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
             style={{
               backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E\")",
               backgroundSize: "128px 128px",
             }}
        />

        {/* Brand — glass pill */}
        <div className="relative z-10 flex-shrink-0">
          <div
            className="inline-flex items-center gap-2.5 px-3 py-2 rounded-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(255,255,255,0.15), rgba(255,255,255,0.07))",
              border: "1px solid rgba(255,255,255,0.20)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.25)",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, rgba(139,92,246,0.60), rgba(59,130,246,0.50))",
                boxShadow: "0 0 12px rgba(139,92,246,0.50)",
              }}
            >
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <span className="text-white text-sm font-semibold tracking-tight">Cleanex</span>
              <span className="text-white/40 text-[11px] ml-1.5">Operations</span>
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
          style={{ background: "linear-gradient(135deg, #0D0B1E 0%, #0A1628 100%)" }}
        >
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.70), rgba(59,130,246,0.60))" }}
          >
            <Sparkles className="w-3 h-3 text-white" />
          </div>
          <span className="text-white font-semibold text-sm tracking-tight">Cleanex</span>
          <span className="text-white/40 text-xs ml-1">Operations Platform</span>
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
          <div className="flex flex-col gap-2 max-w-2xl">
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
                            Coming Soon
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
