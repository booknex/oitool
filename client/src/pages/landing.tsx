import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2,
  Package,
  Receipt,
  CalendarDays,
  Users,
  BarChart3,
  Sparkles,
  ChevronDown,
  ArrowRight,
  Shield,
  Zap,
  Clock,
  Lock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignupPayload {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
}

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Package,
    title: "Inventory Kiosk",
    desc: "Staff self-checkout for cleaning supplies with real-time stock levels and automatic deduction.",
    color: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    desc: "Send professional invoices and collect payments via Stripe — right from the dashboard.",
    color: "from-violet-500/20 to-blue-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: CalendarDays,
    title: "Property Calendar",
    desc: "Sync Airbnb iCal feeds to see checkouts, check-ins, and plan cleans automatically.",
    color: "from-cyan-500/20 to-teal-500/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Track supply costs, restock trends, and revenue over time with live charts.",
    color: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
  },
  {
    icon: Users,
    title: "Affiliate Program",
    desc: "Grow through partners — affiliates get their own portal to manage and track referrals.",
    color: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-400",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    desc: "Get your team up and running in minutes — no IT team or complex configuration required.",
    color: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-400",
  },
];

const STATS = [
  { value: "Real-time", label: "Inventory" },
  { value: "Stripe", label: "Payments" },
  { value: "iCal", label: "Sync" },
  { value: "All-in-one", label: "Platform" },
];

// ─── Glass card primitive ────────────────────────────────────────────────────

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}
    >
      {children}
    </div>
  );
}

// ─── Signup Form ─────────────────────────────────────────────────────────────

