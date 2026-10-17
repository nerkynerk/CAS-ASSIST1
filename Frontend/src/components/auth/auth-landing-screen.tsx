import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  FadeInDown,
  FadeInUp,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import {
  AcademicIcon,
  AppBackdrop,
  StatusBadge,
  SurfaceCard,
  type AcademicIconName,
} from '@/components/ui/academic-ui';
import { Fonts, Layout, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import type { LoginCategory } from '@/context/auth';

interface Props {
  onSelectCategory: (category: LoginCategory) => void;
}

const HERO_ENTERING = FadeInDown.duration(480)
  .easing(Easing.out(Easing.cubic))
  .reduceMotion(ReduceMotion.System);

const ROLE_OPTIONS = [
  {
    category: 'student' as const,
    eyebrow: 'Student services',
    title: 'I am a CAS Student',
    description: 'Access academic assistance, department updates, requests, and classroom announcements.',
    icon: { ios: 'graduationcap.fill', android: 'school', web: 'school' } as AcademicIconName,
    accent: 'blue' as const,
  },
  {
    category: 'institutional' as const,
    eyebrow: 'Institutional services',
    title: 'I am a CAS Staff/Faculty/Admin',
    description: 'Access authorized faculty, staff, and department management services.',
    icon: { ios: 'person.3.fill', android: 'groups', web: 'groups' } as AcademicIconName,
    accent: 'success' as const,
  },
];

function RoleOptionCard({
  category,
  eyebrow,
  title,
  description,
  icon,
  accent,
  index,
  onPress,
}: (typeof ROLE_OPTIONS)[number] & { index: number; onPress: () => void }) {
  const { colors } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const hoverProgress = useSharedValue(0);
  const pressProgress = useSharedValue(0);
  const isStudent = category === 'student';

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(hoverProgress.value, [0, 1], [0, -4]) },
      { scale: interpolate(pressProgress.value, [0, 1], [1, 0.985]) },
    ],
    shadowOpacity: interpolate(hoverProgress.value, [0, 1], [0.08, 0.17]),
    elevation: interpolate(hoverProgress.value, [0, 1], [3, 7]),
  }));

  function setHoverState(next: boolean) {
    setHovered(next);
    // Reanimated shared values are intentionally mutable animation state.
    // eslint-disable-next-line react-hooks/immutability
    hoverProgress.value = withTiming(next ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.cubic),
      reduceMotion: ReduceMotion.System,
    });
  }

  return (
    <Animated.View
      entering={FadeInUp.delay(index * 90 + 120).duration(420).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System)}
      style={[styles.roleCardShell, animatedStyle]}>
      <Pressable
        onPress={onPress}
        onHoverIn={() => setHoverState(true)}
        onHoverOut={() => setHoverState(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onPressIn={() => {
          // Reanimated shared values are intentionally mutable animation state.
          // eslint-disable-next-line react-hooks/immutability
          pressProgress.value = withTiming(1, { duration: 90, reduceMotion: ReduceMotion.System });
        }}
        onPressOut={() => {
          // Reanimated shared values are intentionally mutable animation state.
          // eslint-disable-next-line react-hooks/immutability
          pressProgress.value = withTiming(0, { duration: 140, reduceMotion: ReduceMotion.System });
        }}
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityHint="Opens the sign-in form for this account category."
        style={({ pressed }) => [
          styles.rolePressable,
          focused && { outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.primary, outlineOffset: 2 },
          pressed && styles.pressed,
        ]}>
        <SurfaceCard
          accent={accent}
          style={[
            styles.roleCard,
            {
              borderColor: hovered || focused ? colors.primary : colors.border,
              backgroundColor: colors.card,
            },
          ]}>
          <View style={[styles.roleIcon, { backgroundColor: isStudent ? colors.softBlue : colors.successBg }]}>
            <AcademicIcon name={icon} size={30} color={isStudent ? colors.primary : colors.success} />
          </View>
          <View style={styles.roleCopy}>
            <Text style={[styles.roleEyebrow, { color: isStudent ? colors.primary : colors.success }]}>{eyebrow}</Text>
            <Text style={[styles.roleTitle, { color: colors.navy }]}>{title}</Text>
            <Text style={[styles.roleDescription, { color: colors.textSecondary }]}>{description}</Text>
          </View>
          <View style={[styles.roleAction, { backgroundColor: hovered || focused ? colors.primary : colors.backgroundSelected }]}>
            <AcademicIcon name={{ ios: 'arrow.up.right', android: 'chevron_right', web: 'chevron_right' }} size={20} color={hovered || focused ? '#FFFFFF' : colors.primary} />
          </View>
        </SurfaceCard>
      </Pressable>
    </Animated.View>
  );
}

