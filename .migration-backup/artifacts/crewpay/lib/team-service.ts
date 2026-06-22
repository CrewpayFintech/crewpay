import { supabase } from './supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

const cachedTeamDraftKey = 'crewpay.last-team-draft.v1';

export type TeamMemberRole = 'owner' | 'admin' | 'member';

export type TeamTaskSettings = {
  defaultProofRule: string;
  taskAssignmentRule: string;
  taskPayoutRule: string;
  taskVisibilityRule: string;
};

export const defaultTeamTaskSettings: TeamTaskSettings = {
  defaultProofRule: 'Photo, video, text, or document',
  taskAssignmentRule: 'Admins choose per task',
  taskPayoutRule: 'Admins can decide per member',
  taskVisibilityRule: 'Assigned team members can view',
};

export type CreateTeamInput = {
  category: string;
  categoryPreset: string;
  customCategory: string;
  description?: string;
  id?: string;
  joinRule: string;
  location: string;
  memberRole?: TeamMemberRole;
  name: string;
  ownerId?: string;
  payoutMethod: string;
  permissions: string;
  structureType:
    | 'field-ops'
    | 'event-staffing'
    | 'maintenance'
    | 'remote-work'
    | 'creative-research'
    | 'custom';
} & TeamTaskSettings;

export type TeamRecord = {
  category: string;
  category_preset: string;
  created_at: string;
  custom_category: string | null;
  default_proof_rule: string;
  id: string;
  join_rule: string;
  location: string;
  member_role?: TeamMemberRole;
  name: string;
  owner_id: string;
  payout_method: string;
  permissions: string;
  status: string;
  task_assignment_rule: string;
  task_payout_rule: string;
  task_visibility_rule: string;
  structure_type: CreateTeamInput['structureType'];
  updated_at: string;
};

export function teamRecordToDraft(record: TeamRecord): CreateTeamInput {
  return {
    category: record.category,
    categoryPreset: record.category_preset,
    customCategory: record.custom_category ?? '',
    defaultProofRule:
      record.default_proof_rule ?? defaultTeamTaskSettings.defaultProofRule,
    id: record.id,
    joinRule: record.join_rule,
    location: record.location,
    memberRole: record.member_role ?? 'owner',
    name: record.name,
    ownerId: record.owner_id,
    payoutMethod: record.payout_method,
    permissions: record.permissions,
    structureType: record.structure_type,
    taskAssignmentRule:
      record.task_assignment_rule ??
      defaultTeamTaskSettings.taskAssignmentRule,
    taskPayoutRule:
      record.task_payout_rule ?? defaultTeamTaskSettings.taskPayoutRule,
    taskVisibilityRule:
      record.task_visibility_rule ??
      defaultTeamTaskSettings.taskVisibilityRule,
  };
}

export function withDefaultTeamTaskSettings(
  input: Omit<CreateTeamInput, keyof TeamTaskSettings> & Partial<TeamTaskSettings>,
): CreateTeamInput {
  return {
    ...input,
    defaultProofRule:
      input.defaultProofRule ?? defaultTeamTaskSettings.defaultProofRule,
    taskAssignmentRule:
      input.taskAssignmentRule ?? defaultTeamTaskSettings.taskAssignmentRule,
    taskPayoutRule:
      input.taskPayoutRule ?? defaultTeamTaskSettings.taskPayoutRule,
    taskVisibilityRule:
      input.taskVisibilityRule ?? defaultTeamTaskSettings.taskVisibilityRule,
  };
}

function isTeamDraft(value: unknown): value is CreateTeamInput {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const draft = value as Partial<CreateTeamInput>;

  return (
    typeof draft.category === 'string' &&
    typeof draft.categoryPreset === 'string' &&
    typeof draft.customCategory === 'string' &&
    (draft.id === undefined || typeof draft.id === 'string') &&
    typeof draft.joinRule === 'string' &&
    typeof draft.location === 'string' &&
    typeof draft.name === 'string' &&
    typeof draft.payoutMethod === 'string' &&
    typeof draft.permissions === 'string' &&
    typeof draft.structureType === 'string'
  );
}

