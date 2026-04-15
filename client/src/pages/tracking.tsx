import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Users, Clock, Navigation, Radio, AlertCircle, RefreshCw, LogOut, Building2, Eye, EyeOff } from "lucide-react";
import type { ActiveLocation, StaffMember, Property } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function buildMarkerHtml(color: string, initials: string): string {
  return `
    <div style="
      background:${color};
      color:#fff;
      width:36px;height:36px;
      border-radius:50% 50% 50% 0;
      transform:rotate(-45deg);
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="transform:rotate(45deg);font-size:11px;font-weight:700;">${initials}</span>
    </div>
  `;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function buildPropertyMarkerHtml(color: string, label: string): string {
  return `
    <div style="
      background:${color};
      color:#fff;
      width:32px;height:32px;
      border-radius:6px;
      border:2px solid #fff;
      box-shadow:0 2px 6px rgba(0,0,0,0.35);
      display:flex;align-items:center;justify-content:center;
    ">
      <span style="font-size:10px;font-weight:700;letter-spacing:-0.5px;">${label}</span>
    </div>
  `;
}

// ─── Admin Map View ───────────────────────────────────────────────────────────

function AdminMap() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<import("leaflet").Map | null>(null);
  const staffMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const propertyMarkersRef = useRef<import("leaflet").Marker[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [mapReady, setMapReady] = useState(false);
  const [showProperties, setShowProperties] = useState(true);

  const { data: locations = [], refetch, isFetching } = useQuery<ActiveLocation[]>({
    queryKey: ["/api/location/active"],
    refetchInterval: 30_000,
  });

  const { data: allProperties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties"],
  });

  const mappableProperties = allProperties.filter(
    p => p.lat != null && p.lng != null
  );

  // Init map
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    import("leaflet").then(mod => {
      const L = mod.default ?? mod;
      const map = L.map(mapRef.current!, {
        center: [28.27, -82.72],
        zoom: 11,
        zoomControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(map);
      mapInstance.current = map;
      setMapReady(true);
    });
    return () => {
      mapInstance.current?.remove();
      mapInstance.current = null;
      setMapReady(false);
    };
  }, []);

  // Employee markers
  useEffect(() => {
    if (!mapInstance.current || !mapReady) return;
    import("leaflet").then(mod => {
      const L = mod.default ?? mod;
      staffMarkersRef.current.forEach(m => m.remove());
      staffMarkersRef.current = [];

      const bounds: [number, number][] = [];
      locations.forEach(loc => {
        const icon = L.divIcon({
          html: buildMarkerHtml(loc.color, initials(loc.name)),
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 36],
          popupAnchor: [0, -36],
        });
        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="min-width:140px">
              <strong style="font-size:14px">${loc.name}</strong><br/>
              <span style="font-size:12px;color:#666">Last seen: ${timeAgo(loc.lastSeen)}</span><br/>
              ${loc.accuracy > 0 ? `<span style="font-size:11px;color:#888">±${Math.round(loc.accuracy)}m accuracy</span>` : ""}
            </div>
          `);
        staffMarkersRef.current.push(marker);
        bounds.push([loc.lat, loc.lng]);
      });

      if (bounds.length > 0 && propertyMarkersRef.current.length === 0) {
        mapInstance.current!.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    });
    setLastRefresh(new Date());
  }, [locations, mapReady]);

  // Property markers
  useEffect(() => {
    if (!mapInstance.current || !mapReady) return;
    import("leaflet").then(mod => {
      const L = mod.default ?? mod;
      propertyMarkersRef.current.forEach(m => m.remove());
      propertyMarkersRef.current = [];

      if (!showProperties) return;

      const bounds: [number, number][] = [];
      mappableProperties.forEach(prop => {
        const lat = parseFloat(String(prop.lat));
        const lng = parseFloat(String(prop.lng));
        if (isNaN(lat) || isNaN(lng)) return;

        const icon = L.divIcon({
          html: buildPropertyMarkerHtml(prop.color, initials(prop.name)),
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });
        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="min-width:150px">
              <strong style="font-size:13px">${prop.name}</strong><br/>
              ${prop.address ? `<span style="font-size:12px;color:#666">${prop.address}</span>` : ""}
            </div>
          `);
        propertyMarkersRef.current.push(marker);
        bounds.push([lat, lng]);
      });

      // Fit all markers (properties + employees) on first load
      const allBounds: [number, number][] = [
        ...bounds,
        ...staffMarkersRef.current.map(m => {
          const ll = m.getLatLng();
          return [ll.lat, ll.lng] as [number, number];
        }),
      ];
      if (allBounds.length > 0) {
        mapInstance.current!.fitBounds(allBounds, { padding: [50, 50], maxZoom: 14 });
      }
    });
  }, [mappableProperties, mapReady, showProperties]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 border-r bg-card flex flex-col">
        {/* Staff section header */}
        <div className="px-4 py-3 border-b flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-500" />
            <span className="font-semibold text-sm">Active Staff</span>
            <Badge variant="secondary" data-testid="badge-active-count">{locations.length}</Badge>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-refresh-locations"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Employee location cards */}
          <div className="p-3 space-y-2">
            {locations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-24 gap-2 text-muted-foreground text-sm">
                <MapPin className="w-7 h-7 opacity-30" />
                <span>No active staff</span>
                <span className="text-xs opacity-60">Pings expire after 10 min</span>
              </div>
            ) : (
              locations.map(loc => (
                <Card
                  key={loc.staffId}
                  className="cursor-pointer hover-elevate"
                  data-testid={`card-location-${loc.staffId}`}
                  onClick={() => mapInstance.current?.setView([loc.lat, loc.lng], 15)}
                >
                  <CardContent className="p-3 flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: loc.color }}
                    >
                      {initials(loc.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{loc.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {timeAgo(loc.lastSeen)}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {/* Divider + Properties section */}
          <div className="border-t">
            <div className="px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-500" />
                <span className="font-semibold text-sm">Properties</span>
                <Badge variant="secondary">{mappableProperties.length}</Badge>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setShowProperties(v => !v)}
                data-testid="button-toggle-properties"
              >
                {showProperties
                  ? <Eye className="w-4 h-4" />
                  : <EyeOff className="w-4 h-4" />}
              </Button>
            </div>

            {showProperties && (
              <div className="px-3 pb-3 space-y-1">
                {mappableProperties.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-3">
                    No properties with addresses yet — add one in the Calendar tab.
                  </p>
                ) : (
                  mappableProperties.map(prop => {
                    const lat = parseFloat(String(prop.lat));
                    const lng = parseFloat(String(prop.lng));
                    return (
                      <button
                        key={prop.id}
                        className="w-full flex items-center gap-3 py-2 px-2 rounded-md text-left hover-elevate"
                        onClick={() => mapInstance.current?.setView([lat, lng], 15)}
                        data-testid={`button-property-${prop.id}`}
                      >
                        <div
                          className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-white text-xs font-bold"
                          style={{ background: prop.color }}
                        >
                          {initials(prop.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{prop.name}</p>
                          {prop.address && (
                            <p className="text-xs text-muted-foreground truncate">{prop.address}</p>
                          )}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-3 border-t text-xs text-muted-foreground text-center">
          Staff auto-refreshes every 30s · {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" data-testid="map-container" />
        {locations.length === 0 && mappableProperties.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="bg-background/80 backdrop-blur-sm rounded-md px-6 py-4 flex flex-col items-center gap-2 shadow-lg">
              <MapPin className="w-10 h-10 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">No staff or properties on map yet</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Employee GPS View ────────────────────────────────────────────────────────

function EmployeeView() {
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [sharing, setSharing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [pingCount, setPingCount] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data: staffList = [] } = useQuery<StaffMember[]>({
    queryKey: ["/api/staff"],
  });

  const activeStaff = staffList.filter(s => s.status === "active");

  const pingMutation = useMutation({
    mutationFn: async (data: { staffId: number; lat: number; lng: number; accuracy: number }) =>
      apiRequest("POST", "/api/location/ping", data),
    onSuccess: () => {
      setPingCount(c => c + 1);
      setStatus(`Last ping sent at ${new Date().toLocaleTimeString()}`);
      setError("");
    },
    onError: () => setError("Failed to send location ping"),
  });

  const sendPing = useCallback((staffId: number) => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        pingMutation.mutate({
          staffId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? 0,
        });
      },
      err => {
        setError(`Location error: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 }
    );
  }, [pingMutation]);

  const startSharing = () => {
    if (!selectedStaffId) return;
    const id = parseInt(selectedStaffId);
    setSharing(true);
    setError("");
    sendPing(id);
    intervalRef.current = setInterval(() => sendPing(id), 30_000);
  };

  const stopSharing = () => {
    setSharing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setStatus("");
    setPingCount(0);
  };

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  const selectedMember = activeStaff.find(s => s.id === parseInt(selectedStaffId));

  return (
    <div className="h-full flex flex-col items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-2 text-cyan-600 dark:text-cyan-400 mb-2">
            <Navigation className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-bold">Share My Location</h2>
          <p className="text-muted-foreground text-sm">
            Let the admin track your location in real time
          </p>
        </div>

        {/* Staff selector */}
        <Card>
          <CardContent className="p-6 space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select your name</label>
              <Select
                value={selectedStaffId}
                onValueChange={v => { setSelectedStaffId(v); stopSharing(); }}
                disabled={sharing}
              >
                <SelectTrigger data-testid="select-staff-name">
                  <SelectValue placeholder="Choose your name…" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} data-testid={`option-staff-${s.id}`}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-5 h-5 rounded-full flex-shrink-0"
                          style={{ background: s.color }}
                        />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status indicator */}
            {sharing && selectedMember && (
              <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-950/30 rounded-md border border-green-200 dark:border-green-800">
                <div className="relative">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-green-700 dark:text-green-300">
                    Sharing as {selectedMember.name}
                  </p>
                  {status && (
                    <p className="text-xs text-green-600 dark:text-green-400 truncate">{status}</p>
                  )}
                  {pingCount > 0 && (
                    <p className="text-xs text-green-500 dark:text-green-500">
                      {pingCount} ping{pingCount !== 1 ? "s" : ""} sent · every 30s
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Action button */}
            {!sharing ? (
              <Button
                className="w-full"
                size="lg"
                onClick={startSharing}
                disabled={!selectedStaffId}
                data-testid="button-start-sharing"
              >
                <Navigation className="w-4 h-4 mr-2" />
                Start Sharing Location
              </Button>
            ) : (
              <Button
                className="w-full"
                size="lg"
                variant="destructive"
                onClick={stopSharing}
                data-testid="button-stop-sharing"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Stop Sharing
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          Your location is sent to the admin map and expires after 10 minutes of inactivity.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [location] = useLocation();
  const searchStr = useSearch();

  function resolveView(): "admin" | "employee" {
    const params = new URLSearchParams(searchStr);
    if (params.get("mode") === "employee") return "employee";
    if (location === "/tracking/employee") return "employee";
    return "admin";
  }

  const [view, setView] = useState<"admin" | "employee">(resolveView);

  useEffect(() => {
    setView(resolveView());
  }, [location, searchStr]);

  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-card">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-cyan-500" />
          <h1 className="font-semibold text-base">Employee Tracking</h1>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={view === "admin" ? "default" : "outline"}
            onClick={() => setView("admin")}
            data-testid="button-view-admin"
          >
            <Users className="w-4 h-4 mr-1" />
            Map
          </Button>
          <Button
            size="sm"
            variant={view === "employee" ? "default" : "outline"}
            onClick={() => setView("employee")}
            data-testid="button-view-employee"
          >
            <Navigation className="w-4 h-4 mr-1" />
            Share My Location
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {view === "admin" ? <AdminMap /> : <EmployeeView />}
      </div>
    </div>
  );
}
