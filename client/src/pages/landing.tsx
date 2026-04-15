import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
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
  Star,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SignupPayload {
  firstName: string;
  lastName: string;
  businessName: string;
  email: string;
  phone: string;
}

// ─── Stat cards ───────────────────────────────────────────────────────────────

const STATS = [
  { value: "Real-time", label: "Inventory tracking", color: "bg-rose-600" },
  { value: "Stripe", label: "Built-in payments", color: "bg-violet-600" },
  { value: "iCal", label: "Calendar sync", color: "bg-blue-600" },
  { value: "All-in-one", label: "Operations platform", color: "bg-emerald-600" },
];

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: Package,
    title: "Inventory Kiosk",
    desc: "Staff self-checkout for cleaning supplies with real-time stock levels and automatic deduction.",
  },
  {
    icon: Receipt,
    title: "Invoicing & Payments",
    desc: "Send professional invoices and collect payments via Stripe — right from the dashboard.",
  },
  {
    icon: CalendarDays,
    title: "Property Calendar",
    desc: "Sync Airbnb iCal feeds to see checkouts, check-ins, and plan cleans automatically.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Track supply costs, restock trends, and revenue over time with live charts.",
  },
  {
    icon: Users,
    title: "Affiliate Program",
    desc: "Grow through partners — affiliates get their own portal to manage and track referrals.",
  },
  {
    icon: Star,
    title: "Reviews Gallery",
    desc: "Showcase Airbnb property reviews in a beautiful branded gallery your team can access.",
  },
];

// ─── Hero checkpoints ─────────────────────────────────────────────────────────

const CHECKPOINTS = [
  "Track cleaning supply inventory in real time — no more stockouts",
  "Invoice clients and accept Stripe payments with one click",
  "Sync Airbnb calendars to keep cleans perfectly timed",
  "Get up and running in minutes — no IT team required",
];

// ─── Signup form ─────────────────────────────────────────────────────────────

