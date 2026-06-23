import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type TeamInviteJoinMode = 'auto_join' | 'request';

export type TeamInviteRecord = {
  created_at: string;
  created_by: string;
  expires_at: string | null;
  id: string;
  join_mode: TeamInviteJoinMode;
  max_uses: number | null;
  status: 'active' | 'revoked' | 'expired';
  team_id: string;
  token: string;
  updated_at: string;
  use_count: number;
};

export type JoinTeamResult = {
  join_status: 'joined' | 'requested';
  request_id: string | null;
  team_id: string;
  team_name: string;
};

export async function createTeamInvite(
  teamId: string,
  joinMode: TeamInviteJoinMode,
): Promise<TeamInviteRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('create_team_invite', {
    p_expires_in_days: 30,
    p_join_mode: joinMode,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamInviteRecord;
}

export async function joinTeamWithInvite(
  token: string,
  message?: string,
): Promise<JoinTeamResult> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('join_team_with_invite', {
    p_message: message ?? null,
    p_token: token.trim().toLowerCase(),
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = result.data as JoinTeamResult[] | null;

  if (!rows?.[0]) {
    throw new Error('Could not join team from invite.');
  }

  return rows[0];
}
