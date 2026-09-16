import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import RoleGuard from '@/components/role-guard';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  type StatusTone,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { supabase } from '@/lib/supabase';

type CountGroup = Record<string, number>;

interface AnalyticsSnapshot {
  generatedAt: string;
  windowDays: number;
  users: CountGroup;
  advising: CountGroup;
  documents: CountGroup;
  announcements: CountGroup;
  roomChanges: CountGroup;
  aiHelpdesk: CountGroup;
  notifications: CountGroup;
  academics: CountGroup;
  knowledge: CountGroup;
}

interface ServiceHealth {
  state: 'operational' | 'unavailable' | 'not_configured';
  latencyMs: number | null;
}

interface UsageItem {
  label: string;
  description: string;
  total: number;
  recent: number;
  status: string;
  tone: StatusTone;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
}

const WINDOWS = [7, 30, 90] as const;
const API_BASE = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/+$/, '');

function number(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function compact(value: number): string {
  return new Intl.NumberFormat('en-PH', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: 1,
  }).format(value);
}

function percentage(value: number): string {
  return `${Math.round(value * 10) / 10}%`;
}

function duration(minutes: number): string {
  if (minutes <= 0) return 'No data';
  if (minutes < 60) return `${Math.round(minutes)} min`;
  if (minutes < 1440) return `${(minutes / 60).toFixed(1)} hr`;
  return `${(minutes / 1440).toFixed(1)} days`;
}

async function checkApi(): Promise<ServiceHealth> {
  if (!API_BASE || API_BASE === 'disabled') return { state: 'not_configured', latencyMs: null };
  const started = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(`${API_BASE}/health`, { signal: controller.signal });
    return {
      state: response.ok ? 'operational' : 'unavailable',
      latencyMs: Date.now() - started,
    };
  } catch {
    return { state: 'unavailable', latencyMs: null };
  } finally {
    clearTimeout(timeout);
  }
}

function OverviewMetric({
  label,
  value,
  detail,
  icon,
  wide,
}: {
  label: string;
  value: string;
  detail: string;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
  wide: boolean;
}) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={[styles.overviewMetric, wide && styles.overviewMetricWide]}>
      <View style={[styles.metricIcon, { backgroundColor: colors.softBlue }]}>
        <AcademicIcon name={icon} color={colors.primary} size={21} />
      </View>
      <Text selectable style={[styles.metricValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.metricLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.metricDetail, { color: colors.textSecondary }]}>{detail}</Text>
    </SurfaceCard>
  );
}

function DistributionRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const { colors } = useAppTheme();
  const width = total > 0 ? Math.max(3, Math.min(100, (value / total) * 100)) : 0;
  return (
    <View style={styles.distributionRow}>
      <View style={styles.distributionHeader}>
        <Text style={[styles.distributionLabel, { color: colors.textSecondary }]}>{label}</Text>
        <Text selectable style={[styles.distributionValue, { color: colors.text }]}>{compact(value)}</Text>
      </View>
      <View style={[styles.barTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.barFill, { backgroundColor: color, width: `${width}%` }]} />
      </View>
    </View>
  );
}

function UsageCard({ item, windowDays, wide }: { item: UsageItem; windowDays: number; wide: boolean }) {
  const { colors } = useAppTheme();
  return (
    <SurfaceCard style={[styles.usageCard, wide && styles.usageCardWide]} accent={item.tone === 'muted' || item.tone === 'navy' ? undefined : item.tone}>
      <View style={styles.usageTopRow}>
        <View style={[styles.usageIcon, { backgroundColor: colors.softBlue }]}>
          <AcademicIcon name={item.icon} color={colors.primary} size={21} />
        </View>
        <StatusBadge label={item.status} tone={item.tone} />
      </View>
      <Text style={[styles.usageTitle, { color: colors.text }]}>{item.label}</Text>
      <Text style={[styles.usageDescription, { color: colors.textSecondary }]}>{item.description}</Text>
      <View style={styles.usageStats}>
        <View>
          <Text selectable style={[styles.usageNumber, { color: colors.text }]}>{compact(item.total)}</Text>
          <Text style={[styles.usageStatLabel, { color: colors.textSecondary }]}>Total</Text>
        </View>
        <View style={styles.usageRecent}>
          <Text selectable style={[styles.usageNumber, { color: colors.primary }]}>+{compact(item.recent)}</Text>
          <Text style={[styles.usageStatLabel, { color: colors.textSecondary }]}>Last {windowDays} days</Text>
        </View>
      </View>
    </SurfaceCard>
  );
}