function SignupForm() {
  const { toast } = useToast();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [done, setDone] = useState(false);

  const submit = useMutation({
    mutationFn: async (data: SignupPayload) => {
      const res = await apiRequest("POST", "/api/public/signup", data);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? "Signup failed");
      }
      return res.json();
    },
    onSuccess: () => {
      setDone(true);
      toast({ title: "You're on the list!", description: "We'll be in touch shortly." });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      toast({ title: "Signup failed", description: msg, variant: "destructive" });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName || !lastName || !businessName || !email) return;
    submit.mutate({ firstName, lastName, businessName, email, phone });
  }

  if (done) {
    return (
      <GlassCard className="p-8 flex flex-col items-center justify-center gap-4 min-h-[360px] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-400" />
        </div>
        <h3 className="text-xl font-bold text-white">You're all set!</h3>
        <p className="text-slate-400 text-sm max-w-xs">
          Thanks for signing up. Our team will reach out within one business day.
        </p>
        <button
          onClick={() => setDone(false)}
          className="mt-2 text-sm text-blue-400 hover:text-blue-300 transition-colors underline underline-offset-2"
        >
          Submit another
        </button>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-7">
      <h3 className="text-lg font-bold text-white mb-0.5">Get started free</h3>
      <p className="text-sm text-slate-400 mb-6">No credit card required — 14-day free trial.</p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="lp-first" className="text-xs font-medium text-slate-300">
              First Name <span className="text-blue-400">*</span>
            </Label>
            <Input
              id="lp-first"
              data-testid="input-landing-first"
              placeholder="Jane"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
              className="bg-white/8 border-white/12 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-last" className="text-xs font-medium text-slate-300">
              Last Name <span className="text-blue-400">*</span>
            </Label>
            <Input
              id="lp-last"
              data-testid="input-landing-last"
              placeholder="Smith"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
              className="bg-white/8 border-white/12 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-biz" className="text-xs font-medium text-slate-300">
            Business Name <span className="text-blue-400">*</span>
          </Label>
          <Input
            id="lp-biz"
            data-testid="input-landing-business"
            placeholder="Acme Cleaning Co."
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-email" className="text-xs font-medium text-slate-300">
            Work Email <span className="text-blue-400">*</span>
          </Label>
          <Input
            id="lp-email"
            data-testid="input-landing-email"
            type="email"
            placeholder="jane@acmecleaning.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-phone" className="text-xs font-medium text-slate-300">
            Phone <span className="text-slate-500">(optional)</span>
          </Label>
          <Input
            id="lp-phone"
            data-testid="input-landing-phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500 focus:border-blue-400/50 focus:ring-blue-400/20"
          />
        </div>
        <button
          type="submit"
          data-testid="button-landing-submit"
          disabled={!firstName || !lastName || !businessName || !email || submit.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.4)] hover:shadow-[0_0_28px_rgba(59,130,246,0.55)]"
        >
          {submit.isPending ? "Submitting…" : <><span>Get Started</span><ArrowRight className="w-4 h-4" /></>}
        </button>
        <p className="text-center text-xs text-slate-500">No commitment. No credit card. Just a look.</p>
      </form>
    </GlassCard>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex flex-col overflow-x-hidden">

      {/* ── Ambient background orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-500/15 blur-[100px]" />
        <div className="absolute bottom-[5%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-blue-400/10 blur-[80px]" />
      </div>

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-white/8 bg-[#080d1a]/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5"
            data-testid="link-landing-logo"
          >
            <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shadow-[0_0_14px_rgba(59,130,246,0.5)]">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-base font-bold tracking-tight">Cleanex</span>
          </button>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500 hidden sm:block">Already a customer?</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="button-landing-signin"
                  className="flex items-center gap-1.5 text-sm font-medium text-slate-300 hover:text-white border border-white/12 bg-white/6 hover:bg-white/10 backdrop-blur-sm rounded-xl px-4 py-2 transition-all"
                >
                  Sign In <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 bg-[#111827]/90 backdrop-blur-xl border-white/12 text-white">
                <DropdownMenuItem
                  data-testid="link-signin-ops"
                  onClick={() => navigate("/ops")}
                  className="focus:bg-white/8 focus:text-white cursor-pointer"
                >
                  <Shield className="w-4 h-4 mr-2 text-indigo-400" />
                  Admin Portal
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="link-signin-affiliate"
                  onClick={() => navigate("/portal")}
                  className="focus:bg-white/8 focus:text-white cursor-pointer"
                >
                  <Users className="w-4 h-4 mr-2 text-violet-400" />
                  Affiliate Portal
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="link-signin-dashboard"
                  onClick={() => navigate("/dashboard")}
                  className="focus:bg-white/8 focus:text-white cursor-pointer"
                >
                  <Package className="w-4 h-4 mr-2 text-blue-400" />
                  Staff Dashboard
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative flex-1 max-w-7xl mx-auto w-full px-6 pt-20 pb-16">
        <div className="grid lg:grid-cols-[1fr_400px] gap-14 items-start">

          {/* Left */}
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">
                Cleaning Operations Platform · 2026
              </span>
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6">
                Run your cleaning{" "}
                <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-300 bg-clip-text text-transparent">
                  business smarter.
                </span>
              </h1>
              <p className="text-slate-400 text-lg leading-relaxed max-w-xl">
                Cleanex gives your team inventory management, client invoicing, property calendars, and partner tools — in one sleek platform built for cleaning professionals.
              </p>
            </div>

            {/* Checkpoints */}
            <ul className="space-y-3">
              {[
                "Track cleaning supply inventory in real time — no more stockouts",
                "Invoice clients and accept Stripe payments with one click",
                "Sync Airbnb calendars to keep cleans perfectly timed",
                "Get up and running in minutes — no IT team required",
              ].map((point) => (
                <li key={point} className="flex items-start gap-3 text-sm text-slate-300">
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  {point}
                </li>
              ))}
            </ul>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md px-5 py-3 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
                >
                  <span className="text-base font-extrabold text-white">{s.value}</span>
                  <span className="text-[11px] text-slate-400 mt-0.5">{s.label}</span>
                </div>
              ))}
            </div>

            {/* Trust strip */}
            <div>
              <p className="text-xs text-slate-600 font-medium uppercase tracking-widest mb-3">
                Trusted by cleaning companies across the US
              </p>
              <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                {["MaidPro", "Molly Maid", "Stanley Steemer", "Two Maids", "Zerorez"].map(name => (
                  <span key={name} className="text-sm font-semibold text-slate-700 tracking-tight">{name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right — Signup */}
          <div className="lg:sticky lg:top-24">
            <SignupForm />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-20 border-t border-white/6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">
              Platform Features
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything your team needs
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Purpose-built for cleaning service operations — from supply rooms to client billing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md p-6 flex gap-4 hover:border-white/15 hover:bg-white/7 transition-all duration-300 overflow-hidden"
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
                <div className="relative shrink-0 w-10 h-10 rounded-xl bg-white/8 border border-white/10 flex items-center justify-center">
                  <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div className="relative">
                  <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Cleanex ── */}
      <section className="relative py-20 border-t border-white/6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Problem / Solution list */}
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">
                Why Cleanex
              </p>
              <h2 className="text-3xl font-bold text-white mb-8">
                Why cleaning businesses switch to Cleanex
              </h2>
              <div className="space-y-5">
                {[
                  { bad: true, title: "Spreadsheets that never sync", desc: "Manual tracking leads to stockouts and billing errors that cost you money." },
                  { bad: true, title: "Disconnected tools for every task", desc: "Juggling invoicing apps, calendar apps, and inventory sheets wastes hours every week." },
                  { bad: true, title: "No visibility into costs or revenue", desc: "Without analytics, you're flying blind on which properties are profitable." },
                ].map((item) => (
                  <div key={item.title} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-red-500/15 border border-red-400/25 flex items-center justify-center shrink-0 mt-0.5">
                      <span className="text-red-400 text-[10px] font-bold leading-none">✕</span>
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}

                <div className="border-t border-white/8 my-4" />

                {[
                  "One platform for inventory, invoicing, and scheduling",
                  "Staff self-service kiosk cuts supply waste by tracking every item",
                  "Live dashboards show revenue, costs, and trends at a glance",
                ].map(text => (
                  <div key={text} className="flex gap-3">
                    <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    </div>
                    <p className="text-sm text-slate-300">{text}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA glass card */}
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-600/30 to-indigo-600/20 rounded-3xl blur-xl" />
              <GlassCard className="relative p-8">
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 border border-blue-400/25 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-sm font-semibold text-blue-300">Launch in minutes</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-3">Ready to get started?</h3>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Sign up free today and have your team using the kiosk, sending invoices, and syncing calendars by end of day.
                </p>
                <ul className="space-y-3 mb-7">
                  {[
                    { icon: CheckCircle2, text: "Free 14-day trial", color: "text-emerald-400" },
                    { icon: Lock, text: "No credit card required", color: "text-blue-400" },
                    { icon: Clock, text: "Setup in under 30 minutes", color: "text-cyan-400" },
                  ].map(({ icon: Icon, text, color }) => (
                    <li key={text} className="flex items-center gap-3 text-sm text-slate-300">
                      <Icon className={`w-4 h-4 ${color} shrink-0`} />
                      {text}
                    </li>
                  ))}
                </ul>
                <button
                  data-testid="button-landing-cta"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-3 transition-all shadow-[0_0_24px_rgba(59,130,246,0.4)] hover:shadow-[0_0_32px_rgba(59,130,246,0.6)]"
                >
                  Start your free trial <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-center text-xs text-slate-500 mt-3">Spots are limited — sign up today</p>
              </GlassCard>
            </div>

          </div>
        </div>
      </section>

      {/* ── Portal links ── */}
      <section className="relative py-12 border-t border-white/6">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-500 text-sm mb-6">Already have an account? Jump into your portal</p>
          <div className="flex flex-wrap justify-center gap-3">
            {[
              { icon: Shield, label: "Admin Portal", path: "/ops", color: "text-indigo-400" },
              { icon: Users, label: "Affiliate Portal", path: "/portal", color: "text-violet-400" },
              { icon: Package, label: "Staff Kiosk", path: "/kiosk", color: "text-blue-400" },
            ].map(({ icon: Icon, label, path, color }) => (
              <button
                key={label}
                data-testid={`link-footer-${label.toLowerCase().split(" ")[0]}`}
                onClick={() => navigate(path)}
                className="flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white border border-white/10 bg-white/4 hover:bg-white/8 backdrop-blur-sm rounded-xl px-5 py-2.5 transition-all"
              >
                <Icon className={`w-4 h-4 ${color}`} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/6 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-blue-500 flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.5)]">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Cleanex</span>
            <span className="text-slate-600 text-sm">· Cleaning Operations Platform</span>
          </div>
          <p className="text-slate-600 text-xs">&copy; {new Date().getFullYear()} Cleanex Inc. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
