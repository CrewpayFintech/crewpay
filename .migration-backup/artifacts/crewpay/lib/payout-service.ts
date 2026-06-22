import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type PayoutQueueItem = {
  account_name: string | null;
  account_number: string | null;
  amount_naira: number;
  approved_at: string | null;
  bank_name: string | null;
  member_id: string;
  member_name: string;
  payout_approval_id: string;
  status: 'pending' | 'reserved' | string;
  task_id: string;
  task_submission_id: string;
  task_title: string;
  team_id: string;
};

export type ReservedPayoutBatch = {
  item_count: number;
  payout_batch_id: string;
  total_amount_naira: number;
};

export async function listTeamPayoutQueue(
  teamId: string,
): Promise<PayoutQueueItem[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_team_payout_queue', {
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as PayoutQueueItem[];
}

export async function updatePayoutApprovalAmount(
  payoutApprovalId: string,
  amountNaira: number,
): Promise<PayoutQueueItem> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('update_payout_approval_amount', {
    p_amount_naira: amountNaira,
    p_payout_approval_id: payoutApprovalId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as PayoutQueueItem;
}

export async function reservePayoutApprovals(
  teamId: string,
  payoutApprovalIds: string[],
): Promise<ReservedPayoutBatch> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('reserve_payout_approvals', {
    p_payout_approval_ids: payoutApprovalIds,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  const batch = Array.isArray(result.data) ? result.data[0] : result.data;

  if (!batch) {
    throw new Error('CrewPay could not reserve these payouts.');
  }

  return batch as ReservedPayoutBatch;
}
