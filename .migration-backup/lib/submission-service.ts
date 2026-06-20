import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type SubmissionAssetKind =
  | 'document'
  | 'location'
  | 'photo'
  | 'video';

export type SubmissionAsset = {
  kind: SubmissionAssetKind;
  latitude?: number;
  longitude?: number;
  mimeType?: string;
  name: string;
  path: string;
  size?: number | null;
};

export type SelectedSubmissionAsset = {
  kind: Exclude<SubmissionAssetKind, 'location'>;
  mimeType?: string;
  name: string;
  size?: number | null;
  uri: string;
};

export type TaskSubmissionStatus =
  | 'approved'
  | 'paid'
  | 'rejected'
  | 'submitted';

export type TaskSubmissionRecord = {
  attempt_number: number;
  created_at: string;
  id: string;
  member_id: string;
  proof_asset_url: string | null;
  proof_assets: SubmissionAsset[];
  proof_text: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  status: TaskSubmissionStatus;
  submitted_at: string;
  task_id: string;
  team_id: string;
  updated_at: string;
};

export type MyTaskSubmission = TaskSubmissionRecord & {
  task_title: string;
  team_name: string;
};

export type TeamTaskSubmission = MyTaskSubmission & {
  member_name: string;
};

type UploadSubmissionAssetInput = SelectedSubmissionAsset & {
  taskId: string;
};

type SubmitTaskProofInput = {
  assets: SubmissionAsset[];
  proofText: string;
  taskId: string;
  teamId: string;
};

const taskProofBucket = 'task-proofs';

function sanitizeFileName(value: string) {
  const safeName = value
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-');

  return safeName || 'proof-file';
}

function extensionFromMimeType(mimeType?: string) {
  if (!mimeType) {
    return '';
  }

  const [, subtype] = mimeType.split('/');

  return subtype ? `.${subtype.replace(/[^A-Za-z0-9]/g, '')}` : '';
}

function normalizeSubmission(row: unknown): TaskSubmissionRecord {
  const submission = row as Omit<TaskSubmissionRecord, 'proof_assets'> & {
    proof_assets?: SubmissionAsset[] | null;
    status: string;
  };

  return {
    ...submission,
    proof_assets: Array.isArray(submission.proof_assets)
      ? submission.proof_assets
      : [],
    status: submission.status as TaskSubmissionStatus,
  };
}

export async function uploadSubmissionAsset(
  input: UploadSubmissionAssetInput,
): Promise<SubmissionAsset> {
  const user = await ensureAuthenticatedUser();
  const response = await fetch(input.uri);

  if (!response.ok) {
    throw new Error('Could not read selected proof file.');
  }

  const body = await response.arrayBuffer();
  const inferredName =
    input.name.includes('.') || !input.mimeType
      ? input.name
      : `${input.name}${extensionFromMimeType(input.mimeType)}`;
  const fileName = sanitizeFileName(inferredName);
  const path = `${user.id}/${input.taskId}/${Date.now()}-${fileName}`;
  const upload = await supabase.storage.from(taskProofBucket).upload(path, body, {
    contentType: input.mimeType ?? 'application/octet-stream',
    upsert: false,
  });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  return {
    kind: input.kind,
    mimeType: input.mimeType,
    name: input.name,
    path,
    size: input.size,
  };
}

export async function getSubmissionAssetUrl(path: string) {
  const result = await supabase.storage
    .from(taskProofBucket)
    .createSignedUrl(path, 60 * 10);

  if (result.error || !result.data?.signedUrl) {
    throw new Error(result.error?.message ?? 'Could not open proof file.');
  }

  return result.data.signedUrl;
}

export async function submitTaskProof(
  input: SubmitTaskProofInput,
): Promise<TaskSubmissionRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('submit_task_proof', {
    p_proof_assets: input.assets,
    p_proof_text: input.proofText,
    p_task_id: input.taskId,
    p_team_id: input.teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return normalizeSubmission(result.data);
}

export async function listMyTaskSubmissions(): Promise<MyTaskSubmission[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_my_task_submissions');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data ?? []) as unknown[]).map((row) => {
    const submission = normalizeSubmission(row) as MyTaskSubmission;

    return submission;
  });
}

export async function listTeamTaskSubmissions(
  teamId: string,
): Promise<TeamTaskSubmission[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_team_task_submissions', {
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data ?? []) as unknown[]).map((row) => {
    const submission = normalizeSubmission(row) as TeamTaskSubmission;

    return submission;
  });
}

export async function reviewTaskSubmission(
  submissionId: string,
  status: Extract<TaskSubmissionStatus, 'approved' | 'rejected'>,
  reviewNote?: string,
): Promise<TaskSubmissionRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('review_task_submission', {
    p_review_note: reviewNote ?? null,
    p_status: status,
    p_submission_id: submissionId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return normalizeSubmission(result.data);
}
