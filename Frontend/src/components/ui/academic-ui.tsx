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
import ChevronLeft from 'lucide-react-native/icons/chevron-left';
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
import RefreshCw from 'lucide-react-native/icons/refresh-cw';
import ShieldCheck from 'lucide-react-native/icons/shield-check';
import Search from 'lucide-react-native/icons/search';
import Sparkles from 'lucide-react-native/icons/sparkles';
import Sun from 'lucide-react-native/icons/sun';
import User from 'lucide-react-native/icons/user';
import UserCog from 'lucide-react-native/icons/user-cog';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import { usePathname, useRouter } from 'expo-router';
import { useEffect, useRef, useState, type ComponentProps, type ReactNode, type Ref } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
  type PressableProps,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
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

import { BrandColors, Colors, Fonts, Layout, MaxContentWidth, Radius, Shadows, Spacing, TypeScale } from '@/constants/theme';
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
  chevron_left: ChevronLeft,
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
  refresh: RefreshCw,
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
  const { colors } = useAppTheme();
  return <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />;
}

export type GlassVariant = 'standard' | 'strong' | 'soft';

function glassConfig(variant: GlassVariant, resolvedTheme: 'light' | 'dark') {
  const dark = resolvedTheme === 'dark';
  return {
    backgroundColor: variant === 'strong'
      ? dark ? 'rgba(24,40,38,0.96)' : 'rgba(255,255,255,0.96)'
      : variant === 'soft'
        ? dark ? 'rgba(24,40,38,0.78)' : 'rgba(255,255,255,0.78)'
        : dark ? 'rgba(24,40,38,0.90)' : 'rgba(255,255,255,0.90)',
    intensity: variant === 'strong' ? 8 : variant === 'soft' ? 5 : 6,
  };
}

function GlassOverlay({ variant }: { variant: GlassVariant }) {
  const { resolvedTheme } = useAppTheme();
  const config = glassConfig(variant, resolvedTheme);

  if (Platform.OS === 'web') return null;
  if (isLiquidGlassAvailable()) {
    return <GlassView pointerEvents="none" style={StyleSheet.absoluteFill} />;
  }
  return (
    <BlurView
      pointerEvents="none"
      intensity={resolvedTheme === 'dark' ? Math.max(6, config.intensity - 1) : config.intensity}
      tint={resolvedTheme === 'dark' ? 'dark' : 'light'}
      experimentalBlurMethod="dimezisBlurView"
      style={StyleSheet.absoluteFill}
    />
  );
}

