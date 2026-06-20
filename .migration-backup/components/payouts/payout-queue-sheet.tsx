import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Check, CreditCard, RefreshCcw, X } from 'lucide-react-native';

import { palette } from '../../constants/theme';
import type { PayoutQueueItem } from '../../lib/payout-service';

function money(value: number) {
  return `₦${Number(value || 0).toLocaleString()}`;
}

function parseAmount(value: string) {
  return Number(value.replace(/[^0-9.]/g, '')) || 0;
}

export function PayoutQueueSheet({
  isLoading,
  items,
  onClose,
  onRefresh,
  onReserve,
  onUpdateAmount,
  visible,
}: {
  isLoading: boolean;
  items: PayoutQueueItem[];
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onReserve: (approvalIds: string[]) => Promise<void>;
  onUpdateAmount: (approvalId: string, amountNaira: number) => Promise<void>;
  visible: boolean;
}) {
  const [amountDrafts, setAmountDrafts] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [busyAction, setBusyAction] = useState('');

  useEffect(() => {
    if (!visible) {
      setSelectedIds([]);
      setBusyAction('');
      return;
    }

    setAmountDrafts(
      items.reduce<Record<string, string>>((drafts, item) => {
        drafts[item.payout_approval_id] = String(Number(item.amount_naira || 0));
        return drafts;
      }, {}),
    );
    setSelectedIds(
      items
        .filter((item) => item.status === 'pending')
        .map((item) => item.payout_approval_id),
    );
  }, [items, visible]);

  const selectedTotal = useMemo(() => {
    const selected = new Set(selectedIds);

    return items.reduce((total, item) => {
      if (!selected.has(item.payout_approval_id)) {
        return total;
      }

      return total + parseAmount(amountDrafts[item.payout_approval_id] ?? '0');
    }, 0);
  }, [amountDrafts, items, selectedIds]);

  const pendingItems = items.filter((item) => item.status === 'pending');
  const allSelected =
    pendingItems.length > 0 &&
    pendingItems.every((item) => selectedIds.includes(item.payout_approval_id));

  const toggleSelected = (approvalId: string) => {
    setSelectedIds((current) =>
      current.includes(approvalId)
        ? current.filter((id) => id !== approvalId)
        : [...current, approvalId],
    );
  };

  const saveAmount = async (item: PayoutQueueItem) => {
    const nextAmount = parseAmount(amountDrafts[item.payout_approval_id] ?? '0');

    if (nextAmount <= 0) {
      Alert.alert('Enter an amount', 'Payout amount must be greater than zero.');
      return;
    }

    setBusyAction(`amount:${item.payout_approval_id}`);

    try {
      await onUpdateAmount(item.payout_approval_id, nextAmount);
    } catch (error) {
      Alert.alert(
        'Could not update amount',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusyAction('');
    }
  };

  const reserveSelected = async () => {
    if (selectedIds.length === 0) {
      Alert.alert('Choose payouts', 'Select at least one approved submission.');
      return;
    }

    setBusyAction('reserve');

    try {
      await onReserve(selectedIds);
      setSelectedIds([]);
    } catch (error) {
      Alert.alert(
        'Could not reserve payouts',
        error instanceof Error ? error.message : 'Please try again.',
      );
    } finally {
      setBusyAction('');
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          backgroundColor: 'rgba(10, 12, 9, 0.34)',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityLabel="Close payout queue"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            maxHeight: '88%',
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
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable
                accessibilityRole="button"
                onPress={onRefresh}
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
                <RefreshCcw color="#11130f" size={18} strokeWidth={2.4} />
              </Pressable>
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
          </View>

          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: 29,
              fontWeight: '900',
              letterSpacing: -0.9,
              lineHeight: 34,
            }}
          >
            Payout-ready work
          </Text>
          <Text
            selectable
            style={{
              color: '#747a70',
              fontSize: 15,
              fontWeight: '500',
              lineHeight: 22,
              marginTop: 7,
            }}
          >
            Approved submissions wait here before batch payment. Edit amounts per
            member, then reserve the payout so it cannot be paid twice.
          </Text>

          <View
            style={{
              alignItems: 'center',
              backgroundColor: '#f7f8f4',
              borderColor: '#eceee7',
              borderRadius: 22,
              borderWidth: 1,
              flexDirection: 'row',
              marginTop: 16,
              padding: 14,
            }}
          >
            <View
              style={{
                alignItems: 'center',
                backgroundColor: palette.green,
                borderRadius: 999,
                height: 42,
                justifyContent: 'center',
                width: 42,
              }}
            >
              <CreditCard color="#11130f" size={20} strokeWidth={2.4} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text
                selectable
                style={{ color: '#11130f', fontSize: 20, fontWeight: '900' }}
              >
                {money(selectedTotal)}
              </Text>
              <Text
                selectable
                style={{
                  color: '#8c9188',
                  fontSize: 12,
                  fontWeight: '800',
                  marginTop: 2,
                  textTransform: 'uppercase',
                }}
              >
                {selectedIds.length} selected
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setSelectedIds(
                  allSelected
                    ? []
                    : pendingItems.map((item) => item.payout_approval_id),
                )
              }
              style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
            >
              <Text
                selectable
                style={{
                  color: allSelected ? '#747a70' : palette.greenDeep,
                  fontSize: 14,
                  fontWeight: '900',
                }}
              >
                {allSelected ? 'Clear' : 'Select all'}
              </Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={{ alignItems: 'center', paddingVertical: 42 }}>
              <ActivityIndicator color={palette.greenDeep} />
            </View>
          ) : items.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 42 }}>
              <Text
                selectable
                style={{
                  color: '#11130f',
                  fontSize: 17,
                  fontWeight: '900',
                  textAlign: 'center',
                }}
              >
                No approved submissions yet
              </Text>
              <Text
                selectable
                style={{
                  color: '#8c9188',
                  fontSize: 14,
                  fontWeight: '500',
                  lineHeight: 20,
                  marginTop: 7,
                  textAlign: 'center',
                }}
              >
                Once you approve CrewMate work, it appears here for payout.
              </Text>
            </View>
          ) : (
            <ScrollView
              contentContainerStyle={{ gap: 10, paddingVertical: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {items.map((item) => {
                const selected = selectedIds.includes(item.payout_approval_id);
                const amountDraft = amountDrafts[item.payout_approval_id] ?? '';
                const amountIsDirty =
                  parseAmount(amountDraft) !== Number(item.amount_naira || 0);
                const amountBusy =
                  busyAction === `amount:${item.payout_approval_id}`;

                return (
                  <View
                    key={item.payout_approval_id}
                    style={{
                      backgroundColor: '#fbfcf8',
                      borderColor: selected ? palette.green : '#eceee7',
                      borderRadius: 22,
                      borderWidth: 1.5,
                      padding: 14,
                    }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <Pressable
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        disabled={item.status !== 'pending'}
                        onPress={() => toggleSelected(item.payout_approval_id)}
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          backgroundColor: selected ? palette.green : '#ffffff',
                          borderColor: selected ? palette.green : '#dfe2da',
                          borderRadius: 999,
                          borderWidth: 1,
                          height: 30,
                          justifyContent: 'center',
                          opacity: pressed ? 0.7 : 1,
                          width: 30,
                        })}
                      >
                        {selected ? (
                          <Check color="#11130f" size={17} strokeWidth={3} />
                        ) : null}
                      </Pressable>
                      <View style={{ flex: 1, marginLeft: 11 }}>
                        <Text
                          selectable
                          style={{
                            color: '#11130f',
                            fontSize: 17,
                            fontWeight: '900',
                            letterSpacing: -0.25,
                            lineHeight: 22,
                          }}
                        >
                          {item.member_name}
                        </Text>
                        <Text
                          selectable
                          style={{
                            color: '#747a70',
                            fontSize: 13,
                            fontWeight: '600',
                            lineHeight: 19,
                            marginTop: 3,
                          }}
                        >
                          {item.task_title}
                        </Text>
                        <Text
                          selectable
                          style={{
                            color: '#a0a59d',
                            fontSize: 12,
                            fontWeight: '700',
                            lineHeight: 18,
                            marginTop: 4,
                          }}
                        >
                          {item.bank_name || 'No bank'} ·{' '}
                          {item.account_number || 'No account number'}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={{
                        alignItems: 'center',
                        flexDirection: 'row',
                        gap: 8,
                        marginTop: 12,
                      }}
                    >
                      <TextInput
                        keyboardType="decimal-pad"
                        onChangeText={(value) =>
                          setAmountDrafts((current) => ({
                            ...current,
                            [item.payout_approval_id]: value,
                          }))
                        }
                        placeholder="0"
                        placeholderTextColor="#a5aaa0"
                        style={{
                          backgroundColor: '#ffffff',
                          borderColor: '#dfe2da',
                          borderRadius: 16,
                          borderWidth: 1,
                          color: '#11130f',
                          flex: 1,
                          fontSize: 18,
                          fontWeight: '900',
                          height: 48,
                          paddingHorizontal: 13,
                        }}
                        value={amountDraft}
                      />
                      <Pressable
                        accessibilityRole="button"
                        disabled={!amountIsDirty || amountBusy}
                        onPress={() => saveAmount(item)}
                        style={({ pressed }) => ({
                          alignItems: 'center',
                          backgroundColor: amountIsDirty
                            ? palette.green
                            : '#f0f1eb',
                          borderRadius: 999,
                          height: 48,
                          justifyContent: 'center',
                          opacity: pressed ? 0.72 : 1,
                          paddingHorizontal: 18,
                        })}
                      >
                        <Text
                          selectable
                          style={{
                            color: '#11130f',
                            fontSize: 14,
                            fontWeight: '900',
                          }}
                        >
                          {amountBusy ? 'Saving' : 'Save'}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={busyAction === 'reserve' || selectedIds.length === 0}
            onPress={reserveSelected}
            style={({ pressed }) => ({
              alignItems: 'center',
              backgroundColor: selectedIds.length > 0 ? '#11130f' : '#d8dbd2',
              borderRadius: 999,
              height: 56,
              justifyContent: 'center',
              opacity: pressed ? 0.78 : 1,
            })}
          >
            <Text
              selectable
              style={{
                color: selectedIds.length > 0 ? '#ffffff' : '#747a70',
                fontSize: 16,
                fontWeight: '900',
                letterSpacing: -0.12,
              }}
            >
              {busyAction === 'reserve'
                ? 'Reserving...'
                : `Reserve ${selectedIds.length || ''} payout${
                    selectedIds.length === 1 ? '' : 's'
                  }`.trim()}
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
