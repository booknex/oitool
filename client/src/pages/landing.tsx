import { useState, useRef, useEffect, useCallback } from "react";
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
  TrendingUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignupPayload {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Package,
    title: "Inventory Kiosk",
    desc: "Staff self-checkout for cleaning supplies with real-time stock levels and automatic deduction.",
    grad: "from-blue-500/20 to-cyan-500/20",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15 border-blue-400/20",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    desc: "Send professional invoices and collect payments via Stripe — right from the dashboard.",
    grad: "from-violet-500/20 to-blue-500/20",
    iconColor: "text-violet-400",
    iconBg: "bg-violet-500/15 border-violet-400/20",
  },
  {
    icon: CalendarDays,
    title: "Property Calendar",
    desc: "Sync Airbnb iCal feeds to see checkouts, check-ins, and plan cleans automatically.",
    grad: "from-cyan-500/20 to-teal-500/20",
    iconColor: "text-cyan-400",
    iconBg: "bg-cyan-500/15 border-cyan-400/20",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Track supply costs, restock trends, and revenue over time with live charts.",
    grad: "from-indigo-500/20 to-violet-500/20",
    iconColor: "text-indigo-400",
    iconBg: "bg-indigo-500/15 border-indigo-400/20",
  },
  {
    icon: Users,
    title: "Affiliate Program",
    desc: "Grow through partners — affiliates get their own portal to manage and track referrals.",
    grad: "from-blue-500/20 to-indigo-500/20",
    iconColor: "text-blue-400",
    iconBg: "bg-blue-500/15 border-blue-400/20",
  },
  {
    icon: Zap,
    title: "Instant Setup",
    desc: "Get your team up and running in minutes — no IT team or complex configuration required.",
    grad: "from-sky-500/20 to-blue-500/20",
    iconColor: "text-sky-400",
    iconBg: "bg-sky-500/15 border-sky-400/20",
  },
];

// ─── Scroll-reveal hook ───────────────────────────────────────────────────────