function SystemAnalyticsContent() {
  const { width: viewportWidth } = useWindowDimensions();
  const { colors } = useAppTheme();
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [service, setService] = useState<ServiceHealth>({ state: 'not_configured', latencyMs: null });
  const [queryLatency, setQueryLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wide = viewportWidth >= 760;

  const fetchAnalytics = useCallback(async () => {
    setError(null);
    const started = Date.now();
    const [analyticsResult, healthResult] = await Promise.all([
      supabase.rpc('get_system_analytics', { p_window_days: windowDays }),
      checkApi(),
    ]);
    setQueryLatency(Date.now() - started);
    setService(healthResult);
    if (analyticsResult.error) {
      setError(analyticsResult.error.message);
      return;
    }
    setSnapshot(analyticsResult.data as AnalyticsSnapshot);
  }, [windowDays]);

  useEffect(() => {
    setLoading(true);
    void fetchAnalytics().finally(() => setLoading(false));
  }, [fetchAnalytics]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAnalytics();
    setRefreshing(false);
  }

  const featureUsage = useMemo<UsageItem[]>(() => {
    if (!snapshot) return [];
    return [
      {
        label: 'Advising Requests',
        description: `${compact(number(snapshot.advising.resolved))} resolved · ${compact(number(snapshot.advising.actionRequired))} need action`,
        total: number(snapshot.advising.total),
        recent: number(snapshot.advising.newInWindow),
        status: number(snapshot.advising.actionRequired) > 0 ? 'Needs attention' : 'Healthy',
        tone: number(snapshot.advising.actionRequired) > 0 ? 'warning' : 'success',
        icon: { ios: 'person.2.wave.2', android: 'groups', web: 'groups' },
      },
      {
        label: 'Document Requests',
        description: `${compact(number(snapshot.documents.pending))} processing · ${compact(number(snapshot.documents.ready))} ready`,
        total: number(snapshot.documents.total),
        recent: number(snapshot.documents.newInWindow),
        status: number(snapshot.documents.pending) > 0 ? 'Active queue' : 'Healthy',
        tone: number(snapshot.documents.pending) > 0 ? 'blue' : 'success',
        icon: { ios: 'doc.text', android: 'description', web: 'description' },
      },
      {
        label: 'Announcements',
        description: `${compact(number(snapshot.announcements.published))} published · ${compact(number(snapshot.announcements.draft))} drafts`,
        total: number(snapshot.announcements.total),
        recent: number(snapshot.announcements.newInWindow),
        status: 'Available',
        tone: 'success',
        icon: { ios: 'megaphone', android: 'campaign', web: 'campaign' },
      },
      {
        label: 'Room Changes',
        description: `${compact(number(snapshot.roomChanges.activeNow))} active · ${compact(number(snapshot.roomChanges.acknowledgements))} acknowledgements`,
        total: number(snapshot.roomChanges.total),
        recent: number(snapshot.roomChanges.newInWindow),
        status: number(snapshot.roomChanges.activeNow) > 0 ? 'Live updates' : 'Healthy',
        tone: 'blue',
        icon: { ios: 'location', android: 'location_on', web: 'location_on' },
      },
      {
        label: 'AI Helpdesk',
        description: `${percentage(number(snapshot.aiHelpdesk.resolutionRate))} resolved · ${compact(number(snapshot.aiHelpdesk.escalated))} escalated`,
        total: number(snapshot.aiHelpdesk.total),
        recent: number(snapshot.aiHelpdesk.newInWindow),
        status: number(snapshot.aiHelpdesk.lowConfidence) > 0 ? 'Review suggested' : 'Healthy',
        tone: number(snapshot.aiHelpdesk.lowConfidence) > 0 ? 'warning' : 'success',
        icon: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
      },
      {
        label: 'Push Notifications',
        description: `${compact(number(snapshot.notifications.enabledDevices))} enabled devices · ${percentage(number(snapshot.notifications.successRate))} delivered`,
        total: number(snapshot.notifications.deliveries),
        recent: number(snapshot.notifications.newInWindow),
        status: number(snapshot.notifications.failed) > 0 ? 'Delivery issues' : 'Healthy',
        tone: number(snapshot.notifications.failed) > 0 ? 'error' : 'success',
        icon: { ios: 'bell', android: 'notifications', web: 'notifications' },
      },
    ];
  }, [snapshot]);

  const serviceLabel = service.state === 'operational'
    ? 'Operational'
    : service.state === 'not_configured'
      ? 'Optional API not configured'
      : 'API unavailable';
  const serviceTone: StatusTone = service.state === 'operational' ? 'success' : service.state === 'not_configured' ? 'muted' : 'error';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <View style={styles.content}>
          <RoleHeroHeader
            label="Super Administrator"
            title="System Analytics"
            subtitle="Live performance, operational health, and feature adoption across CAS Assist."
            right={(
              <View style={styles.heroAnalyticsIcon}>
                <AcademicIcon name={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }} color="#FFFFFF" size={27} />
              </View>
            )}
          />

          <View style={styles.toolbar}>
            <View style={styles.windowRail}>
              {WINDOWS.map(days => {
                const selected = windowDays === days;
                return (
                  <Pressable
                    key={days}
                    onPress={() => setWindowDays(days)}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={[styles.windowButton, { backgroundColor: selected ? colors.primary : colors.muted }]}>
                    <Text style={[styles.windowText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{days} days</Text>
                  </Pressable>
                );
              })}
            </View>
            {snapshot ? (
              <Text selectable style={[styles.updatedText, { color: colors.textSecondary }]}>
                Updated {new Date(snapshot.generatedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            ) : null}
          </View>

          {loading ? (
            <View style={styles.loadingState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Preparing the system snapshot…</Text>
            </View>
          ) : error || !snapshot ? (
            <EmptyState
              title="Analytics unavailable"
              message={error ?? 'The system snapshot could not be loaded. Pull down to retry.'}
              icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }}
            />
          ) : (
            <>
              <SectionHeader title="Current State" />
              <SurfaceCard style={styles.healthCard} accent={service.state === 'unavailable' ? 'error' : 'success'}>
                <View style={styles.healthHeader}>
                  <View style={[styles.healthIcon, { backgroundColor: service.state === 'unavailable' ? Academic.errorBg : Academic.successBg }]}>
                    <AcademicIcon
                      name={{ ios: 'waveform.path.ecg', android: 'verified_user', web: 'verified_user' }}
                      color={service.state === 'unavailable' ? Academic.error : Academic.success}
                      size={24}
                    />
                  </View>
                  <View style={styles.healthCopy}>
                    <Text style={[styles.healthTitle, { color: colors.text }]}>System services</Text>
                    <Text style={[styles.healthSubtitle, { color: colors.textSecondary }]}>Database reporting is live and access-controlled.</Text>
                  </View>
                  <StatusBadge label={serviceLabel} tone={serviceTone} />
                </View>
                <View style={[styles.healthDetails, { borderTopColor: colors.border }]}>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Analytics query</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{queryLatency ?? 0} ms</Text>
                  </View>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>API response</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{service.latencyMs === null ? '—' : `${service.latencyMs} ms`}</Text>
                  </View>
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Pending verification</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{compact(number(snapshot.users.pendingVerification))}</Text>
                  </View>
                </View>
              </SurfaceCard>

              <View style={[styles.metricGrid, wide && styles.metricGridWide]}>
                <OverviewMetric
                  wide={wide}
                  label="Active Accounts"
                  value={compact(number(snapshot.users.active))}
                  detail={`+${compact(number(snapshot.users.newInWindow))} in ${windowDays} days`}
                  icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="Advising Resolution"
                  value={percentage(number(snapshot.advising.resolutionRate))}
                  detail={`Average ${duration(number(snapshot.advising.averageResolutionMinutes))}`}
                  icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="Document Completion"
                  value={percentage(number(snapshot.documents.completionRate))}
                  detail={`${compact(number(snapshot.documents.pending))} currently processing`}
                  icon={{ ios: 'checkmark.circle', android: 'description', web: 'description' }}
                />
                <OverviewMetric
                  wide={wide}
                  label="AI Resolution"
                  value={percentage(number(snapshot.aiHelpdesk.resolutionRate))}
                  detail={`${percentage(number(snapshot.aiHelpdesk.averageConfidence))} average confidence`}
                  icon={{ ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' }}
                />
              </View>

              <View style={[styles.twoColumn, wide && styles.twoColumnWide]}>
                <View style={styles.column}>
                  <SectionHeader title="Account Distribution" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Students" value={number(snapshot.users.student)} total={number(snapshot.users.total)} color={Academic.primary} />
                    <DistributionRow label="Faculty" value={number(snapshot.users.faculty)} total={number(snapshot.users.total)} color={Academic.warningText} />
                    <DistributionRow label="Staff" value={number(snapshot.users.staff)} total={number(snapshot.users.total)} color={Academic.success} />
                    <DistributionRow label="Super admins" value={number(snapshot.users.superAdmin)} total={number(snapshot.users.total)} color={Academic.error} />
                  </SurfaceCard>
                </View>
                <View style={styles.column}>
                  <SectionHeader title="Advising Pipeline" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Submitted" value={number(snapshot.advising.submitted)} total={number(snapshot.advising.total)} color={Academic.primary} />
                    <DistributionRow label="Under evaluation" value={number(snapshot.advising.underEvaluation)} total={number(snapshot.advising.total)} color={Academic.warningText} />
                    <DistributionRow label="Action required" value={number(snapshot.advising.actionRequired)} total={number(snapshot.advising.total)} color={Academic.error} />
                    <DistributionRow label="Resolved" value={number(snapshot.advising.resolved)} total={number(snapshot.advising.total)} color={Academic.success} />
                  </SurfaceCard>
                </View>
              </View>

              <SectionHeader title="Feature Usage" badge={`${windowDays}-day activity`} />
              <View style={[styles.usageGrid, wide && styles.usageGridWide]}>
                {featureUsage.map(item => <UsageCard key={item.label} item={item} windowDays={windowDays} wide={wide} />)}
              </View>

              <SectionHeader title="Academic & Knowledge Coverage" />
              <SurfaceCard style={styles.coverageCard}>
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Active schedules</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.academics.schedules))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'graduationcap', android: 'school', web: 'school' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Active enrollments</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.academics.studentEnrollments))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'books.vertical', android: 'menu_book', web: 'menu_book' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Verified sources</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.knowledge.verifiedDocuments))}</Text>
                </View>
                <View style={[styles.coverageDivider, { backgroundColor: colors.border }]} />
                <View style={styles.coverageItem}>
                  <AcademicIcon name={{ ios: 'cylinder', android: 'database', web: 'database' }} color={colors.primary} size={21} />
                  <Text style={[styles.coverageLabel, { color: colors.textSecondary }]}>Knowledge chunks</Text>
                  <Text selectable style={[styles.coverageValue, { color: colors.text }]}>{compact(number(snapshot.knowledge.knowledgeChunks))}</Text>
                </View>
              </SurfaceCard>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

export default function SystemAnalyticsScreen() {
  return (
    <RoleGuard allowed={['super_admin']}>
      <SystemAnalyticsContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: Spacing.three, paddingBottom: 132 },
  content: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.three },
  heroAnalyticsIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  windowRail: { flexDirection: 'row', gap: Spacing.two },
  windowButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  windowText: { fontSize: 12, fontWeight: '900' },
  updatedText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  loadingText: { fontSize: 14, fontWeight: '700' },
  healthCard: { gap: Spacing.three },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  healthCopy: { flex: 1, gap: 2 },
  healthTitle: { fontSize: 16, fontWeight: '900' },
  healthSubtitle: { fontSize: 12, lineHeight: 17 },
  healthDetails: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.three, borderTopWidth: 1, gap: Spacing.three },
  healthDetail: { flex: 1, minWidth: 112, gap: 3 },
  healthDetailLabel: { fontSize: 11, fontWeight: '700' },
  healthDetailValue: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricGridWide: { gap: Spacing.three },
  overviewMetric: { width: '48%', minWidth: 145, gap: 5 },
  overviewMetricWide: { width: '22.8%', flexGrow: 1 },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 25, fontWeight: '900', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 13, fontWeight: '900' },
  metricDetail: { fontSize: 11, lineHeight: 16 },
  twoColumn: { gap: Spacing.three },
  twoColumnWide: { flexDirection: 'row' },
  column: { flex: 1, gap: Spacing.two },
  chartCard: { gap: Spacing.three },
  distributionRow: { gap: 7 },
  distributionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  distributionLabel: { fontSize: 12, fontWeight: '700' },
  distributionValue: { fontSize: 13, fontWeight: '900', fontVariant: ['tabular-nums'] },
  barTrack: { height: 8, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  usageGrid: { gap: Spacing.three },
  usageGridWide: { flexDirection: 'row', flexWrap: 'wrap' },
  usageCard: { width: '100%', gap: Spacing.two },
  usageCardWide: { width: '48%', flexGrow: 1 },
  usageTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  usageIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  usageTitle: { fontSize: 15, fontWeight: '900' },
  usageDescription: { fontSize: 12, lineHeight: 17 },
  usageStats: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingTop: Spacing.one },
  usageRecent: { alignItems: 'flex-end' },
  usageNumber: { fontSize: 19, fontWeight: '900', fontVariant: ['tabular-nums'] },
  usageStatLabel: { fontSize: 10, fontWeight: '700' },
  coverageCard: { gap: 0 },
  coverageItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11 },
  coverageLabel: { flex: 1, fontSize: 13, fontWeight: '700' },
  coverageValue: { fontSize: 17, fontWeight: '900', fontVariant: ['tabular-nums'] },
  coverageDivider: { height: 1, marginLeft: 32 },
});
