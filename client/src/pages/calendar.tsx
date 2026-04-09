import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowLeft, CalendarDays, LogIn, LogOut, RefreshCw, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Property, UpcomingBookings, BookingInfo } from "@shared/schema";

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

export default function Calendar() {
  const [, navigate] = useLocation();

  const { data: properties = [], isLoading: propsLoading } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const { data: upcoming = {}, isLoading: bookLoading, refetch } = useQuery<UpcomingBookings>({
    queryKey: ["/api/bookings/upcoming"],
    refetchInterval: 5 * 60 * 1000,
  });

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
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
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

        {!isLoading && propertiesWithCalendar.length === 0 && (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              <CalendarDays className="w-8 h-8 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No calendars linked yet</p>
              <p className="text-sm mt-1">Add an iCal URL to a property in the Reviews section.</p>
            </CardContent>
          </Card>
        )}

        {!isLoading && propertiesWithCalendar.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Properties
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-3">
              {propertiesWithCalendar.map(prop => {
                const bookings = upcoming[prop.id] ?? [];
                const status = getPropertyStatus(bookings);
                const nextOut = bookings.find(b => b.endDate.split("T")[0] >= today);
                const nextIn  = bookings.find(b => b.startDate.split("T")[0] > today);
                return (
                  <div
                    key={prop.id}
                    className="flex items-start justify-between gap-3 py-2 border-b last:border-0"
                    data-testid={`row-property-${prop.id}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
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
                    <StatusBadge status={status} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

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

        {!isLoading && propertiesNoCalendar.length > 0 && (
          <p className="text-xs text-muted-foreground text-center">
            {propertiesNoCalendar.length} {propertiesNoCalendar.length === 1 ? "property has" : "properties have"} no iCal link — add one in Reviews.
          </p>
        )}
      </div>
    </div>
  );
}
