import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type TeamJoinRequest = {
  request_id: string;
  request_message: string | null;
  request_status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_at: string;
  requester_id: string;
  requester_name: string;
  team_id: string;
  team_name: string;
};

export type MyJoinRequestStatus = Pick<
  TeamJoinRequest,
  | 'request_id'
  | 'request_message'
  | 'request_status'
  | 'requested_at'
  | 'team_id'
  | 'team_name'
> & {
  reviewed_at: string | null;
};

export async function listPendingJoinRequests(): Promise<TeamJoinRequest[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_team_join_requests', {
    p_status: 'pending',
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as TeamJoinRequest[];
}

export async function approveJoinRequest(requestId: string) {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('approve_team_join_request', {
    p_request_id: requestId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function rejectJoinRequest(requestId: string) {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('reject_team_join_request', {
    p_request_id: requestId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data;
}

export async function listMyJoinRequestStatuses(): Promise<MyJoinRequestStatus[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_my_join_requests');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as MyJoinRequestStatus[];
}
