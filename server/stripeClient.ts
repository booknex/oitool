import Stripe from 'stripe';
import { StripeSync } from 'stripe-replit-sync';

let stripeSyncInstance: StripeSync | null = null;

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      'Stripe is not connected. Please connect Stripe through the Replit integration panel ' +
      'or set the STRIPE_SECRET_KEY environment variable.'
    );
  }
  return key;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export async function getUncachableStripeClient(): Promise<Stripe> {
  const key = getStripeSecretKey();
  return new Stripe(key);
}

export async function getStripeSync(): Promise<StripeSync> {
  if (stripeSyncInstance) return stripeSyncInstance;

  const stripeSecretKey = getStripeSecretKey();
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required for Stripe sync.');
  }

  stripeSyncInstance = new StripeSync({
    stripeSecretKey,
    poolConfig: {
      connectionString: databaseUrl,
    },
  });

  return stripeSyncInstance;
}
