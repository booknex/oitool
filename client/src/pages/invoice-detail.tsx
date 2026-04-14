import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, Pencil, Send, Share2, Printer, MoreHorizontal,
  Check, Clock, AlertCircle, Upload, X, Settings, Link, CreditCard, Copy, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { InvoiceWithDetails } from "@shared/schema";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:   { label: "Draft",   color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300",       icon: Clock },
  sent:    { label: "Sent",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",     icon: Send },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: Check },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",         icon: AlertCircle },
};

interface CompanySettings {
  id: number;
  companyName: string;
  address1: string;
  address2: string;
  country: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoData?: string | null;
  invoiceNotes?: string | null;
}

function fmt(n: number | string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(n));
}
function fmtDate(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
}

// ── Company Settings Modal ───────────────────────────────────────────────────
function CompanySettingsModal({
  settings,
  onClose,
}: {
  settings: CompanySettings;
  onClose: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState({
    companyName: settings.companyName,
    address1: settings.address1,
    address2: settings.address2,
    country: settings.country,
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    website: settings.website ?? "",
    invoiceNotes: settings.invoiceNotes ?? "",
    logoData: settings.logoData ?? "",
  });

  const saveMut = useMutation({
    mutationFn: (data: Partial<CompanySettings>) => apiRequest("PATCH", "/api/settings", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      onClose();
    },
  });

  function handleLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(f => ({ ...f, logoData: ev.target?.result as string }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg mx-4 overflow-hidden"
        onClick={e => e.stopPropagation()}
        data-testid="modal-company-settings"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">Company Settings</h2>
          <Button size="icon" variant="ghost" onClick={onClose} data-testid="button-close-settings">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Logo upload */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Company Logo</p>
            <div className="flex items-center gap-4">
              {form.logoData ? (
                <div className="relative w-20 h-20 rounded-full overflow-hidden border border-border flex-shrink-0">
                  <img src={form.logoData} alt="Logo" className="w-full h-full object-cover" />
                  <button
                    className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => setForm(f => ({ ...f, logoData: "" }))}
                    data-testid="button-remove-logo"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center flex-shrink-0 bg-muted/30">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
              <div>
                <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} data-testid="button-upload-logo">
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  {form.logoData ? "Change Logo" : "Upload Logo"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">PNG, JPG or SVG — shown on every invoice</p>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoFile} data-testid="input-logo-file" />
              </div>
            </div>
          </div>

          {/* Company info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Company Name</label>
              <Input value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} className="mt-1" data-testid="input-company-name" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address Line 1</label>
              <Input value={form.address1} onChange={e => setForm(f => ({ ...f, address1: e.target.value }))} className="mt-1" data-testid="input-address1" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Address Line 2</label>
              <Input value={form.address2} onChange={e => setForm(f => ({ ...f, address2: e.target.value }))} className="mt-1" data-testid="input-address2" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Country</label>
              <Input value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} className="mt-1" data-testid="input-country" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Phone</label>
              <Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="mt-1" data-testid="input-phone" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
              <Input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="mt-1" data-testid="input-email" />
            </div>
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Website</label>
              <Input value={form.website} onChange={e => setForm(f => ({ ...f, website: e.target.value }))} className="mt-1" data-testid="input-website" />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Default Invoice Notes</label>
              <Input value={form.invoiceNotes} onChange={e => setForm(f => ({ ...f, invoiceNotes: e.target.value }))} className="mt-1" placeholder="e.g. Thank you for your business!" data-testid="input-invoice-notes" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
          <Button variant="ghost" onClick={onClose} data-testid="button-cancel-settings">Cancel</Button>
          <Button onClick={() => saveMut.mutate(form)} disabled={saveMut.isPending} data-testid="button-save-settings">
            {saveMut.isPending ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Main Invoice Detail View ─────────────────────────────────────────────────
export function InvoiceDetailView({
  invoiceId,
  onBack,
  onEdit,
}: {
  invoiceId: number;
  onBack: () => void;
  onEdit: (inv: InvoiceWithDetails) => void;
}) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { data: allInvoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({ queryKey: ["/api/invoices"] });
  const { data: settings } = useQuery<CompanySettings>({ queryKey: ["/api/settings"] });

  const [statusMenu, setStatusMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const invoice = allInvoices.find(i => i.id === invoiceId);
  const clientInvoices = invoice
    ? allInvoices
        .filter(i => i.clientId === invoice.clientId)
        .sort((a, b) => new Date(b.issueDate!).getTime() - new Date(a.issueDate!).getTime())
    : [];

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InvoiceStatus }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
  });

  const paymentLinkMut = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("POST", `/api/invoices/${id}/payment-link`);
      return await res.json() as { url: string; sessionId: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      window.open(data.url, "_blank");
      navigator.clipboard.writeText(data.url).catch(() => {});
      toast({ title: "Payment link created", description: "Opened in new tab and copied to clipboard." });
    },
    onError: (err: any) => {
      const msg = err.message || "Failed to create payment link";
      toast({ title: "Payment link failed", description: msg, variant: "destructive" });
    },
  });

  if (isLoading) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Loading invoice…</div>;
  }
  if (!invoice) {
    return <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">Invoice not found.</div>;
  }

  const isPaid = invoice.status === "paid";
  const balance = isPaid ? 0 : invoice.total;
  const statusCfg = STATUS_CONFIG[invoice.status as InvoiceStatus] ?? STATUS_CONFIG.draft;

  const co = settings ?? {
    companyName: "CLEANEX EXPRESS INC.",
    address1: "6322 RIDGE RD",
    address2: "PORT RICHEY, Florida 34668",
    country: "U.S.A",
    logoData: null,
    invoiceNotes: null,
  };

  return (
    <>
      {showSettings && settings && (
        <CompanySettingsModal settings={settings} onClose={() => setShowSettings(false)} />
      )}

      <div className="flex h-full overflow-hidden" onClick={() => setStatusMenu(false)}>
        {/* ── Left: invoice list ── */}
        <div className="w-80 flex-shrink-0 border-r border-border flex flex-col overflow-hidden bg-background">
          <div className="flex items-center justify-between px-3 py-3 border-b border-border">
            <button
              className="flex items-center gap-1.5 text-sm font-semibold text-foreground hover:opacity-70 transition-opacity"
              onClick={onBack}
              data-testid="button-back-to-customer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              All Invoices
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-border">
            {clientInvoices.map(inv => {
              const active = inv.id === invoiceId;
              const cfg = STATUS_CONFIG[inv.status as InvoiceStatus] ?? STATUS_CONFIG.draft;
              return (
                <button
                  key={inv.id}
                  className={`w-full text-left px-3 py-2.5 hover-elevate transition-colors ${active ? "bg-blue-50 dark:bg-blue-950/30" : ""}`}
                  onClick={() => navigate(`/invoicing/invoices/${inv.id}`)}
                  data-testid={`list-invoice-${inv.id}`}
                >
                  <p className="text-[13px] font-medium text-foreground truncate">{inv.client?.name ?? "—"}</p>
                  <p className="text-[11px] text-muted-foreground">{inv.invoiceNumber} · {fmtDate(inv.issueDate?.toString())}</p>
                  <div className="flex items-center justify-between mt-1 gap-1">
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-sm ${cfg.color}`}>
                      {cfg.label.toUpperCase()}
                    </span>
                    <span className="text-[12px] font-semibold tabular-nums text-foreground">{fmt(inv.total)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Right: invoice document ── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-muted/30">
          {/* Action bar */}
          <div className="flex items-center gap-1 px-4 py-2.5 border-b border-border bg-background flex-shrink-0 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => onEdit(invoice)} data-testid="button-edit-invoice">
              <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
            </Button>
            <Button size="sm" variant="ghost" data-testid="button-send-invoice">
              <Send className="w-3.5 h-3.5 mr-1" /> Send
            </Button>
            <Button size="sm" variant="ghost" data-testid="button-share-invoice">
              <Share2 className="w-3.5 h-3.5 mr-1" /> Share
            </Button>
            <Button size="sm" variant="ghost" onClick={() => window.print()} data-testid="button-print-invoice">
              <Printer className="w-3.5 h-3.5 mr-1" /> PDF / Print
            </Button>
            {!isPaid && (
              <Button
                size="sm"
                variant="ghost"
                className="text-indigo-600 dark:text-indigo-400"
                onClick={() => paymentLinkMut.mutate(invoice.id)}
                disabled={paymentLinkMut.isPending}
                data-testid="button-payment-link"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" />
                {paymentLinkMut.isPending ? "Generating…" : "Payment Link"}
              </Button>
            )}
            {!isPaid && invoice.stripeCheckoutUrl && (
              <Button
                size="sm"
                variant="ghost"
                className="text-indigo-500 dark:text-indigo-400"
                onClick={() => {
                  navigator.clipboard.writeText(invoice.stripeCheckoutUrl!).catch(() => {});
                  window.open(invoice.stripeCheckoutUrl!, "_blank");
                }}
                title={invoice.stripeCheckoutUrl}
                data-testid="button-copy-payment-link"
              >
                <Copy className="w-3.5 h-3.5 mr-1" /> Copy Link
              </Button>
            )}
            <div className="relative">
              <Button size="icon" variant="ghost" onClick={e => { e.stopPropagation(); setStatusMenu(v => !v); }} data-testid="button-more-actions">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
              {statusMenu && (
                <div className="absolute left-0 top-9 z-50 w-44 bg-popover border rounded-md shadow-md p-1" data-testid="dropdown-status-menu">
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Change Status</p>
                  {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map(s => (
                    <button key={s} className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate"
                      onClick={e => { e.stopPropagation(); updateStatusMut.mutate({ id: invoice.id, status: s }); setStatusMenu(false); }}
                      data-testid={`option-status-${s}`}
                    >{STATUS_CONFIG[s].label}</button>
                  ))}
                </div>
              )}
            </div>
            <div className="ml-auto">
              <Button size="sm" variant="ghost" onClick={() => setShowSettings(true)} data-testid="button-company-settings">
                <Settings className="w-3.5 h-3.5 mr-1" /> Company Info
              </Button>
            </div>
          </div>

          {/* Scrollable document area */}
          <div className="flex-1 overflow-y-auto px-8 py-8 print:p-0">
            <div className="max-w-3xl mx-auto bg-white dark:bg-card rounded-md shadow-sm border border-border relative overflow-hidden print:shadow-none print:border-none print:rounded-none">

              {/* PAID ribbon stamp */}
              {isPaid && (
                <div className="absolute top-0 left-0 w-32 h-32 overflow-hidden pointer-events-none">
                  <div className="absolute -top-1 -left-8 w-36 bg-green-500 text-white text-[11px] font-black tracking-widest text-center py-1.5 rotate-[-45deg] origin-center translate-y-7 shadow-sm">
                    PAID
                  </div>
                </div>
              )}

              <div className="p-10">
                {/* Header row: logo + company info */}
                <div className="flex items-start justify-between mb-8 gap-6">
                  {/* Logo — click to open settings */}
                  <button
                    className="w-28 h-28 rounded-full overflow-hidden border-2 border-border flex items-center justify-center flex-shrink-0 group relative hover:opacity-90 transition-opacity"
                    onClick={() => setShowSettings(true)}
                    title="Click to upload your logo"
                    data-testid="button-logo-upload"
                  >
                    {co.logoData ? (
                      <img src={co.logoData} alt="Company Logo" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-amber-100 dark:bg-amber-900/30 flex flex-col items-center justify-center text-center">
                        <Upload className="w-5 h-5 text-amber-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-bold uppercase text-amber-700 dark:text-amber-300 leading-tight px-1">Upload Logo</span>
                      </div>
                    )}
                  </button>

                  {/* Company info */}
                  <div className="text-right text-[13px] leading-relaxed">
                    <p className="font-black text-[15px] text-foreground">{co.companyName}</p>
                    <p className="text-muted-foreground">{co.address1}</p>
                    <p className="text-muted-foreground">{co.address2}</p>
                    <p className="text-muted-foreground">{co.country}</p>
                    {co.phone && <p className="text-muted-foreground">{co.phone}</p>}
                    {co.email && <p className="text-muted-foreground">{co.email}</p>}
                  </div>
                </div>

                {/* INVOICE heading */}
                <div className="text-center mb-6">
                  <h2 className="text-[13px] font-bold uppercase tracking-[0.2em] text-foreground">Invoice</h2>
                </div>

                {/* Bill To + Invoice details */}
                <div className="flex items-start justify-between gap-6 mb-6">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Bill To</p>
                    <button
                      className="text-[13px] font-medium text-[#1677ff] hover:underline text-left"
                      onClick={() => navigate(`/invoicing/customers/${invoice.clientId}`)}
                      data-testid="link-bill-to-client"
                    >
                      {invoice.client?.name ?? "—"}
                    </button>
                    {invoice.client?.email && <p className="text-[12px] text-muted-foreground">{invoice.client.email}</p>}
                    {(invoice.client?.street1 || invoice.client?.address) && (
                      <p className="text-[12px] text-muted-foreground">{invoice.client?.street1 ?? invoice.client?.address}</p>
                    )}
                    {invoice.client?.city && (
                      <p className="text-[12px] text-muted-foreground">
                        {invoice.client.city}{invoice.client.state ? `, ${invoice.client.state}` : ""} {invoice.client.zipCode ?? ""}
                      </p>
                    )}
                  </div>
                  <div className="text-[13px] space-y-1 text-right min-w-[200px]">
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Invoice#</span>
                      <span className="font-semibold text-foreground">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Invoice Date</span>
                      <span className="text-foreground">{fmtDate(invoice.issueDate?.toString())}</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Terms</span>
                      <span className="text-foreground">Due on Receipt</span>
                    </div>
                    <div className="flex justify-between gap-8">
                      <span className="text-muted-foreground">Due Date</span>
                      <span className="text-foreground">{fmtDate(invoice.dueDate?.toString())}</span>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                {invoice.notes && (
                  <div className="mb-4">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">Subject</p>
                    <p className="text-[13px] text-foreground">{invoice.notes}</p>
                  </div>
                )}

                {/* Line items */}
                <table className="w-full text-[13px] mb-6 border-collapse">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-8">#</th>
                      <th className="text-left py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Item & Description</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-16">Qty</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-24">Rate</th>
                      <th className="text-right py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.items ?? []).length === 0 && (
                      <tr><td colSpan={5} className="py-6 text-center text-muted-foreground text-[12px]">No line items</td></tr>
                    )}
                    {(invoice.items ?? []).map((item, idx) => (
                      <tr key={item.id} className="border-b border-border/50">
                        <td className="py-2.5 text-muted-foreground align-top">{idx + 1}</td>
                        <td className="py-2.5 align-top">
                          <p className="font-medium text-foreground">{item.description}</p>
                        </td>
                        <td className="py-2.5 text-right text-foreground tabular-nums align-top">{Number(item.quantity).toFixed(2)}</td>
                        <td className="py-2.5 text-right text-foreground tabular-nums align-top">{Number(item.unitPrice).toFixed(2)}</td>
                        <td className="py-2.5 text-right text-foreground tabular-nums align-top font-medium">
                          {fmt(Number(item.quantity) * Number(item.unitPrice))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-6">
                  <div className="w-64 space-y-1.5 text-[13px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sub Total</span>
                      <span className="tabular-nums text-foreground">{Number(invoice.total).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between border-t border-border pt-1.5">
                      <span className="font-semibold text-foreground">Total</span>
                      <span className="font-semibold tabular-nums text-foreground">{fmt(invoice.total)}</span>
                    </div>
                    {isPaid && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Payment Made</span>
                        <span className="tabular-nums">(-) {Number(invoice.total).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-border pt-1.5 font-bold">
                      <span className="text-foreground">Balance Due</span>
                      <span className="tabular-nums text-foreground">{fmt(balance)}</span>
                    </div>
                  </div>
                </div>

                {/* Default invoice notes from company settings */}
                {co.invoiceNotes && (
                  <p className="text-[12px] text-muted-foreground italic mt-2">{co.invoiceNotes}</p>
                )}

                {/* Status badge + Stripe badge */}
                <div className="flex items-center gap-2 mt-6 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${statusCfg.color}`}>
                    <statusCfg.icon className="w-3 h-3" />
                    {statusCfg.label}
                  </span>
                  {isPaid && invoice.stripePaymentIntentId && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
                      <CreditCard className="w-3 h-3" />
                      Paid via Stripe
                    </span>
                  )}
                  {!isPaid && invoice.stripeCheckoutUrl && (
                    <a
                      href={invoice.stripeCheckoutUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 hover:opacity-80 transition-opacity"
                      data-testid="link-stripe-checkout"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Pay Online
                    </a>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-[12px] text-muted-foreground mt-4">
              PDF Template: <span className="font-medium">Compact</span>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
