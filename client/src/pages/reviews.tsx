import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft, Plus, Star, Pencil, Trash2, Check, ExternalLink,
  ImagePlus, Loader2, RefreshCw, CalendarClock, LogIn, LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Property, BookingInfo, UpcomingBookings } from "@shared/schema";

// ─── Color palette ────────────────────────────────────────────────────────────

const SQUARE_COLORS = [
  "#E8F4FD", "#FFF8E1", "#F3E5F5", "#E8F5E9", "#FBE9E7",
  "#E3F2FD", "#FCE4EC", "#E0F7FA", "#FFF3E0", "#EDE7F6",
  "#F1F8E9", "#EFEBE9", "#E8EAF6", "#FFF9C4", "#F9FBE7",
];

const ACCENT_MAP: Record<string, string> = {
  "#E8F4FD": "#2196F3", "#FFF8E1": "#F59E0B", "#F3E5F5": "#9C27B0",
  "#E8F5E9": "#4CAF50", "#FBE9E7": "#FF5722", "#E3F2FD": "#1565C0",
  "#FCE4EC": "#E91E63", "#E0F7FA": "#00BCD4", "#FFF3E0": "#FF9800",
  "#EDE7F6": "#673AB7", "#F1F8E9": "#8BC34A", "#EFEBE9": "#795548",
  "#E8EAF6": "#3F51B5", "#FFF9C4": "#F9A825", "#F9FBE7": "#689F38",
};

// ─── Calendar helpers ─────────────────────────────────────────────────────────

type BookingStatus = "available" | "occupied" | "checking_out" | "checking_in";

const STATUS_CONFIG: Record<BookingStatus, { bg: string; text: string; label: string }> = {
  available:    { bg: "#dcfce7", text: "#15803d", label: "Available" },
  occupied:     { bg: "#dbeafe", text: "#1d4ed8", label: "Occupied" },
  checking_out: { bg: "#ffedd5", text: "#c2410c", label: "Checkout Today" },
  checking_in:  { bg: "#f3e8ff", text: "#7e22ce", label: "Check-in Today" },
};

function getPropertyStatus(propBookings: BookingInfo[]): BookingStatus {
  const todayStr = new Date().toISOString().split("T")[0];
  let isCheckingOut = false;
  let isCheckingIn = false;
  let isOccupied = false;

  for (const b of propBookings) {
    const start = b.startDate.split("T")[0];
    const end = b.endDate.split("T")[0];
    if (end === todayStr) isCheckingOut = true;
    else if (start === todayStr) isCheckingIn = true;
    else if (start < todayStr && end > todayStr) isOccupied = true;
  }

  if (isCheckingOut) return "checking_out";
  if (isCheckingIn) return "checking_in";
  if (isOccupied) return "occupied";
  return "available";
}

