import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Package, ClipboardList, Star, BarChart3, Users, Settings, ChevronRight } from "lucide-react";

const APPS = [
  {
    id: "supply-kiosk",
    name: "Supply Kiosk",
    description: "Inventory & supplies",
    icon: Package,
    color: "#E8F4FD",
    iconColor: "#2196F3",
    route: "/kiosk",
    available: true,
  },
  {
    id: "reviews",
    name: "Reviews",
    description: "Airbnb guest feedback",
    icon: Star,
    color: "#FFF8E1",
    iconColor: "#FFC107",
    route: "/reviews",
    available: false,
  },
  {
    id: "tasks",
    name: "Task Board",
    description: "Cleaning checklists",
    icon: ClipboardList,
    color: "#F3E5F5",
    iconColor: "#9C27B0",
    route: "/tasks",
    available: false,
  },
  {
    id: "reports",
    name: "Reports",
    description: "Performance & stats",
    icon: BarChart3,
    color: "#E8F5E9",
    iconColor: "#4CAF50",
    route: "/reports",
    available: false,
  },
  {
    id: "team",
    name: "Team",
    description: "Staff & schedules",
    icon: Users,
    color: "#FBE9E7",
    iconColor: "#FF5722",
    route: "/team",
    available: false,
  },
];

const TABS = ["Apps", "Tools", "Settings"];

function Clock() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-right">
      <div className="text-2xl font-semibold text-foreground tabular-nums">
        {time.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}
      </div>
      <div className="text-xs text-muted-foreground">
        {time.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Apps");
  const [, navigate] = useLocation();

  function handleAppClick(app: typeof APPS[0]) {
    if (app.available) {
      navigate(app.route);
    }
  }

  return (
    <div className="h-screen bg-[#F5F5F7] flex flex-col overflow-hidden select-none">
      <header className="px-6 pt-4 pb-2 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Cleanex</h1>
          <p className="text-xs text-muted-foreground">Cleaning Operations</p>
        </div>
        <Clock />
      </header>

      <div className="px-6 pt-1 pb-3 flex-shrink-0">
        <div className="flex gap-1 bg-white/60 backdrop-blur rounded-xl p-1 w-fit border border-black/5">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              data-testid={`tab-${tab.toLowerCase()}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === "Apps" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {APPS.map(app => {
              const Icon = app.icon;
              return (
                <button
                  key={app.id}
                  onClick={() => handleAppClick(app)}
                  data-testid={`app-tile-${app.id}`}
                  disabled={!app.available}
                  className={`relative flex flex-col items-start p-4 rounded-2xl bg-white border border-black/5 text-left transition-all ${
                    app.available
                      ? "hover-elevate cursor-pointer active:scale-95"
                      : "opacity-50 cursor-not-allowed"
                  }`}
                  style={{ minHeight: "120px" }}
                >
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 flex-shrink-0"
                    style={{ backgroundColor: app.color }}
                  >
                    <Icon className="w-6 h-6" style={{ color: app.iconColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-foreground truncate">{app.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">{app.description}</div>
                  </div>
                  {!app.available && (
                    <div className="absolute top-2 right-2 text-[9px] font-semibold text-muted-foreground bg-black/5 px-1.5 py-0.5 rounded-full">
                      Soon
                    </div>
                  )}
                  {app.available && (
                    <ChevronRight className="absolute top-3 right-3 w-3 h-3 text-muted-foreground/50" />
                  )}
                </button>
              );
            })}
          </div>
        )}

        {activeTab === "Tools" && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Settings className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Tools coming soon</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Additional tools will appear here</p>
          </div>
        )}

        {activeTab === "Settings" && (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Settings className="w-10 h-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">Settings coming soon</p>
            <p className="text-xs text-muted-foreground/60 mt-1">App settings will appear here</p>
          </div>
        )}
      </div>
    </div>
  );
}
