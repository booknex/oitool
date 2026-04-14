import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CustomerDetailPane } from "./customer-detail";
import { InvoiceDetailView } from "./invoice-detail";
import {
  Plus, Trash2, Pencil, Receipt, Users, Check,
  ChevronDown, Send, Clock, AlertCircle, X, Home,
  Package, Tag, ChevronRight, MoreHorizontal, MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, InvoiceWithDetails, CatalogItem } from "@shared/schema";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD" });

const fmtDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; className: string; icon: React.ElementType }> = {
  draft:   { label: "Draft",   className: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",       icon: Clock },
  sent:    { label: "Sent",    className: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",     icon: Send },
  paid:    { label: "Paid",    className: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300", icon: Check },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",         icon: AlertCircle },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as InvoiceStatus] ?? STATUS_CONFIG.draft;
  const Icon = cfg.icon;
  return (
    <Badge className={`gap-1 text-xs font-medium ${cfg.className}`}>
      <Icon className="w-3 h-3" />{cfg.label}
    </Badge>
  );
}

// ─── Line-item editor row ──────────────────────────────────────────────────────

interface LineItem { description: string; quantity: number; unitPrice: number }

function LineItemRow({ item, onChange, onRemove, canRemove }: {
  item: LineItem;
  onChange: (updated: LineItem) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  return (
    <div className="grid grid-cols-[1fr_80px_90px_36px] gap-2 items-center">
      <Input
        value={item.description}
        onChange={e => onChange({ ...item, description: e.target.value })}
        placeholder="Description"
        data-testid="input-line-description"
      />
      <Input
        type="number"
        min="0.01"
        step="0.01"
        value={item.quantity}
        onChange={e => onChange({ ...item, quantity: parseFloat(e.target.value) || 0 })}
        placeholder="Qty"
        data-testid="input-line-qty"
      />
      <Input
        type="number"
        min="0"
        step="0.01"
        value={item.unitPrice}
        onChange={e => onChange({ ...item, unitPrice: parseFloat(e.target.value) || 0 })}
        placeholder="Unit $"
        data-testid="input-line-price"
      />
      <Button size="icon" variant="ghost" onClick={onRemove} disabled={!canRemove} data-testid="button-remove-line">
        <X className="w-4 h-4" />
      </Button>
    </div>
  );
}

// ─── Client Modal ─────────────────────────────────────────────────────────────

const SALUTATIONS = ["", "Mr.", "Ms.", "Mrs.", "Miss", "Dr.", "Prof."];
const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "MXN"];
const LANGUAGES = ["English", "Spanish", "French", "Portuguese", "German"];

function FormRow({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div>{children}</div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 pb-2 pt-1">
      {children}
    </p>
  );
}

function ClientModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: Client;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    customerType: initial?.customerType ?? "business",
    salutation: initial?.salutation ?? "",
    firstName: initial?.firstName ?? "",
    lastName: initial?.lastName ?? "",
    companyName: initial?.companyName ?? "",
    name: initial?.name ?? "",
    currency: initial?.currency ?? "USD",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    customerLanguage: initial?.customerLanguage ?? "English",
    attention: initial?.attention ?? "",
    country: initial?.country ?? "United States",
    street1: initial?.street1 ?? "",
    street2: initial?.street2 ?? "",
    city: initial?.city ?? "",
    state: initial?.state ?? "",
    zipCode: initial?.zipCode ?? "",
    fax: initial?.fax ?? "",
    notes: initial?.notes ?? "",
  });

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const mutation = useMutation({
    mutationFn: async () => {
      const res = isEdit
        ? await apiRequest("PATCH", `/api/clients/${initial!.id}`, form)
        : await apiRequest("POST", "/api/clients", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({ title: isEdit ? "Customer updated" : "Customer added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Could not save customer", variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {isEdit ? "Edit Customer" : "New Customer"}
          </DialogTitle>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Two-column layout */}
          <div className="grid grid-cols-2 gap-y-0 divide-x divide-gray-200 dark:divide-gray-700">

            {/* ── LEFT: Contact Info ── */}
            <div className="space-y-3 pr-8">
              <SectionTitle>Contact Info</SectionTitle>

              {/* Customer Type */}
              <FormRow label="Customer Type">
                <div className="flex items-center gap-5 h-9">
                  {["business", "individual"].map(type => (
                    <label key={type} className="flex items-center gap-1.5 cursor-pointer" onClick={() => set("customerType", type)} data-testid={`radio-${type}`}>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${form.customerType === type ? "border-blue-500" : "border-gray-300 dark:border-gray-600"}`}>
                        {form.customerType === type && <div className="w-2 h-2 rounded-full bg-blue-500" />}
                      </div>
                      <span className="text-sm capitalize">{type}</span>
                    </label>
                  ))}
                </div>
              </FormRow>

              {/* Primary Contact */}
              <FormRow label="Primary Contact">
                <div className="flex gap-1.5">
                  <Select value={form.salutation} onValueChange={v => set("salutation", v)}>
                    <SelectTrigger className="w-24" data-testid="select-salutation"><SelectValue placeholder="—" /></SelectTrigger>
                    <SelectContent>
                      {SALUTATIONS.map(s => <SelectItem key={s || "none"} value={s || "none"}>{s || "—"}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="First" className="flex-1" data-testid="input-first-name" />
                  <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Last" className="flex-1" data-testid="input-last-name" />
                </div>
              </FormRow>

              <FormRow label="Company Name">
                <Input value={form.companyName} onChange={e => set("companyName", e.target.value)} placeholder="Company name" data-testid="input-company-name" />
              </FormRow>

              <FormRow label="Display Name" required>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="How this appears on invoices" data-testid="input-client-name" />
              </FormRow>

              <FormRow label="Currency">
                <Select value={form.currency} onValueChange={v => set("currency", v)}>
                  <SelectTrigger data-testid="select-currency"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map(c => <SelectItem key={c} value={c}>{c === "USD" ? "USD – United States Dollar" : c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormRow>

              <FormRow label="Email Address">
                <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" data-testid="input-client-email" />
              </FormRow>

              <FormRow label="Phone">
                <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="Work phone" data-testid="input-client-phone" />
              </FormRow>

              <FormRow label="Language">
                <Select value={form.customerLanguage} onValueChange={v => set("customerLanguage", v)}>
                  <SelectTrigger data-testid="select-language"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </FormRow>

              {/* Remarks */}
              <div className="pt-1">
                <SectionTitle>Remarks</SectionTitle>
                <Textarea
                  value={form.notes}
                  onChange={e => set("notes", e.target.value)}
                  placeholder="Notes or remarks…"
                  rows={3}
                  data-testid="input-client-notes"
                />
              </div>
            </div>

            {/* ── RIGHT: Billing Address ── */}
            <div className="space-y-3 pl-8">
              <SectionTitle>Billing Address</SectionTitle>

              <FormRow label="Country / Region">
                <Input value={form.country} onChange={e => set("country", e.target.value)} placeholder="Country or region" data-testid="input-country" />
              </FormRow>

              <FormRow label="Street 1">
                <Input value={form.street1} onChange={e => set("street1", e.target.value)} placeholder="Street 1" data-testid="input-street1" />
              </FormRow>

              <FormRow label="Street 2">
                <Input value={form.street2} onChange={e => set("street2", e.target.value)} placeholder="Street 2" data-testid="input-street2" />
              </FormRow>

              <div className="grid grid-cols-2 gap-2">
                <FormRow label="City">
                  <Input value={form.city} onChange={e => set("city", e.target.value)} data-testid="input-city" />
                </FormRow>
                <FormRow label="State">
                  <Input value={form.state} onChange={e => set("state", e.target.value)} data-testid="input-state" />
                </FormRow>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <FormRow label="ZIP Code">
                  <Input value={form.zipCode} onChange={e => set("zipCode", e.target.value)} data-testid="input-zip" />
                </FormRow>
                <FormRow label="Fax">
                  <Input value={form.fax} onChange={e => set("fax", e.target.value)} data-testid="input-fax" />
                </FormRow>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending} data-testid="button-save-client">
            {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Save"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Invoice Modal ────────────────────────────────────────────────────────────

function InvoiceModal({ open, onClose, clients, initial }: {
  open: boolean; onClose: () => void; clients: Client[]; initial?: InvoiceWithDetails;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [clientId, setClientId] = useState<number | "">(initial?.clientId ?? "");
  const [dueDate, setDueDate] = useState(initial?.dueDate ? initial.dueDate.toString().split("T")[0] : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [lineItems, setLineItems] = useState<LineItem[]>(
    initial?.items.map(it => ({
      description: it.description,
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
    })) ?? [{ description: "", quantity: 1, unitPrice: 0 }]
  );
  const total = lineItems.reduce((s, it) => s + it.quantity * it.unitPrice, 0);
  const addLine = () => setLineItems(l => [...l, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeLine = (i: number) => setLineItems(l => l.filter((_, idx) => idx !== i));
  const updateLine = (i: number, val: LineItem) => setLineItems(l => l.map((it, idx) => idx === i ? val : it));
  const mutation = useMutation({
    mutationFn: async () => {
      const body = { clientId: clientId as number, dueDate: dueDate || undefined, notes, items: lineItems };
      const res = isEdit
        ? await apiRequest("PATCH", `/api/invoices/${initial!.id}`, body)
        : await apiRequest("POST", "/api/invoices", body);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/invoices"] });
      toast({ title: isEdit ? "Invoice updated" : "Invoice created" });
      onClose();
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message ?? "Could not save invoice", variant: "destructive" }),
  });
  const canSubmit = clientId !== "" && lineItems.length > 0 && lineItems.every(it => it.description.trim() && it.quantity > 0);
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{isEdit ? `Edit ${initial!.invoiceNumber}` : "New Invoice"}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Client *</Label>
              <Select value={clientId === "" ? "" : String(clientId)} onValueChange={v => setClientId(Number(v))}>
                <SelectTrigger data-testid="select-client"><SelectValue placeholder="Select client…" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} data-testid="input-due-date" />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Line Items</Label>
              <Button size="sm" variant="outline" onClick={addLine} data-testid="button-add-line">
                <Plus className="w-3.5 h-3.5 mr-1" />Add Line
              </Button>
            </div>
            <div className="grid grid-cols-[1fr_80px_90px_36px] gap-2 mb-1 px-0.5">
              <span className="text-xs text-muted-foreground">Description</span>
              <span className="text-xs text-muted-foreground">Qty</span>
              <span className="text-xs text-muted-foreground">Unit Price</span>
              <span />
            </div>
            <div className="space-y-2">
              {lineItems.map((item, i) => (
                <LineItemRow key={i} item={item} onChange={v => updateLine(i, v)} onRemove={() => removeLine(i)} canRemove={lineItems.length > 1} />
              ))}
            </div>
            <div className="flex justify-end mt-3 pt-3 border-t">
              <span className="text-sm font-semibold">Total: {fmt(total)}</span>
            </div>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Payment instructions, terms, etc." rows={2} data-testid="input-invoice-notes" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!canSubmit || mutation.isPending} data-testid="button-save-invoice">
              {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Invoice"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Catalog Item Modal ───────────────────────────────────────────────────────

function CatalogItemModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: CatalogItem;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    unitPrice: initial?.unitPrice ?? "0",
  });
  const mutation = useMutation({
    mutationFn: async () => {
      const res = isEdit
        ? await apiRequest("PATCH", `/api/catalog-items/${initial!.id}`, form)
        : await apiRequest("POST", "/api/catalog-items", form);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/catalog-items"] });
      toast({ title: isEdit ? "Item updated" : "Item added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Could not save item", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Item" : "New Item"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Deep Clean Service" data-testid="input-catalog-name" />
          </div>
          <div>
            <Label>Description</Label>
            <Input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Optional description" data-testid="input-catalog-description" />
          </div>
          <div>
            <Label>Default Price ($)</Label>
            <Input type="number" min="0" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} data-testid="input-catalog-price" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending} data-testid="button-save-catalog-item">
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ icon: Icon, title, subtitle }: { icon: React.ElementType; title: string; subtitle: string }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center text-muted-foreground">
        <Icon className="w-10 h-10 mx-auto mb-4 opacity-30" />
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm mt-1">{subtitle}</p>
      </div>
    </div>
  );
}

// ─── Invoice Dashboard Tab ────────────────────────────────────────────────────

function InvoiceDashboard({
  invoiceList,
  clientList,
  isLoading,
  onViewInvoice,
  onNewInvoice,
  onGoToInvoices,
}: {
  invoiceList: InvoiceWithDetails[];
  clientList: Client[];
  isLoading: boolean;
  onViewInvoice: (id: number) => void;
  onNewInvoice: () => void;
  onGoToInvoices: () => void;
}) {
  const totalInvoiced   = invoiceList.reduce((s, i) => s + i.total, 0);
  const totalPaid       = invoiceList.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const totalOverdue    = invoiceList.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalOutstanding = invoiceList.filter(i => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.total, 0);

  const countPaid       = invoiceList.filter(i => i.status === "paid").length;
  const countOverdue    = invoiceList.filter(i => i.status === "overdue").length;
  const countOutstanding = invoiceList.filter(i => i.status === "sent" || i.status === "draft").length;

  const paidPct        = totalInvoiced > 0 ? (totalPaid / totalInvoiced) * 100 : 0;
  const outPct         = totalInvoiced > 0 ? (totalOutstanding / totalInvoiced) * 100 : 0;
  const overduePct     = totalInvoiced > 0 ? (totalOverdue / totalInvoiced) * 100 : 0;

  const recentInvoices = [...invoiceList]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 8);

  const statCards = [
    { label: "Total Invoiced", value: totalInvoiced, count: invoiceList.length, color: "text-blue-600 dark:text-blue-400",   bg: "bg-blue-50 dark:bg-blue-900/20",    icon: Receipt },
    { label: "Paid",           value: totalPaid,       count: countPaid,          color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20",  icon: Check },
    { label: "Outstanding",    value: totalOutstanding, count: countOutstanding,   color: "text-orange-500",                    bg: "bg-orange-50 dark:bg-orange-900/20", icon: Clock },
    { label: "Overdue",        value: totalOverdue,     count: countOverdue,       color: "text-red-500",                       bg: "bg-red-50 dark:bg-red-900/20",      icon: AlertCircle },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invoice Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {clientList.length} client{clientList.length !== 1 ? "s" : ""} · {invoiceList.length} invoice{invoiceList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={onNewInvoice} disabled={clientList.length === 0} data-testid="button-dashboard-new-invoice">
          <Plus className="w-4 h-4 mr-1" /> New Invoice
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        {statCards.map(card => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4" data-testid={`dash-stat-${card.label.toLowerCase().replace(/\s+/g, "-")}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className={`w-7 h-7 rounded-md flex items-center justify-center ${card.bg}`}>
                  <Icon className={`w-3.5 h-3.5 ${card.color}`} />
                </span>
                <span className="text-xs text-muted-foreground">{card.label}</span>
              </div>
              {isLoading ? (
                <div className="h-6 w-24 rounded bg-muted animate-pulse" />
              ) : (
                <p className={`text-2xl font-bold tabular-nums ${card.color}`}>{fmt(card.value)}</p>
              )}
              {!isLoading && (
                <p className="text-xs text-muted-foreground mt-0.5">{card.count} invoice{card.count !== 1 ? "s" : ""}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Monthly Revenue Chart */}
      {!isLoading && (() => {
        const currentYear = new Date().getFullYear();
        const currentMonth = new Date().getMonth();
        const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const CHART_H = 96;

        // Build per-month buckets: paid, outstanding, overdue
        const monthly = MONTHS.map((_, idx) => {
          const inMonth = invoiceList.filter(inv => {
            const d = inv.issueDate ? new Date(inv.issueDate) : null;
            return d && d.getFullYear() === currentYear && d.getMonth() === idx;
          });
          return {
            paid:        inMonth.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0),
            outstanding: inMonth.filter(i => i.status === "sent" || i.status === "draft").reduce((s, i) => s + i.total, 0),
            overdue:     inMonth.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0),
            total:       inMonth.reduce((s, i) => s + i.total, 0),
          };
        });

        const maxVal = Math.max(...monthly.map(m => m.total), 1);
        const yearTotal = monthly.reduce((s, m) => s + m.total, 0);

        return (
          <div className="mb-5 rounded-xl border border-border bg-card p-5">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Monthly Revenue</p>
              <span className="text-xs text-muted-foreground">{currentYear} · {fmt(yearTotal)} total</span>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 mb-4">
              {[
                { label: "Paid",        dot: "bg-emerald-500" },
                { label: "Outstanding", dot: "bg-amber-400" },
                { label: "Overdue",     dot: "bg-rose-500" },
              ].map(({ label, dot }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${dot}`} />
                  <span className="text-[11px] text-muted-foreground">{label}</span>
                </div>
              ))}
            </div>

            {/* Chart */}
            <div className="relative" style={{ height: `${CHART_H}px` }}>
              {/* Gridlines */}
              {[0.25, 0.5, 0.75, 1].map(g => (
                <div key={g} className="absolute left-0 right-0 border-t border-dashed border-border"
                  style={{ bottom: `${g * CHART_H}px` }} />
              ))}
              <div className="absolute left-0 right-0 bottom-0 border-t border-border" />

              {/* Stacked bars */}
              <div className="absolute inset-0 flex items-end gap-1">
                {monthly.map((m, idx) => {
                  const totalH = Math.max((m.total / maxVal) * CHART_H, m.total > 0 ? 4 : 0);
                  const paidH        = totalH > 0 ? (m.paid        / m.total) * totalH : 0;
                  const outstandingH = totalH > 0 ? (m.outstanding / m.total) * totalH : 0;
                  const overdueH     = totalH > 0 ? (m.overdue     / m.total) * totalH : 0;
                  const isCurrent = idx === currentMonth;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col justify-end items-center group relative"
                      style={{ height: `${CHART_H}px` }}
                    >
                      {/* Tooltip on hover */}
                      {m.total > 0 && (
                        <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 z-20 invisible group-hover:visible bg-popover border border-border rounded-md shadow-md px-2.5 py-1.5 text-[11px] whitespace-nowrap pointer-events-none">
                          <p className="font-semibold text-foreground mb-1">{MONTHS[idx]} {currentYear}</p>
                          {m.paid > 0        && <p className="text-emerald-600 dark:text-emerald-400">Paid: {fmt(m.paid)}</p>}
                          {m.outstanding > 0 && <p className="text-amber-500">Outstanding: {fmt(m.outstanding)}</p>}
                          {m.overdue > 0     && <p className="text-rose-500">Overdue: {fmt(m.overdue)}</p>}
                          <p className="text-muted-foreground mt-0.5 border-t border-border pt-0.5">Total: {fmt(m.total)}</p>
                        </div>
                      )}
                      {/* Stacked bar segments */}
                      <div
                        className={`w-full flex flex-col justify-end overflow-hidden transition-all duration-500 ${isCurrent ? "opacity-100" : "opacity-80"}`}
                        style={{ height: `${totalH}px`, borderRadius: "3px 3px 0 0" }}
                      >
                        {overdueH     > 0 && <div className="bg-rose-500   w-full flex-shrink-0" style={{ height: `${overdueH}px` }} />}
                        {outstandingH > 0 && <div className="bg-amber-400  w-full flex-shrink-0" style={{ height: `${outstandingH}px` }} />}
                        {paidH        > 0 && <div className="bg-emerald-500 w-full flex-shrink-0" style={{ height: `${paidH}px` }} />}
                      </div>
                      {/* Empty bar ghost */}
                      {m.total === 0 && (
                        <div className="w-full rounded-t-sm bg-muted/40" style={{ height: "3px" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* X-axis month labels */}
            <div className="flex gap-1 mt-2">
              {MONTHS.map((m, idx) => (
                <div key={m} className="flex-1 text-center">
                  <span className={`text-[9px] font-medium ${idx === currentMonth ? "text-blue-500" : "text-muted-foreground"}`}>
                    {m}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      {/* Recent invoices */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Recent Invoices</p>
          <button
            onClick={onGoToInvoices}
            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
            data-testid="button-dash-view-all"
          >
            View All <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {isLoading && (
          <div className="divide-y divide-border">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="px-4 py-3 flex items-center gap-3">
                <div className="h-4 flex-1 rounded bg-muted animate-pulse" />
                <div className="h-4 w-16 rounded bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        )}

        {!isLoading && recentInvoices.length === 0 && (
          <div className="px-4 py-8 text-center">
            <Receipt className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
            {clientList.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">Add a customer first to get started.</p>
            )}
          </div>
        )}

        {!isLoading && recentInvoices.length > 0 && (
          <div className="divide-y divide-border">
            {recentInvoices.map(inv => {
              const cfg = STATUS_CONFIG[inv.status as InvoiceStatus] ?? STATUS_CONFIG.draft;
              const Icon = cfg.icon;
              return (
                <button
                  key={inv.id}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover-elevate transition-colors"
                  onClick={() => onViewInvoice(inv.id)}
                  data-testid={`dash-invoice-row-${inv.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground truncate">{inv.client?.name ?? "Unknown"}</span>
                      <Badge className={`gap-1 text-[10px] font-medium flex-shrink-0 ${cfg.className}`}>
                        <Icon className="w-2.5 h-2.5" />{cfg.label}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {inv.invoiceNumber} · Due {inv.dueDate ? fmtDate(inv.dueDate.toString()) : "—"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums flex-shrink-0">{fmt(inv.total)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 flex-shrink-0" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "dashboard" | "invoices" | "customers" | "items";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Home",      icon: Home,    iconBg: "bg-gray-500",   iconColor: "text-white" },
  { id: "customers", label: "Customers", icon: Users,   iconBg: "bg-blue-500",   iconColor: "text-white" },
  { id: "items",     label: "Items",     icon: Package, iconBg: "bg-orange-500", iconColor: "text-white" },
  { id: "invoices",  label: "Invoices",  icon: Receipt, iconBg: "bg-violet-500", iconColor: "text-white" },
];

export default function Invoicing() {
  const [location, navigate] = useLocation();
  const customerMatch = location.match(/^\/invoicing\/customers\/(\d+)$/);
  const matchCustomer = !!customerMatch;
  const customerParams = customerMatch ? { id: customerMatch[1] } : null;

  const invoiceMatch = location.match(/^\/invoicing\/invoices\/(\d+)$/);
  const matchInvoiceDetail = !!invoiceMatch;
  const invoiceDetailId = invoiceMatch ? Number(invoiceMatch[1]) : null;
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [showCatalogModal, setShowCatalogModal] = useState(false);
  const [editInvoice, setEditInvoice] = useState<InvoiceWithDetails | undefined>();
  const [editClient, setEditClient] = useState<Client | undefined>();
  const [editCatalogItem, setEditCatalogItem] = useState<CatalogItem | undefined>();
  const [deleteConfirm, setDeleteConfirm] = useState<{ type: "invoice" | "client" | "catalog"; id: number } | null>(null);
  const [statusDropdown, setStatusDropdown] = useState<number | null>(null);
  const [clientMenu, setClientMenu] = useState<number | null>(null);
  const [invoiceMenu, setInvoiceMenu] = useState<number | null>(null);

  const { data: invoiceList = [], isLoading: invLoading } = useQuery<InvoiceWithDetails[]>({ queryKey: ["/api/invoices"] });
  const { data: clientList = [], isLoading: clientLoading } = useQuery<Client[]>({ queryKey: ["/api/clients"] });
  const { data: catalogList = [], isLoading: catalogLoading } = useQuery<CatalogItem[]>({ queryKey: ["/api/catalog-items"] });

  const deleteInvoiceMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/invoices/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }); setDeleteConfirm(null); toast({ title: "Invoice deleted" }); },
  });
  const deleteClientMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/clients/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/clients"] }); setDeleteConfirm(null); toast({ title: "Client deleted" }); },
    onError: () => toast({ title: "Cannot delete", description: "Client has existing invoices", variant: "destructive" }),
  });
  const deleteCatalogMut = useMutation({
    mutationFn: async (id: number) => { await apiRequest("DELETE", `/api/catalog-items/${id}`); },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/catalog-items"] }); setDeleteConfirm(null); toast({ title: "Item deleted" }); },
  });
  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }); setStatusDropdown(null); },
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday   = new Date(startOfToday.getTime() + 86400000 - 1);
  const in30Days     = new Date(startOfToday.getTime() + 30 * 86400000);

  const unpaidInvoices    = invoiceList.filter(i => i.status === "sent" || i.status === "overdue");
  const totalOutstanding  = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const totalPaid         = invoiceList.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const overdueCount      = invoiceList.filter(i => i.status === "overdue").length;
  const dueToday          = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) >= startOfToday && new Date(i.dueDate) <= endOfToday).reduce((s, i) => s + i.total, 0);
  const dueWithin30       = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) > endOfToday && new Date(i.dueDate) <= in30Days).reduce((s, i) => s + i.total, 0);
  const overdueTotal      = invoiceList.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const paidWithDates     = invoiceList.filter(i => i.status === "paid" && i.paidAt && i.issueDate);
  const avgDaysPaid       = paidWithDates.length > 0
    ? Math.round(paidWithDates.reduce((s, i) => s + (new Date(i.paidAt!).getTime() - new Date(i.issueDate!).getTime()) / 86400000, 0) / paidWithDates.length)
    : null;

  function handleNavClick(id: Tab) {
    setTab(id);
    setStatusDropdown(null);
  }

  function handleNewButton() {
    if (tab === "invoices" || tab === "dashboard") { setEditInvoice(undefined); setShowInvoiceModal(true); }
    else if (tab === "customers") { setEditClient(undefined); setShowClientModal(true); }
    else if (tab === "items") { setEditCatalogItem(undefined); setShowCatalogModal(true); }
  }

  const newButtonLabel =
    tab === "customers" ? "New Customer" :
    tab === "items" ? "New Item" : "New Invoice";

  return (
    <div className="flex h-screen bg-background overflow-hidden">

      {/* ── Left Sidebar (iOS style) ─────────────────────────────── */}
      <aside
        className="w-96 flex-shrink-0 flex flex-col bg-[#E1F0FA] dark:bg-[#0D1F2D] border-r border-black/[0.08] dark:border-white/[0.08]"
        data-testid="invoicing-sidebar"
      >
        <div className="px-5 pt-6 pb-3">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] dark:text-[#636366] select-none">
            Invoicing
          </p>
        </div>

        <nav className="px-4 flex-1">
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#2C2C2E] shadow-sm">
            {NAV_ITEMS.map(({ id, label, icon: Icon, iconBg, iconColor }, idx) => {
              const isActive = tab === id;
              const isLast = idx === NAV_ITEMS.length - 1;
              return (
                <div key={id}>
                  <button
                    onClick={() => handleNavClick(id)}
                    className={`w-full flex items-center gap-3 px-3 py-[11px] transition-colors text-left active:bg-black/5 dark:active:bg-white/5 ${
                      isActive ? "bg-[#007AFF]/[0.08] dark:bg-[#0A84FF]/[0.12]" : ""
                    }`}
                    data-testid={`nav-${id}`}
                  >
                    <span className={`w-[30px] h-[30px] rounded-[8px] flex items-center justify-center flex-shrink-0 ${iconBg}`}>
                      <Icon className={`w-[15px] h-[15px] ${iconColor}`} />
                    </span>
                    <span className={`flex-1 text-[15px] ${
                      isActive ? "text-[#007AFF] dark:text-[#0A84FF] font-medium" : "font-normal text-[#1C1C1E] dark:text-[#F2F2F7]"
                    }`}>
                      {label}
                    </span>
                    <ChevronRight className={`w-[14px] h-[14px] ${
                      isActive ? "text-[#007AFF] dark:text-[#0A84FF]" : "text-[#C7C7CC] dark:text-[#48484A]"
                    }`} />
                  </button>
                  {!isLast && <div className="ml-[54px] h-px bg-black/[0.06] dark:bg-white/[0.06]" />}
                </div>
              );
            })}
          </div>
        </nav>

        <div className="px-4 pb-6 pt-4">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#8E8E93] dark:text-[#636366] mb-2 px-1 select-none">
            Summary
          </p>
          <div className="rounded-2xl overflow-hidden bg-white dark:bg-[#2C2C2E] shadow-sm">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7]">Outstanding</span>
              <span className="text-[14px] font-semibold text-[#007AFF] dark:text-[#0A84FF]">{fmt(totalOutstanding)}</span>
            </div>
            <div className="ml-4 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7]">Collected</span>
              <span className="text-[14px] font-semibold text-[#34C759] dark:text-[#32D74B]">{fmt(totalPaid)}</span>
            </div>
            {overdueCount > 0 && (
              <>
                <div className="ml-4 h-px bg-black/[0.06] dark:bg-white/[0.06]" />
                <div className="px-4 py-3 flex items-center justify-between">
                  <span className="text-[14px] text-[#1C1C1E] dark:text-[#F2F2F7]">Overdue</span>
                  <span className="text-[14px] font-semibold text-[#FF3B30] dark:text-[#FF453A]">{overdueCount}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Invoice detail view */}
        {matchInvoiceDetail && invoiceDetailId ? (
          <InvoiceDetailView
            invoiceId={invoiceDetailId}
            onBack={() => window.history.back()}
            onEdit={inv => { setEditInvoice(inv); setShowInvoiceModal(true); }}
          />
        ) : matchCustomer && customerParams ? (
          <CustomerDetailPane
            clientId={Number(customerParams.id)}
            onBack={() => { navigate("/invoicing"); setTab("customers"); }}
            onEdit={inv => { setEditInvoice(inv); setShowInvoiceModal(true); }}
          />
        ) : tab === "dashboard" ? (
          <InvoiceDashboard
            invoiceList={invoiceList}
            clientList={clientList}
            isLoading={invLoading}
            onViewInvoice={id => navigate(`/invoicing/invoices/${id}`)}
            onNewInvoice={() => { setEditInvoice(undefined); setShowInvoiceModal(true); }}
            onGoToInvoices={() => setTab("invoices")}
          />
        ) : (
        <><header className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background flex-shrink-0 flex-wrap">
          <div>
            {tab === "invoices" ? (
              <button className="flex items-center gap-1 text-base font-semibold text-foreground hover:opacity-70 transition-opacity" data-testid="button-all-invoices-title">
                All Invoices <ChevronDown className="w-4 h-4 mt-0.5" />
              </button>
            ) : (
              <h1 className="text-base font-semibold text-foreground capitalize">
                {tab === "customers" ? "Customers" : "Items"}
              </h1>
            )}
            <p className="text-xs text-muted-foreground">
              {tab === "invoices" && `${invoiceList.length} invoice${invoiceList.length !== 1 ? "s" : ""}`}
              {tab === "customers" && `${clientList.length} client${clientList.length !== 1 ? "s" : ""}`}
              {tab === "items" && `${catalogList.length} item${catalogList.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center">
            <Button
              size="sm"
              onClick={handleNewButton}
              disabled={tab === "invoices" && clientList.length === 0}
              className={tab === "invoices" ? "rounded-r-none" : ""}
              data-testid="button-new"
            >
              <Plus className="w-4 h-4 mr-1" />{newButtonLabel}
            </Button>
            {tab === "invoices" && (
              <Button size="sm" className="rounded-l-none border-l border-primary-foreground/30 px-2" data-testid="button-new-dropdown">
                <ChevronDown className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6 flex flex-col">

          {/* Invoices */}
          {tab === "invoices" && (
            <div className="w-[calc(100%+3rem)] -mx-6 -mt-6 flex flex-col flex-1">

              {/* Payment Summary */}
              <div className="px-5 py-3 border-b border-border bg-background flex-shrink-0">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-2">Payment Summary</p>
                <div className="flex items-start gap-6 flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                      {(clientList[0]?.name?.[0] ?? "C").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">Total Outstanding Receivables</p>
                      <p className="text-[14px] font-bold text-foreground tabular-nums">{fmt(totalOutstanding)}</p>
                    </div>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Due Today</p>
                    <p className={`text-[14px] font-bold tabular-nums ${dueToday > 0 ? "text-orange-500" : "text-foreground"}`}>{fmt(dueToday)}</p>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Due Within 30 Days</p>
                    <p className="text-[14px] font-bold text-foreground tabular-nums">{fmt(dueWithin30)}</p>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Overdue Invoice</p>
                    <p className={`text-[14px] font-bold tabular-nums ${overdueTotal > 0 ? "text-red-500" : "text-foreground"}`}>{fmt(overdueTotal)}</p>
                  </div>
                  <div className="w-px self-stretch bg-border" />
                  <div>
                    <p className="text-[10px] text-muted-foreground">Avg. Days for Getting Paid</p>
                    <p className="text-[14px] font-bold text-foreground">
                      {avgDaysPaid !== null ? `${avgDaysPaid} Days` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Loading / Empty */}
              {invLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading invoices…</p>
                </div>
              )}
              {!invLoading && invoiceList.length === 0 && (
                <div className="flex-1 flex items-center justify-center">
                  <EmptyState
                    icon={Receipt}
                    title="No invoices yet"
                    subtitle={clientList.length === 0
                      ? "Add a customer first, then create your first invoice."
                      : "Click \"New Invoice\" to bill your first client."}
                  />
                </div>
              )}

              {/* Full-width table */}
              {!invLoading && invoiceList.length > 0 && (
                <div className="flex-1 overflow-y-auto">
                  {/* Table header */}
                  <div className="grid grid-cols-[32px_110px_150px_130px_1fr_100px_110px_110px_110px_44px] items-center border-b border-border px-4 py-2 gap-3 bg-muted/30 sticky top-0 z-10">
                    <input type="checkbox" className="rounded border-border accent-blue-500" />
                    <button className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground hover:text-foreground text-left">
                      Date <ChevronDown className="w-3 h-3" />
                    </button>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice #</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Order Number</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer Name</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance Due</span>
                    <div />
                  </div>

                  {/* Rows */}
                  {invoiceList.map(inv => {
                    const balance = (inv.status === "sent" || inv.status === "overdue") ? inv.total : 0;
                    const statusColor =
                      inv.status === "paid"    ? "text-green-600 dark:text-green-400" :
                      inv.status === "overdue" ? "text-red-500" :
                      inv.status === "sent"    ? "text-blue-500" :
                                                 "text-muted-foreground";
                    return (
                      <div
                        key={inv.id}
                        className="group grid grid-cols-[32px_110px_150px_130px_1fr_100px_110px_110px_110px_44px] items-center border-b border-border px-4 py-2.5 gap-3 hover-elevate"
                        data-testid={`row-invoice-${inv.id}`}
                      >
                        <input type="checkbox" className="rounded border-border accent-blue-500" />
                        <span className="text-sm text-foreground">{fmtDate(inv.issueDate?.toString())}</span>
                        <button
                          className="text-sm text-[#1677ff] font-medium hover:underline text-left flex items-center gap-1"
                          onClick={() => navigate(`/invoicing/invoices/${inv.id}`)}
                          data-testid={`text-invoice-number-${inv.id}`}
                        >
                          {inv.invoiceNumber}
                        </button>
                        <span className="text-sm text-muted-foreground">—</span>
                        <span className="text-sm text-foreground truncate" data-testid={`text-invoice-client-${inv.id}`}>{inv.client?.name ?? "—"}</span>
                        <span className={`text-sm font-semibold ${statusColor}`}>{STATUS_CONFIG[inv.status as InvoiceStatus]?.label ?? inv.status}</span>
                        <span className="text-sm text-foreground">{fmtDate(inv.dueDate?.toString())}</span>
                        <span className="text-sm text-foreground text-right tabular-nums" data-testid={`text-invoice-total-${inv.id}`}>{fmt(inv.total)}</span>
                        <span className="text-sm text-foreground text-right tabular-nums">{fmt(balance)}</span>

                        {/* ⋮ menu */}
                        <div className="relative flex items-center justify-end">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={e => { e.stopPropagation(); setInvoiceMenu(invoiceMenu === inv.id ? null : inv.id); }}
                            data-testid={`button-menu-invoice-${inv.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          {invoiceMenu === inv.id && (
                            <div className="absolute right-0 top-9 z-50 w-44 bg-popover border rounded-md shadow-md p-1" data-testid={`dropdown-invoice-${inv.id}`}>
                              <button className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2"
                                onClick={() => { setEditInvoice(inv); setShowInvoiceModal(true); setInvoiceMenu(null); }}
                                data-testid={`option-edit-invoice-${inv.id}`}
                              ><Pencil className="w-3.5 h-3.5" /> Edit</button>
                              <div className="my-1 h-px bg-border" />
                              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Change Status</p>
                              {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map(s => (
                                <button key={s}
                                  className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate"
                                  onClick={() => { updateStatusMut.mutate({ id: inv.id, status: s }); setInvoiceMenu(null); }}
                                  data-testid={`option-status-${s}`}
                                >{STATUS_CONFIG[s].label}</button>
                              ))}
                              <div className="my-1 h-px bg-border" />
                              <button className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2 text-red-500"
                                onClick={() => { setDeleteConfirm({ type: "invoice", id: inv.id }); setInvoiceMenu(null); }}
                                data-testid={`option-delete-invoice-${inv.id}`}
                              ><Trash2 className="w-3.5 h-3.5" /> Delete</button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Customers */}
          {tab === "customers" && (
            <>
              {clientLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading customers…</p>
                </div>
              )}
              {!clientLoading && clientList.length === 0 && (
                <EmptyState icon={Users} title="No customers yet" subtitle="Add your first customer to start billing." />
              )}
              {!clientLoading && clientList.length > 0 && (
                <div className="w-[calc(100%+3rem)] -mx-6 -mt-6">
                  {/* Table header */}
                  <div className="grid grid-cols-[32px_1fr_1fr_1fr_1fr_120px_120px_80px] items-center border-b border-border px-3 py-2 gap-3">
                    <div />
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Company Name</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Email</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Work Phone</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Receivables</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Credits</span>
                    <div />
                  </div>
                  {/* Table rows */}
                  {clientList.map(client => {
                    const unpaid = invoiceList
                      .filter(i => i.clientId === client.id && (i.status === "sent" || i.status === "overdue"))
                      .reduce((s, i) => s + i.total, 0);
                    return (
                      <div
                        key={client.id}
                        className="group grid grid-cols-[32px_1fr_1fr_1fr_1fr_120px_120px_80px] items-center border-b border-border px-3 py-2.5 gap-3 hover-elevate"
                        data-testid={`row-client-${client.id}`}
                      >
                        <input type="checkbox" className="rounded border-border accent-blue-500" data-testid={`check-client-${client.id}`} />
                        <button
                          className="text-sm text-[#1677ff] hover:underline text-left truncate font-medium"
                          onClick={() => navigate(`/invoicing/customers/${client.id}`)}
                          data-testid={`text-client-name-${client.id}`}
                        >
                          {client.name}
                        </button>
                        <span className="text-sm text-foreground truncate">{client.companyName ?? "—"}</span>
                        <span className="text-sm text-foreground truncate">{client.email ?? "—"}</span>
                        <span className="text-sm text-foreground truncate">{client.phone ?? "—"}</span>
                        <span className="text-sm text-foreground text-right tabular-nums">{fmt(unpaid)}</span>
                        <span className="text-sm text-foreground text-right tabular-nums">$0.00</span>
                        <div className="relative flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={e => { e.stopPropagation(); setClientMenu(clientMenu === client.id ? null : client.id); }}
                            data-testid={`button-menu-client-${client.id}`}
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          {clientMenu === client.id && (
                            <div className="absolute right-0 top-9 z-50 w-36 bg-popover border rounded-md shadow-md p-1" data-testid={`dropdown-client-${client.id}`}>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2"
                                onClick={() => { setEditClient(client); setShowClientModal(true); setClientMenu(null); }}
                                data-testid={`option-edit-client-${client.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5" /> Edit
                              </button>
                              <button
                                className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2 text-red-500"
                                onClick={() => { setDeleteConfirm({ type: "client", id: client.id }); setClientMenu(null); }}
                                data-testid={`option-delete-client-${client.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Items */}
          {tab === "items" && (
            <>
              {catalogLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading items…</p>
                </div>
              )}
              {!catalogLoading && catalogList.length === 0 && (
                <EmptyState icon={Package} title="No items yet" subtitle="Add services or products to reuse them on invoices." />
              )}
              {!catalogLoading && catalogList.length > 0 && (
                <div className="max-w-2xl w-full mx-auto">
                  <Card>
                    <CardContent className="pt-0 divide-y">
                      {catalogList.map(item => (
                        <div key={item.id} className="py-3 flex items-center gap-3" data-testid={`row-catalog-${item.id}`}>
                          <div className="w-8 h-8 rounded-md bg-orange-50 dark:bg-orange-950/40 flex items-center justify-center flex-shrink-0">
                            <Tag className="w-4 h-4 text-orange-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm" data-testid={`text-catalog-name-${item.id}`}>{item.name}</p>
                            {item.description && <p className="text-xs text-muted-foreground truncate">{item.description}</p>}
                          </div>
                          <p className="font-semibold text-sm shrink-0" data-testid={`text-catalog-price-${item.id}`}>{fmt(Number(item.unitPrice))}</p>
                          <Button size="icon" variant="ghost" onClick={() => { setEditCatalogItem(item); setShowCatalogModal(true); }} data-testid={`button-edit-catalog-${item.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm({ type: "catalog", id: item.id })} data-testid={`button-delete-catalog-${item.id}`}>
                            <Trash2 className="w-4 h-4 text-red-400" />
                          </Button>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}

        </main>
          </>
        )}
      </div>

      {/* Modals */}
      {showInvoiceModal && (
        <InvoiceModal
          open={showInvoiceModal}
          onClose={() => { setShowInvoiceModal(false); setEditInvoice(undefined); }}
          clients={clientList}
          initial={editInvoice}
        />
      )}
      {showClientModal && (
        <ClientModal
          open={showClientModal}
          onClose={() => { setShowClientModal(false); setEditClient(undefined); }}
          initial={editClient}
        />
      )}
      {showCatalogModal && (
        <CatalogItemModal
          open={showCatalogModal}
          onClose={() => { setShowCatalogModal(false); setEditCatalogItem(undefined); }}
          initial={editCatalogItem}
        />
      )}
      {deleteConfirm && (
        <Dialog open onOpenChange={() => setDeleteConfirm(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader><DialogTitle>Confirm Delete</DialogTitle></DialogHeader>
            <p className="text-sm text-muted-foreground">
              {deleteConfirm.type === "invoice"
                ? "This invoice will be permanently deleted."
                : deleteConfirm.type === "client"
                ? "This customer will be deleted."
                : "This item will be permanently deleted."}
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
              <Button
                variant="destructive"
                onClick={() => {
                  if (deleteConfirm.type === "invoice") deleteInvoiceMut.mutate(deleteConfirm.id);
                  else if (deleteConfirm.type === "client") deleteClientMut.mutate(deleteConfirm.id);
                  else deleteCatalogMut.mutate(deleteConfirm.id);
                }}
                data-testid="button-confirm-delete"
              >
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
