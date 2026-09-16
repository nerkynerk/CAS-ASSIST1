import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { SymbolView } from 'expo-symbols';
import type { LucideIcon } from 'lucide-react-native';
import ArrowLeft from 'lucide-react-native/icons/arrow-left';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Activity from 'lucide-react-native/icons/activity';
import BadgeCheck from 'lucide-react-native/icons/badge-check';
import ChartBar from 'lucide-react-native/icons/chart-bar';
import Bell from 'lucide-react-native/icons/bell';
import BookOpen from 'lucide-react-native/icons/book-open';
import BriefcaseBusiness from 'lucide-react-native/icons/briefcase-business';
import Building2 from 'lucide-react-native/icons/building';
import CalendarDays from 'lucide-react-native/icons/calendar-days';
import CheckCircle2 from 'lucide-react-native/icons/circle-check-big';
import ChevronDown from 'lucide-react-native/icons/chevron-down';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ChevronUp from 'lucide-react-native/icons/chevron-up';
import Circle from 'lucide-react-native/icons/circle';
import CircleAlert from 'lucide-react-native/icons/circle-alert';
import CircleHelp from 'lucide-react-native/icons/circle-question-mark';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Clock3 from 'lucide-react-native/icons/clock-3';
import Contrast from 'lucide-react-native/icons/contrast';
import Database from 'lucide-react-native/icons/database';
import FileText from 'lucide-react-native/icons/file-text';
import GraduationCap from 'lucide-react-native/icons/graduation-cap';
import House from 'lucide-react-native/icons/house';
import Inbox from 'lucide-react-native/icons/inbox';
import Info from 'lucide-react-native/icons/info';
import Landmark from 'lucide-react-native/icons/landmark';
import List from 'lucide-react-native/icons/list';
import Lock from 'lucide-react-native/icons/lock';
import Mail from 'lucide-react-native/icons/mail';
import MapPin from 'lucide-react-native/icons/map-pin';
import Megaphone from 'lucide-react-native/icons/megaphone';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import Moon from 'lucide-react-native/icons/moon';
import Pin from 'lucide-react-native/icons/pin';
import Plus from 'lucide-react-native/icons/plus';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Search from 'lucide-react-native/icons/search';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sun from 'lucide-react-native/icons/sun';
import User from 'lucide-react-native/icons/user';
import UserCog from 'lucide-react-native/icons/user-cog';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  interpolate,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';

import { BrandColors, Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';

export type AcademicIconName = ComponentProps<typeof SymbolView>['name'];

const ICONS: Record<string, LucideIcon> = {
  account_balance: Landmark,
  analytics: ChartBar,
  activity: Activity,
  add: Plus,
  arrow_back: ArrowLeft,
  arrow_upward: ArrowUp,
  assignment: ClipboardList,
  auto_awesome: Sparkles,
  badge: BadgeCheck,
  calendar_today: CalendarDays,
  campaign: Megaphone,
  chat_bubble: MessageCircle,
  check_circle: CheckCircle2,
  keyboard_arrow_down: ChevronDown,
  keyboard_arrow_up: ChevronUp,
  chevron_right: ChevronRight,
  contrast: Contrast,
  dark_mode: Moon,
  database: Database,
  description: FileText,
  domain: Building2,
  format_list_bulleted: List,
  groups: Users,
  home: House,
  inbox: Inbox,
  info: Info,
  light_mode: Sun,
  location_on: MapPin,
  lock: Lock,
  mail: Mail,
  manage_accounts: UserCog,
  menu_book: BookOpen,
  notifications: Bell,
  person: User,
  person_add: UserPlus,
  priority_high: CircleAlert,
  push_pin: Pin,
  radio_button_unchecked: Circle,
  schedule: Clock3,
  school: GraduationCap,
  search: Search,
  verified_user: ShieldCheck,
  work: BriefcaseBusiness,
};

const ICON_ENTERING = ZoomIn.springify().damping(24).stiffness(260).reduceMotion(ReduceMotion.System);
const CARD_ENTERING = FadeInUp.duration(320).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);
const HERO_ENTERING = FadeInDown.duration(380).easing(Easing.out(Easing.cubic)).reduceMotion(ReduceMotion.System);
const BADGE_ENTERING = FadeIn.duration(180).reduceMotion(ReduceMotion.System);

