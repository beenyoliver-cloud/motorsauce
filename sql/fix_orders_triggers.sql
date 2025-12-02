-- Fix inventory reduction to happen when order_items are inserted (not just order)

-- Drop old trigger on orders insert
DROP TRIGGER IF EXISTS reduce_quantities_on_order ON public.orders;

-- Function: reduce listing quantity per order_item insert
CREATE OR REPLACE FUNCTION public.reduce_listing_quantity_on_item()
RETURNS TRIGGER AS $$
DECLARE
  st TEXT;
BEGIN
  -- Check parent order status; only reduce for pending/confirmed
  SELECT status INTO st FROM public.orders WHERE id = NEW.order_id;
  IF st IN ('pending','confirmed') THEN
    UPDATE public.listings
      SET quantity = GREATEST(0, COALESCE(quantity, 0) - NEW.quantity)
      WHERE id = NEW.listing_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on order_items insert
DROP TRIGGER IF EXISTS reduce_quantity_on_order_item_insert ON public.order_items;
CREATE TRIGGER reduce_quantity_on_order_item_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.reduce_listing_quantity_on_item();
