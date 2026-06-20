import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { palette } from '@/constants/theme';
import { slides } from '@/constants/onboarding';
import { useAppContext } from '@/contexts/AppContext';
import type { Slide } from '@/types/app';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function sFor(scale: number, value: number) {
  return Math.round(value * scale);
}

export function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const { setCurrentScreen } = useAppContext();
  const [slideIndex, setSlideIndex] = useState(0);
  const flatRef = useRef<FlatList<Slide>>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const topPad = Platform.OS === 'web' ? 67 : insets.top;

  const widthScale = SCREEN_WIDTH / 590;
  const heightScale = SCREEN_HEIGHT / 1280;
  const scale = Math.min(widthScale, heightScale);
  const s = (v: number) => Math.round(v * scale);
  const x = (v: number) => Math.round(v * widthScale);
  const y = (v: number) => Math.round(v * heightScale);

  const current = slides[slideIndex]!;
  const isFirst = slideIndex === 0;
  const isLast = slideIndex === slides.length - 1;

  const goNext = () => {
    if (isLast) {
      setCurrentScreen('email');
      return;
    }
    const next = slideIndex + 1;
    setSlideIndex(next);
    flatRef.current?.scrollToIndex({ index: next, animated: true });
  };

  const goPrev = () => {
    if (slideIndex === 0) return;
    const prev = slideIndex - 1;
    setSlideIndex(prev);
    flatRef.current?.scrollToIndex({ index: prev, animated: true });
  };

  if (isFirst) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.paper, paddingTop: topPad }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text
            style={{
              color: palette.greenDeep,
              fontSize: s(58),
              fontWeight: '900',
              letterSpacing: -s(3),
            }}
          >
            crewpay
          </Text>
          <Text
            style={{
              color: palette.muted,
              fontSize: s(18),
              marginTop: s(10),
              letterSpacing: -0.2,
            }}
          >
            Coordinate work. Pay on time.
          </Text>
        </View>
        <View
          style={{
            paddingBottom: Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24,
            paddingHorizontal: x(36),
          }}
        >
          <Pressable
            onPress={goNext}
            style={({ pressed }) => ({
              backgroundColor: palette.green,
              borderRadius: s(18),
              alignItems: 'center',
              justifyContent: 'center',
              height: y(72),
              opacity: pressed ? 0.88 : 1,
            })}
          >
            <Text
              style={{
                color: palette.ink,
                fontSize: s(20),
                fontWeight: '800',
                letterSpacing: -0.3,
              }}
            >
              Get started
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setCurrentScreen('email')}
            style={{ alignItems: 'center', marginTop: s(16) }}
          >
            <Text
              style={{
                color: palette.muted,
                fontSize: s(16),
                fontWeight: '500',
              }}
            >
              Sign in to existing account
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.paper }}>
      <FlatList
        ref={flatRef}
        data={slides.slice(1)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        keyExtractor={(_, i) => String(i)}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        renderItem={({ item }) => (
          <View style={{ width: SCREEN_WIDTH }}>
            {item.image ? (
              <Image
                source={item.image}
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT * 0.52,
                  resizeMode: 'cover',
                }}
              />
            ) : (
              <View
                style={{
                  width: SCREEN_WIDTH,
                  height: SCREEN_HEIGHT * 0.52,
                  backgroundColor: palette.rail,
                }}
              />
            )}
          </View>
        )}
      />
      <View
        style={{
          position: 'absolute',
          top: topPad + s(16),
          left: x(24),
          right: x(24),
          flexDirection: 'row',
          gap: s(6),
        }}
      >
        {slides.slice(1).map((_, i) => {
          const isActive = i === slideIndex - 1;
          return (
            <View
              key={i}
              style={{
                flex: 1,
                height: s(3),
                borderRadius: 999,
                backgroundColor: isActive ? palette.greenDeep : 'rgba(255,255,255,0.55)',
              }}
            />
          );
        })}
      </View>
      <View
        style={{
          flex: 1,
          paddingHorizontal: x(36),
          paddingTop: y(28),
          justifyContent: 'space-between',
          paddingBottom: Platform.OS === 'web' ? 34 + insets.bottom : insets.bottom + 24,
        }}
      >
        <View>
          <Text
            style={{
              color: palette.greenDeep,
              fontSize: s(13),
              fontWeight: '700',
              letterSpacing: s(1.4),
              textTransform: 'uppercase',
            }}
          >
            {current.eyebrow}
          </Text>
          <Text
            style={{
              color: palette.ink,
              fontSize: s(30),
              fontWeight: '900',
              letterSpacing: -s(1.2),
              marginTop: s(8),
              lineHeight: s(36),
            }}
          >
            {current.title}
          </Text>
          {!!current.body && (
            <Text
              style={{
                color: palette.muted,
                fontSize: s(17),
                marginTop: s(14),
                lineHeight: s(25),
                fontWeight: '400',
              }}
            >
              {current.body}
            </Text>
          )}
        </View>
        <View style={{ gap: s(12) }}>
          {!isFirst && (
            <View style={{ flexDirection: 'row', gap: s(12) }}>
              {slideIndex > 1 && (
                <Pressable
                  onPress={goPrev}
                  style={({ pressed }) => ({
                    flex: 1,
                    backgroundColor: palette.rail,
                    borderRadius: s(18),
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: y(72),
                    opacity: pressed ? 0.85 : 1,
                  })}
                >
                  <Text
                    style={{
                      color: palette.ink,
                      fontSize: s(18),
                      fontWeight: '700',
                    }}
                  >
                    Back
                  </Text>
                </Pressable>
              )}
              <Pressable
                onPress={goNext}
                style={({ pressed }) => ({
                  flex: 3,
                  backgroundColor: palette.green,
                  borderRadius: s(18),
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: y(72),
                  opacity: pressed ? 0.88 : 1,
                })}
              >
                <Text
                  style={{
                    color: palette.ink,
                    fontSize: s(20),
                    fontWeight: '800',
                    letterSpacing: -0.3,
                  }}
                >
                  {current.cta}
                </Text>
              </Pressable>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
