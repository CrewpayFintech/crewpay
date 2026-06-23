create or replace function public.list_my_notifications()
returns table (
  notification_key text,
  notification_type text,
  title text,
  body text,
  team_id uuid,
  related_id uuid,
  created_at timestamptz,
  read_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  with visible_events as (
    select
      e.id,
      e.team_id,
      e.event_type,
      e.event_data,
      e.created_at,
      t.name as team_name
    from public.team_activity_events e
    join public.teams t on t.id = e.team_id
    where
      (
        e.event_type = 'task.created'
        and public.is_team_member(e.team_id)
      )
      or (
        e.event_type in (
          'payout.batch.reserved',
          'task.submitted',
          'team.join.requested',
          'team.member.joined'
        )
        and public.can_manage_team(e.team_id)
      )
      or (
        e.event_type = 'task.submission_reviewed'
        and e.event_data->>'member_id' = auth.uid()::text
      )
      or (
        e.event_type in (
          'team.join.approved',
          'team.join.rejected',
          'team.member.removed',
          'team.member_role.updated'
        )
        and coalesce(
          e.event_data->>'member_id',
          e.event_data->>'member_profile_id'
        ) = auth.uid()::text
      )
  )
  select
    'event:' || ve.id::text as notification_key,
    ve.event_type as notification_type,
    case ve.event_type
      when 'task.created' then 'New task assigned'
      when 'task.submitted' then 'Proof submitted'
      when 'task.submission_reviewed' then
        case ve.event_data->>'status'
          when 'approved' then 'Submission approved'
          else 'Submission rejected'
        end
      when 'payout.batch.reserved' then 'Payouts reserved'
      when 'team.join.requested' then 'New join request'
      when 'team.member.joined' then 'New team member'
      when 'team.join.approved' then 'Join request approved'
      when 'team.join.rejected' then 'Join request rejected'
      when 'team.member.removed' then 'Removed from team'
      when 'team.member_role.updated' then 'Team role updated'
      else 'CrewPay update'
    end as title,
    case ve.event_type
      when 'task.created' then coalesce(ve.event_data->>'title', 'A task') || ' was assigned to ' || ve.team_name || '.'
      when 'task.submitted' then coalesce(ve.event_data->>'task_title', 'A task') || ' has a new submission.'
      when 'task.submission_reviewed' then coalesce(ve.event_data->>'task_title', 'Your task') || ' was ' || coalesce(ve.event_data->>'status', 'reviewed') || '.'
      when 'payout.batch.reserved' then 'A payout batch is ready for ' || ve.team_name || '.'
      when 'team.join.requested' then 'A CrewMate asked to join ' || ve.team_name || '.'
      when 'team.member.joined' then 'A CrewMate joined ' || ve.team_name || '.'
      when 'team.join.approved' then 'You can now access ' || ve.team_name || '.'
      when 'team.join.rejected' then 'Your request to join ' || ve.team_name || ' was not approved.'
      when 'team.member.removed' then 'Your access to ' || ve.team_name || ' was removed.'
      when 'team.member_role.updated' then 'Your role in ' || ve.team_name || ' is now ' || coalesce(ve.event_data->>'role', 'updated') || '.'
      else 'Open CrewPay for details.'
    end as body,
    ve.team_id,
    nullif(
      coalesce(
        ve.event_data->>'submission_id',
        ve.event_data->>'request_id',
        ve.event_data->>'task_id',
        ve.event_data->>'payout_batch_id',
        ''
      ),
      ''
    )::uuid as related_id,
    ve.created_at,
    nr.read_at
  from visible_events ve
  left join public.notification_reads nr
    on nr.profile_id = auth.uid()
    and nr.notification_key = 'event:' || ve.id::text
  order by ve.created_at desc
  limit 100;
$$;

grant execute on function public.list_my_notifications() to authenticated;
