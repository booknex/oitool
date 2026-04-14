import { getStripeSync } from './stripeClient';
import { storage } from './storage';
import { log } from './vite';

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
    } catch (err: any) {
      log(`[stripe] App-level webhook handler error: ${err.message}`);
    }
  }

  static async handleAppEvent(event: any): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data?.object;
        if (!session) break;

        const invoiceId = session.metadata?.invoiceId
          ? parseInt(session.metadata.invoiceId, 10)
          : null;

        if (!invoiceId || isNaN(invoiceId)) {
          // Try to find by payment_intent if metadata not present
          const paymentIntentId = session.payment_intent;
          if (!paymentIntentId) break;

          const invoices = await storage.getInvoices();
          const invoice = invoices.find(
            (inv: any) => inv.stripePaymentIntentId === paymentIntentId
          );
          if (!invoice) {
            log(`[stripe] checkout.session.completed: no invoice found for payment_intent ${paymentIntentId}`);
            break;
          }
          if (invoice.status === 'paid') break; // idempotent

          await storage.updateInvoice({
            id: invoice.id,
            status: 'paid',
            paidAt: new Date().toISOString(),
          });
          log(`[stripe] Invoice #${invoice.invoiceNumber} marked paid via Stripe (by payment_intent)`);
          break;
        }

        const invoice = await storage.getInvoice(invoiceId);
        if (!invoice) {
          log(`[stripe] checkout.session.completed: invoice ${invoiceId} not found`);
          break;
        }
        if (invoice.status === 'paid') break; // idempotent

        await storage.updateInvoice({
          id: invoiceId,
          status: 'paid',
          paidAt: new Date().toISOString(),
        });
        log(`[stripe] Invoice #${invoice.invoiceNumber} marked paid via Stripe`);
        break;
      }

      default:
        break;
    }
  }
}