function SignupForm() {
  const { toast } = useToast();
  const [navigate] = useLocation();
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
      toast({ title: "You're on the list!", description: "We'll be in touch shortly to get you started." });
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
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8 flex flex-col items-center justify-center gap-4 min-h-[360px] text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">You're all set!</h3>
        <p className="text-gray-500 text-sm max-w-xs">
          Thanks for signing up. Our team will reach out within one business day to get your account configured.
        </p>
        <Button
          variant="outline"
          className="mt-2"
          onClick={() => setDone(false)}
        >
          Submit another
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-7">
      <h3 className="text-lg font-bold text-gray-900 mb-0.5">Get started free</h3>
      <p className="text-sm text-gray-500 mb-5">
        No credit card required &mdash; start your 14-day trial today.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="lp-first" className="text-xs font-medium text-gray-700">
              First Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lp-first"
              data-testid="input-landing-first"
              placeholder="Jane"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="lp-last" className="text-xs font-medium text-gray-700">
              Last Name <span className="text-rose-500">*</span>
            </Label>
            <Input
              id="lp-last"
              data-testid="input-landing-last"
              placeholder="Smith"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              required
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-biz" className="text-xs font-medium text-gray-700">
            Business Name <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="lp-biz"
            data-testid="input-landing-business"
            placeholder="Acme Cleaning Co."
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-email" className="text-xs font-medium text-gray-700">
            Work Email <span className="text-rose-500">*</span>
          </Label>
          <Input
            id="lp-email"
            data-testid="input-landing-email"
            type="email"
            placeholder="jane@acmecleaning.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="lp-phone" className="text-xs font-medium text-gray-700">
            Phone Number
          </Label>
          <Input
            id="lp-phone"
            data-testid="input-landing-phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
        <Button
          type="submit"
          data-testid="button-landing-submit"
          disabled={!firstName || !lastName || !businessName || !email || submit.isPending}
          className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5"
        >
          {submit.isPending ? "Submitting…" : <>Get Started <ArrowRight className="w-4 h-4 ml-1" /></>}
        </Button>
        <p className="text-center text-xs text-gray-400">
          No commitment. No credit card. Just a look.
        </p>
        <div className="flex items-center gap-2 justify-center pt-1">
          <div className="flex -space-x-1.5">
            {["bg-rose-400", "bg-violet-400", "bg-blue-400"].map((c, i) => (
              <div key={i} className={`w-6 h-6 rounded-full border-2 border-white ${c} flex items-center justify-center`}>
                <span className="text-white text-[8px] font-bold">{["J", "M", "R"][i]}</span>
              </div>
            ))}
          </div>
          <span className="text-xs text-gray-500">Our team responds within 1 business hour</span>
        </div>
      </form>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 flex flex-col">

      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
          {/* Logo */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2.5 group"
            data-testid="link-landing-logo"
          >
            <div className="w-8 h-8 rounded-xl bg-rose-600 flex items-center justify-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-lg font-bold text-gray-900 tracking-tight">Cleanex</span>
          </button>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">Already a customer?</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  data-testid="button-landing-signin"
                  className="text-sm gap-1.5"
                >
                  Sign In <ChevronDown className="w-3.5 h-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  data-testid="link-signin-admin"
                  onClick={() => navigate("/dashboard")}
                >
                  <Shield className="w-4 h-4 mr-2 text-rose-500" />
                  Admin Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="link-signin-affiliate"
                  onClick={() => navigate("/portal")}
                >
                  <Users className="w-4 h-4 mr-2 text-violet-500" />
                  Affiliate Portal
                </DropdownMenuItem>
                <DropdownMenuItem
                  data-testid="link-signin-kiosk"
                  onClick={() => navigate("/kiosk")}
                >
                  <Package className="w-4 h-4 mr-2 text-blue-500" />
                  Staff Kiosk
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="flex-1 max-w-7xl mx-auto w-full px-6 pt-16 pb-12">
        <div className="grid lg:grid-cols-[1fr_420px] gap-12 items-start">

          {/* Left column */}
          <div className="space-y-8">
            <div>
              <p className="text-xs font-semibold tracking-widest text-rose-600 uppercase mb-4">
                Cleaning Operations Software
              </p>
              <h1 className="text-4xl sm:text-5xl font-extrabold text-gray-900 leading-tight mb-5">
                Run your cleaning business{" "}
                <span className="text-rose-600">smarter and faster.</span>
              </h1>
              <p className="text-gray-600 text-lg leading-relaxed max-w-xl">
                Cleanex gives your team everything they need — inventory management, client invoicing, property calendars, and partner tools — in one sleek platform built for cleaning pros.
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3">
                Fill out the form and start your free trial — we'll take it from there.
              </p>
              <ul className="space-y-2.5">
                {CHECKPOINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <CheckCircle2 className="w-4 h-4 text-rose-500 mt-0.5 shrink-0" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className={`${s.color} rounded-xl p-4 text-white`}
                >
                  <div className="text-lg font-extrabold leading-tight">{s.value}</div>
                  <div className="text-xs mt-0.5 text-white/80">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Trust bar */}
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-3">
                Trusted by cleaning companies across the US
              </p>
              <div className="flex flex-wrap gap-x-8 gap-y-2 items-center">
                {["MaidPro", "Molly Maid", "Stanley Steemer", "Two Maids", "Zerorez", "Merry Maids"].map(name => (
                  <span key={name} className="text-sm font-semibold text-gray-300 tracking-tight">{name}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Right column — Signup form */}
          <div className="lg:sticky lg:top-24">
            <SignupForm />
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-white border-t border-gray-100 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
              Everything your team needs, nothing they don't
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Purpose-built for cleaning service operations — from supply rooms to client billing.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-gray-100 bg-slate-50/60 p-6 flex gap-4 hover-elevate"
              >
                <div className="w-10 h-10 rounded-lg bg-rose-50 flex items-center justify-center shrink-0">
                  <f.icon className="w-5 h-5 text-rose-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Why Cleanex ── */}
      <section className="py-16 max-w-7xl mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Why cleaning businesses switch to Cleanex
            </h2>
            <div className="space-y-5">
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">✕</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Spreadsheets that never sync</p>
                  <p className="text-sm text-gray-500">Manual tracking leads to stockouts and billing errors that cost you money.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">✕</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">Disconnected tools for every task</p>
                  <p className="text-sm text-gray-500">Juggling invoicing apps, calendar apps, and inventory sheets wastes hours every week.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-red-500 text-xs font-bold">✕</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">No visibility into costs or revenue</p>
                  <p className="text-sm text-gray-500">Without analytics, you're flying blind on which properties and services are profitable.</p>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-200 my-2" />

              {[
                "One platform for inventory, invoicing, and scheduling",
                "Staff self-service kiosk cuts supply waste by tracking every item",
                "Live dashboards show revenue, costs, and trends at a glance",
              ].map(text => (
                <div key={text} className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* CTA card */}
          <div className="bg-gradient-to-br from-rose-600 to-rose-700 rounded-2xl p-8 text-white shadow-xl">
            <div className="flex items-center gap-2 mb-5">
              <Zap className="w-5 h-5 text-rose-200" />
              <span className="text-sm font-semibold text-rose-100">Launch in minutes</span>
            </div>
            <h3 className="text-2xl font-bold mb-3">Ready to get started?</h3>
            <p className="text-rose-100 text-sm mb-6 leading-relaxed">
              Sign up for free today and have your team using the kiosk, sending invoices, and syncing calendars by end of day.
            </p>
            <ul className="space-y-2 text-sm text-rose-100 mb-7">
              {["Free 14-day trial", "No credit card required", "Setup in under 30 minutes"].map(item => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-rose-300" />
                  {item}
                </li>
              ))}
            </ul>
            <Button
              data-testid="button-landing-cta"
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full bg-white text-rose-600 font-semibold hover:bg-rose-50"
            >
              Start your free trial <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
            <p className="text-center text-xs text-rose-300 mt-3">Spots are limited — sign up today</p>
          </div>
        </div>
      </section>

      {/* ── Portal Links ── */}
      <section className="bg-slate-900 py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-slate-400 text-sm mb-6">Already have an account? Jump into your portal</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button
              variant="outline"
              data-testid="link-footer-admin"
              onClick={() => navigate("/dashboard")}
              className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white"
            >
              <Shield className="w-4 h-4 mr-2" />
              Admin Dashboard
            </Button>
            <Button
              variant="outline"
              data-testid="link-footer-affiliate"
              onClick={() => navigate("/portal")}
              className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white"
            >
              <Users className="w-4 h-4 mr-2" />
              Affiliate Portal
            </Button>
            <Button
              variant="outline"
              data-testid="link-footer-kiosk"
              onClick={() => navigate("/kiosk")}
              className="border-slate-700 text-slate-300 bg-transparent hover:bg-slate-800 hover:text-white"
            >
              <Package className="w-4 h-4 mr-2" />
              Staff Kiosk
            </Button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 border-t border-slate-800 py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center">
              <Sparkles className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-bold text-white">Cleanex</span>
            <span className="text-slate-500 text-sm">· Cleaning Operations Platform</span>
          </div>
          <p className="text-slate-500 text-xs">&copy; {new Date().getFullYear()} Cleanex Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
