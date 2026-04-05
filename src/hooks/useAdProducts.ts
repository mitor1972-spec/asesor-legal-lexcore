import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface AdProductCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
}

export interface AdProduct {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  product_type: string;
  base_price: number;
  price_unit: string;
  geo_pricing: any;
  area_multipliers: any;
  keyword_multipliers: any;
  discount_quarterly: number;
  discount_semester: number;
  discount_annual: number;
  max_slots: number | null;
  is_active: boolean;
  is_featured: boolean;
  sort_order: number;
  badge: string | null;
  premium_benefits: string[] | null;
  created_at: string;
  updated_at: string;
  category?: AdProductCategory;
}

export interface AdOrder {
  id: string;
  lawfirm_id: string;
  product_id: string;
  duration: string;
  geo_scope: string | null;
  geo_target: string | null;
  areas_selected: string[] | null;
  keywords_count: number;
  config_json: any;
  base_amount: number;
  multiplier_areas: number;
  multiplier_keywords: number;
  discount_percent: number;
  final_amount: number;
  payment_method: string;
  payment_status: string;
  starts_at: string | null;
  ends_at: string | null;
  auto_renew: boolean;
  status: string;
  notes: string | null;
  created_at: string;
  product?: AdProduct;
  lawfirm?: { name: string; contact_email: string | null };
}

export function useAdCategories() {
  return useQuery({
    queryKey: ['ad-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ad_product_categories')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data as AdProductCategory[];
    },
  });
}

export function useAdProducts(categorySlug?: string) {
  return useQuery({
    queryKey: ['ad-products', categorySlug],
    queryFn: async () => {
      let query = supabase
        .from('ad_products')
        .select('*, category:ad_product_categories(*)')
        .order('sort_order');
      
      if (categorySlug) {
        const { data: cat } = await supabase
          .from('ad_product_categories')
          .select('id')
          .eq('slug', categorySlug)
          .single();
        if (cat) query = query.eq('category_id', cat.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as AdProduct[];
    },
  });
}

export function useAdOrders(lawfirmId?: string) {
  return useQuery({
    queryKey: ['ad-orders', lawfirmId],
    queryFn: async () => {
      let query = supabase
        .from('ad_orders')
        .select('*, product:ad_products(name, product_type, price_unit), lawfirm:lawfirms(name, contact_email)')
        .order('created_at', { ascending: false });

      if (lawfirmId) {
        query = query.eq('lawfirm_id', lawfirmId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as unknown as AdOrder[];
    },
  });
}

export function useAdInvoices(lawfirmId?: string) {
  return useQuery({
    queryKey: ['ad-invoices', lawfirmId],
    queryFn: async () => {
      let query = supabase
        .from('ad_invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (lawfirmId) {
        query = query.eq('lawfirm_id', lawfirmId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AdProduct> & { id: string }) => {
      const { error } = await supabase
        .from('ad_products')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-products'] }),
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (order: any) => {
      const { data, error } = await supabase
        .from('ad_orders')
        .insert(order)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ad-orders'] }),
  });
}

export function calcPrice(product: AdProduct, config: {
  duration: string;
  geoScope?: string;
  areasCount?: number;
  keywordsCount?: number;
}) {
  let base = product.base_price;

  // Geographic pricing
  if (config.geoScope && product.geo_pricing) {
    const geo = product.geo_pricing;
    if (product.product_type === 'section') {
      if (config.duration === 'quarterly') base = (geo.quarterly_total || base * 3) / 3;
      else if (config.duration === 'semester') base = (geo.semester_total || base * 6) / 6;
      else if (config.duration === 'annual') base = (geo.annual_total || base * 12) / 12;
    } else {
      base = geo[config.geoScope] ?? base;
    }
  }

  // Area multiplier
  let areaMult = 1;
  if (config.areasCount && config.areasCount > 1 && product.area_multipliers) {
    const tiers = Array.isArray(product.area_multipliers) ? product.area_multipliers : [];
    for (const t of tiers) {
      if (config.areasCount >= t.min && config.areasCount <= t.max) {
        areaMult = t.multiplier;
        break;
      }
    }
  }

  // Keyword multiplier
  let kwMult = 1;
  if (config.keywordsCount && config.keywordsCount > 10 && product.keyword_multipliers) {
    const tiers = Array.isArray(product.keyword_multipliers) ? product.keyword_multipliers : [];
    for (const t of tiers) {
      if (config.keywordsCount >= t.min && config.keywordsCount <= t.max) {
        kwMult = t.multiplier;
        break;
      }
    }
  }

  // Duration discount
  let discount = 0;
  if (config.duration === 'quarterly') discount = product.discount_quarterly;
  else if (config.duration === 'semester') discount = product.discount_semester;
  else if (config.duration === 'annual') discount = product.discount_annual;

  const subtotal = base * areaMult * kwMult;
  const discountAmount = subtotal * (discount / 100);
  const finalMonthly = subtotal - discountAmount;

  let months = 1;
  if (config.duration === 'quarterly') months = 3;
  else if (config.duration === 'semester') months = 6;
  else if (config.duration === 'annual') months = 12;

  return {
    basePrice: base,
    areaMult,
    kwMult,
    discount,
    monthlyPrice: finalMonthly,
    totalPrice: finalMonthly * months,
    months,
  };
}
