import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type StaffMember } from "@shared/schema";
import { createStaffSchema } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Search, Users, UserCheck, UserX, Mail, Phone, Pencil, Trash2 } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

const formSchema = createStaffSchema;
type FormValues = z.infer<typeof formSchema>;

// ─── Constants ────────────────────────────────────────────────────────────────

const COLOR_OPTIONS = [
  "#3B82F6", "#22C55E", "#EF4444", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#10B981", "#6366F1",
];

const ROLE_LABELS: Record<string, string> = {
  cleaner: "Cleaner",
  supervisor: "Supervisor",
};

const ROLE_COLORS: Record<string, string> = {
  cleaner: "bg-blue-50 text-blue-700 border-blue-200",
  supervisor: "bg-amber-50 text-amber-700 border-amber-200",
};

// ─── Helper ───────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(p => p[0].toUpperCase())
    .join("");
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function StaffAvatar({ member }: { member: StaffMember }) {
  return (
    <div
      className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-lg font-bold shrink-0 select-none"
      style={{ backgroundColor: member.color }}
    >
      {initials(member.name)}
    </div>
  );
}

// ─── Color Picker ─────────────────────────────────────────────────────────────

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {COLOR_OPTIONS.map(c => (
        <button
          key={c}
          type="button"
          data-testid={`color-option-${c}`}
          onClick={() => onChange(c)}
          className="w-7 h-7 rounded-lg border-2 transition-all"
          style={{
            backgroundColor: c,
            borderColor: value === c ? "black" : "transparent",
            transform: value === c ? "scale(1.15)" : "scale(1)",
          }}
        />
      ))}
    </div>
  );
}

// ─── Staff Form Modal ─────────────────────────────────────────────────────────

interface StaffModalProps {
  open: boolean;
  onClose: () => void;
  editing: StaffMember | null;
}