export const Academic = BrandColors;

export function AppBackdrop() {
  const { colors, resolvedTheme } = useAppTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]}>
      <View style={[styles.backdropGlow, styles.backdropGlowTop, {
        backgroundColor: resolvedTheme === 'dark' ? 'rgba(94,209,200,0.12)' : 'rgba(135,206,196,0.24)',
      }]} />
      <View style={[styles.backdropGlow, styles.backdropGlowBottom, {
        backgroundColor: resolvedTheme === 'dark' ? 'rgba(66,104,99,0.16)' : 'rgba(219,229,214,0.56)',
      }]} />
      <View style={[styles.backdropHalo, {
        borderColor: resolvedTheme === 'dark' ? 'rgba(94,209,200,0.06)' : 'rgba(11,125,119,0.05)',
      }]} />
    </View>
  );
}

export const STATUS_TONES = {
  blue: { bg: Academic.softBlue, text: Academic.primary },
  warning: { bg: Academic.warningBg, text: Academic.warningText },
  success: { bg: Academic.successBg, text: Academic.success },
  error: { bg: Academic.errorBg, text: Academic.error },
  muted: { bg: Academic.muted, text: Academic.textSecondary },
  navy: { bg: '#EAF0F8', text: Academic.navy },
} as const;

export type StatusTone = keyof typeof STATUS_TONES;

export function AcademicIcon({
  name,
  size = 20,
  color = Academic.primary,
}: {
  name: AcademicIconName;
  size?: number;
  color?: string;
}) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Animated.View entering={ICON_ENTERING} style={{ width: size, height: size }}>
        <SymbolView name={name} size={size} tintColor={color} weight="semibold" />
      </Animated.View>
    );
  }

  const materialName = typeof name === 'object'
    ? process.env.EXPO_OS === 'android' ? name.android : name.web
    : undefined;
  const Icon = materialName ? ICONS[materialName] : CircleHelp;

  return (
    <Animated.View entering={ICON_ENTERING} style={{ width: size, height: size }}>
      <Icon color={color} size={size} strokeWidth={2.1} absoluteStrokeWidth />
    </Animated.View>
  );
}

export function StatusBadge({
  label,
  tone = 'blue',
}: {
  label: string;
  tone?: StatusTone;
}) {
  const colors = STATUS_TONES[tone];
  return (
    <Animated.View entering={BADGE_ENTERING} style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.badgeText, { color: colors.text }]} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

