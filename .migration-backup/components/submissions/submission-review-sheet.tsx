import { useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';

import { palette } from '../../constants/theme';
import type { TaskSubmissionStatus } from '../../lib/submission-service';

type ReviewDecision = Extract<TaskSubmissionStatus, 'approved' | 'rejected'>;

export function SubmissionReviewSheet({
  decision,
  isSubmitting,
  memberName,
  onClose,
  onSubmit,
  taskTitle,
  visible,
}: {
  decision: ReviewDecision | null;
  isSubmitting: boolean;
  memberName: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<void> | void;
  taskTitle: string;
  visible: boolean;
}) {
  const [note, setNote] = useState('');
  const isApproval = decision === 'approved';

  useEffect(() => {
    if (visible) {
      setNote('');
    }
  }, [visible]);

  if (!decision) {
    return null;
  }

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{
          backgroundColor: 'rgba(10, 12, 9, 0.34)',
          flex: 1,
          justifyContent: 'flex-end',
        }}
      >
        <Pressable
          accessibilityLabel="Close review sheet"
          accessibilityRole="button"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <View
          style={{
            backgroundColor: '#ffffff',
            borderTopLeftRadius: 32,
            borderTopRightRadius: 32,
            paddingBottom: 34,
            paddingHorizontal: 24,
            paddingTop: 18,
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              backgroundColor: '#d8dbd2',
              borderRadius: 999,
              height: 5,
              marginBottom: 24,
              width: 48,
            }}
          />
          <Text
            selectable
            style={{
              color: '#11130f',
              fontSize: 27,
              fontWeight: '900',
              letterSpacing: -0.8,
              lineHeight: 32,
            }}
          >
            {isApproval ? 'Approve submission' : 'Reject submission'}
          </Text>
          <Text
            selectable
            style={{
              color: '#747a70',
              fontSize: 15,
              fontWeight: '500',
              lineHeight: 22,
              marginTop: 8,
            }}
          >
            {memberName} submitted proof for {taskTitle}. Add a short note if
            the decision needs context.
          </Text>

          <TextInput
            multiline
            onChangeText={setNote}
            placeholder={
              isApproval
                ? 'Optional note, e.g. Approved. Good work.'
                : 'Optional note, e.g. Please resend a clearer photo.'
            }
            placeholderTextColor="#a5aaa0"
            style={{
              backgroundColor: '#fbfcf8',
              borderColor: '#dfe2da',
              borderRadius: 18,
              borderWidth: 1,
              color: '#11130f',
              fontSize: 16,
              fontWeight: '500',
              lineHeight: 23,
              marginTop: 18,
              minHeight: 112,
              paddingHorizontal: 14,
              paddingTop: 13,
              textAlignVertical: 'top',
            }}
            value={note}
          />

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={onClose}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: '#f0f1eb',
                borderRadius: 999,
                flex: 1,
                height: 54,
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
                Cancel
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isSubmitting}
              onPress={() => onSubmit(note.trim())}
              style={({ pressed }) => ({
                alignItems: 'center',
                backgroundColor: isApproval ? palette.green : '#11130f',
                borderRadius: 999,
                flex: 1,
                height: 54,
                justifyContent: 'center',
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Text
                selectable
                style={{
                  color: isApproval ? '#11130f' : '#ffffff',
                  fontSize: 15,
                  fontWeight: '900',
                  letterSpacing: -0.12,
                }}
              >
                {isSubmitting
                  ? 'Saving...'
                  : isApproval
                    ? 'Approve'
                    : 'Reject'}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
