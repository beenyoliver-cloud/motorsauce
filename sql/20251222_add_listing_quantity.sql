-- Add quantity (stock) to listings
--
-- Default to 1 for existing listings.

alter table if exists listings
  add column if not exists quantity integer not null default 1;

-- Ensure no existing rows have NULL quantity
update listings set quantity = 1 where quantity is null;

-- Helpful index for filtering in-stock items
create index if not exists idx_listings_quantity on listings (quantity);
