import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  BadgeCheck,
  CreditCard,
  ShieldCheck,
  Trash2,
  UserRound,
  X,
} from 'lucide-react-native';

import { palette } from '../../constants/theme';
import type { TeamMemberDetail } from '../../lib/member-service';

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function roleLabel(role?: string) {
  if (role === 'owner') {
    return 'Owner';
  }

  if (role === 'admin') {
    return 'Admin';
  }

  return 'Member';
}

export function MemberDetailSheet({
  canManage,
  detail,
  isLoading,
  onClose,
  onRemove,
  onRoleChange,
  visible,
}: {
  canManage: boolean;
  detail: TeamMemberDetail | null;
  isLoading: boolean;
  onClose: () => void;
  onRemove: () => Promise<void>;
  onRoleChange: (role: 'admin' | 'member') => Promise<void>;
  visible: boolean;
}) {
  const [busyAction, setBusyAction] = useState<
    'admin' | 'member' | 'remove' | ''
  >('');

  useEffect(() => {
    if (!visible) {
      setBusyAction('');
    }
  }, [visible]);

  const runAction = async (
    action: 'admin' | 'member' | 'remove',
    task: () => Promise<void>,
  ) => {
    setBusyAction(action);

    try {
      await task();
    } catch (error) {
      Alert.alert(
        'Could not update member',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusyAction('');
    }
  };

  const canEditRole =
    canManage && detail?.member_role !== 'owner' && detail?.member_status === 'active';
  const canRemove =
    canManage && detail?.member_role !== 'owner' && detail?.member_status === 'active';

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View
        style={{
          backgroundColor: 'rgba(10, 12, 9, 0.34)',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityLabel="Close member details"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            maxHeight: '86%',
            paddingBottom: 30,
            paddingHorizontal: 22,
            paddingTop: 16,
          }}
        >
          <View
            style={{
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'space-between',
              marginBottom: 18,
            }}
          >
            <View
              style={{
                backgroundColor: '#d8dbd2',
                borderRadius: 999,
                height: 5,
                marginLeft: 4,
                width: 48,
              }}
            />
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#f2f3ef',
                borderRadius: 999,
                height: 42,
                justifyContent: 'center',
                opacity: pressed ? 0.65 : 1,
                width: 42,
              })}
            >
              <X color="#11130f" size={20} strokeWidth={2.4} />
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 54 }}>
              <ActivityIndicator color={palette.greenDeep} />
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: 15,
                  fontWeight: '600',
                  marginTop: 14,
                }}
              >
                Loading member details
              </Text>
            </View>
          ) : detail ? (
            <ScrollView
              contentContainerStyle={{ paddingBottom: 8 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                <View
                  style={{
                    alignItems: 'center',
                    backgroundColor: palette.green,
                    borderRadius: 999,
                    height: 64,
                    justifyContent: 'center',
                    width: 64,
                  }}
                >
                  <UserRound color="#11130f" size={28} strokeWidth={2.4} />
                </View>
                <View style={{ flex: 1, marginLeft: 14 }}>
                  <Text
                    selectable
                    style={{
                      color: '#11130f',
                      fontSize: 26,
                      fontWeight: '900',
                      letterSpacing: -0.7,
                      lineHeight: 31,
                    }}
                  >
                    {detail.member_name}
                  </Text>
                  <Text
                    selectable
                    style={{
                      color: '#747a70',
                      fontSize: 14,
                      fontWeight: '700',
                      lineHeight: 20,
                      marginTop: 3,
                    }}
                  >
                    {roleLabel(detail.member_role)} · {detail.member_status}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  gap: 9,
                  marginTop: 20,
                }}
              >
                <MetricCard label="Pending" value={detail.pending_submissions} />
                <MetricCard label="Approved" value={detail.approved_submissions} />
                <MetricCard label="Rejected" value={detail.rejected_submissions} />
              </View>

              <InfoBlock
                icon={<CreditCard color="#11130f" size={20} strokeWidth={2.4} />}
                title="Payout bank"
              >
                <InfoLine label="Bank" value={detail.bank_name || 'Not added'} />
                <InfoLine
                  label="Account"
                  value={detail.account_number || 'Not added'}
                />
                <InfoLine
                  label="Account name"
                  value={detail.account_name || 'Not verified'}
                />
                <InfoLine
                  label="Verification"
                  value={detail.bank_is_verified ? 'Verified' : 'Pending'}
                />
              </InfoBlock>

              <InfoBlock
                icon={<BadgeCheck color="#11130f" size={20} strokeWidth={2.4} />}
                title="Payment readiness"
              >
                <InfoLine
                  label="Approved for payout"
                  value={money(detail.payout_ready_amount_naira)}
                />
                <InfoLine label="Email" value={detail.email || 'No email saved'} />
              </InfoBlock>

              {canEditRole ? (
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                  <SheetButton
                    busy={busyAction === 'admin'}
                    label={
                      detail.member_role === 'admin' ? 'Keep admin' : 'Make admin'
                    }
                    onPress={() => runAction('admin', () => onRoleChange('admin'))}
                  />
                  <SheetButton
                    busy={busyAction === 'member'}
                    label="Make member"
                    onPress={() => runAction('member', () => onRoleChange('member'))}
                    secondary
                  />
                </View>
              ) : null}

              {canRemove ? (
                <Pressable
                  accessibilityRole="button"
                  disabled={Boolean(busyAction)}
                  onPress={() =>
                    Alert.alert(
                      'Remove member?',
                      `${detail.member_name} will lose access to this team.`,
                      [
                        { style: 'cancel', text: 'Cancel' },
                        {
                          onPress: () => runAction('remove', onRemove),
                          style: 'destructive',
                          text: 'Remove',
                        },
                      ],
                    )
                  }
                  style={({ pressed }) => ({
                    alignItems: 'center',
                    borderColor: '#ffd4c9',
                    borderRadius: 999,
                    borderWidth: 1,
                    flexDirection: 'row',
                    height: 52,
                    justifyContent: 'center',
                    marginTop: 12,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Trash2 color="#b3261e" size={18} strokeWidth={2.4} />
                  <Text
                    selectable
                    style={{
                      color: '#b3261e',
                      fontSize: 15,
                      fontWeight: '900',
                      marginLeft: 8,
                    }}
                  >
                    {busyAction === 'remove' ? 'Removing...' : 'Remove member'}
                  </Text>
                </Pressable>
              ) : null}
            </ScrollView>
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 52 }}>
              <ShieldCheck color="rgba(17,19,15,0.24)" size={44} strokeWidth={2} />
              <Text
                selectable
                style={{
                  color: '#747a70',
                  fontSize: 15,
                  fontWeight: '700',
                  lineHeight: 22,
                  marginTop: 14,
                  textAlign: 'center',
                }}
              >
                Member details are unavailable.
              </Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <View
      style={{
        backgroundColor: '#f7f8f4',
        borderColor: '#eceee7',
        borderRadius: 18,
        borderWidth: 1,
        flex: 1,
        paddingHorizontal: 12,
        paddingVertical: 12,
      }}
    >
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: 21,
          fontVariant: ['tabular-nums'],
          fontWeight: '900',
        }}
      >
        {value}
      </Text>
      <Text
        selectable
        style={{
          color: '#8c9188',
          fontSize: 11,
          fontWeight: '800',
          marginTop: 3,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </Text>
    </View>
  );
}