export async function getCachedTeamDraft(): Promise<CreateTeamInput | null> {
  try {
    const value = await AsyncStorage.getItem(cachedTeamDraftKey);

    if (!value) {
      return null;
    }

    const parsed = JSON.parse(value) as unknown;

    return isTeamDraft(parsed) ? withDefaultTeamTaskSettings(parsed) : null;
  } catch {
    return null;
  }
}

export async function saveCachedTeamDraft(input: CreateTeamInput) {
  await AsyncStorage.setItem(cachedTeamDraftKey, JSON.stringify(input));
}

export async function ensureAuthenticatedUser() {
  const sessionResult = await supabase.auth.getSession();

  if (sessionResult.error) {
    throw new Error(sessionResult.error.message);
  }

  if (sessionResult.data.session?.user) {
    return sessionResult.data.session.user;
  }

  throw new Error('Please create an account or sign in to continue.');
}

export async function createTeamRecord(
  input: CreateTeamInput,
): Promise<TeamRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('create_team', {
    p_category: input.category,
    p_category_preset: input.categoryPreset,
    p_custom_category: input.customCategory || null,
    p_join_rule: input.joinRule,
    p_location: input.location,
    p_name: input.name,
    p_payout_method: input.payoutMethod,
    p_permissions: input.permissions,
    p_structure_type: input.structureType,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamRecord;
}

export async function listMyTeams(): Promise<TeamRecord[]> {
  await ensureAuthenticatedUser();

  const result = await supabase
    .from('teams')
    .select(
      'category, category_preset, created_at, custom_category, default_proof_rule, id, join_rule, location, name, owner_id, payout_method, permissions, status, structure_type, task_assignment_rule, task_payout_rule, task_visibility_rule, updated_at',
    )
    .order('created_at', { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as TeamRecord[];
}

type TeamMembershipRow = {
  role: TeamMemberRole;
  teams: TeamRecord | TeamRecord[] | null;
};

export async function listMyTeamMemberships(): Promise<TeamRecord[]> {
  const user = await ensureAuthenticatedUser();

  const result = await supabase
    .from('team_members')
    .select(
      `role, teams:team_id (
        category,
        category_preset,
        created_at,
        custom_category,
        default_proof_rule,
        id,
        join_rule,
        location,
        name,
        owner_id,
        payout_method,
        permissions,
        status,
        structure_type,
        task_assignment_rule,
        task_payout_rule,
        task_visibility_rule,
        updated_at
      )`,
    )
    .eq('profile_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data ?? []) as TeamMembershipRow[]).reduce<TeamRecord[]>(
    (teams, row) => {
      const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;

      if (team) {
        teams.push({ ...team, member_role: row.role });
      }

      return teams;
    },
    [],
  );
}

export async function updateTeamTaskSettings(
  teamId: string,
  settings: TeamTaskSettings,
): Promise<TeamRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('update_team_task_settings', {
    p_default_proof_rule: settings.defaultProofRule,
    p_task_assignment_rule: settings.taskAssignmentRule,
    p_task_payout_rule: settings.taskPayoutRule,
    p_task_visibility_rule: settings.taskVisibilityRule,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamRecord;
}

export async function updateTeamAccessSettings(
  teamId: string,
  settings: Pick<CreateTeamInput, 'joinRule' | 'permissions'>,
): Promise<TeamRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase
    .from('teams')
    .update({
      join_rule: settings.joinRule,
      permissions: settings.permissions,
    })
    .eq('id', teamId)
    .select(
      'category, category_preset, created_at, custom_category, default_proof_rule, id, join_rule, location, name, owner_id, payout_method, permissions, status, structure_type, task_assignment_rule, task_payout_rule, task_visibility_rule, updated_at',
    )
    .single();

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as TeamRecord;
}
