alter table tournaments
  add column registration_open boolean not null default true,
  add column registration_mode text not null default 'open'
    check (registration_mode in ('open','cap','pick_first')),
  add column registration_limit int;