export default function AuthLandingScreen({ onSelectCategory }: Props) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const wide = width >= Layout.compactBreakpoint;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <ScrollView
          contentContainerStyle={[styles.scroll, wide && styles.scrollWide]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Animated.View entering={HERO_ENTERING} style={[styles.content, wide && styles.contentWide]}>
            <View style={styles.brandRow}>
              <View style={[styles.brandMark, { backgroundColor: colors.primary }]}>
                <AcademicIcon
                  name={{ ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' }}
                  color="#FFFFFF"
                  size={22}
                />
              </View>
              <View>
                <Text style={[styles.brandName, { color: colors.navy }]}>CAS Assist</Text>
                <Text style={[styles.brandMeta, { color: colors.textSecondary }]}>College of Arts and Sciences</Text>
              </View>
            </View>

            <View style={styles.heroCopy}>
              <StatusBadge label="NEU academic services portal" tone="blue" />
              <Text style={[styles.welcomeTitle, { color: colors.navy }, wide && styles.welcomeTitleWide]}>
                Welcome to your CAS workspace.
              </Text>
              <Text style={[styles.welcomeBody, { color: colors.textSecondary }]}>
                Choose the account type that best describes your work with the College of Arts and Sciences.
              </Text>
            </View>

            <View style={[styles.roleGrid, wide && styles.roleGridWide]}>
              {ROLE_OPTIONS.map((option, index) => (
                <RoleOptionCard
                  key={option.category}
                  {...option}
                  index={index}
                  onPress={() => onSelectCategory(option.category)}
                />
              ))}
            </View>

            <View style={[styles.trustNote, { borderTopColor: colors.border }]}>
              <AcademicIcon name={{ ios: 'checkmark.shield.fill', android: 'verified_user', web: 'verified_user' }} size={17} color={colors.primary} />
              <Text style={[styles.trustText, { color: colors.textSecondary }]}>Your account role is verified securely after sign-in.</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
  },
  scrollWide: { paddingVertical: Spacing.five },
  content: { width: '100%', maxWidth: 560, gap: Spacing.four },
  contentWide: { maxWidth: 1080 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  brandMark: {
    width: 48,
    height: 48,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  brandName: { fontFamily: Fonts.sans, fontSize: 19, lineHeight: 24, fontWeight: '800', letterSpacing: -0.3 },
  brandMeta: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '600' },
  heroCopy: { gap: Spacing.two, maxWidth: 680 },
  welcomeTitle: { fontFamily: Fonts.sans, fontSize: 36, lineHeight: 42, fontWeight: '800', letterSpacing: -1.1 },
  welcomeTitleWide: { fontSize: 48, lineHeight: 54, maxWidth: 760 },
  welcomeBody: { fontFamily: Fonts.sans, fontSize: 16, lineHeight: 24, maxWidth: 620 },
  roleGrid: { gap: Spacing.three },
  roleGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  roleCardShell: { flex: 1, ...Shadows.card },
  rolePressable: { borderRadius: Radius.card },
  roleCard: { minHeight: 214, flex: 1, justifyContent: 'space-between', gap: Spacing.three, padding: Spacing.four },
  roleIcon: { width: 58, height: 58, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  roleCopy: { flex: 1, gap: Spacing.one },
  roleEyebrow: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '800', letterSpacing: 0.5, textTransform: 'uppercase' },
  roleTitle: { fontFamily: Fonts.sans, fontSize: 21, lineHeight: 27, fontWeight: '800', letterSpacing: -0.35 },
  roleDescription: { fontFamily: Fonts.sans, fontSize: TypeScale.control, lineHeight: 22 },
  roleAction: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-end' },
  pressed: { opacity: 0.9 },
  trustNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two, paddingTop: Spacing.three, borderTopWidth: 1 },
  trustText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, textAlign: 'center' },
});
