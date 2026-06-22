create or replace function public.submit_task_proof(
  p_task_id uuid,
  p_team_id uuid,
  p_proof_text text,
  p_proof_assets jsonb default '[]'::jsonb
)
returns public.task_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_task public.tasks;
  v_submission public.task_submissions;
  v_attempt integer;
  v_assets jsonb := coalesce(p_proof_assets, '[]'::jsonb);
  v_proof_types public.task_proof_type[];
  v_has_accepted_proof boolean := false;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  insert into public.profiles (id, account_role)
  values (v_user_id, 'crewmate')
  on conflict (id) do nothing;

  select *
  into v_task
  from public.tasks
  where id = p_task_id
    and status = 'published';

  if v_task.id is null then
    raise exception 'Task is not available';
  end if;

  if not exists (
    select 1
    from public.task_team_assignments tta
    where tta.task_id = p_task_id
      and tta.team_id = p_team_id
  ) then
    raise exception 'This task is not assigned to that team';
  end if;

  if not exists (
    select 1
    from public.team_members tm
    where tm.team_id = p_team_id
      and tm.profile_id = v_user_id
      and tm.status = 'active'
  ) then
    raise exception 'Join this team before submitting proof';
  end if;

  if exists (
    select 1
    from public.task_submissions ts
    where ts.task_id = p_task_id
      and ts.team_id = p_team_id
      and ts.member_id = v_user_id
      and ts.status = 'submitted'
  ) then
    raise exception 'You already have a submission waiting for review';
  end if;

  if exists (
    select 1
    from public.task_submissions ts
    where ts.task_id = p_task_id
      and ts.team_id = p_team_id
      and ts.member_id = v_user_id
      and ts.status in ('approved', 'paid')
  ) then
    raise exception 'This task has already been approved for you';
  end if;

  v_proof_types := coalesce(
    nullif(v_task.proof_types, array[]::public.task_proof_type[]),
    array[v_task.proof_type]
  );

  v_has_accepted_proof :=
    'none' = any(v_proof_types)
    or (
      'text' = any(v_proof_types)
      and char_length(trim(coalesce(p_proof_text, ''))) >= 2
    )
    or (
      'photo' = any(v_proof_types)
      and public.submission_has_asset_kind(v_assets, 'photo')
    )
    or (
      'video' = any(v_proof_types)
      and public.submission_has_asset_kind(v_assets, 'video')
    )
    or (
      'document' = any(v_proof_types)
      and public.submission_has_asset_kind(v_assets, 'document')
    )
    or (
      'location' = any(v_proof_types)
      and public.submission_has_asset_kind(v_assets, 'location')
    );

  if not v_has_accepted_proof then
    raise exception 'Add at least one accepted proof before submitting';
  end if;

  select count(*)::integer + 1
  into v_attempt
  from public.task_submissions ts
  where ts.task_id = p_task_id
    and ts.team_id = p_team_id
    and ts.member_id = v_user_id;

  insert into public.task_submissions (
    task_id,
    team_id,
    member_id,
    proof_text,
    proof_asset_url,
    proof_assets,
    attempt_number,
    status
  )
  values (
    p_task_id,
    p_team_id,
    v_user_id,
    nullif(trim(coalesce(p_proof_text, '')), ''),
    nullif(v_assets->0->>'path', ''),
    v_assets,
    v_attempt,
    'submitted'
  )
  returning * into v_submission;

  insert into public.team_activity_events (
    team_id,
    actor_id,
    event_type,
    event_data
  )
  values (
    p_team_id,
    v_user_id,
    'task.submitted',
    jsonb_build_object(
      'submission_id', v_submission.id,
      'task_id', p_task_id,
      'task_title', v_task.title,
      'attempt_number', v_attempt
    )
  );

  return v_submission;
end;
$$;

revoke all on function public.submit_task_proof(uuid, uuid, text, jsonb) from public, anon;
grant execute on function public.submit_task_proof(uuid, uuid, text, jsonb) to authenticated;
