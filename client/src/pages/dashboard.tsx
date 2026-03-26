import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  Package, ClipboardList, Star, BarChart3, Users, ChevronRight,
  Sparkles, Settings2, Pencil, Trash2, Plus, X, Check,
  Home, Calendar, Truck, ShoppingCart, Bell, FileText,
  Phone, Zap, DollarSign, Globe, Wrench, Droplet, Archive,
  Lock, Coffee, AlertCircle, BookOpen, Camera,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import type { DashboardApp } from "@shared/schema";

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
            <div className="flex-1 space-y-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="App name"
                  data-testid="input-app-name"
                />
              </div>
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
      {/* ── Left hero panel ─────────────────────────────────────────────── */}
      <div
        className="hidden md:flex w-[38%] flex-shrink-0 flex-col justify-between p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, #0F4C5C 0%, #0A3240 50%, #061E29 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #4DD9C0 0%, transparent 60%),
                              radial-gradient(circle at 80% 20%, #38BDF8 0%, transparent 50%),
                              radial-gradient(circle at 60% 80%, #0EA5E9 0%, transparent 40%)`,
          }}
        />

        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-semibold text-lg tracking-tight">Cleanex</span>
          </div>
          <p className="text-white/40 text-xs ml-10">Operations Platform</p>
        </div>

        <div className="relative z-10">
          <p className="text-white/40 text-xs uppercase tracking-widest mb-3 font-medium">
            Empowering your team
          </p>
          <h2 className="text-white text-4xl font-bold leading-tight">
            Cleaning
            <br />
            Operations
            <br />
            <span className="text-[#4DD9C0]">Made Simple</span>
          </h2>
          <p className="text-white/50 text-sm mt-4 leading-relaxed max-w-xs">
            Everything your cleaning team needs, in one place.
          </p>
        </div>
      </div>

      {/* ── Right panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        {/* Mobile brand bar */}
        <div
          className="md:hidden flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #0F4C5C 0%, #0A3240 100%)" }}
        >
          <div className="w-6 h-6 rounded-md bg-white/10 flex items-center justify-center">
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

            {/* Add App button — only in edit mode */}
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

            {/* Dismiss confirm-delete hint */}
            {editMode && deletingId !== null && (
              <div className="flex items-center gap-2 px-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Tap the red trash icon again to confirm deletion.{" "}
                  <button
                    className="underline"
                    onClick={() => setDeletingId(null)}
                  >
                    Cancel
                  </button>
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
