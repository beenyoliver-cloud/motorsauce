-- Create orders system for tracking purchases
-- Ensures listings are removed/reduced when sold and buyers can manage their orders

-- Orders table: main order record
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Buyer information
  buyer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Order totals
  items_subtotal NUMERIC(10, 2) NOT NULL,
  service_fee NUMERIC(10, 2) NOT NULL,
  shipping_cost NUMERIC(10, 2) NOT NULL,
  total NUMERIC(10, 2) NOT NULL,
  
  -- Shipping details
  shipping_method TEXT NOT NULL CHECK (shipping_method IN ('standard', 'collection')),
  
  -- Order status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled')),
  
  -- Cancellation
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Order items: individual items in each order
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE SET NULL,
  
  -- Seller info (denormalized for historical record)
  seller_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_name TEXT NOT NULL,
  
  -- Item details (snapshot at purchase time)
  title TEXT NOT NULL,
  image TEXT,
  price NUMERIC(10, 2) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_buyer_id ON public.orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_seller_id ON public.order_items(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_items_listing_id ON public.order_items(listing_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS orders_updated_at ON public.orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Function to reduce listing quantity when order is created
CREATE OR REPLACE FUNCTION reduce_listing_quantities()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Loop through all items in the new order
  FOR item IN 
    SELECT listing_id, quantity 
    FROM public.order_items 
    WHERE order_id = NEW.id
  LOOP
    -- Reduce the listing quantity
    UPDATE public.listings
    SET quantity = GREATEST(0, COALESCE(quantity, 0) - item.quantity)
    WHERE id = item.listing_id;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to reduce quantities when order is confirmed (not on pending)
DROP TRIGGER IF EXISTS reduce_quantities_on_order ON public.orders;
CREATE TRIGGER reduce_quantities_on_order
  AFTER INSERT ON public.orders
  FOR EACH ROW
  WHEN (NEW.status = 'confirmed' OR NEW.status = 'pending')
  EXECUTE FUNCTION reduce_listing_quantities();

-- Function to restore listing quantity when order is cancelled
CREATE OR REPLACE FUNCTION restore_listing_quantities()
RETURNS TRIGGER AS $$
DECLARE
  item RECORD;
BEGIN
  -- Only restore if status changed to cancelled
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    FOR item IN 
      SELECT listing_id, quantity 
      FROM public.order_items 
      WHERE order_id = NEW.id
    LOOP
      -- Restore the listing quantity
      UPDATE public.listings
      SET quantity = COALESCE(quantity, 0) + item.quantity
      WHERE id = item.listing_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to restore quantities when order is cancelled
DROP TRIGGER IF EXISTS restore_quantities_on_cancel ON public.orders;
CREATE TRIGGER restore_quantities_on_cancel
  AFTER UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION restore_listing_quantities();

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Buyers can view their own orders
CREATE POLICY "Users can view their own orders"
  ON public.orders
  FOR SELECT
  USING (auth.uid() = buyer_id);

-- Buyers can insert their own orders (checkout process)
CREATE POLICY "Users can create their own orders"
  ON public.orders
  FOR INSERT
  WITH CHECK (auth.uid() = buyer_id);

-- Buyers can update their own orders (cancel, etc.)
CREATE POLICY "Users can update their own orders"
  ON public.orders
  FOR UPDATE
  USING (auth.uid() = buyer_id);

-- Sellers can view order items for their listings
CREATE POLICY "Sellers can view items from their orders"
  ON public.order_items
  FOR SELECT
  USING (
    auth.uid() = seller_id 
    OR 
    auth.uid() IN (
      SELECT buyer_id FROM public.orders WHERE id = order_id
    )
  );

-- Buyers can insert order items (checkout process)
CREATE POLICY "Buyers can create order items"
  ON public.order_items
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT buyer_id FROM public.orders WHERE id = order_id
    )
  );

-- Comments for documentation
COMMENT ON TABLE public.orders IS 'Customer orders with status tracking and cancellation support';
COMMENT ON TABLE public.order_items IS 'Individual items within each order, linked to listings and sellers';
COMMENT ON COLUMN public.orders.status IS 'Order status: pending, confirmed, shipped, delivered, cancelled';
COMMENT ON FUNCTION reduce_listing_quantities() IS 'Automatically reduces listing quantities when order is placed';
COMMENT ON FUNCTION restore_listing_quantities() IS 'Restores listing quantities when order is cancelled';