export function GlassSurface({
  children,
  variant = 'standard',
  style,
}: {
  children: ReactNode;
  variant?: GlassVariant;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors, resolvedTheme } = useAppTheme();
  const config = glassConfig(variant, resolvedTheme);

  return (
    <View
      style={[
        styles.glassSurface,
        { backgroundColor: config.backgroundColor, borderColor: colors.border },
        Platform.OS === 'web' && styles.webGlassSurface,
        style,
      ]}>
      <GlassOverlay variant={variant} />
      {children}
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

function statusColors(tone: StatusTone, colors: typeof Colors.light | typeof Colors.dark) {
  switch (tone) {
    case 'success':
      return { bg: colors.successBg, text: colors.success };
    case 'warning':
      return { bg: colors.warningBg, text: colors.warning };
    case 'error':
      return { bg: colors.errorBg, text: colors.error };
    case 'muted':
      return { bg: colors.muted, text: colors.textSecondary };
    case 'navy':
      return { bg: colors.backgroundSelected, text: colors.navy };
    case 'blue':
    default:
      return { bg: colors.softBlue, text: colors.primary };
  }
}

export function AcademicIcon({
  name,
  size = 20,
  color = Academic.primary,
  animated = true,
}: {
  name: AcademicIconName;
  size?: number;
  color?: string;
  animated?: boolean;
}) {
  if (process.env.EXPO_OS === 'ios') {
    return (
      <Animated.View entering={animated ? ICON_ENTERING : undefined} style={{ width: size, height: size }}>
        <SymbolView name={name} size={size} tintColor={color} weight="semibold" />
      </Animated.View>
    );
  }

  const materialName = typeof name === 'object'
    ? process.env.EXPO_OS === 'android' ? name.android : name.web
    : undefined;
  const Icon = materialName ? ICONS[materialName] ?? CircleHelp : CircleHelp;

  return (
    <Animated.View entering={animated ? ICON_ENTERING : undefined} style={{ width: size, height: size }}>
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
  const { colors: themeColors } = useAppTheme();
  const colors = statusColors(tone, themeColors);
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
  const { colors } = useAppTheme();
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: colors.navy }]}>{title}</Text>
        {badge ? <StatusBadge label={badge} tone="error" /> : null}
      </View>
      {action && onAction ? (
        <Pressable onPress={onAction} hitSlop={8}>
          <Text style={[styles.sectionAction, { color: colors.primary }]}>{action}</Text>
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
  stackOnMobile = false,
}: {
  label: string;
  title: string;
  subtitle: string;
  right?: ReactNode;
  stackOnMobile?: boolean;
}) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const shouldStack = stackOnMobile && width < 600;

  return (
    <Animated.View entering={HERO_ENTERING} style={[styles.hero, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.heroRule, { backgroundColor: colors.border }]} />
      <View style={[styles.heroContent, shouldStack && styles.heroContentStacked]}>
        <View style={styles.heroCopy}>
          <View style={[styles.heroLabelPill, { backgroundColor: colors.softBlue }]}>
            <View style={[styles.heroLabelDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.heroLabel, { color: colors.primary }]}>{label}</Text>
          </View>
          <Text style={[styles.heroTitle, { color: colors.navy }]} numberOfLines={2}>{title}</Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]} numberOfLines={2}>{subtitle}</Text>
        </View>
        {right ?? (
          <View style={[styles.heroIconButton, { backgroundColor: colors.backgroundSelected, borderColor: colors.border }]}>
            <AcademicIcon
              name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              color={colors.primary}
              size={21}
              animated={false}
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
  style?: StyleProp<ViewStyle>;
  accent?: 'blue' | 'success' | 'error' | 'warning';
}) {
  const { colors: themeColors } = useAppTheme();
  const accentColor = accent === 'success'
    ? themeColors.success
    : accent === 'error'
      ? themeColors.error
      : accent === 'warning'
        ? themeColors.warning
        : accent === 'blue'
          ? themeColors.primary
          : undefined;

  const cardStyle = [
    styles.card,
    {
      backgroundColor: themeColors.card,
      borderColor: themeColors.border,
      ...(Platform.OS === 'web' ? styles.webGlassSurface : {}),
    },
    accentColor && { borderLeftWidth: 4, borderLeftColor: accentColor },
    style,
  ];

  return (
    <Animated.View entering={process.env.EXPO_OS === 'web' ? undefined : CARD_ENTERING} style={cardStyle}>
      <GlassOverlay variant="standard" />
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
  const { colors: themeColors } = useAppTheme();
  const colors = statusColors(tone, themeColors);
  return (
    <SurfaceCard style={styles.metricCard}>
      <View style={[styles.metricIcon, { backgroundColor: colors.bg }]}>
        <AcademicIcon name={icon} size={20} color={colors.text} />
      </View>
      <Text style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: themeColors.textSecondary }]} numberOfLines={2}>{label}</Text>
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
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={styles.emptyState}>
      {icon ? (
        <View style={[styles.emptyIcon, { backgroundColor: colors.muted }]}>
          <AcademicIcon name={icon} color={colors.textSecondary} size={24} />
        </View>
      ) : null}
      <Text style={[styles.emptyTitle, { color: colors.navy }]}>{title}</Text>
      <Text style={[styles.emptyMessage, { color: colors.textSecondary }]}>{message}</Text>
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

