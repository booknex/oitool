import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Navigation, Radio, AlertCircle, RefreshCw, Building2, Eye, EyeOff, Users, Clock, ArrowLeft } from "lucide-react";
import type { ActiveLocation, StaffMember, Property, Client } from "@shared/schema";
import "leaflet/dist/leaflet.css";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  return `${Math.floor(secs / 3600)}h ago`;
}

function initials(name: string): string {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function buildStaffMarkerHtml(color: string, init: string): string {
  return `
    <div style="
      position:relative;
      width:44px;height:52px;
      display:flex;flex-direction:column;align-items:center;
    ">
      <div style="
        width:44px;height:44px;
        background:${color};
        border-radius:50%;
        border:3px solid #fff;
        box-shadow:0 2px 12px rgba(0,0,0,0.25);
        display:flex;align-items:center;justify-content:center;
        font-size:13px;font-weight:700;color:#fff;
        letter-spacing:-0.5px;
        font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
      ">${init}</div>
      <div style="
        width:0;height:0;
        border-left:6px solid transparent;
        border-right:6px solid transparent;
        border-top:8px solid ${color};
        margin-top:-1px;
        filter:drop-shadow(0 2px 4px rgba(0,0,0,0.15));
      "></div>
    </div>
  `;
}

function buildPropertyMarkerHtml(_color: string, label: string, address?: string): string {
  const babyBlue = "#5BAFD6";
  return `
    <div style="
      position:relative;
      display:flex;flex-direction:column;align-items:center;
    ">
      ${address ? `
      <div style="
        background:#ffffff;
        border:2px solid #5BAFD6;
        border-radius:6px;
        padding:6px 10px;
        margin-bottom:5px;
        font-size:10px;font-weight:700;color:#1e3a4f;
        font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
        white-space:normal;
        word-break:break-word;
        width:110px;
        text-align:center;
        line-height:1.4;
        box-shadow:0 2px 8px rgba(0,0,0,0.15);
        letter-spacing:0.2px;
      ">${address}</div>` : ""}
      <div style="
        width:38px;height:38px;
        background:${babyBlue};
        border-radius:10px;
        border:3px solid #fff;
        box-shadow:0 2px 12px rgba(0,0,0,0.22);
        display:flex;align-items:center;justify-content:center;
        font-size:11px;font-weight:700;color:#fff;
        letter-spacing:-0.5px;
        font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
      ">${label}</div>
      <div style="
        width:0;height:0;
        border-left:5px solid transparent;
        border-right:5px solid transparent;
        border-top:7px solid ${babyBlue};
        margin-top:-1px;
      "></div>
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

  const { data: allClients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Convert clients (with property addresses) into Property-shaped objects for the map
  const allProperties: Property[] = allClients.map(c => ({
    id: c.id,
    name: c.name,
    address: [c.propertyStreet, c.propertyCity, c.propertyState, c.propertyZip].filter(Boolean).join(", "),
    airbnbUrl: "",
    color: "#5BAFD6",
    sortOrder: 0,
    imageUrl: "",
    icalUrl: null,
    lastSynced: null,
    lat: c.lat,
    lng: c.lng,
  }));

  const mappableProperties = allProperties.filter(p => p.lat != null && p.lng != null);

  // Init map with CartoDB Positron tiles (Apple Maps-like light style)
  useEffect(() => {
    if (!mapRef.current || mapInstance.current) return;
    import("leaflet").then(mod => {
      const L = mod.default ?? mod;
      const map = L.map(mapRef.current!, {
        center: [25.79, -80.13],
        zoom: 13,
        zoomControl: false,
        attributionControl: true,
      });

      // CartoDB Positron — clean, minimal, iOS Maps-like
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
      }).addTo(map);

      // Custom zoom controls (bottom-right)
      L.control.zoom({ position: "bottomright" }).addTo(map);

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
          html: buildStaffMarkerHtml(loc.color, initials(loc.name)),
          className: "",
          iconSize: [44, 52],
          iconAnchor: [22, 52],
          popupAnchor: [0, -54],
        });
        const marker = L.marker([loc.lat, loc.lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="
              font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
              min-width:160px;padding:4px 0;
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <div style="width:32px;height:32px;border-radius:50%;background:${loc.color};display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">${initials(loc.name)}</div>
                <strong style="font-size:14px;font-weight:600;">${loc.name}</strong>
              </div>
              <div style="display:flex;align-items:center;gap:6px;color:#666;font-size:12px;">
                <div style="width:6px;height:6px;border-radius:50%;background:#34C759;flex-shrink:0;"></div>
                Active · ${timeAgo(loc.lastSeen)}
              </div>
              ${loc.accuracy > 0 ? `<div style="color:#aaa;font-size:11px;margin-top:3px;">±${Math.round(loc.accuracy)}m accuracy</div>` : ""}
            </div>
          `, { className: "ios-popup" });
        staffMarkersRef.current.push(marker);
        bounds.push([loc.lat, loc.lng]);
      });

      if (bounds.length > 0 && propertyMarkersRef.current.length === 0) {
        mapInstance.current!.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
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
          html: buildPropertyMarkerHtml(prop.color, initials(prop.name), prop.address ?? undefined),
          className: "",
          iconSize: [200, 72],
          iconAnchor: [100, 72],
          popupAnchor: [0, -72],
        });
        const marker = L.marker([lat, lng], { icon })
          .addTo(mapInstance.current!)
          .bindPopup(`
            <div style="
              font-family:-apple-system,BlinkMacSystemFont,'SF Pro Display',sans-serif;
              min-width:160px;padding:4px 0;
            ">
              <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
                <div style="width:30px;height:30px;border-radius:8px;background:#5BAFD6;display:flex;align-items:center;justify-content:center;color:#fff;font-size:11px;font-weight:700;">${initials(prop.name)}</div>
                <strong style="font-size:14px;font-weight:600;">${prop.name}</strong>
              </div>
              ${prop.address ? `<div style="color:#888;font-size:12px;">${prop.address}</div>` : ""}
            </div>
          `, { className: "ios-popup" });
        propertyMarkersRef.current.push(marker);
        bounds.push([lat, lng]);
      });

      const allBounds: [number, number][] = [
        ...bounds,
        ...staffMarkersRef.current.map(m => {
          const ll = m.getLatLng();
          return [ll.lat, ll.lng] as [number, number];
        }),
      ];
      if (allBounds.length > 0) {
        mapInstance.current!.fitBounds(allBounds, { padding: [80, 80], maxZoom: 14 });
      }
    });
  }, [mappableProperties, mapReady, showProperties]);

  return (
    <div className="relative w-full h-full">
      {/* Map fills everything */}
      <div ref={mapRef} className="absolute inset-0" data-testid="map-container" />

      {/* Floating sidebar panel — iOS Maps style */}
      <div
        className="absolute top-4 left-4 bottom-4 z-[1000] flex flex-col"
        style={{ width: "280px" }}
      >
        <div
          className="flex flex-col h-full rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.92)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
          }}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between gap-2 border-b border-black/[0.06]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Radio className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <p className="text-[13px] font-semibold text-gray-900 leading-tight">Live Tracking</p>
                <p className="text-[11px] text-gray-400 leading-tight">{lastRefresh.toLocaleTimeString()}</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="w-8 h-8 rounded-full flex items-center justify-center bg-black/5 hover:bg-black/10 transition-colors"
              data-testid="button-refresh-locations"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-gray-600 ${isFetching ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto">

            {/* Active Staff section */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Active Staff</span>
              {locations.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-blue-500">{locations.length}</span>
              )}
            </div>

            <div className="px-3 pb-2 space-y-1">
              {locations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-5 gap-1.5">
                  <MapPin className="w-6 h-6 text-gray-300" />
                  <p className="text-[12px] text-gray-400">No staff sharing location</p>
                  <p className="text-[11px] text-gray-300">Pings expire after 10 min</p>
                </div>
              ) : (
                locations.map(loc => (
                  <button
                    key={loc.staffId}
                    className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-colors"
                    style={{ background: "transparent" }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    onClick={() => mapInstance.current?.setView([loc.lat, loc.lng], 15)}
                    data-testid={`card-location-${loc.staffId}`}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-bold border-2 border-white"
                      style={{ background: loc.color, boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}
                    >
                      {initials(loc.name)}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-[13px] font-semibold text-gray-900 truncate">{loc.name}</p>
                      <p className="text-[11px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" /> {timeAgo(loc.lastSeen)}
                      </p>
                    </div>
                    <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  </button>
                ))
              )}
            </div>

            {/* Divider */}
            <div className="mx-3 border-t border-black/[0.06]" />

            {/* Properties section */}
            <div className="px-4 pt-3 pb-1 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Properties</span>
              {mappableProperties.length > 0 && (
                <span className="ml-auto text-[11px] font-semibold text-blue-500">{mappableProperties.length}</span>
              )}
              <button
                onClick={() => setShowProperties(v => !v)}
                className="w-6 h-6 rounded-full flex items-center justify-center ml-1 bg-black/5 hover:bg-black/10 transition-colors"
                data-testid="button-toggle-properties"
              >
                {showProperties
                  ? <Eye className="w-3 h-3 text-gray-500" />
                  : <EyeOff className="w-3 h-3 text-gray-500" />}
              </button>
            </div>

            {showProperties && (
              <div className="px-3 pb-3 space-y-1">
                {mappableProperties.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-4 gap-1">
                    <p className="text-[12px] text-gray-400 text-center">No mapped properties yet</p>
                    <p className="text-[11px] text-gray-300 text-center">Add customers with property addresses in the Invoicing tab</p>
                  </div>
                ) : (
                  mappableProperties.map(prop => {
                    const lat = parseFloat(String(prop.lat));
                    const lng = parseFloat(String(prop.lng));
                    return (
                      <button
                        key={prop.id}
                        className="w-full flex items-center gap-3 py-2.5 px-3 rounded-xl text-left transition-colors"
                        style={{ background: "transparent" }}
                        onMouseEnter={e => (e.currentTarget.style.background = "rgba(0,0,0,0.04)")}
                        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                        onClick={() => mapInstance.current?.setView([lat, lng], 15)}
                        data-testid={`button-property-${prop.id}`}
                      >
                        <div
                          className="w-8 h-8 rounded-[9px] flex-shrink-0 flex items-center justify-center text-white text-[11px] font-bold border-2 border-white"
                          style={{ background: "#5BAFD6", boxShadow: "0 1px 4px rgba(0,0,0,0.18)" }}
                        >
                          {initials(prop.name)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-semibold text-gray-900 truncate">{prop.name}</p>
                          {prop.address && (
                            <p className="text-[11px] text-gray-400 leading-snug">{prop.address}</p>
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
      </div>

      {/* iOS-style popup CSS */}
      <style>{`
        .ios-popup .leaflet-popup-content-wrapper {
          background: rgba(255,255,255,0.96);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-radius: 14px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.08);
          padding: 12px 16px;
          border: none;
        }
        .ios-popup .leaflet-popup-tip-container { display: none; }
        .ios-popup .leaflet-popup-close-button {
          color: #aaa;
          font-size: 18px;
          top: 8px;
          right: 10px;
        }
        .ios-popup .leaflet-popup-content { margin: 0; }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 0 2px 12px rgba(0,0,0,0.15) !important;
        }
        .leaflet-control-zoom a {
          background: rgba(255,255,255,0.92) !important;
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          color: #333 !important;
          border: none !important;
          font-size: 16px !important;
          width: 36px !important;
          height: 36px !important;
          line-height: 36px !important;
        }
        .leaflet-control-zoom a:first-child {
          border-radius: 10px 10px 0 0 !important;
        }
        .leaflet-control-zoom a:last-child {
          border-radius: 0 0 10px 10px !important;
        }
        .leaflet-control-attribution {
          background: rgba(255,255,255,0.7) !important;
          backdrop-filter: blur(8px);
          border-radius: 8px 0 0 0 !important;
          font-size: 10px !important;
        }
      `}</style>
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
      err => setError(`Location error: ${err.message}`),
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
    <div
      className="h-full flex flex-col items-center justify-center p-6"
      style={{
        background: "linear-gradient(160deg, #f0f4ff 0%, #e8f5e9 100%)",
      }}
    >
      <div className="w-full max-w-sm space-y-5">
        {/* Header */}
        <div className="text-center space-y-1">
          <div
            className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center mx-auto mb-4 shadow-lg"
          >
            <Navigation className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Share Location</h2>
          <p className="text-[14px] text-gray-500">Let the team see where you are</p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.9)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 4px 30px rgba(0,0,0,0.10)",
          }}
        >
          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[13px] font-semibold text-gray-600">Your Name</label>
              <Select
                value={selectedStaffId}
                onValueChange={v => { setSelectedStaffId(v); stopSharing(); }}
                disabled={sharing}
              >
                <SelectTrigger data-testid="select-staff-name" className="rounded-xl border-black/10">
                  <SelectValue placeholder="Select your name…" />
                </SelectTrigger>
                <SelectContent>
                  {activeStaff.map(s => (
                    <SelectItem key={s.id} value={String(s.id)} data-testid={`option-staff-${s.id}`}>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ background: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sharing status */}
            {sharing && selectedMember && (
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                <div className="relative flex-shrink-0">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-ping" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-green-700">Sharing as {selectedMember.name}</p>
                  {status && <p className="text-[11px] text-green-600 truncate">{status}</p>}
                  {pingCount > 0 && (
                    <p className="text-[11px] text-green-500">
                      {pingCount} ping{pingCount !== 1 ? "s" : ""} · every 30s
                    </p>
                  )}
                </div>
              </div>
            )}

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-[13px] text-red-700">{error}</p>
              </div>
            )}

            {!sharing ? (
              <button
                onClick={startSharing}
                disabled={!selectedStaffId}
                className="w-full py-3 rounded-xl font-semibold text-[15px] text-white transition-all"
                style={{
                  background: selectedStaffId ? "#007AFF" : "#aaa",
                  boxShadow: selectedStaffId ? "0 4px 14px rgba(0,122,255,0.4)" : "none",
                }}
                data-testid="button-start-sharing"
              >
                Start Sharing Location
              </button>
            ) : (
              <button
                onClick={stopSharing}
                className="w-full py-3 rounded-xl font-semibold text-[15px] text-white bg-red-500 transition-all"
                style={{ boxShadow: "0 4px 14px rgba(239,68,68,0.35)" }}
                data-testid="button-stop-sharing"
              >
                Stop Sharing
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-[12px] text-gray-400">
          Location data expires after 10 minutes of inactivity.
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TrackingPage() {
  const [location] = useLocation();
  const searchStr = useSearch();
  const [, navigate] = useLocation();

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
    <div className="fixed inset-0 z-10" style={{ background: "#e8ecf0" }}>
      {/* Map or Employee view fills everything */}
      <div className="absolute inset-0">
        {view === "admin" ? <AdminMap /> : <EmployeeView />}
      </div>

      {/* Floating top-right controls */}
      <div className="absolute top-4 right-4 z-[1001] flex items-center gap-2">
        {/* View toggle pill */}
        <div
          className="flex items-center rounded-full p-1 gap-1"
          style={{
            background: "rgba(255,255,255,0.90)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
          }}
        >
          <button
            onClick={() => setView("admin")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: view === "admin" ? "#007AFF" : "transparent",
              color: view === "admin" ? "#fff" : "#555",
            }}
            data-testid="button-view-admin"
          >
            <Users className="w-3.5 h-3.5" />
            Map
          </button>
          <button
            onClick={() => setView("employee")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[13px] font-semibold transition-all"
            style={{
              background: view === "employee" ? "#007AFF" : "transparent",
              color: view === "employee" ? "#fff" : "#555",
            }}
            data-testid="button-view-employee"
          >
            <Navigation className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>

      {/* Floating back button */}
      <button
        onClick={() => navigate("/dashboard")}
        className="absolute top-4 z-[1001] flex items-center justify-center w-9 h-9 rounded-full transition-all"
        style={{
          left: "calc(280px + 32px)",
          background: "rgba(255,255,255,0.90)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 2px 16px rgba(0,0,0,0.12)",
        }}
        data-testid="button-back-tracking"
      >
        <ArrowLeft className="w-4 h-4 text-gray-700" />
      </button>
    </div>
  );
}
