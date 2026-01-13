-- Cache postcode lookups for county/country + lat/lng (UK-focused, extensible)

create table if not exists public.postcode_cache (
  postcode text primary key,
  outcode text not null,
  county text,
  admin_district text,
  region text,
  country text,
  latitude double precision,
  longitude double precision,
  lat_rounded double precision,
  lng_rounded double precision,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists postcode_cache_outcode_idx on public.postcode_cache (outcode);

create table if not exists public.postcode_outcode_cache (
  outcode text primary key,
  counties text[],
  districts text[],
  regions text[],
  countries text[],
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.postcode_cache enable row level security;
alter table public.postcode_outcode_cache enable row level security;
