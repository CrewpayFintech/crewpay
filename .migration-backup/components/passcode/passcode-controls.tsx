import { Animated, Pressable, Text, View } from 'react-native';

import { palette } from '../../constants/theme';

export function PasscodeDots({
  count,
  error = false,
  marginTop,
  s,
  scale,
  shake,
}: {
  count: number;
  error?: boolean;
  marginTop: number;
  s: (value: number) => number;
  scale: number;
  shake?: Animated.Value;
}) {
  return (
    <Animated.View
      style={[
        {
          alignSelf: 'center',
          flexDirection: 'row',
          gap: s(15),
          marginTop,
        },
        shake ? { transform: [{ translateX: shake }] } : null,
      ]}
    >
      {Array.from({ length: 4 }).map((_, index) => {
        const isFilled = index < count;
        return (
          <View
            key={`passcode-dot-${index}`}
            style={{
              backgroundColor: error
                ? '#bd2f20'
                : isFilled
                  ? '#4f514c'
                  : 'transparent',
              borderColor: error ? '#bd2f20' : '#5e605b',
              borderRadius: 999,
              borderWidth:
                error || isFilled ? 0 : Math.max(1.4, 1.7 * scale),
              height: s(23),
              width: s(23),
            }}
          />
        );
      })}
    </Animated.View>
  );
}

export function PasscodeKeypad({
  onDelete,
  onDigit,
  s,
  scale,
  x,
  y,
}: {
  onDelete: () => void;
  onDigit: (digit: string) => void;
  s: (value: number) => number;
  scale: number;
  x: (value: number) => number;
  y: (value: number) => number;
}) {
  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', 'Delete'],
  ];

  return (
    <View style={{ gap: y(92), marginTop: y(91) }}>
      {rows.map((row, rowIndex) => (
        <View
          key={`passcode-row-${rowIndex}`}
          style={{ flexDirection: 'row', justifyContent: 'space-between' }}
        >
          {row.map((value, index) => {
            const key = `${rowIndex}-${index}-${value || 'spacer'}`;

            if (!value) {
              return <View key={key} style={{ width: x(120) }} />;
            }

            return (
              <Pressable
                accessibilityRole="button"
                key={key}
                onPress={() =>
                  value === 'Delete' ? onDelete() : onDigit(value)
                }
                style={({ pressed }) => ({
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: y(44),
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                  width: x(120),
                })}
              >
                <Text
                  selectable
                  style={{
                    color: palette.greenDeep,
                    fontSize: s(23),
                    fontWeight: '800',
                    letterSpacing: -Math.max(0.1, 0.2 * scale),
                  }}
                >
                  {value}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