function useReveal(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

// ─── 3-D tilt card ───────────────────────────────────────────────────────────

function TiltCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const card = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = card.current!.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);
    setTilt({ x: -dy * 6, y: dx * 6 });
  }, []);

  const onLeave = useCallback(() => setTilt({ x: 0, y: 0 }), []);

  return (
    <div
      ref={card}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        transform: `perspective(700px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
        transition: tilt.x === 0 && tilt.y === 0 ? "transform 0.5s ease" : "transform 0.08s linear",
        willChange: "transform",
      }}
    >
      {children}
    </div>
  );
}

// ─── Dot grid ─────────────────────────────────────────────────────────────────

function DotGrid() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: "radial-gradient(circle, rgba(148,163,184,0.12) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 60% at 50% 0%, black 0%, transparent 100%)",
      }}
    />
  );
}

// ─── App Mockup ───────────────────────────────────────────────────────────────

const BAR_HEIGHTS = [38, 52, 44, 68, 55, 82, 63, 90, 72, 84, 61, 95];

function AppMockup() {
  return (
    <div className="rounded-2xl border border-white/12 bg-[#0d1426]/80 backdrop-blur-xl overflow-hidden shadow-[0_24px_60px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.06)]">
      {/* Browser chrome */}
      <div className="flex items-center gap-2 px-4 py-3 bg-white/4 border-b border-white/8">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
        </div>
        <div className="flex-1 mx-2 h-5 rounded-md bg-white/6 border border-white/8 flex items-center justify-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400/60" />
          <span className="text-[9px] text-slate-500 font-mono">app.cleanexinc.com/dashboard</span>
        </div>
      </div>

      {/* Mini dashboard content */}
      <div className="p-4 space-y-3">
        {/* Tiny nav */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-md bg-blue-500 flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="text-[10px] font-bold text-white">Cleanex</span>
            <span className="text-[9px] text-slate-500">Operations</span>
          </div>
          <div className="w-5 h-5 rounded-full bg-blue-500/30 border border-blue-400/30" />
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "MRR", value: "$12.4K", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-400/15" },
            { label: "Properties", value: "24", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-400/15" },
            { label: "Supplies", value: "156", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-400/15" },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl border p-2.5 ${s.bg}`}>
              <div className={`text-sm font-bold leading-tight ${s.color}`}>{s.value}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Bar chart */}
        <div className="rounded-xl bg-white/4 border border-white/6 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[9px] text-slate-400 font-medium">Monthly Revenue</span>
            <TrendingUp className="w-2.5 h-2.5 text-blue-400" />
          </div>
          <div className="flex items-end gap-0.5 h-10">
            {BAR_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-sm"
                style={{
                  height: `${h}%`,
                  background: `rgba(59,130,246,${0.35 + (h / 100) * 0.45})`,
                }}
              />
            ))}
          </div>
        </div>

        {/* App tiles */}
        <div className="grid grid-cols-4 gap-1.5">
          {[
            { Icon: Package, label: "Kiosk", bg: "bg-blue-500/15 border-blue-400/15", ic: "text-blue-400" },
            { Icon: CalendarDays, label: "Calendar", bg: "bg-cyan-500/15 border-cyan-400/15", ic: "text-cyan-400" },
            { Icon: Receipt, label: "Invoice", bg: "bg-violet-500/15 border-violet-400/15", ic: "text-violet-400" },
            { Icon: BarChart3, label: "Analytics", bg: "bg-indigo-500/15 border-indigo-400/15", ic: "text-indigo-400" },
          ].map(({ Icon, label, bg, ic }) => (
            <div key={label} className={`rounded-xl border p-2 flex flex-col items-center gap-1 ${bg}`}>
              <Icon className={`w-3.5 h-3.5 ${ic}`} />
              <span className="text-[8px] text-slate-400 font-medium">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Glass card ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] ${className}`}>
      {children}
    </div>
  );
}

// ─── Signup form ─────────────────────────────────────────────────────────────

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
              className="bg-white/8 border-white/12 text-white placeholder:text-slate-500"
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
              className="bg-white/8 border-white/12 text-white placeholder:text-slate-500"
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
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500"
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
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500"
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
            className="bg-white/8 border-white/12 text-white placeholder:text-slate-500"
          />
        </div>
        <button
          type="submit"
          data-testid="button-landing-submit"
          disabled={!firstName || !lastName || !businessName || !email || submit.isPending}
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-2.5 transition-all shadow-[0_0_20px_rgba(59,130,246,0.35)] hover:shadow-[0_0_28px_rgba(59,130,246,0.55)]"
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

  const featuresReveal = useReveal();
  const whyReveal = useReveal();
  const portalReveal = useReveal();
  const mockupReveal = useReveal();

  return (
    <div className="min-h-screen bg-[#080d1a] text-white flex flex-col overflow-x-hidden">

      {/* ── Animated ambient orbs ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[700px] h-[700px] rounded-full bg-blue-600/20 blur-[120px] orb-1" />
        <div className="absolute top-[10%] right-[-15%] w-[600px] h-[600px] rounded-full bg-indigo-500/15 blur-[100px] orb-2" />
        <div className="absolute bottom-[5%] left-[20%] w-[500px] h-[500px] rounded-full bg-cyan-600/10 blur-[100px] orb-3" />
        <div className="absolute bottom-[-10%] right-[5%] w-[400px] h-[400px] rounded-full bg-blue-400/10 blur-[80px] orb-2" />
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
        {/* Dot grid behind hero */}
        <DotGrid />

        <div className="relative grid lg:grid-cols-[1fr_400px] gap-14 items-start">

          {/* Left column */}
          <div className="space-y-8">
            {/* Animated badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-400/25 bg-blue-500/10 px-4 py-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              <span className="text-xs font-semibold text-blue-300 tracking-wide uppercase">
                Cleaning Operations Platform · 2026
              </span>
            </div>

            {/* Shimmer headline */}
            <div>
              <h1 className="text-5xl sm:text-6xl font-extrabold leading-[1.08] tracking-tight mb-6">
                Run your cleaning{" "}
                <span
                  className="bg-gradient-to-r from-blue-400 via-cyan-300 via-blue-300 to-indigo-400 bg-clip-text text-transparent text-shimmer"
                >
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
              ].map((point, i) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-slate-300"
                  style={{ transitionDelay: `${i * 80}ms` }}
                >
                  <div className="w-5 h-5 rounded-full bg-blue-500/20 border border-blue-400/30 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-3 h-3 text-blue-400" />
                  </div>
                  {point}
                </li>
              ))}
            </ul>

            {/* App mockup with scroll reveal */}
            <div
              ref={mockupReveal.ref}
              className={`transition-all duration-700 delay-100 ${mockupReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
            >
              <TiltCard>
                <AppMockup />
              </TiltCard>
            </div>

            {/* Stat pills */}
            <div className="flex flex-wrap gap-3">
              {[
                { value: "Real-time", label: "Inventory" },
                { value: "Stripe", label: "Payments" },
                { value: "iCal", label: "Sync" },
                { value: "All-in-one", label: "Platform" },
              ].map((s) => (
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

          {/* Right — sticky signup */}
          <div className="lg:sticky lg:top-24">
            <SignupForm />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="relative py-20 border-t border-white/6">
        <div
          ref={featuresReveal.ref}
          className={`max-w-7xl mx-auto px-6 transition-all duration-700 ${featuresReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="text-center mb-12">
            <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Platform Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Everything your team needs
            </h2>
            <p className="text-slate-400 max-w-lg mx-auto">
              Purpose-built for cleaning service operations — from supply rooms to client billing.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <TiltCard
                key={f.title}
                className={`transition-all duration-700 ${featuresReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
                // stagger via inline style
              >
                <div
                  className="group relative h-full rounded-2xl border border-white/8 bg-white/4 backdrop-blur-md p-6 flex gap-4 overflow-hidden"
                  style={{ transitionDelay: featuresReveal.visible ? `${i * 60}ms` : "0ms" }}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.grad} opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl`} />
                  <div className={`relative shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${f.iconBg}`}>
                    <f.icon className={`w-5 h-5 ${f.iconColor}`} />
                  </div>
                  <div className="relative">
                    <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </TiltCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Cleanex ── */}
      <section className="relative py-20 border-t border-white/6">
        <div
          ref={whyReveal.ref}
          className={`max-w-7xl mx-auto px-6 transition-all duration-700 ${whyReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* Problems → Solutions */}
            <div>
              <p className="text-xs font-semibold tracking-widest text-blue-400 uppercase mb-3">Why Cleanex</p>
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

            {/* CTA glass card with pulsing button */}
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
                {/* Pulsing CTA button */}
                <button
                  data-testid="button-landing-cta"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                  className="cta-pulse-ring w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl py-3 transition-all shadow-[0_0_24px_rgba(59,130,246,0.4)] hover:shadow-[0_0_32px_rgba(59,130,246,0.6)]"
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
        <div
          ref={portalReveal.ref}
          className={`max-w-7xl mx-auto px-6 text-center transition-all duration-700 ${portalReveal.visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}
        >
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