export function SectionHeader({
  title,
  action,
  onAction,
  badge,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  badge?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {badge ? <StatusBadge label={badge} tone="error" /> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={styles.sectionAction}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function RoleHeroHeader({
  label,
  title,
  subtitle,
  right,
}: {
  label: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
}) {
  return (
    <Animated.View entering={HERO_ENTERING} style={styles.hero}>
      <View style={styles.heroGlowLarge} />
      <View style={styles.heroGlowSmall} />
      <View style={styles.heroRule} />
      <View style={styles.heroContent}>
        <View style={styles.heroCopy}>
          <View style={styles.heroLabelPill}>
            <View style={styles.heroLabelDot} />
            <Text style={styles.heroLabel}>{label}</Text>
          </View>
          <Text style={styles.heroTitle} numberOfLines={2}>{title}</Text>
          <Text style={styles.heroSubtitle} numberOfLines={2}>{subtitle}</Text>
        </View>
        {right ?? (
          <View style={styles.heroIconButton}>
            <AcademicIcon
              name={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
              color="#FFFFFF"
              size={24}
            />
          </View>
        )}
      </View>
    </Animated.View>
  );
}

export function SurfaceCard({
  children,
  style,
  accent,
}: {
  children: ReactNode;
  style?: object;
  accent?: 'blue' | 'success' | 'error' | 'warning';
}) {
  const { colors: themeColors, resolvedTheme } = useAppTheme();
  const accentColor = accent === 'success'
    ? Academic.success
    : accent === 'error'
      ? Academic.error
      : accent === 'warning'
        ? Academic.warningText
        : accent === 'blue'
          ? Academic.primary
          : undefined;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: themeColors.card,
      borderColor: resolvedTheme === 'dark' ? 'rgba(224,246,241,0.10)' : 'rgba(255,255,255,0.82)',
    },
    accentColor && { borderLeftWidth: 4, borderLeftColor: accentColor },
    style,
  ];

  return (
    <Animated.View entering={process.env.EXPO_OS === 'web' ? undefined : CARD_ENTERING} style={cardStyle}>
      {process.env.EXPO_OS === 'web' ? null : isLiquidGlassAvailable() ? (
        <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} />
      ) : (
        <BlurView
          pointerEvents="none"
          intensity={resolvedTheme === 'dark' ? 42 : 62}
          tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
          experimentalBlurMethod="dimezisBlurView"
          style={StyleSheet.absoluteFill}
        />
      )}
      {children}
    </Animated.View>
  );
}

export function MetricCard({
  label,
  value,
  icon,
  tone = 'blue',
}: {
  label: string;
  value: string | number;
  icon: AcademicIconName;
  tone?: StatusTone;
}) {
  const colors = STATUS_TONES[tone];
  return (
    <SurfaceCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.bg }]}>
        <AcademicIcon name={icon} size={20} color={colors.text} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>{label}</Text>
    </SurfaceCard>
  );
}

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon?: AcademicIconName;
}) {
  return (
    <SurfaceCard style={styles.emptyState}>
      {icon ? (
        <View style={styles.emptyIcon}>
          <AcademicIcon name={icon} color={Academic.textSecondary} size={24} />
        </View>
      ) : null}
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyMessage}>{message}</Text>
    </SurfaceCard>
  );
}

export function FloatingChatButton() {
  const router = useRouter();
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();
  const expansion = useSharedValue(0);
  const buttonScale = useSharedValue(1);
  const [launching, setLaunching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expansionScale = Math.max(24, Math.hypot(width, height) / 28);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const expansionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expansion.value, [0, 0.04, 1], [0, 1, 1]),
    transform: [{ scale: interpolate(expansion.value, [0, 1], [1, expansionScale]) }],
  }));
  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
    opacity: interpolate(expansion.value, [0, 0.72, 1], [1, 1, 0]),
  }));

  function openChat() {
    if (launching) return;
    setLaunching(true);
    // Reanimated shared values are intentionally mutable animation state.
    // eslint-disable-next-line react-hooks/immutability
    buttonScale.value = withSequence(
      withTiming(0.9, { duration: 70 }),
      withTiming(1.12, { duration: 110 }),
      withTiming(1, { duration: 80 }),
    );
    // eslint-disable-next-line react-hooks/immutability
    expansion.value = withTiming(1, {
      duration: 280,
      easing: Easing.bezier(0.22, 1, 0.36, 1),
      reduceMotion: ReduceMotion.System,
    });
    timerRef.current = setTimeout(() => {
      router.push('/chatbot');
      expansion.value = 0;
      buttonScale.value = 1;
      setLaunching(false);
    }, 245);
  }

  if (pathname === '/chatbot' || pathname === '/faq') return null;

  return (
    <View pointerEvents="box-none" style={styles.chatLauncherLayer}>
      <Animated.View pointerEvents="none" style={[styles.chatExpansion, expansionStyle]} />
      <Animated.View style={[styles.chatFab, buttonStyle]}>
        <Pressable
          onPress={openChat}
          disabled={launching}
          style={({ pressed }) => [styles.chatFabPressable, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel="Open CAS Assist AI Helpdesk"
          accessibilityHint="Expands the AI Helpdesk to full screen">
          <AcademicIcon
            name={{ ios: 'message.fill', android: 'chat_bubble', web: 'chat_bubble' }}
            color="#FFFFFF"
            size={25}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  color = Academic.primary,
  bg = Academic.softBlue,
  label,
}: {
  icon: AcademicIconName;
  onPress: () => void;
  color?: string;
  bg?: string;
  label: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.iconButton, { backgroundColor: bg }, pressed && styles.pressed]}
      accessibilityLabel={label}
      accessibilityRole="button">
      <AcademicIcon name={icon} color={color} size={22} />
    </Pressable>
  );
}

