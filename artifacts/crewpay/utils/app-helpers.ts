import type { MyJoinRequestStatus } from '../lib/request-service';
import type { TaskWithTeams } from '../lib/task-service';
import type { TeamDraft } from '../types/app';

export function getUniqueTeams(teams: TeamDraft[]) {
  const seen = new Set<string>();

  return teams.filter((team) => {
    const key = team.id
      ? `id:${team.id}`
      : `name:${team.name.trim().toLowerCase()}|${team.location.trim().toLowerCase()}|role:${team.memberRole ?? 'owner'}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function getTasksForTeam(tasks: TaskWithTeams[], teamId?: string) {
  if (!teamId) {
    return [];
  }

  return tasks.filter((task) =>
    task.task_team_assignments?.some(
      (assignment) => assignment.team_id === teamId,
    ),
  );
}

export function extractInviteToken(value: string) {
  const normalized = value
    .trim()
    .replace(/%0A/gi, '\n')
    .replace(/[\u2018\u2019\u201c\u201d]/g, '');

  if (!normalized) {
    return '';
  }

  const labelledCode = normalized.match(
    /invite\s+code\s*[:\-]?\s*([a-z0-9_-]{8,128})/i,
  )?.[1];
  const generatedHexCode = normalized.match(
    /(?:^|[^a-f0-9])([a-f0-9]{36})(?=$|[^a-f0-9])/i,
  )?.[1];
  const queryCode = normalized.match(
    /[?&#](?:code|invite|token)=([a-z0-9_-]{8,128})/i,
  )?.[1];
  const standaloneCode = normalized.match(
    /(?:^|\s)([a-z0-9_-]{8,128})(?=\s|$)/i,
  )?.[1];
  const token = labelledCode ?? generatedHexCode ?? queryCode ?? standaloneCode;

  if (token) {
    return token.replace(/[.,;:!?]+$/, '').toLowerCase();
  }

  return normalized.replace(/\s+/g, '').toLowerCase();
}

export function formatRequestTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Just now';
  }

  return date.toLocaleString(undefined, {
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    month: 'short',
  });
}

export function getJoinNotificationKey(notification: MyJoinRequestStatus) {
  return `${notification.request_id}:${notification.request_status}:${
    notification.reviewed_at ?? notification.requested_at
  }`;
}

export function getSeenJoinNotificationStorageKey(userId: string) {
  return `crewpay.seen-join-notifications.v1.${userId}`;
}

export function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Please try again.';
}

export function getAuthCallbackParams(url: string) {
  const params = new URLSearchParams();
  const [, query = ''] = url.split('?');
  const [queryString = '', hashString = ''] = query.split('#');
  const hashFallback = url.includes('#') ? url.split('#')[1] ?? '' : '';

  [queryString, hashString || hashFallback].forEach((segment) => {
    if (!segment) {
      return;
    }

    new URLSearchParams(segment).forEach((value, key) => {
      params.set(key, value);
    });
  });

  return params;
}
