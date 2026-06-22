import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft,
  MessageCircle,
  Paperclip,
  RefreshCw,
  Send,
  Users,
  X,
} from 'lucide-react-native';

import {
  ensureDirectChat,
  listChatConversations,
  listChatMessages,
  listChatTargets,
  markChatRead,
  sendChatMessage,
  subscribeToConversationMessages,
  uploadChatAttachment,
  type ChatConversation,
  type ChatMessage,
  type ChatTarget,
} from '../../lib/chat-service';
import { palette } from '../../constants/theme';
import { formatRequestTime, getErrorMessage } from '../../utils/app-helpers';

type ChatScreenProps = {
  allowedTeamIds: string[];
  onBack: () => void;
};

const IMAGE_MIME_PREFIXES = ['image/'];

function isImageUrl(body: string) {
  if (!body.startsWith('http')) return false;
  const lower = body.toLowerCase();
  return (
    lower.includes('.jpg') ||
    lower.includes('.jpeg') ||
    lower.includes('.png') ||
    lower.includes('.gif') ||
    lower.includes('.webp')
  );
}

function parseAttachmentMessage(body: string): { name: string; url: string } | null {
  const match = body.match(/^\[file:(.+?)\]\((.+?)\)$/);
  if (match) return { name: match[1], url: match[2] };
  const trimmed = body.trim();
  if (isImageUrl(trimmed)) return { name: 'image', url: trimmed };
  return null;
}

