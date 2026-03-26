import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Package, ClipboardList, Star, BarChart3, Users, ChevronRight, Sparkles } from "lucide-react";

const APPS = [
  {
    id: "supply-kiosk",
    name: "Supply Kiosk",
    description: "Manage inventory & cleaning supplies",
    icon: Package,
    color: "#E8F4FD",
    iconColor: "#2196F3",
    route: "/kiosk",
    available: true,
  },
  {
    id: "reviews",
    name: "Reviews",
    description: "View Airbnb guest feedback",
    icon: Star,
    color: "#FFF8E1",
    iconColor: "#F59E0B",
    route: "/reviews",
    available: false,
  },
  {
    id: "tasks",
    name: "Task Board",
    description: "Cleaning checklists & assignments",
    icon: ClipboardList,
    color: "#F3E5F5",
    iconColor: "#9C27B0",
    route: "/tasks",
    available: false,
  },
  {
    id: "reports",
    name: "Reports",
    description: "Performance stats & analytics",
    icon: BarChart3,
    color: "#E8F5E9",
    iconColor: "#4CAF50",
    route: "/reports",
    available: false,
  },
  {
    id: "team",
    name: "Team",
    description: "Staff management & schedules",
    icon: Users,
    color: "#FBE9E7",
    iconColor: "#FF5722",
    route: "/team",
    available: false,
  },
];

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

export default function Dashboard() {
  const [, navigate] = useLocation();

  return (
    <div className="h-screen flex overflow-hidden select-none bg-[#F7F7F8]">
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
          <div
            className="absolute -top-24 -left-8 w-64 h-64 rounded-full opacity-5"
            style={{ background: "radial-gradient(circle, #4DD9C0, transparent)" }}
          />
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

      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="flex items-center justify-between px-6 pt-5 pb-4 flex-shrink-0 border-b border-black/5">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Select App</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Choose a tool to get started</p>
          </div>
          <Clock />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="flex flex-col gap-2 max-w-2xl">
            {APPS.map((app) => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => app.available && navigate(app.route)}
                  disabled={!app.available}
                  data-testid={`app-tile-${app.id}`}
                  className={`flex items-center gap-4 p-4 rounded-xl border border-black/5 bg-[#FAFAFA] text-left transition-all w-full ${
                    app.available
                      ? "hover-elevate cursor-pointer"
                      : "opacity-50 cursor-not-allowed"
                  }`}
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

                  <div className="flex-shrink-0 flex items-center gap-2">
                    {!app.available && (
                      <span className="text-[10px] font-semibold text-muted-foreground bg-black/5 px-2 py-0.5 rounded-full">
                        Coming Soon
                      </span>
                    )}
                    {app.available && (
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-black/5 flex-shrink-0">
          <p className="text-[11px] text-muted-foreground/50 text-center">
            Cleanex &bull; Cleaning Operations Platform
          </p>
        </div>
      </div>
    </div>
  );
}
