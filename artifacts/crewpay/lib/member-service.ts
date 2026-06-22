import { supabase } from './supabase';
import { ensureAuthenticatedUser, type TeamMemberRole } from './team-service';

export type TeamMemberListItem = {
  joined_at: string | null;
  member_id: string;
  member_name: string;
  member_role: TeamMemberRole;
  member_status: string;
  profile_id: string;
};

export type TeamMemberDetail = TeamMemberListItem & {
  account_name: string | null;
  account_number: string | null;
  approved_submissions: number;
  bank_code: string | null;
  bank_is_verified: boolean;
  bank_name: string | null;
  email: string | null;
  payout_ready_amount_naira: number;
  pending_submissions: number;
  rejected_submissions: number;
};

export async function listTeamMembers(
  teamId: string,
): Promise<TeamMemberListItem[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_team_members', {
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as TeamMemberListItem[];
}

export async function getTeamMemberDetail(
  teamId: string,
  profileId: string,
): Promise<TeamMemberDetail> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('get_team_member_detail', {
    p_profile_id: profileId,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const detail = Array.isArray(result.data) ? result.data[0] : result.data;

  if (!detail) {
    throw new Error('Member details are not available yet.');
  }

  return detail as TeamMemberDetail;
}

export async function updateTeamMemberRole(
  teamId: string,
  profileId: string,
  role: Exclude<TeamMemberRole, 'owner'>,
): Promise<TeamMemberListItem> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('update_team_member_role', {
    p_profile_id: profileId,
    p_role: role,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamMemberListItem;
}

export async function removeTeamMember(
  teamId: string,
  profileId: string,
): Promise<TeamMemberListItem> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('remove_team_member', {
    p_profile_id: profileId,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamMemberListItem;
}