function getInitials(value: string) {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'CP';
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function shortRole(role: string) {
  if (role === 'owner') return 'Owner';
  if (role === 'admin') return 'Admin';
  return 'Member';
}

function formatReplyBody(message: ChatMessage, body: string) {
  const excerpt = message.body.replace(/\s+/g, ' ').trim().slice(0, 90);
  return `Replying to ${message.sender_name}: "${excerpt}"\n${body}`;
}

export function ChatScreen({ allowedTeamIds, onBack }: ChatScreenProps) {
  const { width, height } = useWindowDimensions();
  const widthScale = width / 624;
  const heightScale = height / 1239;
  const scale = Math.min(widthScale, heightScale);
  const x = (value: number) => Math.round(value * widthScale);
  const y = (value: number) => Math.round(value * heightScale);
  const s = (value: number) => Math.round(value * scale);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [targets, setTargets] = useState<ChatTarget[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<ChatConversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [replyToMessage, setReplyToMessage] = useState<ChatMessage | null>(null);
  const [error, setError] = useState('');
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sending, setSending] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);

  const allowedTeamIdSet = useMemo(
    () => new Set(allowedTeamIds),
    [allowedTeamIds],
  );
  const roleConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        allowedTeamIdSet.has(conversation.team_id),
      ),
    [allowedTeamIdSet, conversations],
  );

  // ── Dedup: track which profile IDs already have a DM conversation ─────────
  const directConversationProfileIds = useMemo(() => {
    return new Set(
      roleConversations
        .filter((c) => c.conversation_type === 'direct' && c.other_profile_id)
        .map((c) => c.other_profile_id ?? ''),
    );
  }, [roleConversations]);

  const teamConversations = useMemo(
    () => roleConversations.filter((c) => c.conversation_type === 'team'),
    [roleConversations],
  );

  // Show only the most recent DM per person (no duplicate DMs from same user across teams)
  const directConversations = useMemo(() => {
    const seen = new Set<string>();
    return roleConversations
      .filter((c) => c.conversation_type === 'direct')
      .sort((a, b) => {
        if (!a.last_message_at && !b.last_message_at) return 0;
        if (!a.last_message_at) return 1;
        if (!b.last_message_at) return -1;
        return (
          new Date(b.last_message_at).getTime() -
          new Date(a.last_message_at).getTime()
        );
      })
      .filter((c) => {
        const key = c.other_profile_id ?? c.conversation_id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [roleConversations]);

  // Only show targets that don't already have a DM conversation (dedup by profile_id)
  const freshTargets = useMemo(
    () =>
      targets.filter(
        (target) =>
          allowedTeamIdSet.has(target.team_id) &&
          !directConversationProfileIds.has(target.profile_id),
      ),
    [allowedTeamIdSet, directConversationProfileIds, targets],
  );

  const loadChatHome = useCallback(async () => {
    setError('');
    try {
      const [conversationRows, targetRows] = await Promise.all([
        listChatConversations(),
        listChatTargets(),
      ]);
      setConversations(conversationRows);
      setTargets(targetRows);
    } catch (loadError) {
      setError(getErrorMessage(loadError));
    } finally {
      setLoadingConversations(false);
      setRefreshing(false);
    }
  }, []);

  const loadMessages = useCallback(
    async (conversation: ChatConversation) => {
      setLoadingMessages(true);
      setError('');
      try {
        const messageRows = await listChatMessages(
          conversation.conversation_id,
        );
        setMessages(messageRows);
        await markChatRead(conversation.conversation_id);
        void loadChatHome();
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: true });
        });
      } catch (loadError) {
        setError(getErrorMessage(loadError));
      } finally {
        setLoadingMessages(false);
      }
    },
    [loadChatHome],
  );

  useEffect(() => {
    void loadChatHome();
  }, [loadChatHome]);

  useEffect(() => {
    if (!selectedConversation) return undefined;
    void loadMessages(selectedConversation);
    return subscribeToConversationMessages(
      selectedConversation.conversation_id,
      () => {
        void loadMessages(selectedConversation);
      },
    );
  }, [loadMessages, selectedConversation]);

  const openConversation = useCallback((conversation: ChatConversation) => {
    setSelectedConversation(conversation);
    setMessageText('');
    setReplyToMessage(null);
  }, []);

  const openDirectTarget = useCallback(
    async (target: ChatTarget) => {
      setError('');
      try {
        const conversation = await ensureDirectChat(
          target.team_id,
          target.profile_id,
        );
        const nextConversation: ChatConversation = {
          conversation_id: conversation.id,
          conversation_type: 'direct',
          last_message: null,
          last_message_at: null,
          other_profile_id: target.profile_id,
          subtitle: target.team_name,
          team_id: target.team_id,
          title: target.member_name,
          unread_count: 0,
        };
        setSelectedConversation(nextConversation);
        setMessageText('');
        setReplyToMessage(null);
        void loadChatHome();
      } catch (targetError) {
        setError(getErrorMessage(targetError));
      }
    },
    [loadChatHome],
  );

  const sendMessage = useCallback(
    async (overrideBody?: string) => {
      const body = (overrideBody ?? messageText).trim();
      const outgoingBody = replyToMessage
        ? formatReplyBody(replyToMessage, body)
        : body;
      if (!selectedConversation || !body || sending) return;

      setSending(true);
      if (!overrideBody) setMessageText('');
      setError('');

      try {
        const sent = await sendChatMessage(
          selectedConversation.conversation_id,
          outgoingBody,
        );
        setReplyToMessage(null);
        setMessages((current) => [
          ...current,
          {
            body: sent.body,
            conversation_id: sent.conversation_id,
            created_at: sent.created_at,
            is_mine: true,
            message_id: sent.id,
            sender_id: sent.sender_id,
            sender_name: 'You',
          },
        ]);
        void loadChatHome();
        requestAnimationFrame(() => {
          listRef.current?.scrollToEnd({ animated: true });
        });
      } catch (sendError) {
        if (!overrideBody) setMessageText(body);
        setError(getErrorMessage(sendError));
      } finally {
        setSending(false);
      }
    },
    [loadChatHome, messageText, replyToMessage, selectedConversation, sending],
  );

  const handleAttach = useCallback(async () => {
    if (!selectedConversation) return;

    Alert.alert('Add attachment', 'Choose what to share', [
      {
        text: 'Photo / Video',
        onPress: async () => {
          const perm =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!perm.granted) {
            Alert.alert(
              'Permission needed',
              'Allow media access to share photos.',
            );
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: false,
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            quality: 0.8,
          });
          if (result.canceled || !result.assets[0]) return;

          const asset = result.assets[0];
          const mimeType =
            asset.mimeType ??
            (asset.uri.includes('.mp4') ? 'video/mp4' : 'image/jpeg');
          const name = asset.fileName ?? `media-${Date.now()}.jpg`;

          setUploadingAttachment(true);
          setError('');
          try {
            const { publicUrl } = await uploadChatAttachment({
              mimeType,
              name,
              uri: asset.uri,
            });
            const isImage = IMAGE_MIME_PREFIXES.some((p) =>
              mimeType.startsWith(p),
            );
            const body = isImage
              ? publicUrl
              : `[file:${name}](${publicUrl})`;
            await sendMessage(body);
          } catch (err) {
            setError(getErrorMessage(err));
          } finally {
            setUploadingAttachment(false);
          }
        },
      },
      {
        text: 'File',
        onPress: async () => {
          const result = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            type: '*/*',
          });
          if (result.canceled || !result.assets[0]) return;

          const asset = result.assets[0];
          const mimeType = asset.mimeType ?? 'application/octet-stream';
          const name = asset.name ?? `file-${Date.now()}`;

          setUploadingAttachment(true);
          setError('');
          try {
            const { publicUrl } = await uploadChatAttachment({
              mimeType,
              name,
              uri: asset.uri,
            });
            const body = `[file:${name}](${publicUrl})`;
            await sendMessage(body);
          } catch (err) {
            setError(getErrorMessage(err));
          } finally {
            setUploadingAttachment(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [selectedConversation, sendMessage]);

  const closeRoom = useCallback(() => {
    setSelectedConversation(null);
    setMessages([]);
    setMessageText('');
    setReplyToMessage(null);
    void loadChatHome();
  }, [loadChatHome]);

  const renderConversationRow = (conversation: ChatConversation) => (
    <Pressable
      key={conversation.conversation_id}
      accessibilityRole="button"
      onPress={() => openConversation(conversation)}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: pressed ? '#f8f8f3' : '#ffffff',
        borderColor: palette.line,
        borderRadius: s(28),
        borderWidth: 1,
        flexDirection: 'row',
        gap: x(16),
        marginBottom: y(13),
        minHeight: y(88),
        paddingHorizontal: x(16),
        paddingVertical: y(14),
        transform: [{ scale: pressed ? 0.985 : 1 }],
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor:
            conversation.conversation_type === 'team'
              ? palette.green
              : '#dce8ff',
          borderRadius: 999,
          height: s(50),
          justifyContent: 'center',
          width: s(50),
        }}
      >
        {conversation.conversation_type === 'team' ? (
          <Users color={palette.ink} size={s(22)} strokeWidth={2.5} />
        ) : (
          <Text
            style={{
              color: palette.ink,
              fontSize: s(16),
              fontWeight: '800',
            }}
          >
            {getInitials(conversation.title)}
          </Text>
        )}
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View
          style={{ alignItems: 'center', flexDirection: 'row', gap: x(8) }}
        >
          <Text
            numberOfLines={1}
            style={{
              color: palette.ink,
              flex: 1,
              fontSize: s(18),
              fontWeight: '700',
            }}
          >
            {conversation.title}
          </Text>
          {conversation.last_message_at ? (
            <Text
              style={{
                color: '#a5a7a0',
                fontSize: s(12),
                fontWeight: '600',
              }}
            >
              {formatRequestTime(conversation.last_message_at)}
            </Text>
          ) : null}
        </View>
        <Text
          numberOfLines={1}
          style={{
            color: '#8e9189',
            fontSize: s(14),
            fontWeight: '500',
            marginTop: y(4),
          }}
        >
          {conversation.last_message ?? conversation.subtitle}
        </Text>
      </View>
      {conversation.unread_count > 0 ? (
        <View
          style={{
            alignItems: 'center',
            backgroundColor: '#2f7df6',
            borderRadius: 999,
            minWidth: s(24),
            paddingHorizontal: x(7),
            paddingVertical: y(4),
          }}
        >
          <Text
            style={{ color: '#ffffff', fontSize: s(12), fontWeight: '800' }}
          >
            {conversation.unread_count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const renderTargetRow = (target: ChatTarget) => (
    <Pressable
      key={`${target.profile_id}`}
      accessibilityRole="button"
      onPress={() => void openDirectTarget(target)}
      style={({ pressed }) => ({
        alignItems: 'center',
        borderRadius: s(24),
        flexDirection: 'row',
        gap: x(14),
        marginBottom: y(11),
        opacity: pressed ? 0.72 : 1,
        paddingHorizontal: x(10),
        paddingVertical: y(10),
      })}
    >
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#f0f3ff',
          borderRadius: 999,
          height: s(44),
          justifyContent: 'center',
          width: s(44),
        }}
      >
        <Text
          style={{ color: '#2f61d9', fontSize: s(14), fontWeight: '800' }}
        >
          {getInitials(target.member_name)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{ color: palette.ink, fontSize: s(16), fontWeight: '700' }}
        >
          {target.member_name}
        </Text>
        <Text
          numberOfLines={1}
          style={{
            color: '#9a9c95',
            fontSize: s(13),
            fontWeight: '500',
            marginTop: y(3),
          }}
        >
          {shortRole(target.member_role)} in {target.team_name}
        </Text>
      </View>
      <MessageCircle
        color={palette.greenDeep}
        size={s(19)}
        strokeWidth={2.4}
      />
    </Pressable>
  );

  const renderChatHome = () => (
    <View style={{ flex: 1 }}>
      <View style={{ paddingHorizontal: x(38), paddingTop: y(54) }}>
        <Pressable
          accessibilityRole="button"
          onPress={onBack}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: '#ffffff',
            borderColor: '#edf0f5',
            borderRadius: s(18),
            borderWidth: 1,
            height: s(56),
            justifyContent: 'center',
            opacity: pressed ? 0.72 : 1,
            shadowColor: '#0a1530',
            shadowOffset: { height: 8, width: 0 },
            shadowOpacity: 0.08,
            shadowRadius: 16,
            width: s(56),
          })}
        >
          <ChevronLeft color="#8a90a3" size={s(26)} strokeWidth={3} />
        </Pressable>

        <View
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginTop: y(54),
          }}
        >
          <View>
            <Text
              style={{
                color: palette.ink,
                fontSize: s(35),
                fontWeight: '800',
                letterSpacing: -1,
              }}
            >
              Chats
            </Text>
            <Text
              style={{
                color: '#777a83',
                fontSize: s(18),
                fontWeight: '500',
                marginTop: y(6),
              }}
            >
              Team rooms and direct messages
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              setRefreshing(true);
              void loadChatHome();
            }}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: palette.green,
              borderRadius: 999,
              height: s(48),
              justifyContent: 'center',
              opacity: pressed ? 0.75 : 1,
              width: s(48),
            })}
          >
            <RefreshCw color={palette.ink} size={s(21)} strokeWidth={2.5} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingBottom: y(58),
          paddingHorizontal: x(38),
          paddingTop: y(34),
        }}
        refreshControl={
          <RefreshControl
            onRefresh={() => {
              setRefreshing(true);
              void loadChatHome();
            }}
            refreshing={refreshing}
            tintColor={palette.greenDeep}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {error ? <InlineError error={error} s={s} x={x} y={y} /> : null}

        {loadingConversations ? (
          <View style={{ paddingTop: y(90) }}>
            <ActivityIndicator color={palette.greenDeep} size="large" />
          </View>
        ) : (
          <>
            <SectionHeader label="Team rooms" s={s} y={y} />
            {teamConversations.length > 0 ? (
              teamConversations.map(renderConversationRow)
            ) : (
              <EmptyChatCopy
                body="Create or join a team and the group chat will appear here."
                s={s}
                y={y}
              />
            )}

            <SectionHeader label="Direct messages" s={s} y={y} />
            {directConversations.map(renderConversationRow)}
            {freshTargets.map(renderTargetRow)}
            {directConversations.length === 0 &&
            freshTargets.length === 0 ? (
              <EmptyChatCopy
                body="Admins and members you can message will appear here."
                s={s}
                y={y}
              />
            ) : null}
          </>
        )}
      </ScrollView>
    </View>
  );

  const renderMessageItem = ({ item }: { item: ChatMessage }) => {
    const attachment = parseAttachmentMessage(item.body);

    return (
      <Pressable
        onLongPress={() => setReplyToMessage(item)}
        style={{
          alignItems: item.is_mine ? 'flex-end' : 'flex-start',
          marginBottom: y(12),
          paddingHorizontal: x(20),
        }}
      >
        {!item.is_mine ? (
          <Text
            style={{
              color: '#8a90a3',
              fontSize: s(12),
              fontWeight: '600',
              marginBottom: y(4),
            }}
          >
            {item.sender_name}
          </Text>
        ) : null}
        <View
          style={{
            backgroundColor: item.is_mine ? '#2f7df6' : '#f0f2f8',
            borderBottomLeftRadius: item.is_mine ? s(18) : s(4),
            borderBottomRightRadius: item.is_mine ? s(4) : s(18),
            borderTopLeftRadius: s(18),
            borderTopRightRadius: s(18),
            maxWidth: '78%',
            overflow: 'hidden',
            paddingHorizontal:
              attachment?.name === 'image' ? 0 : x(14),
            paddingVertical: attachment?.name === 'image' ? 0 : y(10),
          }}
        >
          {attachment ? (
            attachment.name === 'image' || isImageUrl(attachment.url) ? (
              <Image
                resizeMode="cover"
                source={{ uri: attachment.url }}
                style={{
                  borderRadius: s(18),
                  height: s(180),
                  width: s(220),
                }}
              />
            ) : (
              <View
                style={{
                  alignItems: 'center',
                  flexDirection: 'row',
                  gap: x(8),
                }}
              >
                <Text style={{ fontSize: s(20) }}>📎</Text>
                <Text
                  numberOfLines={1}
                  style={{
                    color: item.is_mine ? '#ffffff' : palette.ink,
                    fontSize: s(14),
                    fontWeight: '600',
                    maxWidth: s(160),
                    textDecorationLine: 'underline',
                  }}
                >
                  {attachment.name}
                </Text>
              </View>
            )
          ) : (
            <Text
              selectable
              style={{
                color: item.is_mine ? '#ffffff' : '#22242e',
                fontSize: Math.max(s(16), 14),
                fontWeight: '500',
                lineHeight: Math.max(s(22), 20),
              }}
            >
              {item.body}
            </Text>
          )}
        </View>
        <Text
          style={{
            color: '#a5a7a0',
            fontSize: s(11),
            fontWeight: '500',
            marginTop: y(4),
          }}
        >
          {formatRequestTime(item.created_at)}
        </Text>
      </Pressable>
    );
  };

  const renderChatRoom = () => (
    <View style={{ flex: 1 }}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: '#ffffff',
          borderBottomColor: '#edf0f5',
          borderBottomWidth: 1,
          flexDirection: 'row',
          gap: x(14),
          paddingBottom: y(14),
          paddingHorizontal: x(20),
          paddingTop: y(54),
        }}
      >
        <Pressable
          accessibilityRole="button"
          onPress={closeRoom}
          style={({ pressed }) => ({
            alignItems: 'center',
            backgroundColor: pressed ? '#f0f2f6' : '#f5f6fa',
            borderRadius: s(16),
            height: s(44),
            justifyContent: 'center',
            width: s(44),
          })}
        >
          <ChevronLeft color="#8a90a3" size={s(22)} strokeWidth={3} />
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              color: '#22242e',
              fontSize: s(18),
              fontWeight: '800',
            }}
          >
            {selectedConversation?.title}
          </Text>
          {selectedConversation?.subtitle ? (
            <Text
              numberOfLines={1}
              style={{
                color: '#8a90a3',
                fontSize: s(13),
                fontWeight: '500',
                marginTop: y(2),
              }}
            >
              {selectedConversation.subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {loadingMessages ? (
        <View
          style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}
        >
          <ActivityIndicator color={palette.greenDeep} size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          contentContainerStyle={{
            paddingBottom: y(16),
            paddingTop: y(16),
          }}
          data={messages}
          keyExtractor={(item) => item.message_id}
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={renderMessageItem}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={{
          backgroundColor: '#ffffff',
          borderTopColor: '#edf0f5',
          borderTopWidth: 1,
          paddingBottom: y(24),
          paddingHorizontal: x(16),
          paddingTop: y(12),
        }}
      >
        {error ? <InlineError error={error} s={s} x={x} y={y} /> : null}

        {replyToMessage ? (
          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#f3f5fb',
              borderRadius: s(12),
              flexDirection: 'row',
              gap: x(10),
              marginBottom: y(10),
              paddingHorizontal: x(14),
              paddingVertical: y(8),
            }}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: '#2f7df6',
                  fontSize: s(13),
                  fontWeight: '800',
                }}
              >
                Replying to {replyToMessage.sender_name}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: '#22242e',
                  fontSize: s(13),
                  fontWeight: '500',
                  marginTop: y(2),
                }}
              >
                {replyToMessage.body}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => setReplyToMessage(null)}
              style={({ pressed }) => ({
                alignItems: 'center',
                height: s(34),
                justifyContent: 'center',
                opacity: pressed ? 0.58 : 1,
                width: s(34),
              })}
            >
              <X color="#8a90a3" size={s(18)} strokeWidth={2.5} />
            </Pressable>
          </View>
        ) : null}

        <View
          style={{ alignItems: 'center', flexDirection: 'row', gap: x(8) }}
        >
          <Pressable
            accessibilityRole="button"
            disabled={uploadingAttachment || sending}
            onPress={() => void handleAttach()}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: pressed ? '#e8eaf0' : '#f0f2f8',
              borderRadius: 999,
              height: s(46),
              justifyContent: 'center',
              opacity: uploadingAttachment ? 0.5 : 1,
              width: s(46),
            })}
          >
            {uploadingAttachment ? (
              <ActivityIndicator color={palette.greenDeep} size="small" />
            ) : (
              <Paperclip color="#8a90a3" size={s(20)} strokeWidth={2.4} />
            )}
          </Pressable>

          <TextInput
            onChangeText={setMessageText}
            onSubmitEditing={() => void sendMessage()}
            placeholder="My message"
            placeholderTextColor="#a1a6b6"
            returnKeyType="send"
            style={{
              borderColor: '#dbe1f0',
              borderRadius: s(22),
              borderWidth: 1,
              color: palette.ink,
              flex: 1,
              fontSize: Math.max(s(18), 16),
              fontWeight: '500',
              lineHeight: Math.max(s(24), 22),
              minHeight: y(58),
              paddingHorizontal: x(22),
              paddingVertical: y(12),
            }}
            value={messageText}
          />

          <Pressable
            accessibilityRole="button"
            disabled={!messageText.trim() || sending}
            onPress={() => void sendMessage()}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: messageText.trim() ? '#2f7df6' : '#d9dde7',
              borderRadius: 999,
              height: s(52),
              justifyContent: 'center',
              opacity: pressed ? 0.78 : 1,
              width: s(52),
            })}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Send color="#ffffff" size={s(20)} strokeWidth={2.6} />
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );

  return (
    <View style={{ backgroundColor: '#ffffff', flex: 1 }}>
      <StatusBar style="dark" />
      {selectedConversation ? renderChatRoom() : renderChatHome()}
    </View>
  );
}

