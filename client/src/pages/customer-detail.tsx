import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import {
  ArrowLeft, ChevronDown,
  Check, Send, Clock, AlertCircle, ArrowDownLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { Client, InvoiceWithDetails } from "@shared/schema";

type InvoiceStatus = "draft" | "sent" | "paid" | "overdue";

const STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; icon: React.ElementType }> = {
  draft:   { label: "Draft",   color: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300", icon: Clock },
  sent:    { label: "Sent",    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: Send },
  paid:    { label: "Paid",    color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", icon: Check },
  overdue: { label: "Overdue", color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",  icon: AlertCircle },
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
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
      {status.toUpperCase()}
    </span>
  );
}

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const clientId = Number(id);

  const { data: client } = useQuery<Client>({ queryKey: ["/api/clients", clientId] });
  const { data: allInvoices = [], isLoading } = useQuery<InvoiceWithDetails[]>({ queryKey: ["/api/invoices"] });

  const invoices = allInvoices
    .filter(i => i.clientId === clientId)
    .sort((a, b) => new Date(a.issueDate!).getTime() - new Date(b.issueDate!).getTime());

  const updateStatusMut = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: InvoiceStatus }) => {
      const res = await apiRequest("PATCH", `/api/invoices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/invoices"] }),
    onError: () => toast({ title: "Error", description: "Could not update status", variant: "destructive" }),
  });

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfToday   = new Date(startOfToday.getTime() + 86400000 - 1);
  const in30Days     = new Date(startOfToday.getTime() + 30 * 86400000);

  const unpaidInvoices = invoices.filter(i => i.status === "sent" || i.status === "overdue");

  const totalOutstanding = unpaidInvoices.reduce((s, i) => s + i.total, 0);

  const dueToday = unpaidInvoices
    .filter(i => i.dueDate && new Date(i.dueDate) >= startOfToday && new Date(i.dueDate) <= endOfToday)
    .reduce((s, i) => s + i.total, 0);

  const dueWithin30 = unpaidInvoices
    .filter(i => i.dueDate && new Date(i.dueDate) > endOfToday && new Date(i.dueDate) <= in30Days)
    .reduce((s, i) => s + i.total, 0);

  const overdueTotal = invoices
    .filter(i => i.status === "overdue")
    .reduce((s, i) => s + i.total, 0);

  const totalAmount = invoices.reduce((s, i) => s + i.total, 0);
  const balanceDue  = totalOutstanding;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav bar */}
      <header className="flex items-center gap-3 px-5 py-3 border-b border-border bg-background flex-shrink-0">
        <Button size="icon" variant="ghost" onClick={() => navigate("/invoicing")} data-testid="button-back">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <button
          className="flex items-center gap-1.5 text-[15px] font-semibold text-foreground hover:opacity-70 transition-opacity"
          data-testid="text-customer-name"
        >
          {client?.name ?? "All Invoices"}
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </header>

      {/* Payment Summary card */}
      <div className="px-5 py-4 border-b border-border bg-background flex-shrink-0">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground mb-3">
          Payment Summary
        </p>
        <div className="flex items-start gap-10 flex-wrap">
          {/* Total Outstanding */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
              <ArrowDownLeft className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground leading-tight">Total Outstanding Receivables</p>
              <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-outstanding">
                {fmt(totalOutstanding)}
              </p>
            </div>
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          {/* Due Today */}
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Due Today</p>
            <p className={`text-[15px] font-semibold tabular-nums ${dueToday > 0 ? "text-amber-500" : "text-foreground"}`} data-testid="text-due-today">
              {fmt(dueToday)}
            </p>
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          {/* Due Within 30 Days */}
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Due Within 30 Days</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-due-30">
              {fmt(dueWithin30)}
            </p>
          </div>

          <div className="w-px self-stretch bg-border mx-1" />

          {/* Overdue */}
          <div>
            <p className="text-[11px] text-muted-foreground leading-tight mb-0.5">Overdue Invoice</p>
            <p className="text-[15px] font-semibold text-foreground tabular-nums" data-testid="text-overdue">
              {fmt(overdueTotal)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <main className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-40">
            <p className="text-muted-foreground">Loading invoices…</p>
          </div>
        )}

        {!isLoading && invoices.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-2 text-muted-foreground">
            <p className="text-sm">No invoices for this customer yet.</p>
          </div>
        )}

        {!isLoading && invoices.length > 0 && (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px] items-center border-b border-border px-4 py-2 gap-3">
              <div />
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Date</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Invoice #</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Order Number</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Customer Name</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Due Date</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Amount</span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground text-right">Balance Due</span>
            </div>

            {/* Rows */}
            {invoices.map(inv => {
              const balance = (inv.status === "sent" || inv.status === "overdue") ? inv.total : 0;
              return (
                <div
                  key={inv.id}
                  className="grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px] items-center border-b border-border px-4 py-2.5 gap-3 hover-elevate"
                  data-testid={`row-invoice-${inv.id}`}
                >
                  <input type="checkbox" className="rounded border-border accent-blue-500" />
                  <span className="text-sm text-foreground" data-testid={`text-date-${inv.id}`}>
                    {fmtDate(inv.issueDate?.toString())}
                  </span>
                  <span className="text-sm text-[#1677ff] font-medium" data-testid={`text-inv-num-${inv.id}`}>
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-sm text-muted-foreground">—</span>
                  <span className="text-sm text-foreground truncate" data-testid={`text-client-name-${inv.id}`}>
                    {inv.client?.name ?? client?.name ?? "—"}
                  </span>
                  <div data-testid={`text-status-${inv.id}`}>
                    <StatusPill status={inv.status} />
                  </div>
                  <span className="text-sm text-foreground" data-testid={`text-due-${inv.id}`}>
                    {fmtDate(inv.dueDate?.toString())}
                  </span>
                  <span className="text-sm text-foreground text-right tabular-nums" data-testid={`text-amount-${inv.id}`}>
                    {fmt(inv.total)}
                  </span>
                  <span className="text-sm text-foreground text-right tabular-nums" data-testid={`text-balance-${inv.id}`}>
                    {fmt(balance)}
                  </span>
                </div>
              );
            })}

            {/* Totals row */}
            <div className="grid grid-cols-[32px_140px_160px_160px_1fr_120px_140px_110px_100px] items-center px-4 py-3 gap-3 border-t border-border bg-muted/30">
              <div /><div /><div /><div /><div /><div /><div />
              <span className="text-sm font-semibold text-foreground text-right tabular-nums" data-testid="text-grand-total">
                {fmt(totalAmount)}
              </span>
              <span className="text-sm font-semibold text-foreground text-right tabular-nums" data-testid="text-grand-balance">
                {fmt(balanceDue)}
              </span>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
