import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { useAppContext } from '@/contexts/AppContext';
import { listMyTasks, type TaskWithTeams } from '@/lib/task-service';
import { listMyTeams, listMyTeamMemberships, type TeamRecord } from '@/lib/team-service';
import { listMyNotifications, type AppNotification } from '@/lib/notification-service';
import { crewLeadHomeActions, crewMateHomeActions } from '@/constants/home';
import type { HomeActionConfig, HomeTab } from '@/types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type HomeScreenProps = {
  initialAction?: string;
};

const toneColors: Record<string, string> = {
  blue: '#d6eaff',
  orange: '#ffe9cc',
  purple: '#eedcff',
  black: '#e1e1dc',
};

const toneFg: Record<string, string> = {
  blue: '#1a4a7a',
  orange: '#7a3a00',
  purple: '#4a1a7a',
  black: '#2a2a24',
};

function formatNaira(v: number) {
  return `₦${Math.trunc(v).toLocaleString('en-NG')}`;
}

export function HomeScreen({ initialAction }: HomeScreenProps) {
  const insets = useSafeAreaInsets();
  const { profile, signOut, setCurrentScreen } = useAppContext();
  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const bottomPad = Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24;

  const widthScale = SCREEN_WIDTH / 590;
  const heightScale = SCREEN_HEIGHT / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (v: number) => Math.round(v * scale);
  const y = (v: number) => Math.round(v * heightScale);
  const x = (v: number) => Math.round(v * widthScale);

  const [tab, setTab] = useState<HomeTab>('home');
  const [tasks, setTasks] = useState<TaskWithTeams[]>([]);
  const [teams, setTeams] = useState<TeamRecord[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isCrewLead = profile?.account_role === 'crewlead';
  const actions = isCrewLead ? crewLeadHomeActions : crewMateHomeActions;
  const firstName = profile?.first_name ?? profile?.full_name?.split(' ')[0] ?? 'there';

  const loadData = useCallback(async () => {
    try {
      const [t, tm, n] = await Promise.all([
        listMyTasks().catch(() => [] as TaskWithTeams[]),
        (isCrewLead ? listMyTeams() : listMyTeamMemberships()).catch(() => [] as TeamRecord[]),
        listMyNotifications().catch(() => [] as AppNotification[]),
      ]);
      setTasks(t);
      setTeams(tm);
      setNotifications(n);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load data.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCrewLead]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <View
        style={{
          paddingTop: topPad,
          paddingHorizontal: x(28),
          paddingBottom: s(16),
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
          backgroundColor: palette.paper,
        }}
      >
        <View>
          <Text style={{ color: palette.muted, fontSize: s(13), fontWeight: '600' }}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long' })}
          </Text>
          <Text style={{ color: palette.ink, fontSize: s(22), fontWeight: '800', letterSpacing: -0.5 }}>
            Hey, {firstName} 👋
          </Text>
        </View>
        <Pressable
          onPress={() => setCurrentScreen('notifications')}
          style={{
            width: s(44),
            height: s(44),
            borderRadius: 999,
            backgroundColor: palette.rail,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: s(20) }}>🔔</Text>
          {unreadCount > 0 && (
            <View
              style={{
                position: 'absolute',
                top: 0,
                right: 0,
                backgroundColor: '#bd2f20',
                borderRadius: 999,
                width: s(16),
                height: s(16),
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#fff', fontSize: s(9), fontWeight: '800' }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>

      <View
        style={{
          flexDirection: 'row',
          paddingHorizontal: x(28),
          paddingVertical: s(12),
          gap: s(8),
          borderBottomWidth: 1,
          borderBottomColor: palette.line,
        }}
      >
        {(['home', 'activity', 'settings'] as HomeTab[]).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={{
              paddingHorizontal: s(16),
              paddingVertical: s(8),
              borderRadius: s(24),
              backgroundColor: tab === t ? palette.greenDeep : 'transparent',
            }}
          >
            <Text
              style={{
                color: tab === t ? '#fffef8' : palette.muted,
                fontSize: s(14),
                fontWeight: '600',
                textTransform: 'capitalize',
              }}
            >
              {t}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={palette.greenDeep} />
        </View>
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.greenDeep} />
          }
          contentContainerStyle={{ paddingBottom: bottomPad + s(80) }}
        >
          {tab === 'home' && (
            <View style={{ paddingHorizontal: x(24), paddingTop: y(24) }}>
              <Text
                style={{
                  color: palette.ink,
                  fontSize: s(18),
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: s(14),
                }}
              >
                Quick actions
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: s(12) }}>
                {actions.map((action: HomeActionConfig) => (
                  <Pressable
                    key={action.id}
                    onPress={() => setCurrentScreen(action.id as any)}
                    style={({ pressed }) => ({
                      width: (SCREEN_WIDTH - x(48) - s(12)) / 2,
                      backgroundColor: toneColors[action.tone] ?? palette.rail,
                      borderRadius: s(18),
                      padding: s(18),
                      opacity: pressed ? 0.88 : 1,
                      minHeight: y(110),
                      justifyContent: 'flex-end',
                    })}
                  >
                    <Text
                      style={{
                        color: toneFg[action.tone] ?? palette.ink,
                        fontSize: s(17),
                        fontWeight: '800',
                        letterSpacing: -0.2,
                      }}
                    >
                      {action.title}
                    </Text>
                    <Text
                      style={{
                        color: toneFg[action.tone] ?? palette.muted,
                        fontSize: s(13),
                        marginTop: s(2),
                        opacity: 0.75,
                      }}
                    >
                      {action.subtitle}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {tasks.length > 0 && (
                <View style={{ marginTop: y(32) }}>
                  <Text
                    style={{
                      color: palette.ink,
                      fontSize: s(18),
                      fontWeight: '800',
                      letterSpacing: -0.3,
                      marginBottom: s(12),
                    }}
                  >
                    Recent tasks
                  </Text>
                  {tasks.slice(0, 5).map((task) => (
                    <Pressable
                      key={task.id}
                      style={({ pressed }) => ({
                        backgroundColor: palette.rail,
                        borderRadius: s(14),
                        padding: s(16),
                        marginBottom: s(10),
                        opacity: pressed ? 0.88 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: palette.ink,
                          fontSize: s(16),
                          fontWeight: '700',
                          letterSpacing: -0.2,
                        }}
                      >
                        {task.title}
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: s(6), gap: s(10) }}>
                        <Text style={{ color: palette.greenDeep, fontSize: s(14), fontWeight: '700' }}>
                          {formatNaira(task.payout_amount_naira)}
                        </Text>
                        <Text style={{ color: palette.muted, fontSize: s(13) }}>
                          {task.status}
                        </Text>
                      </View>
                    </Pressable>
                  ))}
                </View>
              )}

              {teams.length > 0 && (
                <View style={{ marginTop: y(24) }}>
                  <Text
                    style={{
                      color: palette.ink,
                      fontSize: s(18),
                      fontWeight: '800',
                      letterSpacing: -0.3,
                      marginBottom: s(12),
                    }}
                  >
                    My teams
                  </Text>
                  {teams.slice(0, 5).map((team) => (
                    <Pressable
                      key={team.id}
                      style={({ pressed }) => ({
                        backgroundColor: palette.line,
                        borderRadius: s(14),
                        padding: s(16),
                        marginBottom: s(10),
                        opacity: pressed ? 0.88 : 1,
                      })}
                    >
                      <Text
                        style={{
                          color: palette.ink,
                          fontSize: s(16),
                          fontWeight: '700',
                        }}
                      >
                        {team.name}
                      </Text>
                      <Text style={{ color: palette.muted, fontSize: s(13), marginTop: s(2) }}>
                        {team.category} · {team.location}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              )}

              {tasks.length === 0 && teams.length === 0 && (
                <View
                  style={{
                    marginTop: y(48),
                    alignItems: 'center',
                    paddingHorizontal: x(24),
                  }}
                >
                  <Text
                    style={{
                      color: palette.muted,
                      fontSize: s(16),
                      textAlign: 'center',
                      lineHeight: s(24),
                    }}
                  >
                    {isCrewLead
                      ? 'Create your first task or team to get started.'
                      : 'Join a team or browse tasks to get started.'}
                  </Text>
                </View>
              )}
            </View>
          )}

          {tab === 'activity' && (
            <View style={{ paddingHorizontal: x(24), paddingTop: y(24) }}>
              <Text
                style={{
                  color: palette.ink,
                  fontSize: s(18),
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: s(14),
                }}
              >
                Notifications
              </Text>
              {notifications.length === 0 ? (
                <Text style={{ color: palette.muted, fontSize: s(15) }}>No activity yet.</Text>
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <View
                    key={n.notification_key}
                    style={{
                      backgroundColor: n.read_at ? palette.line : '#f1fce9',
                      borderRadius: s(14),
                      padding: s(16),
                      marginBottom: s(10),
                    }}
                  >
                    <Text style={{ color: palette.ink, fontSize: s(15), fontWeight: '700' }}>
                      {n.title}
                    </Text>
                    <Text style={{ color: palette.muted, fontSize: s(13), marginTop: s(3) }}>
                      {n.body}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}

          {tab === 'settings' && (
            <View style={{ paddingHorizontal: x(24), paddingTop: y(24) }}>
              <Text
                style={{
                  color: palette.ink,
                  fontSize: s(18),
                  fontWeight: '800',
                  letterSpacing: -0.3,
                  marginBottom: s(14),
                }}
              >
                Settings
              </Text>
              <View
                style={{
                  backgroundColor: palette.rail,
                  borderRadius: s(16),
                  padding: s(16),
                  marginBottom: s(14),
                }}
              >
                <Text style={{ color: palette.muted, fontSize: s(13), fontWeight: '600', marginBottom: s(4) }}>
                  Account
                </Text>
                <Text style={{ color: palette.ink, fontSize: s(16), fontWeight: '700' }}>
                  {profile?.full_name ?? (`${profile?.first_name ?? ''} ${profile?.last_name ?? ''}`.trim() || 'No name set')}
                </Text>
                <Text style={{ color: palette.muted, fontSize: s(14), marginTop: s(2) }}>
                  {profile?.email}
                </Text>
                <Text
                  style={{
                    color: palette.greenDeep,
                    fontSize: s(13),
                    fontWeight: '700',
                    marginTop: s(6),
                    textTransform: 'capitalize',
                  }}
                >
                  {profile?.account_role}
                </Text>
              </View>

              <Pressable
                onPress={() => signOut()}
                style={({ pressed }) => ({
                  backgroundColor: '#fde8e4',
                  borderRadius: s(14),
                  padding: s(16),
                  alignItems: 'center',
                  opacity: pressed ? 0.85 : 1,
                })}
              >
                <Text style={{ color: '#bd2f20', fontSize: s(16), fontWeight: '700' }}>Sign out</Text>
              </Pressable>
            </View>
          )}
        </ScrollView>
      )}
    </View>
  );
}