function InfoBlock({
  children,
  icon,
  title,
}: {
  children: React.ReactNode;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <View
      style={{
        backgroundColor: '#fbfcf8',
        borderColor: '#eceee7',
        borderRadius: 22,
        borderWidth: 1,
        marginTop: 14,
        padding: 15,
      }}
    >
      <View style={{ alignItems: 'center', flexDirection: 'row', marginBottom: 10 }}>
        {icon}
        <Text
          selectable
          style={{
            color: '#11130f',
            fontSize: 16,
            fontWeight: '900',
            letterSpacing: -0.2,
            marginLeft: 8,
          }}
        >
          {title}
        </Text>
      </View>
      {children}
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 5,
      }}
    >
      <Text
        selectable
        style={{ color: '#8c9188', fontSize: 14, fontWeight: '700' }}
      >
        {label}
      </Text>
      <Text
        selectable
        numberOfLines={1}
        style={{
          color: '#11130f',
          flex: 1,
          fontSize: 14,
          fontWeight: '800',
          marginLeft: 12,
          textAlign: 'right',
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function SheetButton({
  busy,
  label,
  onPress,
  secondary = false,
}: {
  busy: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => ({
        alignItems: 'center',
        backgroundColor: secondary ? '#f0f1eb' : palette.green,
        borderRadius: 999,
        flex: 1,
        height: 52,
        justifyContent: 'center',
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Text
        selectable
        style={{
          color: '#11130f',
          fontSize: 15,
          fontWeight: '900',
          letterSpacing: -0.12,
        }}
      >
        {busy ? 'Saving...' : label}
      </Text>
    </Pressable>
  );
}
