-- Atomic lead purchase RPC
-- Wraps all purchase steps in a single transaction with FOR UPDATE locking
CREATE OR REPLACE FUNCTION public.purchase_lead_atomic(
  _lead_id uuid,
  _lawfirm_id uuid,
  _user_id uuid,
  _is_commission boolean DEFAULT false,
  _commission_percent numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lead record;
  v_lawfirm record;
  v_price numeric;
  v_current_balance numeric;
  v_new_balance numeric;
  v_has_email boolean;
  v_has_phone boolean;
  v_existing_assignment uuid;
BEGIN
  -- 1. Lock the lead row to prevent concurrent purchases
  SELECT id, status_internal, is_in_marketplace, marketplace_price, price_final,
         structured_fields, is_demo
  INTO v_lead
  FROM public.leads
  WHERE id = _lead_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead no encontrado', 'code', 'LEAD_NOT_FOUND');
  END IF;

  -- 2. Check lead is still pending and in marketplace
  IF v_lead.status_internal IS DISTINCT FROM 'Pendiente' OR COALESCE(v_lead.is_in_marketplace, false) = false THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead no disponible en el marketplace', 'code', 'LEAD_UNAVAILABLE');
  END IF;

  -- 3. Check no existing assignment (exclusivity)
  SELECT id INTO v_existing_assignment
  FROM public.lead_assignments
  WHERE lead_id = _lead_id
  LIMIT 1;

  IF v_existing_assignment IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Este lead ya ha sido asignado a otro despacho', 'code', 'ALREADY_ASSIGNED');
  END IF;

  -- 4. Golden Rule: email or phone required
  v_has_email := COALESCE(NULLIF(TRIM(v_lead.structured_fields->>'email'), ''), '') <> '';
  v_has_phone := COALESCE(NULLIF(TRIM(v_lead.structured_fields->>'telefono'), ''), '') <> '';

  IF NOT v_has_email AND NOT v_has_phone THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead sin contacto válido', 'code', 'NO_CONTACT');
  END IF;

  -- 5. Lock and read lawfirm
  SELECT id, name, marketplace_balance
  INTO v_lawfirm
  FROM public.lawfirms
  WHERE id = _lawfirm_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Despacho no encontrado', 'code', 'LAWFIRM_NOT_FOUND');
  END IF;

  -- 6. Compute price and validate balance
  v_price := CASE WHEN _is_commission THEN 0
                  ELSE COALESCE(v_lead.marketplace_price, v_lead.price_final, 0) END;
  v_current_balance := COALESCE(v_lawfirm.marketplace_balance, 0);

  IF NOT _is_commission AND v_current_balance < v_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Saldo insuficiente',
      'code', 'INSUFFICIENT_BALANCE',
      'current_balance', v_current_balance,
      'required', v_price
    );
  END IF;

  v_new_balance := v_current_balance - v_price;

  -- 7. Update lawfirm balance
  UPDATE public.lawfirms
  SET marketplace_balance = v_new_balance
  WHERE id = _lawfirm_id;

  -- 8. Create purchase record
  INSERT INTO public.lead_purchases (lead_id, lawfirm_id, user_id, price_paid, previous_balance, new_balance)
  VALUES (_lead_id, _lawfirm_id, _user_id, v_price, v_current_balance, v_new_balance);

  -- 9. Create balance transaction
  INSERT INTO public.balance_transactions (lawfirm_id, type, amount, description, reference_id, balance_before, balance_after, created_by)
  VALUES (_lawfirm_id, 'purchase', -v_price, 'Compra de lead en LeadsMarket', _lead_id, v_current_balance, v_new_balance, _user_id);

  -- 10. Update lead status (remove from marketplace)
  UPDATE public.leads
  SET is_in_marketplace = false,
      status_internal = 'Enviado'
  WHERE id = _lead_id;

  -- 11. Create assignment (unique constraint on lead_id provides extra safety)
  INSERT INTO public.lead_assignments (
    lead_id, lawfirm_id, assigned_by_user_id, status_delivery, firm_status,
    is_commission, commission_percent, commission_origin, commission_terms_confirmed_at, lead_cost
  ) VALUES (
    _lead_id, _lawfirm_id, _user_id, 'delivered', 'received',
    COALESCE(_is_commission, false),
    CASE WHEN _is_commission THEN COALESCE(_commission_percent, 20) ELSE NULL END,
    CASE WHEN _is_commission THEN 'marketplace_commission' ELSE NULL END,
    CASE WHEN _is_commission THEN now() ELSE NULL END,
    CASE WHEN _is_commission THEN 0 ELSE v_price END
  );

  -- 12. Insert lead_history if table exists
  BEGIN
    INSERT INTO public.lead_history (lead_id, user_id, action, details)
    VALUES (
      _lead_id, _user_id, 'purchased_marketplace',
      jsonb_build_object('lawfirm_id', _lawfirm_id, 'lawfirm_name', v_lawfirm.name, 'price_paid', v_price)
    );
  EXCEPTION WHEN undefined_table THEN
    -- silently skip if lead_history doesn't exist
    NULL;
  END;

  RETURN jsonb_build_object(
    'success', true,
    'lead_id', _lead_id,
    'price_paid', v_price,
    'new_balance', v_new_balance,
    'is_commission', COALESCE(_is_commission, false)
  );

EXCEPTION
  WHEN unique_violation THEN
    -- Race condition on lead_assignments unique constraint
    RETURN jsonb_build_object('success', false, 'error', 'Este lead ya ha sido asignado a otro despacho', 'code', 'ALREADY_ASSIGNED');
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM, 'code', 'INTERNAL_ERROR');
END;
$$;

-- Restrict execution: only authenticated users
REVOKE ALL ON FUNCTION public.purchase_lead_atomic(uuid, uuid, uuid, boolean, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purchase_lead_atomic(uuid, uuid, uuid, boolean, numeric) TO authenticated, service_role;