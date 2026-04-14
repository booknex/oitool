import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, Trash2, Pencil, Receipt, Users, Check,
  ChevronDown, Send, Clock, AlertCircle, X, Home,
  Package, Tag, ChevronRight,
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

function ClientModal({ open, onClose, initial }: {
  open: boolean; onClose: () => void; initial?: Client;
}) {
  const { toast } = useToast();
  const isEdit = !!initial;
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    address: initial?.address ?? "",
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
      toast({ title: isEdit ? "Client updated" : "Client added" });
      onClose();
    },
    onError: () => toast({ title: "Error", description: "Could not save client", variant: "destructive" }),
  });
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{isEdit ? "Edit Client" : "New Client"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={e => set("name", e.target.value)} placeholder="Client name" data-testid="input-client-name" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => set("email", e.target.value)} placeholder="email@example.com" data-testid="input-client-email" />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={e => set("phone", e.target.value)} placeholder="(555) 000-0000" data-testid="input-client-phone" />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input value={form.address} onChange={e => set("address", e.target.value)} placeholder="Street, City, State" data-testid="input-client-address" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Optional notes" rows={2} data-testid="input-client-notes" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={() => mutation.mutate()} disabled={!form.name.trim() || mutation.isPending} data-testid="button-save-client">
              {mutation.isPending ? "Saving…" : "Save"}
            </Button>
          </div>
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type Tab = "invoices" | "customers" | "items";

interface NavItem {
  id: Tab | "home";
  label: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home",      label: "Home",      icon: Home,    iconBg: "bg-gray-500",   iconColor: "text-white" },
  { id: "customers", label: "Customers", icon: Users,   iconBg: "bg-blue-500",   iconColor: "text-white" },
  { id: "items",     label: "Items",     icon: Package, iconBg: "bg-orange-500", iconColor: "text-white" },
  { id: "invoices",  label: "Invoices",  icon: Receipt, iconBg: "bg-violet-500", iconColor: "text-white" },
];

export default function Invoicing() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("invoices");
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

  const totalOutstanding = invoiceList.filter(i => i.status === "sent" || i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalPaid = invoiceList.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
  const overdueCount = invoiceList.filter(i => i.status === "overdue").length;

  function handleNavClick(id: Tab | "home") {
    if (id === "home") { navigate("/"); return; }
    setTab(id);
    setStatusDropdown(null);
  }

  function handleNewButton() {
    if (tab === "invoices") { setEditInvoice(undefined); setShowInvoiceModal(true); }
    else if (tab === "customers") { setEditClient(undefined); setShowClientModal(true); }
    else if (tab === "items") { setEditCatalogItem(undefined); setShowCatalogModal(true); }
  }

  const newButtonLabel =
    tab === "invoices" ? "New Invoice" :
    tab === "customers" ? "New Customer" : "New Item";

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
              const isActive = id !== "home" && tab === id;
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
        <header className="flex items-center justify-between gap-3 px-6 py-3 border-b border-border bg-background flex-shrink-0 flex-wrap">
          <div>
            <h1 className="text-base font-semibold text-foreground capitalize">
              {tab === "customers" ? "Customers" : tab === "items" ? "Items" : "Invoices"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {tab === "invoices" && `${invoiceList.length} invoice${invoiceList.length !== 1 ? "s" : ""}`}
              {tab === "customers" && `${clientList.length} client${clientList.length !== 1 ? "s" : ""}`}
              {tab === "items" && `${catalogList.length} item${catalogList.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleNewButton}
            disabled={tab === "invoices" && clientList.length === 0}
            data-testid="button-new"
          >
            <Plus className="w-4 h-4 mr-1" />{newButtonLabel}
          </Button>
        </header>

        <main className="flex-1 overflow-y-auto p-6 flex flex-col">

          {/* Invoices */}
          {tab === "invoices" && (
            <>
              {invLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <p className="text-muted-foreground">Loading invoices…</p>
                </div>
              )}
              {!invLoading && invoiceList.length === 0 && (
                <EmptyState
                  icon={Receipt}
                  title="No invoices yet"
                  subtitle={clientList.length === 0
                    ? "Add a customer first, then create your first invoice."
                    : "Click \"New Invoice\" to bill your first client."}
                />
              )}
              {!invLoading && invoiceList.length > 0 && (
                <div className="max-w-2xl w-full mx-auto">
                  <Card>
                    <CardContent className="pt-0 divide-y">
                      {invoiceList.map(inv => (
                        <div key={inv.id} className="py-3 flex items-center gap-3" data-testid={`row-invoice-${inv.id}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-sm font-semibold" data-testid={`text-invoice-number-${inv.id}`}>{inv.invoiceNumber}</span>
                              <StatusBadge status={inv.status} />
                            </div>
                            <p className="text-sm text-muted-foreground truncate mt-0.5" data-testid={`text-invoice-client-${inv.id}`}>{inv.client?.name ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">
                              {fmtDate(inv.issueDate?.toString())}
                              {inv.dueDate ? ` · Due ${fmtDate(inv.dueDate.toString())}` : ""}
                            </p>
                          </div>
                          <p className="font-semibold text-sm shrink-0" data-testid={`text-invoice-total-${inv.id}`}>{fmt(inv.total)}</p>
                          <div className="relative">
                            <Button size="icon" variant="ghost" onClick={() => setStatusDropdown(statusDropdown === inv.id ? null : inv.id)} data-testid={`button-status-${inv.id}`}>
                              <ChevronDown className="w-4 h-4" />
                            </Button>
                            {statusDropdown === inv.id && (
                              <div className="absolute right-0 top-9 z-50 w-36 bg-popover border rounded-md shadow-md p-1" data-testid={`dropdown-status-${inv.id}`}>
                                {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map(s => (
                                  <button key={s} className="w-full text-left px-2 py-1.5 text-sm rounded hover-elevate" onClick={() => updateStatusMut.mutate({ id: inv.id, status: s })} data-testid={`option-status-${s}`}>
                                    {STATUS_CONFIG[s].label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => { setEditInvoice(inv); setShowInvoiceModal(true); }} data-testid={`button-edit-invoice-${inv.id}`}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm({ type: "invoice", id: inv.id })} data-testid={`button-delete-invoice-${inv.id}`}>
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
                <div className="max-w-2xl w-full mx-auto">
                  <Card>
                    <CardContent className="pt-0 divide-y">
                      {clientList.map(client => {
                        const clientInvoices = invoiceList.filter(i => i.clientId === client.id);
                        const clientTotal = clientInvoices.filter(i => i.status === "paid").reduce((s, i) => s + i.total, 0);
                        return (
                          <div key={client.id} className="py-3 flex items-center gap-3" data-testid={`row-client-${client.id}`}>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm" data-testid={`text-client-name-${client.id}`}>{client.name}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {[client.email, client.phone].filter(Boolean).join(" · ") || "No contact info"}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {clientInvoices.length} invoice{clientInvoices.length !== 1 ? "s" : ""}
                                {clientTotal > 0 ? ` · ${fmt(clientTotal)} paid` : ""}
                              </p>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => { setEditClient(client); setShowClientModal(true); }} data-testid={`button-edit-client-${client.id}`}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setDeleteConfirm({ type: "client", id: client.id })} data-testid={`button-delete-client-${client.id}`}>
                              <Trash2 className="w-4 h-4 text-red-400" />
                            </Button>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
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
