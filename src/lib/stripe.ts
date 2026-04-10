import { supabase } from '@/integrations/supabase/client';
import { loadStripe } from '@stripe/stripe-js';

// Publishable key - safe to include in frontend
const STRIPE_PUBLIC_KEY = 'pk_live_510akFeHRbfOnapOGqvEGUvCwNZ8Mq10ZpI';

let stripePromise: ReturnType<typeof loadStripe> | null = null;

function getStripe() {
  if (!stripePromise) {
    stripePromise = loadStripe(STRIPE_PUBLIC_KEY);
  }
  return stripePromise;
}

interface StripePurchaseParams {
  leadId: string;
  lawfirmId: string;
}

export async function purchaseWithStripe({ leadId, lawfirmId }: StripePurchaseParams) {
  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: { lead_id: leadId, lawfirm_id: lawfirmId },
  });

  if (error) throw error;
  if (data?.error) throw new Error(data.error);

  const redirectUrl = data?.sessionUrl;
  if (!redirectUrl) throw new Error('No se recibió URL de pago');
  
  window.location.href = redirectUrl;
}