function SectionHeader({
  label,
  s,
  y,
}: {
  label: string;
  s: (v: number) => number;
  y: (v: number) => number;
}) {
  return (
    <Text
      style={{
        color: '#22242e',
        fontSize: s(15),
        fontWeight: '800',
        letterSpacing: 0.2,
        marginBottom: y(12),
        marginTop: y(20),
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Text>
  );
}

function InlineError({
  error,
  s,
  x,
  y,
}: {
  error: string;
  s: (v: number) => number;
  x: (v: number) => number;
  y: (v: number) => number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#fff0ed',
        borderColor: '#ffd3ca',
        borderRadius: s(18),
        borderWidth: 1,
        marginBottom: y(10),
        paddingHorizontal: x(16),
        paddingVertical: y(12),
      }}
    >
      <Text style={{ color: '#a12d1c', fontSize: s(14), fontWeight: '600' }}>
        {error}
      </Text>
    </View>
  );
}

function EmptyChatCopy({
  body,
  s,
  y,
}: {
  body: string;
  s: (v: number) => number;
  y: (v: number) => number;
}) {
  return (
    <View
      style={{
        borderColor: '#eff1f5',
        borderRadius: s(24),
        borderStyle: 'dashed',
        borderWidth: 1,
        marginBottom: y(12),
        paddingVertical: y(20),
      }}
    >
      <Text
        style={{
          color: '#a0a3ac',
          fontSize: s(15),
          fontWeight: '500',
          lineHeight: s(22),
          paddingHorizontal: 18,
          textAlign: 'center',
        }}
      >
        {body}
      </Text>
    </View>
  );
}
