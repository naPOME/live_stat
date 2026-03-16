alter table organizations
  add column if not exists api_key uuid not null default gen_random_uuid();

create unique index if not exists idx_organizations_api_key on organizations(api_key);
