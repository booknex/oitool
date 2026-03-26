import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Star, Pencil, Trash2, Check, X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import type { Property } from "@shared/schema";

// ─── Color palette for property squares ───────────────────────────────────────

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

// ─── Add / Edit modal ─────────────────────────────────────────────────────────

type FormState = { name: string; address: string; airbnbUrl: string; color: string };
const BLANK: FormState = { name: "", address: "", airbnbUrl: "", color: SQUARE_COLORS[0] };

function PropertyModal({
  open,
  onClose,
  initial,
  onSave,
  saving,
}: {
  open: boolean;
  onClose: () => void;
  initial: FormState;
  onSave: (f: FormState) => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<FormState>(initial);
  const set = (k: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{initial.name ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label>Property Name</Label>
            <Input
              value={form.name}
              onChange={set("name")}
              placeholder="e.g. Beach House"
              data-testid="input-property-name"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Address <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              value={form.address}
              onChange={set("address")}
              placeholder="e.g. 123 Ocean Dr, Miami"
              data-testid="input-property-address"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Airbnb Reviews URL</Label>
            <Input
              value={form.airbnbUrl}
              onChange={set("airbnbUrl")}
              placeholder="https://airbnb.com/rooms/..."
              data-testid="input-property-url"
            />
          </div>

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
              disabled={saving || !form.name.trim() || !form.airbnbUrl.trim()}
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

  const createMutation = useMutation({
    mutationFn: (data: Omit<FormState, "id">) =>
      apiRequest("POST", "/api/properties", data),
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
      setDeleteId(null);
      toast({ title: "Property removed" });
    },
    onError: () => toast({ title: "Failed to delete property", variant: "destructive" }),
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
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-[18px] font-semibold text-slate-800 leading-tight">Property Reviews</h1>
            <p className="text-xs text-slate-400 mt-0.5">Tap a property to open its Airbnb reviews</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant={editMode ? "default" : "ghost"}
            onClick={() => { setEditMode((v) => !v); setDeleteId(null); }}
            data-testid="button-toggle-edit"
          >
            {editMode ? <Check className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setAddOpen(true)}
            data-testid="button-add-property"
          >
            <Plus className="w-5 h-5" />
          </Button>
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
                      window.open(prop.airbnbUrl, "_blank", "noopener,noreferrer");
                    }}
                    disabled={editMode}
                    data-testid={`button-open-property-${prop.id}`}
                  >
                    {/* Star icon top-left */}
                    <div
                      className="absolute top-2 left-2 w-7 h-7 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${ac}18` }}
                    >
                      <Star className="w-3.5 h-3.5" style={{ color: ac }} />
                    </div>

                    {/* External link icon top-right (visible on hover when not in edit mode) */}
                    {!editMode && (
                      <div
                        className="absolute top-2 right-2 w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ backgroundColor: `${ac}20` }}
                      >
                        <ExternalLink className="w-3 h-3" style={{ color: ac }} />
                      </div>
                    )}

                    {/* Property name + address */}
                    <div className="w-full">
                      <p
                        className="text-[12px] font-bold leading-snug line-clamp-2"
                        style={{ color: ac }}
                      >
                        {prop.name}
                      </p>
                      {prop.address && (
                        <p className="text-[10px] mt-0.5 truncate" style={{ color: `${ac}99` }}>
                          {prop.address}
                        </p>
                      )}
                    </div>
                  </button>

                  {/* Edit mode controls */}
                  {editMode && (
                    <div className="absolute top-2 right-2 flex gap-1.5">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm"
                        onClick={() => setEditTarget(prop)}
                        data-testid={`button-edit-property-${prop.id}`}
                      >
                        <Pencil className="w-3.5 h-3.5 text-slate-600" />
                      </Button>
                      {isConfirmingDelete ? (
                        <div className="flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 bg-red-500 rounded-lg shadow-sm"
                            onClick={() => deleteMutation.mutate(prop.id)}
                            data-testid={`button-confirm-delete-property-${prop.id}`}
                          >
                            <Check className="w-3.5 h-3.5 text-white" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7 bg-white/80 rounded-lg shadow-sm"
                            onClick={() => setDeleteId(null)}
                            data-testid={`button-cancel-delete-property-${prop.id}`}
                          >
                            <X className="w-3.5 h-3.5 text-slate-600" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7 bg-white/80 backdrop-blur-sm rounded-lg shadow-sm"
                          onClick={() => setDeleteId(prop.id)}
                          data-testid={`button-delete-property-${prop.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-500" />
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add modal */}
      <PropertyModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        initial={BLANK}
        onSave={handleSaveNew}
        saving={createMutation.isPending}
      />

      {/* Edit modal */}
      <PropertyModal
        open={!!editTarget}
        onClose={() => setEditTarget(null)}
        initial={
          editTarget
            ? { name: editTarget.name, address: editTarget.address, airbnbUrl: editTarget.airbnbUrl, color: editTarget.color }
            : BLANK
        }
        onSave={handleSaveEdit}
        saving={updateMutation.isPending}
      />
    </div>
  );
}
