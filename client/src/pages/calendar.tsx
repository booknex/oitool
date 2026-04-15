import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, CalendarDays, LogIn, LogOut, RefreshCw, Clock, Plus, Pencil, Trash2, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Property, UpcomingBookings, BookingInfo } from "@shared/schema";

// ─── Types & constants ────────────────────────────────────────────────────────

const COLOR_PRESETS = [
  "#E8F4FD", "#E8F5E9", "#FFF3E0", "#F3E5F5",
  "#FCE4EC", "#E0F7FA", "#FBE9E7", "#EDE9FE",
  "#ECEFF1", "#FFF8E1", "#E8EAF6", "#F1F8E9",
];

const propertyFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  address: z.string().default(""),
  icalUrl: z.string().default(""),
  airbnbUrl: z.string().default(""),
  color: z.string().default("#E8F4FD"),
});
type PropertyFormValues = z.infer<typeof propertyFormSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function getStatus(booking: BookingInfo): "checkout" | "checkin" | "occupied" {
  const today = todayStr();
  const start = booking.startDate.split("T")[0];
  const end = booking.endDate.split("T")[0];
  if (end === today) return "checkout";
  if (start === today) return "checkin";
  return "occupied";
}

function getPropertyStatus(bookings: BookingInfo[]): "available" | "occupied" | "checkout" | "checkin" {
  if (!bookings || bookings.length === 0) return "available";
  const today = todayStr();
  const active = bookings.find(b => b.startDate.split("T")[0] <= today && b.endDate.split("T")[0] >= today);
  if (!active) return "available";
  const end = active.endDate.split("T")[0];
  const start = active.startDate.split("T")[0];
  if (end === today) return "checkout";
  if (start === today) return "checkin";
  return "occupied";
}

