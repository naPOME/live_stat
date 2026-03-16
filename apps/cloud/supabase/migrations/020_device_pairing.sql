create table if not exists org_devices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  name text,
  device_token uuid not null default gen_random_uuid(),
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  last_seen timestamptz
);

create unique index if not exists idx_org_devices_token on org_devices(device_token);
create index if not exists idx_org_devices_org_id on org_devices(org_id);

create table if not exists device_pairings (
  code text primary key,
  org_id uuid references organizations(id) on delete cascade,
  device_token uuid,
  device_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  approved_at timestamptz
);

create index if not exists idx_device_pairings_org_id on device_pairings(org_id);
