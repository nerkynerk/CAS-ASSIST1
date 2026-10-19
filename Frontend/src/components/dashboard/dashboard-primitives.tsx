import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  AcademicIcon,
  SurfaceCard,
  type AcademicIconName,
  type StatusTone,
} from '@/components/ui/academic-ui';
import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';

type DashboardActionTone = Extract<StatusTone, 'blue' | 'success' | 'warning' | 'error'>;

function getToneColors(tone: DashboardActionTone, colors: ReturnType<typeof useAppTheme>['colors']) {
  switch (tone) {
    case 'success':
      return { background: colors.successBg, foreground: colors.success };
    case 'warning':
      return { background: colors.warningBg, foreground: colors.warning };
    case 'error':
      return { background: colors.errorBg, foreground: colors.error };
    case 'blue':
    default:
      return { background: colors.softBlue, foreground: colors.primary };
  }
}

export function DashboardActionCard({
  label,
  caption,
  icon,
  onPress,
  tone = 'blue',
}: {
  label: string;
  caption?: string;
  icon: AcademicIconName;
  onPress: () => void;
  tone?: DashboardActionTone;
}) {
  const { colors } = useAppTheme();
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const toneColors = getToneColors(tone, colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={caption}
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      style={({ pressed }) => [
        styles.actionPressable,
        hovered && styles.actionHovered,
        focused && { outlineStyle: 'solid', outlineWidth: 2, outlineColor: colors.primary, outlineOffset: 2 },
        pressed && styles.actionPressed,
      ]}>
      <SurfaceCard accent={tone} style={[styles.actionCard, { borderColor: hovered || focused ? toneColors.foreground : colors.border }]}>
        <View style={[styles.actionIcon, { backgroundColor: toneColors.background }]}>
          <AcademicIcon name={icon} color={toneColors.foreground} size={21} />
        </View>
        <View style={styles.actionCopy}>
          <Text style={[styles.actionLabel, { color: colors.navy }]} numberOfLines={2}>{label}</Text>
          {caption ? <Text style={[styles.actionCaption, { color: colors.textSecondary }]} numberOfLines={2}>{caption}</Text> : null}
        </View>
        <View style={[styles.actionArrow, { backgroundColor: hovered || focused ? toneColors.foreground : colors.backgroundSelected }]}>
          <AcademicIcon
            name={{ ios: 'arrow.up.right', android: 'chevron_right', web: 'chevron_right' }}
            color={hovered || focused ? '#FFFFFF' : toneColors.foreground}
            size={18}
          />
        </View>
      </SurfaceCard>
    </Pressable>
  );
}

export const dashboardActionGridStyles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
});

const styles = StyleSheet.create({
  actionPressable: {
    flexGrow: 1,
    flexBasis: 210,
    minWidth: 0,
    borderRadius: Radius.card,
  },
  actionHovered: {
    transform: [{ translateY: -2 }],
  },
  actionPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  actionCard: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCopy: {
    flex: 1,
    minWidth: 0,
    gap: Spacing.one,
  },
  actionLabel: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.control,
    lineHeight: 19,
    fontWeight: '800',
  },
  actionCaption: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption,
    lineHeight: 17,
  },
  actionArrow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