export function formatCategory(value: string | null | undefined) {
  if (!value) return 'General Request';
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function formatRelative(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
}

export function shortRef(id: string, prefix = 'T') {
  const digits = id.replace(/\D/g, '');
  if (digits.length >= 3) return `${prefix}-${digits.slice(-3)}`;
  const compact = id.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase();
  return compact ? `${prefix}-${compact}` : `${prefix}-REQ`;
}

const styles = StyleSheet.create({
  backdropGlow: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
  },
  backdropGlowTop: { top: -150, right: -125 },
  backdropGlowBottom: { bottom: -180, left: -130 },
  backdropHalo: {
    position: 'absolute',
    top: '18%',
    left: '50%',
    width: 560,
    height: 560,
    marginLeft: -280,
    borderRadius: 280,
    borderWidth: 80,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.97 }] },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 128,
  },
  badgeText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '700', letterSpacing: 0.15 },
  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  sectionTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.section, fontWeight: '700', letterSpacing: -0.2 },
  sectionAction: { color: Academic.primary, fontFamily: Fonts.sans, fontSize: TypeScale.body, fontWeight: '700' },
  hero: {
    minHeight: 220,
    marginHorizontal: -Spacing.three,
    marginTop: -Spacing.one,
    marginBottom: -Spacing.two,
    borderBottomLeftRadius: Radius.panel,
    borderBottomRightRadius: Radius.panel,
    overflow: 'hidden',
    backgroundColor: '#123936',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    boxShadow: '0 24px 64px rgba(18, 57, 54, 0.22)',
  },
  heroGlowLarge: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    right: -86,
    top: -144,
    backgroundColor: 'rgba(94,209,200,0.16)',
  },
  heroGlowSmall: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    right: 92,
    bottom: -112,
    backgroundColor: 'rgba(200,221,214,0.09)',
  },
  heroRule: { position: 'absolute', left: 24, right: 24, bottom: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.16)' },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: 54,
    paddingBottom: Spacing.five,
  },
  heroCopy: { flex: 1, gap: 10 },
  heroLabelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(255,255,255,0.11)',
  },
  heroLabelDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#72DED5' },
  heroLabel: { color: '#E7F7F4', fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '700', letterSpacing: 0.35 },
  heroTitle: { color: '#FFFFFF', fontFamily: Fonts.sans, fontSize: TypeScale.display, lineHeight: 38, fontWeight: '700', letterSpacing: -0.8 },
  heroSubtitle: { color: '#D4E5E1', fontFamily: Fonts.sans, fontSize: TypeScale.control, lineHeight: 22 },
  heroIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  card: {
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    padding: Spacing.three,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    overflow: 'hidden',
    boxShadow: '0 16px 44px rgba(24, 55, 51, 0.085)',
  },
  metricCard: { flex: 1, flexBasis: 160, gap: 8, minHeight: 126 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '700', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  metricLabel: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '600' },
  emptyState: { alignItems: 'center', gap: 7, paddingVertical: Spacing.four },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  emptyTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.control, fontWeight: '700', textAlign: 'center' },
  emptyMessage: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center' },
  chatLauncherLayer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10000,
    elevation: 10000,
    pointerEvents: 'box-none',
  },
  chatExpansion: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 98,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Academic.primary,
  },
  chatFab: {
    position: 'absolute',
    right: Spacing.four,
    bottom: 98,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.58)',
    boxShadow: '0 12px 32px rgba(11, 125, 119, 0.30)',
  },
  chatFabPressable: {
    width: '100%',
    height: '100%',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