export type ActionButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function ActionButton({
  label,
  variant = 'primary',
  icon,
  loading = false,
  style,
  disabled,
  ...props
}: Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  variant?: ActionButtonVariant;
  icon?: AcademicIconName;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const palette = {
    primary: { backgroundColor: colors.primary, foreground: '#FFFFFF' },
    secondary: { backgroundColor: colors.backgroundSelected, foreground: colors.primary },
    ghost: { backgroundColor: 'transparent', foreground: colors.primary },
    danger: { backgroundColor: colors.errorBg, foreground: colors.error },
  }[variant];

  return (
    <Pressable
      {...props}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'ghost' && styles.actionButtonGhost,
        { backgroundColor: palette.backgroundColor },
        (disabled || loading) && styles.actionButtonDisabled,
        pressed && styles.pressed,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.foreground} />
      ) : (
        <>
          {icon ? <AcademicIcon name={icon} size={18} color={palette.foreground} /> : null}
          <Text style={[styles.actionButtonText, { color: palette.foreground }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

export function TextField({
  label,
  hint,
  error,
  trailing,
  inputRef,
  containerStyle,
  style: inputStyle,
  placeholderTextColor,
  ...props
}: TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
  trailing?: ReactNode;
  inputRef?: Ref<TextInput>;
  containerStyle?: StyleProp<ViewStyle>;
}) {
  const { colors } = useAppTheme();
  const hasError = Boolean(error);

  return (
    <View style={[styles.fieldGroup, containerStyle]}>
      <Text style={[styles.fieldLabel, { color: colors.navy }]}>{label}</Text>
      <View
        style={[
          styles.textFieldShell,
          { backgroundColor: colors.surfaceMuted, borderColor: hasError ? colors.error : colors.border },
          props.editable === false && styles.textFieldDisabled,
        ]}>
        <TextInput
          {...props}
          ref={inputRef}
          placeholderTextColor={placeholderTextColor ?? colors.textTertiary}
          style={[styles.textFieldInput, { color: colors.text }, inputStyle]}
        />
        {trailing ? <View style={styles.textFieldTrailing}>{trailing}</View> : null}
      </View>
      {error || hint ? (
        <Text style={[styles.fieldHint, { color: hasError ? colors.error : colors.textSecondary }]}>
          {error ?? hint}
        </Text>
      ) : null}
    </View>
  );
}

export function ContentContainer({
  children,
  style,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const { width } = useWindowDimensions();
  const compact = width < Layout.compactBreakpoint;

  return (
    <View
      style={[
        styles.contentContainer,
        { paddingHorizontal: compact ? Layout.contentPadding : Layout.contentPaddingWide },
        style,
      ]}>
      {children}
    </View>
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
  glassSurface: {
    borderWidth: 1,
    borderRadius: Radius.card,
    overflow: 'hidden',
  },
  webGlassSurface: {
    ...(Platform.OS === 'web'
      ? ({ backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)' } as unknown as ViewStyle)
      : {}),
  },
  pressed: { opacity: 0.78 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    maxWidth: 280,
    flexShrink: 0,
  },
  badgeText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600', letterSpacing: 0.15 },
  sectionHeader: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flex: 1 },
  sectionTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.section, fontWeight: '600', letterSpacing: -0.2 },
  sectionAction: { color: Academic.primary, fontFamily: Fonts.sans, fontSize: TypeScale.body, fontWeight: '500' },
  hero: {
    minHeight: 128,
    borderRadius: Radius.card,
    overflow: 'hidden',
    borderWidth: 1,
    boxShadow: '0 2px 10px rgba(24, 55, 51, 0.04)',
  },
  heroRule: { position: 'absolute', left: 24, right: 24, bottom: 0, height: 1 },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.four,
  },
  heroContentStacked: { flexDirection: 'column', alignItems: 'stretch' },
  heroCopy: { flex: 1, gap: 7 },
  heroLabelPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  heroLabelDot: { width: 6, height: 6, borderRadius: 3 },
  heroLabel: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600', letterSpacing: 0.35, textTransform: 'uppercase' },
  heroTitle: { fontFamily: Fonts.sans, fontSize: 28, lineHeight: 34, fontWeight: '600', letterSpacing: -0.55 },
  heroSubtitle: { fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20 },
  heroIconButton: {
    width: 44,
    height: 44,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  card: {
    ...Shadows.card,
    borderRadius: Radius.card,
    borderCurve: 'continuous',
    padding: Spacing.three,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: 'rgba(19,62,59,0.11)',
    overflow: 'hidden',
    boxShadow: '0 2px 10px rgba(24, 55, 51, 0.04)',
  },
  metricCard: { flex: 1, flexBasis: 160, gap: 8, minHeight: 126 },
  metricIcon: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricValue: { fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '600', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  metricLabel: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17, fontWeight: '500' },
  emptyState: { alignItems: 'center', gap: 7, paddingVertical: Spacing.four },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  emptyTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.control, fontWeight: '600', textAlign: 'center' },
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
  actionButton: {
    minHeight: Layout.minTouchTarget,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    ...Shadows.card,
  },
  actionButtonGhost: {
    shadowOpacity: 0,
    elevation: 0,
  },
  actionButtonDisabled: { opacity: 0.58 },
  actionButtonText: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.control,
    lineHeight: 20,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  fieldGroup: { gap: Spacing.one },
  fieldLabel: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.body,
    lineHeight: 20,
    fontWeight: '500',
  },
  textFieldShell: {
    minHeight: 52,
    borderRadius: Radius.control,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    gap: Spacing.two,
  },
  textFieldDisabled: { opacity: 0.62 },
  textFieldInput: {
    flex: 1,
    minHeight: 50,
    paddingVertical: 0,
    fontFamily: Fonts.sans,
    fontSize: 16,
    lineHeight: 21,
  },
  textFieldTrailing: { alignItems: 'center', justifyContent: 'center' },
  fieldHint: {
    fontFamily: Fonts.sans,
    fontSize: TypeScale.caption,
    lineHeight: 17,
  },
  contentContainer: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
