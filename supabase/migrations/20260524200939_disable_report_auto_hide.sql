create index if not exists recommendation_photos_recommendation_id_idx
	on public.recommendation_photos(recommendation_id);

create index if not exists admin_audit_logs_recommendation_action_idx
	on public.admin_audit_logs(recommendation_id, action);

create index if not exists recommendations_visible_idx
	on public.recommendations(status)
	where status <> 'hidden'::public.moderation_status;

drop policy if exists "active recommendations are readable" on public.recommendations;
drop policy if exists "visible recommendations are readable" on public.recommendations;

create policy "visible recommendations are readable" on public.recommendations
	for select using (status <> 'hidden'::public.moderation_status or (select public.is_admin()));

drop policy if exists "photos follow readable recommendations" on public.recommendation_photos;
drop policy if exists "photos follow visible recommendations" on public.recommendation_photos;

create policy "photos follow visible recommendations" on public.recommendation_photos
	for select using (
		exists (
			select 1 from public.recommendations r
			where r.id = recommendation_id and (r.status <> 'hidden'::public.moderation_status or (select public.is_admin()))
		)
	);

drop trigger if exists prevent_non_admin_moderation_status_change on public.recommendations;
drop function if exists public.prevent_non_admin_moderation_status_change();

revoke update on table public.recommendations from public, anon, authenticated;

grant update (
	dish_name,
	place_name,
	category,
	city,
	neighborhood,
	address,
	location,
	price_paid,
	price_band,
	value_score,
	summary,
	why_worth_it,
	updated_at
) on table public.recommendations to authenticated;

create or replace function public.increment_recommendation_report_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
	update public.recommendations
	set
		report_count = report_count + 1,
		status = case
			when status = 'hidden'::public.moderation_status then status
			else 'reported'::public.moderation_status
		end,
		updated_at = now()
	where id = new.recommendation_id;

	return new;
end;
$$;

revoke execute on function public.increment_recommendation_report_count() from public, anon, authenticated;

drop trigger if exists reports_increment_recommendation_report_count on public.reports;

create trigger reports_increment_recommendation_report_count
after insert on public.reports
for each row execute function public.increment_recommendation_report_count();

create or replace function public.update_recommendation_status(
	p_recommendation_id uuid,
	p_next_status public.moderation_status,
	p_admin_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
	if auth.uid() is null or auth.uid() <> p_admin_id or not (select public.is_admin()) then
		raise exception 'Only admins can update recommendation moderation status';
	end if;

	update public.recommendations
	set
		status = p_next_status,
		updated_at = now()
	where id = p_recommendation_id;

	if not found then
		raise exception 'Recommendation not found';
	end if;

	insert into public.admin_audit_logs (admin_id, recommendation_id, action)
	values (p_admin_id, p_recommendation_id, p_next_status::text);
end;
$$;

revoke execute on function public.update_recommendation_status(uuid, public.moderation_status, uuid) from public, anon;
grant execute on function public.update_recommendation_status(uuid, public.moderation_status, uuid) to authenticated;
