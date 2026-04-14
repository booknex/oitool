import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ArrowLeft, ChevronDown,
  ArrowDownLeft, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Client, InvoiceWithDetails } from "@shared/schema";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string }> = {
  draft:   { label: "Draft",   color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
  sent:    { label: "Sent",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" });
}

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status as InvoiceStatus] ?? STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {status.toUpperCase()}
    </span>
  );
}

export function CustomerDetailPane({
  clientId,
  onBack,
  onEdit,
}: {
  clientId: number;
  onBack: () => void;
  onEdit: (inv: InvoiceWithDetails) => void;
}) {
  const [, navigate] = useLocation();
  const { data: client } = useQuery<Client>({ queryKey: ["/api/clients", clientId] });
  const { data: allInvoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({ queryKey: ["/api/invoices"] });

  const [invoiceMenu, setInvoiceMenu] = useState<number | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  const invoices = allInvoices
    .filter(i => i.clientId === clientId)
    .sort((a, b) => new Date(a.issueDate!).getTime() - new Date(b.issueDate!).getTime());

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday   = new Date(startOfToday.getTime() + 86400000 - 1);
  const in30Days     = new Date(startOfToday.getTime() + 30 * 86400000);

  const unpaidInvoices   = invoices.filter(i => i.status === "sent" || i.status === "overdue");
  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);
  const dueToday         = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) >= startOfToday && new Date(i.dueDate) <= endOfToday).reduce((s, i) => s + i.total, 0);
  const dueWithin30      = unpaidInvoices.filter(i => i.dueDate && new Date(i.dueDate) > endOfToday && new Date(i.dueDate) <= in30Days).reduce((s, i) => s + i.total, 0);
  const overdueTotal     = invoices.filter(i => i.status === "overdue").reduce((s, i) => s + i.total, 0);
  const totalAmount      = invoices.reduce((s, i) => s + i.total, 0);

  const updateStatusMut = useMutation({
    mutationFn: ({ id, status }: { id: number; status: InvoiceStatus }) =>
      apiRequest("PATCH", `/api/invoices/${id}`, { status }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
  });

  const deleteInvoiceMut = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/invoices/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
  });

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={() => setInvoiceMenu(null)}>
      {/* Top nav bar */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background flex-shrink-0">
        <Button size="icon" variant="ghost" onClick={onBack} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <button
          className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground hover:opacity-70 transition-opacity"
          data-testid="text-customer-name"
        >
          {client?.name ?? "Customer"}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      {/* Payment Summary */}
      <div className="px-5 py-4 border-b border-border bg-background flex-shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Payment Summary
        </p>
        <div className="flex items-start gap-10 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Total Outstanding Receivables</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-outstanding">{fmt(totalOutstanding)}</p>
            </div>
          </div>
          <div className="w-px self-stretch bg-border mx-1" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Due Today</p>
            <p className={`text-[15px] font-semibold tabular-nums ${dueToday > 0 ? "text-amber-500" : "text-foreground"}`} data-testid="text-due-today">{fmt(dueToday)}</p>
          </div>
          <div className="w-px self-stretch bg-border mx-1" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Due Within 30 Days</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-due-30">{fmt(dueWithin30)}</p>
          </div>
          <div className="w-px self-stretch bg-border mx-1" />
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Overdue Invoice</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-overdue">{fmt(overdueTotal)}</p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground text-sm">Loading invoices…</p>
          </div>
        )}
        {!isLoading && invoices.length === 0 && (
          <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
            No invoices for this customer yet.
          </div>
        )}
        {!isLoading && invoices.length > 0 && (
          <>
            <div className="grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px_44px] items-center border-b border-border px-4 py-2 gap-3">
              <div />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice #</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Order Number</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer Name</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance Due</span>
              <div />
            </div>
            {invoices.map(inv => {
              const balance = (inv.status === "sent" || inv.status === "overdue") ? inv.total : 0;
              return (
                <div
                  key={inv.id}
                  className="group grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px_44px] items-center border-b border-border px-4 py-2.5 gap-3 hover-elevate"
                  data-testid={`row-invoice-${inv.id}`}
                >
                  <input type="checkbox" className="rounded border-border accent-blue-500" />
                  <span className="text-sm text-foreground">{fmtDate(inv.issueDate?.toString())}</span>
                  <button
                    className="text-sm text-[#1677ff] font-medium hover:underline text-left"
                    onClick={() => navigate(`/invoicing/invoices/${inv.id}`)}
                    data-testid={`link-invoice-${inv.id}`}
                  >
                    {inv.invoiceNumber}
                  </button>
                  <span className="text-sm text-muted-foreground">—</span>
                  <span className="text-sm text-foreground truncate">{inv.client?.name ?? client?.name ?? "—"}</span>
                  <div><StatusPill status={inv.status} /></div>
                  <span className="text-sm text-foreground">{fmtDate(inv.dueDate?.toString())}</span>
                  <span className="text-sm text-foreground text-right tabular-nums">{fmt(inv.total)}</span>
                  <span className="text-sm text-foreground text-right tabular-nums">{fmt(balance)}</span>

                  {/* 3-dot menu */}
                  <div className="relative flex items-center justify-end">
                    {deleteConfirmId === inv.id ? (
                      <div className="absolute right-0 top-9 z-50 w-44 bg-popover border rounded-md shadow-md p-2 text-sm" data-testid={`confirm-delete-invoice-${inv.id}`}>
                        <p className="text-foreground mb-2">Delete this invoice?</p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={e => { e.stopPropagation(); deleteInvoiceMut.mutate(inv.id); setDeleteConfirmId(null); }} data-testid={`confirm-yes-${inv.id}`}>
                            Delete
                          </Button>
                          <Button size="sm" variant="ghost" onClick={e => { e.stopPropagation(); setDeleteConfirmId(null); }} data-testid={`confirm-no-${inv.id}`}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : null}
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
                        <button
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2"
                          onClick={e => { e.stopPropagation(); onEdit(inv); setInvoiceMenu(null); }}
                          data-testid={`option-edit-invoice-${inv.id}`}
                        >
                          <Pencil className="w-3.5 h-3.5" /> Edit
                        </button>
                        <div className="my-1 h-px bg-border" />
                        <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Change Status</p>
                        {(["draft", "sent", "paid", "overdue"] as InvoiceStatus[]).map(s => (
                          <button
                            key={s}
                            className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate"
                            onClick={e => { e.stopPropagation(); updateStatusMut.mutate({ id: inv.id, status: s }); setInvoiceMenu(null); }}
                            data-testid={`option-status-${s}-${inv.id}`}
                          >
                            {STATUS_CONFIG[s].label}
                          </button>
                        ))}
                        <div className="my-1 h-px bg-border" />
                        <button
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover-elevate flex items-center gap-2 text-red-500"
                          onClick={e => { e.stopPropagation(); setDeleteConfirmId(inv.id); setInvoiceMenu(null); }}
                          data-testid={`option-delete-invoice-${inv.id}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            <div className="grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px_44px] items-center px-4 py-3 gap-3 border-t border-border bg-muted/30">
              <div /><div /><div /><div /><div /><div /><div />
              <span className="text-sm font-semibold text-foreground text-right tabular-nums">{fmt(totalAmount)}</span>
              <span className="text-sm font-semibold text-foreground text-right tabular-nums">{fmt(totalOutstanding)}</span>
              <div />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
