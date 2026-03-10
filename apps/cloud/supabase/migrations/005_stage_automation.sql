alter table stages
  add column status text not null default 'pending'
    check (status in ('pending','active','completed'));

alter table stages
  add column auto_advance boolean not null default true;

with first_stage as (
  select distinct on (tournament_id) id
  from stages
  order by tournament_id, stage_order
)
update stages s
set status = 'active'
from first_stage f
where s.id = f.id;