function nextDateOf(propBookings: BookingInfo[], field: "startDate" | "endDate", strictlyAfterToday = false): string | null {
  const todayStr = new Date().toISOString().split("T")[0];
  const dates = propBookings
    .map(b => b[field].split("T")[0])
    .filter(d => strictlyAfterToday ? d > todayStr : d >= todayStr)
    .sort();
  return dates[0] ?? null;
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function timeAgo(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type SyncResult = { count: number; lastSynced: string };

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

type FormState = {
  name: string; address: string; airbnbUrl: string;
  color: string; imageUrl: string; icalUrl: string;
};

const BLANK: FormState = {
  name: "", address: "", airbnbUrl: "", color: SQUARE_COLORS[0], imageUrl: "", icalUrl: "",
};

function PropertyModal({
  open, onClose, initial, onSave, saving, propertyId, lastSynced,
}: {
  open: boolean;
  onClose: () => void;
  initial: FormState;
  onSave: (f: FormState) => void;
  saving: boolean;
  propertyId?: number;
  lastSynced?: Date | string | null;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const [uploading, setUploading] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | string | null | undefined>(lastSynced);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const syncMutation = useMutation({
    mutationFn: async (): Promise<SyncResult> => {
      const res = await apiRequest("POST", `/api/properties/${propertyId}/sync`);
      return res.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      setSyncedAt(data.lastSynced);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: `Calendar synced — ${data.count} upcoming booking(s) loaded` });
    },
    onError: (err: Error) =>
      toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const handleImageFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      if (!res.ok) throw new Error("Upload failed");
      const { url } = await res.json();
      setForm((p) => ({ ...p, imageUrl: url }));
    } catch {
      toast({ title: "Image upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { onClose(); setForm(initial); } }}>
      <DialogContent className="max-w-sm max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Photo upload */}
          <div className="space-y-1.5">
            <Label>Photo <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <div
              className="relative w-full h-32 rounded-xl border-2 border-dashed border-slate-200 overflow-hidden cursor-pointer flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              data-testid="button-upload-image"
            >
              {form.imageUrl ? (
                <>
                  <img src={form.imageUrl} alt="Property" className="absolute inset-0 w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <span className="text-white text-sm font-medium">Change photo</span>
                  </div>
                </>
              ) : uploading ? (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">Uploading…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400">
                  <ImagePlus className="w-6 h-6" />
                  <span className="text-xs">Tap to upload a photo</span>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageFile(e.target.files[0])}
              data-testid="input-property-image"
            />
            {form.imageUrl && (
              <button
                className="text-xs text-red-500 hover:text-red-700"
                onClick={() => setForm((p) => ({ ...p, imageUrl: "" }))}
                data-testid="button-remove-image"
              >
                Remove photo
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Property Name</Label>
            <Input value={form.name} onChange={set("name")} placeholder="e.g. Beach House" data-testid="input-property-name" />
          </div>

          <div className="space-y-1.5">
            <Label>Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={form.address} onChange={set("address")} placeholder="e.g. 123 Ocean Dr, Miami" data-testid="input-property-address" />
          </div>

          <div className="space-y-1.5">
            <Label>Airbnb Reviews URL</Label>
            <Input value={form.airbnbUrl} onChange={set("airbnbUrl")} placeholder="https://airbnb.com/rooms/..." data-testid="input-property-url" />
          </div>

          {/* Airbnb iCal URL */}
          <div className="space-y-1.5">
            <Label>
              Airbnb iCal URL{" "}
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              value={form.icalUrl}
              onChange={set("icalUrl")}
              placeholder="https://www.airbnb.com/calendar/ical/..."
              data-testid="input-property-ical"
            />
            <p className="text-[11px] text-muted-foreground leading-snug">
              Find this in Airbnb → Manage listing → Calendar → Export calendar
            </p>

            {propertyId && form.icalUrl && (
              <div className="flex items-center gap-3 pt-0.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  data-testid={`button-sync-calendar-${propertyId}`}
                >
                  {syncMutation.isPending
                    ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                    : <RefreshCw className="w-3.5 h-3.5 mr-1.5" />}
                  Sync Now
                </Button>
                {syncedAt && (
                  <span className="text-[11px] text-muted-foreground">
                    Last synced {timeAgo(syncedAt)}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Color */}
          <div className="space-y-1.5">
            <Label>Square Color</Label>
            <div className="flex flex-wrap gap-2">
              {SQUARE_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className="w-7 h-7 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: c,
                    borderColor: form.color === c ? ACCENT_MAP[c] ?? "#2196F3" : "transparent",
                    boxShadow: form.color === c ? `0 0 0 2px ${ACCENT_MAP[c] ?? "#2196F3"}33` : "none",
                  }}
                  data-testid={`color-swatch-${c.replace("#", "")}`}
                />
              ))}
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" onClick={onClose} className="flex-1" data-testid="button-cancel-property">
              Cancel
            </Button>
            <Button
              onClick={() => onSave(form)}
              disabled={saving || uploading || !form.name.trim()}
              className="flex-1"
              data-testid="button-save-property"
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reviews page ─────────────────────────────────────────────────────────────

export default function Reviews() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [addOpen, setAddOpen]       = useState(false);
  const [editTarget, setEditTarget] = useState<Property | null>(null);
  const [deleteId, setDeleteId]     = useState<number | null>(null);
  const [editMode, setEditMode]     = useState(false);

  const { data: props = [], isLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: upcomingBookings = {} as UpcomingBookings } = useQuery<UpcomingBookings>({
    queryKey: ["/api/bookings/upcoming"],
    refetchInterval: 5 * 60 * 1000, // auto-refetch every 5 min
  });

  const createMutation = useMutation({
    mutationFn: (data: FormState) => apiRequest("POST", "/api/properties", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setAddOpen(false);
      toast({ title: "Property added" });
    },
    onError: () => toast({ title: "Failed to add property", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: FormState & { id: number }) =>
      apiRequest("PATCH", `/api/properties/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      setEditTarget(null);
      toast({ title: "Property updated" });
    },
    onError: () => toast({ title: "Failed to update property", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      setDeleteId(null);
      toast({ title: "Property removed" });
    },
    onError: () => toast({ title: "Failed to delete property", variant: "destructive" }),
  });

  // Card-level quick sync
  const cardSyncMutation = useMutation({
    mutationFn: async (id: number): Promise<SyncResult> => {
      const res = await apiRequest("POST", `/api/properties/${id}/sync`);
      return res.json() as Promise<SyncResult>;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: `Synced — ${data.count} upcoming booking(s)` });
    },
    onError: (err: Error) =>
      toast({ title: "Sync failed", description: err.message, variant: "destructive" }),
  });

  const handleSaveNew = (form: FormState) => createMutation.mutate(form);
  const handleSaveEdit = (form: FormState) => {
    if (!editTarget) return;
    updateMutation.mutate({ ...form, id: editTarget.id });
  };

  const accent = (color: string) => ACCENT_MAP[color] ?? "#2196F3";

  return (
    <div className="min-h-screen bg-[#F7F7F8]">
      {/* ── Header ── */}
      <div className="bg-white border-b border-black/5 px-5 py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 leading-none">Properties</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tap a property to view its reviews</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={editMode ? "default" : "outline"}
            onClick={() => { setEditMode((v) => !v); setDeleteId(null); }}
            data-testid="button-toggle-edit"
          >
            {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </Button>
          {!editMode && (
            <Button size="icon" onClick={() => setAddOpen(true)} data-testid="button-add-property">
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="p-4">
        {isLoading ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : props.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center mb-4">
              <Star className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-slate-700 text-base font-semibold">No properties yet</p>
            <p className="text-slate-400 text-sm mt-1 mb-5">Add your first property to get started.</p>
            <Button onClick={() => setAddOpen(true)} data-testid="button-add-first-property">
              <Plus className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
            {props.map((prop) => {
              const ac = accent(prop.color);
              const isConfirmingDelete = deleteId === prop.id;
              const hasCalendar = !!prop.icalUrl;
              const propBookings: BookingInfo[] = upcomingBookings[prop.id] ?? [];
              const status: BookingStatus | null = hasCalendar ? getPropertyStatus(propBookings) : null;
              const statusCfg = status ? STATUS_CONFIG[status] : null;
              const nextCheckout = hasCalendar ? nextDateOf(propBookings, "endDate") : null;
              const nextCheckin = hasCalendar ? nextDateOf(propBookings, "startDate", true) : null;
              const isSyncing = cardSyncMutation.isPending && cardSyncMutation.variables === prop.id;

              return (
                <div key={prop.id} className="relative" data-testid={`property-card-${prop.id}`}>
                  {/* Main square card */}
                  <button
                    className="w-full aspect-square rounded-xl flex flex-col items-start justify-end p-3 text-left transition-transform active:scale-[0.97] relative overflow-hidden group"
                    style={{
                      backgroundColor: prop.color,
                      border: `1px solid ${ac}22`,
                      boxShadow: `0 2px 12px ${ac}18`,
                    }}
                    onClick={() => {
                      if (editMode) return;
                      if (prop.airbnbUrl) window.open(prop.airbnbUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={editMode}
                    data-testid={`button-open-property-${prop.id}`}
                  >
                    {prop.imageUrl && (
                      <img src={prop.imageUrl} alt={prop.name} className="absolute inset-0 w-full h-full object-contain" />
                    )}

                    <div
                      className="absolute inset-0"
                      style={{
                        background: prop.imageUrl
                          ? "linear-gradient(to top, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0.1) 50%, transparent 100%)"
                          : undefined,
                      }}
                    />

                    {!prop.imageUrl && (
                      <div
                        className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${ac}18` }}
                      >
                        <Star className="w-3.5 h-3.5" style={{ color: ac }} />
                      </div>
                    )}

                    {!editMode && prop.airbnbUrl && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: prop.imageUrl ? "rgba(0,0,0,0.4)" : `${ac}20` }}
                      >
                        <ExternalLink className="w-3 h-3" style={{ color: prop.imageUrl ? "#fff" : ac }} />
                      </div>
                    )}

                    {/* Property name + address */}
                    <div className="w-full relative">
                      <p className="text-[12px] font-bold leading-snug line-clamp-2" style={{ color: prop.imageUrl ? "#fff" : ac }}>
                        {prop.name}
                      </p>
                      {prop.address && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: prop.imageUrl ? "rgba(255,255,255,0.75)" : `${ac}99` }}>
                          {prop.address}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Calendar info row — below the card */}
                  {hasCalendar && (
                    <div className="mt-1 space-y-0.5 px-0.5">
                      {/* Status badge + sync button */}
                      <div className="flex items-center gap-1">
                        {statusCfg && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full leading-none"
                            style={{ backgroundColor: statusCfg.bg, color: statusCfg.text }}
                            data-testid={`status-badge-${prop.id}`}
                          >
                            {statusCfg.label}
                          </span>
                        )}
                        <button
                          className="ml-auto flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center bg-white border border-slate-200 shadow-sm"
                          onClick={() => cardSyncMutation.mutate(prop.id)}
                          disabled={isSyncing || cardSyncMutation.isPending}
                          data-testid={`button-card-sync-${prop.id}`}
                          title="Sync calendar"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 text-slate-500 ${isSyncing ? "animate-spin" : ""}`} />
                        </button>
                      </div>

                      {/* Next checkout + checkin dates */}
                      <div className="flex items-center gap-1.5">
                        {nextCheckout && (
                          <span className="flex items-center gap-0.5 text-[9px] text-orange-600 font-medium">
                            <LogOut className="w-2.5 h-2.5" />
                            {fmtDate(nextCheckout)}
                          </span>
                        )}
                        {nextCheckin && (
                          <span className="flex items-center gap-0.5 text-[9px] text-violet-600 font-medium">
                            <LogIn className="w-2.5 h-2.5" />
                            {fmtDate(nextCheckin)}
                          </span>
                        )}
                      </div>

                      {/* Last synced */}
                      {prop.lastSynced && (
                        <p className="flex items-center gap-0.5 text-[8px] text-slate-400" data-testid={`last-synced-${prop.id}`}>
                          <CalendarClock className="w-2 h-2" />
                          {timeAgo(prop.lastSynced)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Always-visible edit button + delete in edit mode */}
                  <div className="absolute -top-2 -right-2 flex gap-1">
                    <button
                      className="h-8 px-3 rounded-full bg-white shadow-md border border-slate-200 flex items-center gap-1.5 text-xs font-semibold text-slate-700"
                      onClick={() =>
                        setEditTarget({
                          ...prop,
                          imageUrl: prop.imageUrl ?? "",
                          icalUrl: prop.icalUrl ?? "",
                        })
                      }
                      data-testid={`button-edit-property-${prop.id}`}
                    >
                      <Pencil className="w-3 h-3" />
                      Edit
                    </button>

                    {editMode && (
                      isConfirmingDelete ? (
                        <button
                          className="w-7 h-7 rounded-full bg-red-500 shadow-md flex items-center justify-center"
                          onClick={() => deleteMutation.mutate(prop.id)}
                          data-testid={`button-delete-confirm-${prop.id}`}
                        >
                          <Check className="w-3 h-3 text-white" />
                        </button>
                      ) : (
                        <button
                          className="w-7 h-7 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center"
                          onClick={() => setDeleteId(prop.id)}
                          data-testid={`button-delete-property-${prop.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-red-500" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Add modal ── */}
      <PropertyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initial={BLANK}
        onSave={handleSaveNew}
        saving={createMutation.isPending}
      />

      {/* ── Edit modal ── */}
      {editTarget && (
        <PropertyModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          initial={{
            name: editTarget.name,
            address: editTarget.address,
            airbnbUrl: editTarget.airbnbUrl,
            color: editTarget.color,
            imageUrl: editTarget.imageUrl ?? "",
            icalUrl: editTarget.icalUrl ?? "",
          }}
          onSave={handleSaveEdit}
          saving={updateMutation.isPending}
          propertyId={editTarget.id}
          lastSynced={editTarget.lastSynced}
        />
      )}
    </div>
  );
}
