-- Ejecuta esto en el SQL Editor de Supabase.
-- Actualiza el trigger handle_new_user para que también funcione con
-- usuarios que se registran vía Google OAuth (que no traen "nombres" ni
-- "apellidos" en raw_user_meta_data, sino "full_name" / "name").
--
-- Decisión tomada: partimos el full_name de Google automáticamente
-- (primer espacio separa nombres/apellidos). Si el nombre no tiene
-- espacio, "apellidos" queda como cadena vacía (la columna es NOT NULL
-- pero permite '').

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  tipo text;
  v_nombres text;
  v_apellidos text;
  v_full_name text;
  v_space_pos int;
begin
  -- Solo aceptamos 'cliente' o 'admin_gimnasio' desde el registro público.
  -- 'desarrollador' nunca se asigna automáticamente por seguridad.
  -- Los usuarios de Google nunca traen tipo_usuario -> quedan como 'cliente'.
  tipo := coalesce(new.raw_user_meta_data->>'tipo_usuario', 'cliente');
  if tipo not in ('cliente', 'admin_gimnasio') then
    tipo := 'cliente';
  end if;

  v_nombres := new.raw_user_meta_data->>'nombres';
  v_apellidos := new.raw_user_meta_data->>'apellidos';

  if v_nombres is null then
    -- No vino del formulario propio -> asumimos login con Google.
    v_full_name := coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    );
    v_space_pos := position(' ' in v_full_name);
    if v_space_pos > 0 then
      v_nombres := substring(v_full_name from 1 for v_space_pos - 1);
      v_apellidos := substring(v_full_name from v_space_pos + 1);
    else
      v_nombres := v_full_name;
      v_apellidos := '';
    end if;
  end if;

  insert into public.usuarios (idusuario, nombres, apellidos, correo, tipo_usuario)
  values (
    new.id,
    v_nombres,
    coalesce(v_apellidos, ''),
    new.email,
    tipo
  );
  return new;
end;
$$;

-- No hace falta recrear el trigger "on_auth_user_created": ya apunta a
-- esta función por nombre, y create or replace la actualiza in-place.
