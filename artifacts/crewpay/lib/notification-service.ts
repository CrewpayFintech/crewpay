import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type AppNotification = {
  body: string;
  created_at: string;
  notification_key: string;
  notification_type: string;
  read_at: string | null;
  related_id: string | null;
  team_id: string | null;
  title: string;
};

export async function listMyNotifications(): Promise<AppNotification[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_my_notifications');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as AppNotification[];
}

export async function markNotificationsRead(
  notificationKeys: string[],
): Promise<number> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('mark_notifications_read', {
    p_notification_keys: notificationKeys,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return Number(result.data ?? 0);
}
