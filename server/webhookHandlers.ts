import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { log } from './vite';
import type { InvoiceWithDetails } from '@shared/schema';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Let stripe-replit-sync handle signature verification and syncing
    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);

    // Parse the event (signature already verified above) and handle app-level logic
    try {
      const event = JSON.parse(payload.toString('utf8'));
      await WebhookHandlers.handleAppEvent(event);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log(`[stripe] App-level webhook handler error: ${msg}`);
    }
  }

  static async handleAppEvent(event: { type: string; data?: { object?: Record<string, unknown> } }): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object;
        if (!session) break;

        const paymentIntentId = typeof session.payment_intent === 'string'
          ? session.payment_intent
          : null;

        const metadataInvoiceId = typeof (session.metadata as Record<string, string> | null)?.invoiceId === 'string'
          ? parseInt((session.metadata as Record<string, string>).invoiceId, 10)
          : null;

        let invoice: InvoiceWithDetails | undefined;

        // Primary lookup: by metadata.invoiceId (set when creating the Checkout Session)
        if (metadataInvoiceId && !isNaN(metadataInvoiceId)) {
          invoice = await storage.getInvoice(metadataInvoiceId);
        }

        // Fallback: find by stripe_payment_intent_id stored on the invoice
        if (!invoice && paymentIntentId) {
          const allInvoices = await storage.getInvoices();
          invoice = allInvoices.find(
            (inv: InvoiceWithDetails) => inv.stripePaymentIntentId === paymentIntentId
          );
        }

        if (!invoice) {
          log(`[stripe] checkout.session.completed: no matching invoice found`);
          break;
        }

        if (invoice.status === 'paid') {
          // Idempotent: already paid, but persist payment_intent if missing
          if (paymentIntentId && !invoice.stripePaymentIntentId) {
            await storage.updateInvoice({ id: invoice.id, stripePaymentIntentId: paymentIntentId });
          }
          break;
        }

        // Mark the invoice as paid, always persisting the payment intent ID
        await storage.updateInvoice({
          id: invoice.id,
          status: 'paid',
          paidAt: new Date().toISOString(),
          stripePaymentIntentId: paymentIntentId ?? invoice.stripePaymentIntentId,
        });
        log(`[stripe] Invoice #${invoice.invoiceNumber} marked paid via Stripe`);
        break;
      }

      default:
        break;
    }
  }
}
