import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { CustomerDetailPane } from "./customer-detail";
import { InvoiceDetailView } from "./invoice-detail";
import {
  Plus, Trash2, Pencil, Receipt, Users, Check,
  ChevronDown, Send, Clock, AlertCircle, X, Home,
  Package, Tag, ChevronRight, MoreHorizontal, MoreVertical,
  CircleDollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
    propertyStreet: initial?.propertyStreet ?? "",
    propertyCity: initial?.propertyCity ?? "",
    propertyState: initial?.propertyState ?? "",
    propertyZip: initial?.propertyZip ?? "",
    propertyFax: initial?.propertyFax ?? "",
    name: initial?.name ?? "",
    currency: "USD",
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

              {/* Primary Contact */}
              <FormRow label="Primary Contact">
                <div className="flex gap-1.5">
                  <Input value={form.firstName} onChange={e => set("firstName", e.target.value)} placeholder="First" className="flex-1" data-testid="input-first-name" />
                  <Input value={form.lastName} onChange={e => set("lastName", e.target.value)} placeholder="Last" className="flex-1" data-testid="input-last-name" />
                </div>
              </FormRow>

              <div className="pt-1">
                <SectionTitle>Property Address</SectionTitle>
              </div>

              <FormRow label="Street" required>
                <Input value={form.propertyStreet} onChange={e => set("propertyStreet", e.target.value)} placeholder="Street" data-testid="input-property-street" />
              </FormRow>

              <FormRow label="City">
                <Input value={form.propertyCity} onChange={e => set("propertyCity", e.target.value)} placeholder="City" data-testid="input-property-city" />
              </FormRow>

              <FormRow label="State">
                <Input value={form.propertyState} onChange={e => set("propertyState", e.target.value)} placeholder="State" data-testid="input-property-state" />
              </FormRow>

              <FormRow label="ZIP Code">
                <Input value={form.propertyZip} onChange={e => set("propertyZip", e.target.value)} placeholder="ZIP" data-testid="input-property-zip" />
              </FormRow>

              <FormRow label="Display Name" required>
                <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="How this appears on invoices" data-testid="input-client-name" />
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

              <FormRow label="Street">
                <Input value={form.street1} onChange={e => set("street1", e.target.value)} placeholder="Street" data-testid="input-street1" />
              </FormRow>

              <FormRow label="City">
                <Input value={form.city} onChange={e => set("city", e.target.value)} data-testid="input-city" />
              </FormRow>

              <FormRow label="State">
                <Input value={form.state} onChange={e => set("state", e.target.value)} data-testid="input-state" />
              </FormRow>

              <FormRow label="ZIP Code">
                <Input value={form.zipCode} onChange={e => set("zipCode", e.target.value)} data-testid="input-zip" />
              </FormRow>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || !form.propertyStreet.trim() || mutation.isPending} data-testid="button-save-client">
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
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-foreground">Invoice Dashboard</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          {clientList.length} client{clientList.length !== 1 ? "s" : ""} · {invoiceList.length} invoice{invoiceList.length !== 1 ? "s" : ""}
        </p>
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
        const now = new Date();
        const MONTH_ABBR = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const CHART_H = 160;
        const Y_AXIS_W = 36;

        // Rolling last 12 months
        const months = Array.from({ length: 12 }, (_, i) => {
          const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
          return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_ABBR[d.getMonth()] };
        });

        const data = months.map(({ year, month }) => {
          const inMonth = invoiceList.filter(inv => {
            const d = inv.issueDate ? new Date(inv.issueDate) : null;
            return d && d.getFullYear() === year && d.getMonth() === month;
          });
          return {
            total:   inMonth.reduce((s, i) => s + i.total, 0),
            paid:    inMonth.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0),
            unpaid:  inMonth.filter(i => i.status !== "paid").reduce((s, i) => s + i.total, 0),
          };
        });

        // Nice Y-axis
        const rawMax = Math.max(...data.map(d => d.total), 1);
        const mag = Math.pow(10, Math.floor(Math.log10(rawMax)));
        const norm = rawMax / mag;
        const niceMax = norm <= 1 ? mag : norm <= 2 ? 2 * mag : norm <= 5 ? 5 * mag : 10 * mag;
        const tickStep = niceMax / 4;
        const ticks = [0, 1, 2, 3, 4].map(i => i * tickStep);
        const fmtY = (v: number) => v === 0 ? "0" : v >= 1000 ? `${(v / 1000 % 1 === 0 ? v / 1000 : (v / 1000).toFixed(1))}K` : `${v}`;

        // Totals for legend
        const totalInvoiced    = data.reduce((s, d) => s + d.total, 0);
        const totalPaid        = data.reduce((s, d) => s + d.paid, 0);
        const totalUnpaid      = data.reduce((s, d) => s + d.unpaid, 0);

        return (
          <div className="mb-5 rounded-xl border border-border bg-card p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm font-semibold text-foreground">Monthly Revenue</p>
              <span className="text-[11px] text-muted-foreground border border-border rounded px-2 py-0.5">Last 12 Months</span>
            </div>

            <div className="flex gap-5">
              {/* Chart */}
              <div className="flex-1 min-w-0">
                <div className="flex">
                  {/* Y-axis labels */}
                  <div className="flex flex-col-reverse justify-between pb-[1px]" style={{ width: `${Y_AXIS_W}px`, height: `${CHART_H}px`, flexShrink: 0 }}>
                    {ticks.map(tick => (
                      <span key={tick} className="text-[9px] text-muted-foreground text-right pr-2 leading-none">{fmtY(tick)}</span>
                    ))}
                  </div>

                  {/* Plot area */}
                  <div className="flex-1 relative" style={{ height: `${CHART_H}px` }}>
                    {/* Gridlines */}
                    {ticks.map(tick => (
                      <div key={tick} className="absolute left-0 right-0 border-t border-border/60"
                        style={{ bottom: `${(tick / niceMax) * CHART_H}px` }} />
                    ))}

                    {/* Bars */}
                    <div className="absolute inset-0 flex items-end">
                      {data.map(({ total, paid, unpaid }, idx) => {
                        const isCurrent = months[idx].month === now.getMonth() && months[idx].year === now.getFullYear();
                        const h = (v: number) => Math.max((v / niceMax) * CHART_H, v > 0 ? 2 : 0);
                        return (
                          <div key={idx} className="flex-1 flex items-end justify-center gap-[1px] group relative">
                            {/* Hover tooltip */}
                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-20 invisible group-hover:visible bg-popover border border-border rounded-md shadow-md px-3 py-2 text-[11px] whitespace-nowrap pointer-events-none">
                              <p className="font-semibold text-foreground mb-1">{months[idx].label} {months[idx].year}</p>
                              <p className="text-blue-500">Total: {fmt(total)}</p>
                              {paid   > 0 && <p className="text-emerald-600 dark:text-emerald-400">Paid: {fmt(paid)}</p>}
                              {unpaid > 0 && <p className="text-orange-500">Unpaid: {fmt(unpaid)}</p>}
                            </div>
                            {/* Total invoiced bar (blue) */}
                            <div className={`rounded-t-sm transition-all duration-500 ${isCurrent ? "opacity-100" : "opacity-85"} bg-blue-500`}
                              style={{ width: "15%", height: `${h(total)}px` }} />
                            {/* Paid bar (green) */}
                            <div className={`rounded-t-sm transition-all duration-500 ${isCurrent ? "opacity-100" : "opacity-85"} bg-emerald-500`}
                              style={{ width: "15%", height: `${h(paid)}px` }} />
                            {/* Unpaid bar (orange) */}
                            <div className={`rounded-t-sm transition-all duration-500 ${isCurrent ? "opacity-100" : "opacity-85"} bg-orange-400`}
                              style={{ width: "15%", height: `${h(unpaid)}px` }} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* X-axis */}
                <div className="flex mt-1.5" style={{ paddingLeft: `${Y_AXIS_W}px` }}>
                  {months.map(({ label, year, month }, idx) => {
                    const isCur = month === now.getMonth() && year === now.getFullYear();
                    return (
                      <div key={idx} className="flex-1 text-center">
                        <div className={`text-[9px] leading-tight ${isCur ? "text-blue-500 font-bold" : "text-muted-foreground"}`}>{label}</div>
                        <div className="text-[8px] text-muted-foreground/50 leading-tight">{String(year).slice(2)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right legend */}
              <div className="flex flex-col justify-center gap-4 pl-5 border-l border-border shrink-0">
                {[
                  { label: "Total Invoiced", value: totalInvoiced, color: "text-blue-500" },
                  { label: "Total Paid",     value: totalPaid,     color: "text-emerald-600 dark:text-emerald-400" },
                  { label: "Total Unpaid",   value: totalUnpaid,   color: "text-orange-500" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p className={`text-[11px] font-medium ${color} mb-0.5`}>{label}</p>
                    <p className={`text-base font-bold tabular-nums ${color}`}>{fmt(value)}</p>
                  </div>
                ))}
              </div>
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

type Tab = "dashboard" | "invoices" | "customers" | "items" | "payments";

interface NavItem {
  id: Tab;
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "dashboard", label: "Home",               icon: Home,              iconBg: "bg-gray-500",   iconColor: "text-white" },
  { id: "customers", label: "Customers",          icon: Users,             iconBg: "bg-blue-500",   iconColor: "text-white" },
  { id: "items",     label: "Items",              icon: Package,           iconBg: "bg-orange-500", iconColor: "text-white" },
  { id: "invoices",  label: "Invoices",           icon: Receipt,           iconBg: "bg-violet-500", iconColor: "text-white" },
  { id: "payments",  label: "Payments Received",  icon: CircleDollarSign,  iconBg: "bg-emerald-500", iconColor: "text-white" },
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
        <nav className="px-4 flex-1 pt-16">
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
                {tab === "customers" ? "Customers" : tab === "items" ? "Items" : "Payments Received"}
              </h1>
            )}
            <p className="text-xs text-muted-foreground">
              {tab === "invoices" && `${invoiceList.length} invoice${invoiceList.length !== 1 ? "s" : ""}`}
              {tab === "customers" && `${clientList.length} client${clientList.length !== 1 ? "s" : ""}`}
              {tab === "items" && `${catalogList.length} item${catalogList.length !== 1 ? "s" : ""}`}
              {tab === "payments" && `${invoiceList.filter(i => i.status === "paid").length} payment${invoiceList.filter(i => i.status === "paid").length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {tab !== "payments" && (
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
          )}
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
                        <div className="flex items-center justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={e => e.stopPropagation()}
                                data-testid={`button-menu-invoice-${inv.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44" data-testid={`dropdown-invoice-${inv.id}`}>
                              <DropdownMenuItem
                                onClick={() => { setEditInvoice(inv); setShowInvoiceModal(true); }}
                                data-testid={`option-edit-invoice-${inv.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuLabel className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">Change Status</DropdownMenuLabel>
                              {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map(s => (
                                <DropdownMenuItem key={s}
                                  onClick={() => updateStatusMut.mutate({ id: inv.id, status: s })}
                                  data-testid={`option-status-${s}`}
                                >{STATUS_CONFIG[s].label}</DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500"
                                onClick={() => setDeleteConfirm({ type: "invoice", id: inv.id })}
                                data-testid={`option-delete-invoice-${inv.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Property Address</span>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Name</span>
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
                    const propertyAddress = [
                      client.propertyStreet,
                      client.propertyCity,
                      client.propertyState,
                      client.propertyZip,
                    ].filter(Boolean).join(", ");
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
                          data-testid={`text-property-address-${client.id}`}
                        >
                          {propertyAddress || "—"}
                        </button>
                        <span className="text-sm text-foreground truncate" data-testid={`text-client-name-${client.id}`}>{client.name ?? "—"}</span>
                        <span className="text-sm text-foreground truncate">{client.email ?? "—"}</span>
                        <span className="text-sm text-foreground truncate">{client.phone ?? "—"}</span>
                        <span className="text-sm text-foreground text-right tabular-nums">{fmt(unpaid)}</span>
                        <span className="text-sm text-foreground text-right tabular-nums">$0.00</span>
                        <div className="flex items-center justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={e => e.stopPropagation()}
                                data-testid={`button-menu-client-${client.id}`}
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36" data-testid={`dropdown-client-${client.id}`}>
                              <DropdownMenuItem
                                onClick={() => { setEditClient(client); setShowClientModal(true); }}
                                data-testid={`option-edit-client-${client.id}`}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-500 focus:text-red-500"
                                onClick={() => setDeleteConfirm({ type: "client", id: client.id })}
                                data-testid={`option-delete-client-${client.id}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

          {/* Payments Received */}
          {tab === "payments" && (() => {
            const paidInvoices = invoiceList.filter(i => i.status === "paid").sort((a, b) => {
              const da = a.paidAt ? new Date(a.paidAt).getTime() : 0;
              const db = b.paidAt ? new Date(b.paidAt).getTime() : 0;
              return db - da;
            });
            const totalPaidAmt = paidInvoices.reduce((s, i) => s + i.total, 0);
            if (invLoading) return (
              <div className="flex-1 flex items-center justify-center">
                <p className="text-muted-foreground">Loading…</p>
              </div>
            );
            if (paidInvoices.length === 0) return (
              <EmptyState icon={CircleDollarSign} title="No payments yet" subtitle="Paid invoices will appear here." />
            );
            return (
              <div className="w-[calc(100%+3rem)] -mx-6 -mt-6 flex flex-col flex-1">
                {/* Summary bar */}
                <div className="px-5 py-3 border-b border-border bg-background flex-shrink-0">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-1">Total Collected</p>
                  <p className="text-[22px] font-bold text-emerald-500 tabular-nums">{fmt(totalPaidAmt)}</p>
                </div>
                {/* Table header */}
                <div className="grid grid-cols-[1fr_1fr_1fr_140px_120px] items-center border-b border-border px-5 py-2 gap-4">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date Paid</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice #</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice Date</span>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</span>
                </div>
                {/* Table rows */}
                {paidInvoices.map(inv => {
                  const client = clientList.find(c => c.id === inv.clientId);
                  return (
                    <div
                      key={inv.id}
                      className="grid grid-cols-[1fr_1fr_1fr_140px_120px] items-center border-b border-border px-5 py-3 gap-4 hover-elevate cursor-pointer"
                      onClick={() => navigate(`/invoicing/invoices/${inv.id}`)}
                      data-testid={`row-payment-${inv.id}`}
                    >
                      <span className="text-sm text-foreground tabular-nums">
                        {inv.paidAt ? new Date(inv.paidAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                      <span className="text-sm text-[#1677ff] font-medium">{inv.invoiceNumber}</span>
                      <span className="text-sm text-foreground truncate">{client?.name ?? "—"}</span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {inv.issueDate ? new Date(inv.issueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </span>
                      <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 text-right tabular-nums">{fmt(inv.total)}</span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

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
