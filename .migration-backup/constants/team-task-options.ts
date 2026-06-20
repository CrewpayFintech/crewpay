import type { CreateTaskInput } from '../lib/task-service';
import type { TaskCreationStep, TeamCreationStep, TeamDraft } from '../types/app';

export const teamCreationSteps: TeamCreationStep[] = [
  'name',
  'category',
  'location',
  'join',
  'payout',
  'permissions',
  'review',
];

export const taskCreationSteps: TaskCreationStep[] = [
  'basics',
  'teams',
  'instructions',
  'location',
  'payout',
  'proof',
  'assignment',
  'review',
];

export const taskCategoryOptions = [
  'Errands and delivery',
  'Cleaning and maintenance',
  'Event support',
  'Online admin',
  'Content and research',
  'Other',
];

export const taskLocationOptions: Array<{
  label: string;
  value: CreateTaskInput['locationType'];
}> = [
  { label: 'Remote', value: 'remote' },
  { label: 'Physical location', value: 'physical' },
  { label: 'Hybrid', value: 'hybrid' },
];

export const taskProofOptions: Array<{
  label: string;
  value: CreateTaskInput['proofType'];
}> = [
  { label: 'Upload photo', value: 'photo' },
  { label: 'Upload video', value: 'video' },
  { label: 'Upload document', value: 'document' },
  { label: 'Text confirmation', value: 'text' },
  { label: 'Location check-in', value: 'location' },
  { label: 'No proof required', value: 'none' },
];

export const taskAssignmentOptions: Array<{
  label: string;
  value: CreateTaskInput['assignmentMode'];
}> = [
  { label: 'Anyone in team can claim', value: 'team_claim' },
  { label: 'Admin assigns manually', value: 'admin_assign' },
  { label: 'First come first served', value: 'first_come' },
  { label: 'Multiple people can complete it', value: 'multi_complete' },
];

export const taskApprovalOptions = [
  'Manual approval',
  'Auto approve after proof',
  'Auto approve trusted members',
  'Auto approve under payout limit',
];

export const teamCategoryOptions = [
  'Errands and delivery',
  'Events and staffing',
  'Cleaning and maintenance',
  'Online and admin work',
  'Content and research',
  'Other',
];

export const teamCategoryStructure: Record<
  string,
  TeamDraft['structureType']
> = {
  'Cleaning and maintenance': 'maintenance',
  'Content and research': 'creative-research',
  'Errands and delivery': 'field-ops',
  'Events and staffing': 'event-staffing',
  'Online and admin work': 'remote-work',
  Other: 'custom',
};

export const teamJoinOptions = [
  'Invite only',
  'Approval required',
  'Anyone with a link can request',
];

export const teamPayoutOptions = [
  'CrewPay wallet',
  'Bank transfer',
  'Decide per task',
];

export const teamPermissionOptions = [
  'Only me',
  'Selected admins',
  'Any team member',
];
