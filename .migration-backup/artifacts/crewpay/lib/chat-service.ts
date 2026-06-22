import { supabase } from './supabase';
import { ensureAuthenticatedUser } from './team-service';

export type ChatConversationType = 'team' | 'direct';

export type ChatConversation = {
  conversation_id: string;
  conversation_type: ChatConversationType;
  team_id: string;
  title: string;
  subtitle: string;
  other_profile_id: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
};

export type ChatTarget = {
  team_id: string;
  team_name: string;
  profile_id: string;
  member_name: string;
  member_role: string;
};

export type ChatMessage = {
  message_id: string;
  conversation_id: string;
  sender_id: string;
  sender_name: string;
  body: string;
  created_at: string;
  is_mine: boolean;
};

type ChatConversationRow = Omit<ChatConversation, 'conversation_type'> & {
  conversation_type: string;
};

type ChatConversationRecord = {
  conversation_type: ChatConversationType;
  created_at: string;
  created_by: string | null;
  direct_key: string | null;
  id: string;
  team_id: string;
  title: string | null;
  updated_at: string;
};

type SentChatMessage = {
  body: string;
  conversation_id: string;
  created_at: string;
  deleted_at: string | null;
  id: string;
  sender_id: string;
  updated_at: string;
};

function normalizeConversation(row: ChatConversationRow): ChatConversation {
  return {
    ...row,
    conversation_type:
      row.conversation_type === 'direct' ? 'direct' : 'team',
    last_message: row.last_message ?? null,
    last_message_at: row.last_message_at ?? null,
    other_profile_id: row.other_profile_id ?? null,
    subtitle: row.subtitle ?? '',
    title: row.title ?? 'CrewPay chat',
    unread_count: Number(row.unread_count ?? 0),
  };
}

export async function listChatConversations(): Promise<ChatConversation[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_my_chat_conversations');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return ((result.data ?? []) as ChatConversationRow[]).map(
    normalizeConversation,
  );
}

export async function listChatTargets(): Promise<ChatTarget[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_my_chat_targets');

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as ChatTarget[];
}

export async function ensureTeamChat(
  teamId: string,
): Promise<ChatConversationRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('ensure_team_chat', {
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ChatConversationRecord;
}

export async function ensureDirectChat(
  teamId: string,
  profileId: string,
): Promise<ChatConversationRecord> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('ensure_direct_chat', {
    p_profile_id: profileId,
    p_team_id: teamId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as ChatConversationRecord;
}

export async function listChatMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('list_chat_messages', {
    p_conversation_id: conversationId,
    p_limit: 80,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return (result.data ?? []) as ChatMessage[];
}

export async function markChatRead(conversationId: string): Promise<void> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('mark_chat_read', {
    p_conversation_id: conversationId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }
}

export async function sendChatMessage(
  conversationId: string,
  body: string,
): Promise<SentChatMessage> {
  await ensureAuthenticatedUser();

  const result = await supabase.rpc('send_chat_message', {
    p_body: body,
    p_conversation_id: conversationId,
  });

  if (result.error) {
    throw new Error(result.error.message);
  }

  return result.data as SentChatMessage;
}

export async function uploadChatAttachment(input: {
  mimeType: string;
  name: string;
  uri: string;
}): Promise<{ publicUrl: string; storagePath: string }> {
  const user = await ensureAuthenticatedUser();
  const response = await fetch(input.uri);

  if (!response.ok) {
    throw new Error('Could not read selected file.');
  }

  const body = await response.arrayBuffer();
  const safeName = input.name
    .trim()
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-') || 'attachment';
  const storagePath = `${user.id}/chat/${Date.now()}-${safeName}`;

  const upload = await supabase.storage
    .from('chat-media')
    .upload(storagePath, body, {
      contentType: input.mimeType || 'application/octet-stream',
      upsert: false,
    });

  if (upload.error) {
    throw new Error(upload.error.message);
  }

  const { data: urlData } = supabase.storage
    .from('chat-media')
    .getPublicUrl(storagePath);

  return { publicUrl: urlData.publicUrl, storagePath };
}

export function subscribeToConversationMessages(
  conversationId: string,
  onMessage: () => void,
) {
  const channel = supabase
    .channel(`chat:${conversationId}:${Date.now()}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        filter: `conversation_id=eq.${conversationId}`,
        schema: 'public',
        table: 'chat_messages',
      },
      () => onMessage(),
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
