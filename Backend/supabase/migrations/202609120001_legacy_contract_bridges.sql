-- Keep canonical CAS Assist writes compatible with prototype columns that
-- may still carry NOT NULL constraints in an upgraded database.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'announcements' and column_name = 'posted_by'
  ) then
    execute $function$
      create or replace function public.bridge_legacy_announcement_columns()
      returns trigger language plpgsql
      set search_path = public
      as $body$
      begin
        if new.created_by is null then new.created_by := new.posted_by; end if;
        if new.posted_by is null then new.posted_by := new.created_by; end if;
        if new.publish_at is null then new.publish_at := new.published_at; end if;
        if new.published_at is null then new.published_at := new.publish_at; end if;
        new.pinned := coalesce(new.pinned, new.is_pinned, false);
        new.is_pinned := new.pinned;
        return new;
      end
      $body$
    $function$;

    execute 'drop trigger if exists bridge_legacy_announcement_columns on public.announcements';
    execute 'create trigger bridge_legacy_announcement_columns before insert or update on public.announcements for each row execute function public.bridge_legacy_announcement_columns()';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'spatial_logs' and column_name = 'logged_by'
  ) then
    execute $function$
      create or replace function public.bridge_legacy_spatial_columns()
      returns trigger language plpgsql
      set search_path = public
      as $body$
      begin
        if new.faculty_id is null then new.faculty_id := new.logged_by; end if;
        if new.logged_by is null then new.logged_by := new.faculty_id; end if;
        if new.new_room is null then new.new_room := new.relocated_room; end if;
        if new.relocated_room is null then new.relocated_room := new.new_room; end if;
        if new.section_code is null then new.section_code := new.section; end if;
        if new.section is null then new.section := new.section_code; end if;
        return new;
      end
      $body$
    $function$;

    execute 'drop trigger if exists bridge_legacy_spatial_columns on public.spatial_logs';
    execute 'create trigger bridge_legacy_spatial_columns before insert or update on public.spatial_logs for each row execute function public.bridge_legacy_spatial_columns()';
  end if;
end $$;
