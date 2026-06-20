import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type TaskAssignmentMode =
  | 'team_claim'
  | 'admin_assign'
  | 'first_come'
  | 'multi_complete';

export type TaskLocationType = 'remote' | 'physical' | 'hybrid';

export type TaskProofType =
  | 'photo'
  | 'video'
  | 'document'
  | 'text'
  | 'location'
  | 'none';

export type CreateTaskInput = {
  approvalMode: string;
  assignmentMode: TaskAssignmentMode;
  category: string;
  description: string;
  dueAt: string | null;
  instructions: string;
  locationNote: string;
  locationType: TaskLocationType;
  payoutAmountNaira: number;
  peopleNeeded: number;
  proofType: TaskProofType;
  proofTypes: TaskProofType[];
  successCriteria: string;
  teamIds: string[];
  title: string;
};

export type UpdateTaskSettingsInput = {
  approvalMode: string;
  assignmentMode: TaskAssignmentMode;
  proofType: TaskProofType;
  proofTypes: TaskProofType[];
};

export type TaskRecord = {
  approval_mode: string;
  assignment_mode: TaskAssignmentMode;
  category: string;
  created_at: string;
  creator_id: string;
  description: string;
  due_at: string | null;
  id: string;
  instructions: string;
  location_note: string | null;
  location_type: TaskLocationType;
  payout_amount_naira: number;
  people_needed: number;
  proof_type: TaskProofType;
  proof_types?: TaskProofType[];
  status: string;
  success_criteria: string;
  title: string;
  updated_at: string;
};

export type TaskWithTeams = TaskRecord & {
  task_team_assignments?: Array<{
    team_id: string;
  }>;
};

export async function createTaskRecord(
  input: CreateTaskInput,
): Promise<TaskRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('create_task_with_teams', {
    p_approval_mode: input.approvalMode,
    p_assignment_mode: input.assignmentMode,
    p_category: input.category,
    p_description: input.description,
    p_due_at: input.dueAt,
    p_instructions: input.instructions,
    p_location_note: input.locationNote || null,
    p_location_type: input.locationType,
    p_payout_amount_naira: input.payoutAmountNaira,
    p_people_needed: input.peopleNeeded,
    p_proof_type: input.proofType,
    p_proof_types: input.proofTypes.length > 0 ? input.proofTypes : [input.proofType],
    p_success_criteria: input.successCriteria,
    p_team_ids: input.teamIds,
    p_title: input.title,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TaskRecord;
}

export async function listMyTasks(): Promise<TaskWithTeams[]> {
  await ensureAuthenticatedUser();

  const result = await supabase
    .from('tasks')
    .select(
      'approval_mode, assignment_mode, category, created_at, creator_id, description, due_at, id, instructions, location_note, location_type, payout_amount_naira, people_needed, proof_type, proof_types, status, success_criteria, title, updated_at, task_team_assignments(team_id)',
    )
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as TaskWithTeams[];
}

export async function archiveTaskRecord(taskId: string): Promise<void> {
  await ensureAuthenticatedUser();

  const result = await supabase
    .from('tasks')
    .update({ status: 'archived' })
    .eq('id', taskId);

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function updateTaskSettings(
  taskId: string,
  input: UpdateTaskSettingsInput,
): Promise<TaskWithTeams> {
  await ensureAuthenticatedUser();

  const proofTypes = input.proofTypes.length > 0 ? input.proofTypes : [input.proofType];

  const result = await supabase
    .from('tasks')
    .update({
      approval_mode: input.approvalMode,
      assignment_mode: input.assignmentMode,
      proof_type: input.proofType,
      proof_types: proofTypes,
    })
    .eq('id', taskId)
    .select(
      'approval_mode, assignment_mode, category, created_at, creator_id, description, due_at, id, instructions, location_note, location_type, payout_amount_naira, people_needed, proof_type, proof_types, status, success_criteria, title, updated_at, task_team_assignments(team_id)',
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TaskWithTeams;
}