function StatusBadge({ status }: { status: ReturnType<typeof getPropertyStatus> }) {
  const map = {
    available:  { label: "Available",      className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300" },
    occupied:   { label: "Occupied",       className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" },
    checkout:   { label: "Checkout Today", className: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300" },
    checkin:    { label: "Check-in Today", className: "bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300" },
  };
  const { label, className } = map[status];
  return <Badge className={`text-xs font-medium ${className}`} data-testid={`badge-status-${status}`}>{label}</Badge>;
}

// ─── Add / Edit Property Modal ────────────────────────────────────────────────

function PropertyModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Property | null;
}) {
  const { toast } = useToast();

  const form = useForm<PropertyFormValues>({
    resolver: zodResolver(propertyFormSchema),
    defaultValues: {
      name: editing?.name ?? "",
      address: editing?.address ?? "",
      icalUrl: editing?.icalUrl ?? "",
      airbnbUrl: editing?.airbnbUrl ?? "",
      color: editing?.color ?? "#E8F4FD",
    },
    values: {
      name: editing?.name ?? "",
      address: editing?.address ?? "",
      icalUrl: editing?.icalUrl ?? "",
      airbnbUrl: editing?.airbnbUrl ?? "",
      color: editing?.color ?? "#E8F4FD",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: PropertyFormValues) => apiRequest("POST", "/api/properties", data),
    onSuccess: async (res) => {
      const prop: Property = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      // Auto-sync if an iCal URL was provided
      if (form.getValues("icalUrl")) {
        apiRequest("POST", `/api/properties/${prop.id}/sync`).catch(() => null);
      }
      toast({ title: "Property added" });
      onClose();
    },
    onError: () => toast({ title: "Failed to add property", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: PropertyFormValues) =>
      apiRequest("PATCH", `/api/properties/${editing!.id}`, { ...data, id: editing!.id }),
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      toast({ title: "Property updated" });
      onClose();
    },
    onError: () => toast({ title: "Failed to update property", variant: "destructive" }),
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  function onSubmit(values: PropertyFormValues) {
    if (editing) updateMutation.mutate(values);
    else createMutation.mutate(values);
  }

  const selectedColor = form.watch("color");

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Beachfront Villa" {...field} data-testid="input-property-name" />
                  </FormControl>
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
                    <Input placeholder="e.g. 123 Ocean Dr, Port Richey, FL" {...field} data-testid="input-property-address" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icalUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>iCal URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.airbnb.com/calendar/ical/..." {...field} data-testid="input-property-ical" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="airbnbUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Airbnb Listing URL</FormLabel>
                  <FormControl>
                    <Input placeholder="https://www.airbnb.com/rooms/..." {...field} data-testid="input-property-airbnb" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Color</FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap gap-2">
                      {COLOR_PRESETS.map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => field.onChange(c)}
                          className="w-7 h-7 rounded-full border-2 transition-transform"
                          style={{
                            background: c,
                            borderColor: selectedColor === c ? "#374151" : "transparent",
                            transform: selectedColor === c ? "scale(1.2)" : "scale(1)",
                          }}
                          data-testid={`color-swatch-${c.replace("#", "")}`}
                        />
                      ))}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending} data-testid="button-save-property">
                {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editing ? "Save Changes" : "Add Property"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Calendar() {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [syncingId, setSyncingId] = useState<number | null>(null);

  const { data: properties = [], isLoading: propsLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: upcoming = {}, isLoading: bookLoading, refetch } = useQuery<UpcomingBookings>({
    queryKey: ["/api/bookings/upcoming"],
    refetchInterval: 5 * 60 * 1000,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/properties/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      setConfirmDeleteId(null);
      toast({ title: "Property deleted" });
    },
    onError: () => toast({ title: "Failed to delete property", variant: "destructive" }),
  });

  async function handleSync(id: number) {
    setSyncingId(id);
    try {
      await apiRequest("POST", `/api/properties/${id}/sync`);
      queryClient.invalidateQueries({ queryKey: ["/api/bookings/upcoming"] });
      queryClient.invalidateQueries({ queryKey: ["/api/properties"] });
      toast({ title: "Synced" });
    } catch {
      toast({ title: "Sync failed", variant: "destructive" });
    } finally {
      setSyncingId(null);
    }
  }

  const isLoading = propsLoading || bookLoading;
  const today = todayStr();

  const propertiesWithCalendar = properties.filter(p => p.icalUrl);
  const propertiesNoCalendar = properties.filter(p => !p.icalUrl);

  const allUpcomingEvents: { property: Property; booking: BookingInfo }[] = [];
  for (const prop of propertiesWithCalendar) {
    const bookings = upcoming[prop.id] ?? [];
    for (const b of bookings) {
      allUpcomingEvents.push({ property: prop, booking: b });
    }
  }
  allUpcomingEvents.sort((a, b) => a.booking.startDate.localeCompare(b.booking.startDate));

  const checkoutsToday = allUpcomingEvents.filter(e => e.booking.endDate.split("T")[0] === today).length;
  const checkinsToday  = allUpcomingEvents.filter(e => e.booking.startDate.split("T")[0] === today).length;
  const occupiedNow    = propertiesWithCalendar.filter(p => {
    const s = getPropertyStatus(upcoming[p.id] ?? []);
    return s === "occupied" || s === "checkin";
  }).length;

  function openAdd() {
    setEditingProperty(null);
    setModalOpen(true);
  }
  function openEdit(p: Property) {
    setEditingProperty(p);
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => navigate("/")} data-testid="button-back-home">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <CalendarDays className="w-5 h-5 text-green-600" />
          <h1 className="text-lg font-semibold">Calendar</h1>
        </div>
        <Button size="icon" variant="ghost" onClick={() => refetch()} data-testid="button-refresh-all">
          <RefreshCw className="w-4 h-4" />
        </Button>
        <Button size="sm" onClick={openAdd} data-testid="button-add-property">
          <Plus className="w-4 h-4 mr-1" />
          Add Property
        </Button>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <Card data-testid="card-checkouts-today">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 text-orange-500">
                <LogOut className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{checkoutsToday}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Checkout Today</p>
            </CardContent>
          </Card>
          <Card data-testid="card-checkins-today">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 text-violet-500">
                <LogIn className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{checkinsToday}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check-in Today</p>
            </CardContent>
          </Card>
          <Card data-testid="card-occupied-now">
            <CardContent className="pt-4 pb-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1 text-red-500">
                <CalendarDays className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold">{occupiedNow}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Occupied Now</p>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="text-center text-muted-foreground py-8">Loading bookings…</div>
        )}

        {/* Empty state */}
        {!isLoading && properties.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No properties yet</p>
              <p className="text-sm mt-1 mb-4">Add a property and paste its Airbnb iCal link to track bookings.</p>
              <Button onClick={openAdd} data-testid="button-add-property-empty">
                <Plus className="w-4 h-4 mr-1" />
                Add First Property
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Properties with iCal */}
        {!isLoading && propertiesWithCalendar.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                iCal Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {propertiesWithCalendar.map(prop => {
                const bookings = upcoming[prop.id] ?? [];
                const status = getPropertyStatus(bookings);
                const nextOut = bookings.find(b => b.endDate.split("T")[0] >= today);
                const nextIn  = bookings.find(b => b.startDate.split("T")[0] > today);
                const isConfirmingDelete = confirmDeleteId === prop.id;

                return (
                  <div
                    key={prop.id}
                    className="py-2 border-b last:border-0"
                    data-testid={`row-property-${prop.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div
                          className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5"
                          style={{ background: prop.color }}
                        />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate" data-testid={`text-property-name-${prop.id}`}>{prop.name}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5">
                            {nextOut && (
                              <span className="flex items-center gap-1 text-xs text-orange-600">
                                <LogOut className="w-3 h-3" />
                                {formatDate(nextOut.endDate)}
                              </span>
                            )}
                            {nextIn && nextIn !== nextOut && (
                              <span className="flex items-center gap-1 text-xs text-violet-600">
                                <LogIn className="w-3 h-3" />
                                {formatDate(nextIn.startDate)}
                              </span>
                            )}
                            {prop.lastSynced && (
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                {new Date(prop.lastSynced).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <StatusBadge status={status} />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          disabled={syncingId === prop.id}
                          onClick={() => handleSync(prop.id)}
                          data-testid={`button-sync-${prop.id}`}
                        >
                          <RefreshCw className={`w-3 h-3 ${syncingId === prop.id ? "animate-spin" : ""}`} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => openEdit(prop)}
                          data-testid={`button-edit-${prop.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        {isConfirmingDelete ? (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-7 text-xs px-2"
                            disabled={deleteMutation.isPending}
                            onClick={() => deleteMutation.mutate(prop.id)}
                            data-testid={`button-confirm-delete-${prop.id}`}
                          >
                            {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                          </Button>
                        ) : (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-7 h-7"
                            onClick={() => setConfirmDeleteId(prop.id)}
                            data-testid={`button-delete-${prop.id}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Properties without iCal */}
        {!isLoading && propertiesNoCalendar.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                No iCal Link
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {propertiesNoCalendar.map(prop => {
                const isConfirmingDelete = confirmDeleteId === prop.id;
                return (
                  <div
                    key={prop.id}
                    className="flex items-center justify-between gap-2 py-2 border-b last:border-0"
                    data-testid={`row-property-nocalendar-${prop.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: prop.color }} />
                      <p className="text-sm font-medium truncate text-muted-foreground">{prop.name}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        onClick={() => openEdit(prop)}
                        data-testid={`button-add-ical-${prop.id}`}
                      >
                        Add iCal
                      </Button>
                      {isConfirmingDelete ? (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="h-7 text-xs px-2"
                          disabled={deleteMutation.isPending}
                          onClick={() => deleteMutation.mutate(prop.id)}
                          data-testid={`button-confirm-delete-nocalendar-${prop.id}`}
                        >
                          {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="w-7 h-7"
                          onClick={() => setConfirmDeleteId(prop.id)}
                          data-testid={`button-delete-nocalendar-${prop.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Upcoming bookings */}
        {!isLoading && allUpcomingEvents.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming Bookings
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-1">
              {allUpcomingEvents.map(({ property: prop, booking }, idx) => {
                const status = getStatus(booking);
                const isToday = booking.startDate.split("T")[0] === today || booking.endDate.split("T")[0] === today;
                return (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 py-2 border-b last:border-0 ${isToday ? "bg-muted/40 -mx-2 px-2 rounded-md" : ""}`}
                    data-testid={`row-booking-${idx}`}
                  >
                    {status === "checkout" && <LogOut className="w-4 h-4 text-orange-500 flex-shrink-0" />}
                    {status === "checkin"  && <LogIn  className="w-4 h-4 text-violet-500 flex-shrink-0" />}
                    {status === "occupied" && <CalendarDays className="w-4 h-4 text-red-400 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{prop.name}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(booking.startDate)} → {formatDate(booking.endDate)}</p>
                    </div>
                    {isToday && <Badge className="text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300">Today</Badge>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add / Edit modal */}
      {modalOpen && (
        <PropertyModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditingProperty(null); }}
          editing={editingProperty}
        />
      )}
    </div>
  );
}
