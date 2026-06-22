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

export type InviteLinkDetails = {
  teamName?: string;
  token: string;
};

export function extractInviteDetails(value: string): InviteLinkDetails {
  const trimmed = value.trim();

  if (!trimmed) {
    return { token: '' };
  }

  try {
    const url = new URL(trimmed);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const joinIndex = pathParts.findIndex((part) =>
      ['join', 'join-team', 'team-invite'].includes(part.toLowerCase()),
    );
    const hostnameIsInvite = ['join', 'join-team', 'team-invite'].includes(
      url.hostname.toLowerCase(),
    );
    const isInviteRoute = joinIndex >= 0 || hostnameIsInvite;
    const tokenFromSearch =
      url.searchParams.get('invite') ||
      url.searchParams.get('invite_token') ||
      url.searchParams.get('team_invite') ||
      url.searchParams.get('token') ||
      // OAuth callbacks also use `code`; only accept it on an invite route.
      (isInviteRoute ? url.searchParams.get('code') : '') ||
      '';
    const tokenFromPath =
      joinIndex >= 0
        ? pathParts[joinIndex + 1] ?? ''
        : hostnameIsInvite
          ? pathParts[0] ?? ''
          : '';
    const token = (tokenFromSearch || tokenFromPath)
      .replace(/^token=/i, '')
      .trim();
    const teamName =
      url.searchParams.get('team') ||
      url.searchParams.get('team_name') ||
      undefined;

    return {
      teamName: teamName ? decodeURIComponent(teamName) : undefined,
      token,
    };
  } catch {
    const parts = trimmed.split(/[\s/?#]+/).filter(Boolean);
    const finalPart = parts[parts.length - 1] ?? trimmed;

    return {
      token: finalPart.replace(/^token=/i, '').trim(),
    };
  }
}

export function extractInviteToken(value: string) {
  return extractInviteDetails(value).token;
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