function StaffModal({ open, onClose, editing }: StaffModalProps) {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: editing
      ? {
          name: editing.name,
          email: editing.email ?? "",
          phone: editing.phone,
          role: editing.role as "cleaner" | "supervisor",
          status: editing.status as "active" | "inactive",
          color: editing.color,
          notes: editing.notes,
        }
      : {
          name: "",
          email: "",
          phone: "",
          role: "cleaner",
          status: "active",
          color: "#3B82F6",
          notes: "",
        },
  });

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/staff", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Team member added" });
      onClose();
    },
    onError: () => toast({ title: "Failed to add team member", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("PATCH", `/api/staff/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Team member updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update team member", variant: "destructive" }),
  });

  function onSubmit(data: FormValues) {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input data-testid="input-staff-name" placeholder="Full name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-3">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-staff-role">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="cleaner">Cleaner</SelectItem>
                      <SelectItem value="supervisor">Supervisor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-staff-status">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel>Phone</FormLabel>
                <FormControl>
                  <Input data-testid="input-staff-phone" type="tel" placeholder="+1 (555) 000-0000" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="color" render={({ field }) => (
              <FormItem>
                <FormLabel>Avatar Color</FormLabel>
                <FormControl>
                  <ColorPicker value={field.value} onChange={field.onChange} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea
                    data-testid="input-staff-notes"
                    placeholder="Any additional notes..."
                    className="resize-none"
                    rows={2}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="flex gap-2 pt-1">
              <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isPending} data-testid="button-save-staff">
                {isPending ? "Saving…" : editing ? "Save Changes" : "Add Member"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Staff Card ───────────────────────────────────────────────────────────────

interface StaffCardProps {
  member: StaffMember;
  onEdit: (m: StaffMember) => void;
  onDelete: (id: number) => void;
  deleteConfirmId: number | null;
  setDeleteConfirmId: (id: number | null) => void;
}

function StaffCard({ member, onEdit, onDelete, deleteConfirmId, setDeleteConfirmId }: StaffCardProps) {
  const isConfirming = deleteConfirmId === member.id;

  return (
    <Card
      data-testid={`card-staff-${member.id}`}
      className="hover-elevate transition-all"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <StaffAvatar member={member} />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <div>
                <p data-testid={`text-staff-name-${member.id}`} className="font-semibold text-sm leading-tight">
                  {member.name}
                </p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${ROLE_COLORS[member.role] ?? ""}`}
                    data-testid={`badge-role-${member.id}`}
                  >
                    {ROLE_LABELS[member.role] ?? member.role}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${member.status === "active" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-slate-50 text-slate-500 border-slate-200"}`}
                    data-testid={`badge-status-${member.id}`}
                  >
                    {member.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon"
                  variant="ghost"
                  data-testid={`button-edit-staff-${member.id}`}
                  onClick={() => onEdit(member)}
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                {isConfirming ? (
                  <Button
                    size="sm"
                    variant="destructive"
                    data-testid={`button-confirm-delete-staff-${member.id}`}
                    onClick={() => onDelete(member.id)}
                  >
                    Confirm
                  </Button>
                ) : (
                  <Button
                    size="icon"
                    variant="ghost"
                    data-testid={`button-delete-staff-${member.id}`}
                    onClick={() => setDeleteConfirmId(member.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="mt-2 space-y-0.5">
              {member.email && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{member.email}</span>
                </div>
              )}
              {member.phone && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Phone className="w-3 h-3 shrink-0" />
                  <span>{member.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {member.notes && (
          <p className="mt-2.5 text-xs text-muted-foreground border-t pt-2 leading-relaxed">
            {member.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: color + "22" }}>
          <Icon className="w-4.5 h-4.5" style={{ color }} />
        </div>
        <div>
          <p className="text-2xl font-bold leading-none">{value}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Team() {
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const { toast } = useToast();

  const { data: staffList = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/staff/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/staff"] });
      toast({ title: "Team member removed" });
      setDeleteConfirmId(null);
    },
    onError: () => toast({ title: "Failed to remove team member", variant: "destructive" }),
  });

  const filtered = staffList.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.phone ?? "").toLowerCase().includes(search.toLowerCase()) ||
    m.role.toLowerCase().includes(search.toLowerCase())
  );

  const total = staffList.length;
  const active = staffList.filter(m => m.status === "active").length;
  const inactive = staffList.filter(m => m.status === "inactive").length;
  const supervisors = staffList.filter(m => m.role === "supervisor").length;

  function openAdd() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(m: StaffMember) {
    setEditing(m);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditing(null);
  }

  // Clear delete confirm when clicking elsewhere
  function handleCardAreaClick() {
    if (deleteConfirmId !== null) setDeleteConfirmId(null);
  }

  return (
    <div className="min-h-screen bg-background" onClick={handleCardAreaClick}>
      {/* Header */}
      <div className="border-b bg-card px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage your cleaning staff</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={Users}     label="Total Staff"   value={total}       color="#3B82F6" />
          <StatCard icon={UserCheck} label="Active"        value={active}      color="#22C55E" />
          <StatCard icon={UserX}     label="Inactive"      value={inactive}    color="#94A3B8" />
          <StatCard icon={Users}     label="Supervisors"   value={supervisors} color="#F59E0B" />
        </div>

        {/* Search + Add */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              data-testid="input-staff-search"
              placeholder="Search by name, phone, or role…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Button data-testid="button-add-staff" onClick={openAdd}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add Member
          </Button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24" />
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">
              {search ? "No team members match your search." : "No team members yet. Add your first one!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(member => (
              <StaffCard
                key={member.id}
                member={member}
                onEdit={openEdit}
                onDelete={id => deleteMutation.mutate(id)}
                deleteConfirmId={deleteConfirmId}
                setDeleteConfirmId={id => {
                  setDeleteConfirmId(id);
                }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <StaffModal
          open={modalOpen}
          onClose={handleModalClose}
          editing={editing}
        />
      )}
    </div>
  );
}
