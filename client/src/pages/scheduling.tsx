import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  CalendarClock, ChevronLeft, ChevronRight, Plus, Pencil, Trash2,
  Clock, MapPin, User, Check, List, CalendarDays, X, Building2,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import type { CleaningJobWithDetails, StaffMember } from "@shared/schema";
import { createJobSchema } from "@shared/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateToISO(d: Date) {
  return d.toISOString().split("T")[0];
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  "in-progress": "bg-amber-100 text-amber-700 border-amber-200",
  completed: "bg-green-100 text-green-700 border-green-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};

const STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

function fmtDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return new Date(Number(y), Number(m) - 1, Number(d)).toLocaleDateString("en-US", {
    month: "short", day: "numeric",
  });
}

function fmtTime(t: string) {
  if (!t) return "";
  const [h, min] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${h12}:${min} ${ampm}`;
}

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

type SortField = "date" | "title" | "status" | "staffMember";
type SortDir = "asc" | "desc";

// ─── Job Form ─────────────────────────────────────────────────────────────────

type FormValues = z.infer<typeof createJobSchema>;

interface Property { id: number; name: string; address: string; }

interface JobModalProps {
  editing: CleaningJobWithDetails | null;
  open: boolean;
  onClose: () => void;
  onDelete?: () => void;
  staffList: StaffMember[];
  properties: Property[];
  defaultDate?: string;
}

function JobModal({ editing, open, onClose, onDelete, staffList, properties, defaultDate }: JobModalProps) {
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: "",
      staffId: staffList[0]?.id ?? 0,
      propertyId: null,
      address: "",
      date: dateToISO(new Date()),
      startTime: "",
      endTime: "",
      status: "scheduled",
      notes: "",
    },
  });

  // Reset form whenever the modal opens or the editing target changes
  useEffect(() => {
    if (!open) return;
    if (editing) {
      form.reset({
        title: editing.title,
        staffId: editing.staffId,
        propertyId: editing.propertyId ?? null,
        address: editing.address,
        date: editing.date,
        startTime: editing.startTime,
        endTime: editing.endTime,
        status: editing.status as FormValues["status"],
        notes: editing.notes,
      });
    } else {
      form.reset({
        title: "",
        staffId: staffList[0]?.id ?? 0,
        propertyId: null,
        address: "",
        date: defaultDate ?? dateToISO(new Date()),
        startTime: "",
        endTime: "",
        status: "scheduled",
        notes: "",
      });
    }
    setConfirmDelete(false);
  }, [open, editing, defaultDate]);

  const createMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("POST", "/api/jobs", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job created" });
      onClose();
    },
    onError: () => toast({ title: "Failed to create job", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormValues) => apiRequest("PATCH", `/api/jobs/${editing!.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update job", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/jobs/${editing!.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({ title: "Job deleted" });
      if (onDelete) onDelete();
      onClose();
    },
    onError: () => toast({ title: "Failed to delete job", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  // Auto-fill address when a property is selected
  const watchedPropertyId = form.watch("propertyId");
  useEffect(() => {
    if (watchedPropertyId) {
      const prop = properties.find(p => p.id === watchedPropertyId);
      if (prop) form.setValue("address", prop.address);
    }
  }, [watchedPropertyId]);

  function onSubmit(data: FormValues) {
    if (editing) updateMutation.mutate(data);
    else createMutation.mutate(data);
  }

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Job" : "New Job"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Job Title</FormLabel>
                  <FormControl>
                    <Input data-testid="input-job-title" placeholder="e.g. Morning deep clean – Maple Ave" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="staffId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Employee</FormLabel>
                  <Select
                    value={String(field.value)}
                    onValueChange={v => field.onChange(parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-staff">
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {staffList.map(s => (
                        <SelectItem key={s.id} value={String(s.id)} data-testid={`option-staff-${s.id}`}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input data-testid="input-job-date" type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-status">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map(s => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="startTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Time</FormLabel>
                    <FormControl>
                      <Input data-testid="input-start-time" type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="endTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Time</FormLabel>
                    <FormControl>
                      <Input data-testid="input-end-time" type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property selector (optional) */}
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property <span className="text-muted-foreground font-normal">(optional)</span></FormLabel>
                  <Select
                    value={field.value ? String(field.value) : "none"}
                    onValueChange={v => field.onChange(v === "none" ? null : parseInt(v, 10))}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
                        <Building2 className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="None — enter address manually" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None — enter address manually</SelectItem>
                      {properties.map(p => (
                        <SelectItem key={p.id} value={String(p.id)} data-testid={`option-property-${p.id}`}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input data-testid="input-address" placeholder="Job location address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea data-testid="input-notes" placeholder="Any special instructions…" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex items-center justify-between gap-2 pt-1">
              {editing ? (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      data-testid="button-confirm-delete-modal"
                    >
                      <Check className="w-3 h-3 mr-1" />
                      Confirm Delete
                    </Button>
                    <Button type="button" size="icon" variant="ghost" onClick={() => setConfirmDelete(false)}>
                      <X className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(true)}
                    data-testid="button-delete-job-modal"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Delete
                  </Button>
                )
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={onClose} data-testid="button-cancel-job">
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending} data-testid="button-save-job">
                  {isPending ? "Saving…" : editing ? "Save Changes" : "Create Job"}
                </Button>
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sort icon helper ─────────────────────────────────────────────────────────

function SortIcon({ field, current, dir }: { field: SortField; current: SortField; dir: SortDir }) {
  if (field !== current) return <ChevronsUpDown className="w-3 h-3 text-muted-foreground" />;
  return dir === "asc"
    ? <ChevronUp className="w-3 h-3 text-primary" />
    : <ChevronDown className="w-3 h-3 text-primary" />;
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Scheduling() {
  const { toast } = useToast();

  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [monday, setMonday] = useState<Date>(() => getMondayOf(new Date()));
  const [filterStaff, setFilterStaff] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CleaningJobWithDetails | null>(null);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(monday, i)), [monday]);
  const todayStr = dateToISO(new Date());

  const { data: jobs = [], isLoading: jobsLoading } = useQuery<CleaningJobWithDetails[]>({
    queryKey: ["/api/jobs"],
  });

  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const { data: propertiesRaw = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  // Shared filter logic (used in both views)
  function applyFilters(list: CleaningJobWithDetails[]) {
    return list.filter(j => {
      if (filterStaff !== "all" && j.staffId !== parseInt(filterStaff, 10)) return false;
      if (filterStatus !== "all" && j.status !== filterStatus) return false;
      if (filterDateFrom && j.date < filterDateFrom) return false;
      if (filterDateTo && j.date > filterDateTo) return false;
      return true;
    });
  }

  // Calendar week jobs
  const weekJobs = useMemo(() => {
    const monStr = dateToISO(monday);
    const sunStr = dateToISO(addDays(monday, 6));
    return applyFilters(jobs).filter(j => j.date >= monStr && j.date <= sunStr);
  }, [jobs, monday, filterStaff, filterStatus, filterDateFrom, filterDateTo]);

  // List view jobs (sorted)
  const sortedJobs = useMemo(() => {
    const filtered = applyFilters(jobs);
    return [...filtered].sort((a, b) => {
      let av = "", bv = "";
      if (sortField === "date") { av = a.date + a.startTime; bv = b.date + b.startTime; }
      else if (sortField === "title") { av = a.title.toLowerCase(); bv = b.title.toLowerCase(); }
      else if (sortField === "status") { av = a.status; bv = b.status; }
      else if (sortField === "staffMember") {
        av = a.staffMember?.name?.toLowerCase() ?? "";
        bv = b.staffMember?.name?.toLowerCase() ?? "";
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [jobs, filterStaff, filterStatus, filterDateFrom, filterDateTo, sortField, sortDir]);

  // Stats (current ISO week, unfiltered)
  const thisWeekJobs = useMemo(() => {
    const mon = getMondayOf(new Date());
    const monStr = dateToISO(mon);
    const sunStr = dateToISO(addDays(mon, 6));
    return jobs.filter(j => j.date >= monStr && j.date <= sunStr);
  }, [jobs]);

  const stats = useMemo(() => ({
    total: thisWeekJobs.length,
    scheduled: thisWeekJobs.filter(j => j.status === "scheduled").length,
    inProgress: thisWeekJobs.filter(j => j.status === "in-progress").length,
    completed: thisWeekJobs.filter(j => j.status === "completed").length,
  }), [thisWeekJobs]);

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  function openNew(date?: string) {
    setEditing(null);
    setDefaultDate(date);
    setModalOpen(true);
  }

  function openEdit(job: CleaningJobWithDetails) {
    setEditing(job);
    setDefaultDate(undefined);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-md flex items-center justify-center" style={{ backgroundColor: "#FFF3E0" }}>
            <CalendarClock className="w-5 h-5" style={{ color: "#F97316" }} />
          </div>
          <div>
            <h1 className="text-xl font-bold">Scheduling</h1>
            <p className="text-sm text-muted-foreground">Assign cleaning jobs to employees</p>
          </div>
        </div>
        <Button onClick={() => openNew()} data-testid="button-new-job">
          <Plus className="w-4 h-4 mr-1" /> New Job
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "This Week", value: stats.total, color: "text-foreground" },
          { label: "Scheduled", value: stats.scheduled, color: "text-blue-600" },
          { label: "In Progress", value: stats.inProgress, color: "text-amber-600" },
          { label: "Completed", value: stats.completed, color: "text-green-600" },
        ].map(stat => (
          <Card key={stat.label} data-testid={`stat-${stat.label.toLowerCase().replace(" ", "-")}`}>
            <CardContent className="pt-4 pb-3">
              <p className="text-xs text-muted-foreground mb-0.5">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterStaff} onValueChange={setFilterStaff}>
          <SelectTrigger className="w-44" data-testid="filter-staff">
            <User className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {staffList.map(s => (
              <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40" data-testid="filter-status">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map(s => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5">
          <Input
            type="date"
            className="w-36"
            value={filterDateFrom}
            onChange={e => setFilterDateFrom(e.target.value)}
            placeholder="From"
            data-testid="filter-date-from"
          />
          <span className="text-muted-foreground text-xs">–</span>
          <Input
            type="date"
            className="w-36"
            value={filterDateTo}
            onChange={e => setFilterDateTo(e.target.value)}
            placeholder="To"
            data-testid="filter-date-to"
          />
          {(filterDateFrom || filterDateTo) && (
            <Button
              size="icon"
              variant="ghost"
              onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}
              data-testid="button-clear-dates"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button
            size="icon"
            variant={view === "calendar" ? "default" : "outline"}
            onClick={() => setView("calendar")}
            data-testid="button-view-calendar"
          >
            <CalendarDays className="w-4 h-4" />
          </Button>
          <Button
            size="icon"
            variant={view === "list" ? "default" : "outline"}
            onClick={() => setView("list")}
            data-testid="button-view-list"
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Week navigation (calendar view only) */}
      {view === "calendar" && (
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMonday(d => addDays(d, -7))}
            data-testid="button-prev-week"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium min-w-[180px] text-center">
            {fmtDate(dateToISO(monday))} – {fmtDate(dateToISO(addDays(monday, 6)))}
          </span>
          <Button
            size="icon"
            variant="outline"
            onClick={() => setMonday(d => addDays(d, 7))}
            data-testid="button-next-week"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMonday(getMondayOf(new Date()))}
            data-testid="button-today"
          >
            Today
          </Button>
        </div>
      )}

      {/* ── Calendar view ── */}
      {view === "calendar" && (
        <div className="grid grid-cols-7 gap-2 min-w-0">
          {weekDates.map((date, i) => {
            const iso = dateToISO(date);
            const isToday = iso === todayStr;
            const dayJobs = weekJobs.filter(j => j.date === iso);

            return (
              <div key={iso} className="min-w-0" data-testid={`col-day-${iso}`}>
                <div
                  className={`mb-2 text-center rounded-md py-1.5 ${isToday ? "bg-primary text-primary-foreground" : "bg-muted"}`}
                >
                  <p className="text-xs font-semibold">{DAY_LABELS[i]}</p>
                  <p className="text-base font-bold leading-none">{date.getDate()}</p>
                </div>

                <div className="space-y-1.5">
                  {dayJobs.map(job => (
                    <div
                      key={job.id}
                      className="rounded-md p-2 text-xs cursor-pointer hover-elevate"
                      style={{
                        backgroundColor: job.staffMember?.color ? `${job.staffMember.color}22` : "#f4f4f4",
                        borderLeft: `3px solid ${job.staffMember?.color ?? "#888"}`,
                      }}
                      onClick={() => openEdit(job)}
                      data-testid={`cal-job-${job.id}`}
                    >
                      <p className="font-medium leading-snug line-clamp-2">{job.title}</p>
                      {job.startTime && (
                        <p className="text-muted-foreground mt-0.5">{fmtTime(job.startTime)}</p>
                      )}
                      <div className="flex items-center gap-1 mt-0.5">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: job.staffMember?.color ?? "#888" }}
                        />
                        <span className="text-muted-foreground truncate">{job.staffMember?.name ?? "?"}</span>
                      </div>
                    </div>
                  ))}
                  <button
                    className="w-full text-xs text-muted-foreground py-1 rounded-md border border-dashed border-border hover:border-primary hover:text-primary transition-colors"
                    onClick={() => openNew(iso)}
                    data-testid={`button-add-on-${iso}`}
                  >
                    <Plus className="w-3 h-3 inline mr-0.5" />
                    Add
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── List / Table view ── */}
      {view === "list" && (
        <div className="rounded-md border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 bg-muted text-xs font-semibold text-muted-foreground">
            {(
              [
                { field: "title" as SortField, label: "Job" },
                { field: "staffMember" as SortField, label: "Employee" },
                { field: "date" as SortField, label: "Date & Time" },
                { field: "status" as SortField, label: "Status" },
              ] as { field: SortField; label: string }[]
            ).map(col => (
              <button
                key={col.field}
                className="flex items-center gap-1 px-4 py-2.5 hover:text-foreground transition-colors text-left"
                onClick={() => toggleSort(col.field)}
                data-testid={`sort-${col.field}`}
              >
                {col.label}
                <SortIcon field={col.field} current={sortField} dir={sortDir} />
              </button>
            ))}
            <div className="px-4 py-2.5">Actions</div>
          </div>

          {/* Table rows */}
          {jobsLoading && (
            <div className="text-center py-8 text-muted-foreground text-sm">Loading…</div>
          )}
          {!jobsLoading && sortedJobs.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <CalendarClock className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No jobs found</p>
              <p className="text-sm">Adjust filters or create a new job.</p>
            </div>
          )}
          {sortedJobs.map((job, idx) => {
            const sm = job.staffMember;
            return (
              <div
                key={job.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-0 items-center border-t text-sm ${idx % 2 === 1 ? "bg-muted/30" : ""}`}
                data-testid={`row-job-${job.id}`}
              >
                <div className="px-4 py-3">
                  <p className="font-medium truncate">{job.title}</p>
                  {job.address && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{job.address}</span>
                    </p>
                  )}
                </div>
                <div className="px-4 py-3">
                  {sm ? (
                    <span className="flex items-center gap-1.5">
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                        style={{ backgroundColor: sm.color }}
                      >
                        {initials(sm.name)}
                      </span>
                      <span className="truncate">{sm.name}</span>
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </div>
                <div className="px-4 py-3">
                  <p>{fmtDate(job.date)}</p>
                  {job.startTime && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {fmtTime(job.startTime)}{job.endTime ? ` – ${fmtTime(job.endTime)}` : ""}
                    </p>
                  )}
                </div>
                <div className="px-4 py-3">
                  <Badge
                    className={`text-[10px] px-1.5 py-0 border ${STATUS_COLORS[job.status] ?? "bg-muted"}`}
                    data-testid={`status-job-${job.id}`}
                  >
                    {STATUS_OPTIONS.find(s => s.value === job.status)?.label ?? job.status}
                  </Badge>
                </div>
                <div className="px-3 py-2 flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(job)}
                    data-testid={`button-edit-job-${job.id}`}
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal — handles both add and edit; delete is available in edit mode */}
      <JobModal
        open={modalOpen}
        editing={editing}
        onClose={closeModal}
        staffList={staffList}
        properties={propertiesRaw as Property[]}
        defaultDate={defaultDate}
      />
    </div>
  );
}
