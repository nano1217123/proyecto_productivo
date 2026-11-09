-- Ejecuta esto en el SQL Editor de tu proyecto de Supabase.
-- Crea la tabla "usuarios" conectada a auth.users, con RLS y el
-- trigger que crea automáticamente el perfil al registrarse.

create table public.usuarios (
  idusuario uuid not null primary key references auth.users(id) on delete cascade,
  nombres varchar not null,
  apellidos varchar not null,
  correo varchar not null unique,
  tipo_usuario varchar not null default 'estandar',
  tiempo_registrado timestamptz not null default now(),
  tiempo_duracion_inscripcion interval not null default interval '30 days'
);

alter table public.usuarios enable row level security;

create policy "usuarios_select_propio"
  on public.usuarios for select
  using (auth.uid() = idusuario);

create policy "usuarios_update_propio"
  on public.usuarios for update
  using (auth.uid() = idusuario);

alter table public.usuarios
  add constraint tipo_usuario_valido
  check (tipo_usuario in ('cliente', 'admin_gimnasio', 'desarrollador'));

alter table public.usuarios
  alter column tipo_usuario set default 'cliente';

create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  tipo text;
begin
  -- Solo aceptamos 'cliente' o 'admin_gimnasio' desde el registro público.
  -- 'desarrollador' nunca se asigna automáticamente por seguridad.
  tipo := coalesce(new.raw_user_meta_data->>'tipo_usuario', 'cliente');
  if tipo not in ('cliente', 'admin_gimnasio') then
    tipo := 'cliente';
  end if;

  insert into public.usuarios (idusuario, nombres, apellidos, correo, tipo_usuario)
  values (
    new.id,
    new.raw_user_meta_data->>'nombres',
    new.raw_user_meta_data->>'apellidos',
    new.email,
    tipo
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();