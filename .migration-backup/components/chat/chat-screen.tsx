import { StatusBar } from 'expo-status-bar';
import {
  ActivityIndicator,
  FlatList,
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
  RefreshCw,
  Send,
  Users,
} from 'lucide-react-native';

import {
  ensureDirectChat,
  listChatConversations,
  listChatMessages,
  listChatTargets,
  markChatRead,
  sendChatMessage,
  subscribeToConversationMessages,
  type ChatConversation,
  type ChatMessage,
  type ChatTarget,
} from '../../lib/chat-service';
import { palette } from '../../constants/theme';
import { formatRequestTime, getErrorMessage } from '../../utils/app-helpers';

type ChatScreenProps = {
  onBack: () => void;
};

function getInitials(value: string) {
  const words = value
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return 'CP';
  }

  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? '')
    .join('');
}

function shortRole(role: string) {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Member';
}

function formatReplyBody(message: ChatMessage, body: string) {
  const excerpt = message.body.replace(/\s+/g, ' ').trim().slice(0, 90);

  return `Replying to ${message.sender_name}: "${excerpt}"\n${body}`;
}

export function ChatScreen({ onBack }: ChatScreenProps) {
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
  const swipeStartX = useRef(0);
  const swipeStartY = useRef(0);

  const directConversationKeys = useMemo(() => {
    return new Set(
      conversations
        .filter((conversation) => conversation.conversation_type === 'direct')
        .map(
          (conversation) =>
            `${conversation.team_id}:${conversation.other_profile_id ?? ''}`,
        ),
    );
  }, [conversations]);

  const teamConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => conversation.conversation_type === 'team',
      ),
    [conversations],
  );

  const directConversations = useMemo(
    () =>
      conversations.filter(
        (conversation) => conversation.conversation_type === 'direct',
      ),
    [conversations],
  );

  const freshTargets = useMemo(
    () =>
      targets.filter(
        (target) =>
          !directConversationKeys.has(
            `${target.team_id}:${target.profile_id}`,
          ),
      ),
    [directConversationKeys, targets],
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

  const loadMessages = useCallback(async (conversation: ChatConversation) => {
    setLoadingMessages(true);
    setError('');

    try {
      const messageRows = await listChatMessages(conversation.conversation_id);
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
  }, [loadChatHome]);

  useEffect(() => {
    void loadChatHome();
  }, [loadChatHome]);

  useEffect(() => {
    if (!selectedConversation) {
      return undefined;
    }

    void loadMessages(selectedConversation);

    return subscribeToConversationMessages(
      selectedConversation.conversation_id,
      () => {
        void loadMessages(selectedConversation);
      },
    );
  }, [loadMessages, selectedConversation]);

  const openConversation = useCallback(
    (conversation: ChatConversation) => {
      setSelectedConversation(conversation);
      setMessageText('');
      setReplyToMessage(null);
    },
    [],
  );

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

  const sendMessage = useCallback(async () => {
    const body = messageText.trim();
    const outgoingBody = replyToMessage
      ? formatReplyBody(replyToMessage, body)
      : body;

    if (!selectedConversation || !body || sending) {
      return;
    }

    setSending(true);
    setMessageText('');
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
      setMessageText(body);
      setError(getErrorMessage(sendError));
    } finally {
      setSending(false);
    }
  }, [loadChatHome, messageText, replyToMessage, selectedConversation, sending]);

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
          style={{
            alignItems: 'center',
            flexDirection: 'row',
            gap: x(8),
          }}
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
            style={{
              color: '#ffffff',
              fontSize: s(12),
              fontWeight: '800',
            }}
          >
            {conversation.unread_count}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );

  const renderTargetRow = (target: ChatTarget) => (
    <Pressable
      key={`${target.team_id}:${target.profile_id}`}
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
          style={{
            color: '#2f61d9',
            fontSize: s(14),
            fontWeight: '800',
          }}
        >
          {getInitials(target.member_name)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text
          numberOfLines={1}
          style={{
            color: palette.ink,
            fontSize: s(16),
            fontWeight: '700',
          }}
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
      <MessageCircle color={palette.greenDeep} size={s(19)} strokeWidth={2.4} />
    </Pressable>
  );

  const renderChatHome = () => (
    <View style={{ flex: 1 }}>
      <View
        style={{
          paddingHorizontal: x(38),
          paddingTop: y(54),
        }}
      >
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
            {directConversations.length === 0 && freshTargets.length === 0 ? (
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

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View
      style={{
        alignItems: item.is_mine ? 'flex-end' : 'flex-start',
        marginBottom: y(10),
      }}
    >
      {!item.is_mine ? (
        <Text
          style={{
            color: '#858895',
            fontSize: s(12),
            fontWeight: '600',
            marginBottom: y(5),
            marginLeft: x(4),
          }}
        >
          {item.sender_name}
        </Text>
      ) : null}
      <View
        onResponderGrant={(event) => {
          swipeStartX.current = event.nativeEvent.pageX;
          swipeStartY.current = event.nativeEvent.pageY;
        }}
        onResponderRelease={(event) => {
          const deltaX = event.nativeEvent.pageX - swipeStartX.current;
          const deltaY = event.nativeEvent.pageY - swipeStartY.current;

          if (deltaX < -42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.15) {
            setReplyToMessage(item);
          }
        }}
        onStartShouldSetResponder={() => true}
        style={{
          backgroundColor: item.is_mine ? '#2f7df6' : '#fff4f0',
          borderBottomLeftRadius: item.is_mine ? s(22) : s(8),
          borderBottomRightRadius: item.is_mine ? s(8) : s(22),
          borderTopLeftRadius: s(22),
          borderTopRightRadius: s(22),
          maxWidth: '82%',
          paddingHorizontal: x(20),
          paddingVertical: y(14),
        }}
      >
        <Text
          style={{
            color: item.is_mine ? '#ffffff' : '#262633',
            fontSize: s(18),
            fontWeight: '500',
            lineHeight: s(27),
          }}
        >
          {item.body}
        </Text>
      </View>
    </View>
  );

  const renderChatRoom = () => {
    if (!selectedConversation) {
      return null;
    }

    return (
      <View style={{ flex: 1 }}>
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              gap: x(14),
              paddingHorizontal: x(38),
              paddingTop: y(54),
            }}
          >
            <Pressable
              accessibilityRole="button"
              onPress={closeRoom}
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
            <View style={{ flex: 1 }}>
              <Text
                numberOfLines={1}
                style={{
                  color: palette.ink,
                  fontSize: s(22),
                  fontWeight: '800',
                  letterSpacing: -0.4,
                }}
              >
                {selectedConversation.title}
              </Text>
              <Text
                numberOfLines={1}
                style={{
                  color: '#757989',
                  fontSize: s(15),
                  fontWeight: '500',
                  marginTop: y(2),
                }}
              >
                {selectedConversation.conversation_type === 'team'
                  ? 'Team chat'
                  : selectedConversation.subtitle}
              </Text>
            </View>
          </View>

          {error ? (
            <View style={{ paddingHorizontal: x(38), paddingTop: y(14) }}>
              <InlineError error={error} s={s} x={x} y={y} />
            </View>
          ) : null}

          <FlatList
            ref={listRef}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent:
                messages.length === 0 && !loadingMessages
                  ? 'center'
                  : 'flex-end',
              paddingBottom: y(22),
              paddingHorizontal: x(54),
              paddingTop: y(44),
            }}
            data={messages}
            keyExtractor={(item) => item.message_id}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              loadingMessages ? (
                <ActivityIndicator color={palette.greenDeep} size="large" />
              ) : (
                <View style={{ alignItems: 'center', paddingHorizontal: x(20) }}>
                  <MessageCircle
                    color="#c7cad2"
                    size={s(42)}
                    strokeWidth={2.2}
                  />
                  <Text
                    style={{
                      color: '#22242e',
                      fontSize: s(19),
                      fontWeight: '700',
                      marginTop: y(14),
                      textAlign: 'center',
                    }}
                  >
                    No messages yet
                  </Text>
                  <Text
                    style={{
                      color: '#a2a5ad',
                      fontSize: s(15),
                      fontWeight: '500',
                      lineHeight: s(22),
                      marginTop: y(6),
                      textAlign: 'center',
                    }}
                  >
                    Send the first message and keep the team aligned.
                  </Text>
                </View>
              )
            }
            onContentSizeChange={() => {
              listRef.current?.scrollToEnd({ animated: true });
            }}
            renderItem={renderMessage}
            showsVerticalScrollIndicator={false}
          />

          <View
            style={{
              paddingBottom: y(32),
              paddingHorizontal: x(42),
              paddingTop: y(10),
            }}
          >
            {replyToMessage ? (
              <View
                style={{
                  alignItems: 'center',
                  backgroundColor: '#f4f6fb',
                  borderColor: '#e1e6f3',
                  borderRadius: s(18),
                  borderWidth: 1,
                  flexDirection: 'row',
                  marginBottom: y(9),
                  paddingHorizontal: x(14),
                  paddingVertical: y(9),
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    numberOfLines={1}
                    style={{
                      color: '#5f6f91',
                      fontSize: s(12),
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
                  <Text
                    style={{
                      color: '#8a90a3',
                      fontSize: Math.max(s(22), 18),
                      fontWeight: '700',
                      lineHeight: s(24),
                    }}
                  >
                    ×
                  </Text>
                </Pressable>
              </View>
            ) : null}
            <View
              style={{
                alignItems: 'center',
                flexDirection: 'row',
                gap: x(10),
              }}
            >
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
  };

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
  s: (value: number) => number;
  y: (value: number) => number;
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
  s: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
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
      <Text
        style={{
          color: '#a12d1c',
          fontSize: s(14),
          fontWeight: '600',
        }}
      >
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
  s: (value: number) => number;
  y: (value: number) => number;
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
