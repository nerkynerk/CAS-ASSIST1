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
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  type StatusTone,
} from '@/components/ui/academic-ui';
import { Layout, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAppTheme } from '@/context/theme';
import { apiGet } from '@/lib/api';
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

interface QueueAnalytics {
  activeLoad: number;
  arrivalsPerHour: number;
  resolvedCount: number;
  mostLikelyMinutes: number | null;
  expectedTriangularMinutes: number | null;
  estimateSource: string;
  calculatedAt: string;
}

function AggregateBar({ item, maximum }: { item: UsageItem; maximum: number }) {
  const { colors } = useAppTheme();
  const value = item.recent;
  const width = maximum > 0 ? Math.max(3, Math.min(100, (value / maximum) * 100)) : 0;

  return (
    <View style={styles.aggregateRow}>
      <View style={styles.aggregateHeader}>
        <View style={styles.aggregateLabelGroup}>
          <View style={[styles.aggregateIcon, { backgroundColor: colors.softBlue }]}>
            <AcademicIcon name={item.icon} color={colors.primary} size={17} />
          </View>
          <View style={styles.aggregateCopy}>
            <Text style={[styles.aggregateLabel, { color: colors.text }]}>{item.label}</Text>
            <Text style={[styles.aggregateDescription, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
          </View>
        </View>
        <Text selectable style={[styles.aggregateValue, { color: colors.text }]}>{compact(value)}</Text>
      </View>
      <View style={[styles.aggregateTrack, { backgroundColor: colors.muted }]}>
        <View style={[styles.aggregateFill, { backgroundColor: colors.primary, width: `${width}%` }]} />
      </View>
    </View>
  );
}

function ActivityTableRow({ item, windowDays, compactLayout }: { item: UsageItem; windowDays: number; compactLayout: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.activityRow, compactLayout && styles.activityRowCompact, { borderTopColor: colors.border }]}>
      <View style={[styles.activityService, compactLayout && styles.activityServiceCompact]}>
        <View style={[styles.activityIcon, { backgroundColor: colors.softBlue }]}>
          <AcademicIcon name={item.icon} color={colors.primary} size={17} />
        </View>
        <View style={styles.activityCopy}>
          <Text style={[styles.activityTitle, { color: colors.text }]}>{item.label}</Text>
          <Text style={[styles.activityDescription, { color: colors.textSecondary }]} numberOfLines={1}>{item.description}</Text>
        </View>
      </View>
      <View style={[styles.activityDetails, compactLayout && styles.activityDetailsCompact]}>
        <View style={styles.activityMetric}>
          <Text selectable style={[styles.activityMetricValue, { color: colors.text }]}>{compact(item.recent)}</Text>
          <Text style={[styles.activityMetricLabel, { color: colors.textSecondary }]}>{windowDays}-day activity</Text>
        </View>
        <View style={styles.activityMetric}>
          <Text selectable style={[styles.activityMetricValue, { color: colors.text }]}>{compact(item.total)}</Text>
          <Text style={[styles.activityMetricLabel, { color: colors.textSecondary }]}>All time</Text>
        </View>
        <View style={styles.activityStatus}>
          <StatusBadge label={item.status} tone={item.tone} />
        </View>
      </View>
    </View>
  );
}

function SystemAnalyticsContent() {
  const { width: viewportWidth } = useWindowDimensions();
  const { colors } = useAppTheme();
  const [windowDays, setWindowDays] = useState<(typeof WINDOWS)[number]>(30);
  const [snapshot, setSnapshot] = useState<AnalyticsSnapshot | null>(null);
  const [service, setService] = useState<ServiceHealth>({ state: 'not_configured', latencyMs: null });
  const [queueAnalytics, setQueueAnalytics] = useState<QueueAnalytics | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [queryLatency, setQueryLatency] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wide = viewportWidth >= 760;
  const compactTable = viewportWidth < Layout.compactBreakpoint;

  const fetchAnalytics = useCallback(async () => {
    setError(null);
    const started = Date.now();
    const queueResult = apiGet<QueueAnalytics>(`/api/queue/analytics?windowHours=${windowDays * 24}`)
      .then(data => ({ data, error: null as string | null }))
      .catch(() => ({ data: null, error: 'Queue analytics are unavailable.' }));
    const [analyticsResult, healthResult, resolvedQueue] = await Promise.all([
      supabase.rpc('get_system_analytics', { p_window_days: windowDays }),
      checkApi(),
      queueResult,
    ]);
    setQueryLatency(Date.now() - started);
    setService(healthResult);
    setQueueAnalytics(resolvedQueue.data);
    setQueueError(resolvedQueue.error);
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

  const recentActivityTotal = featureUsage.reduce((sum, item) => sum + item.recent, 0);
  const largestRecentActivity = featureUsage.reduce((largest, item) => Math.max(largest, item.recent), 0);

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
          <SurfaceCard style={styles.reportHeader}>
            <View style={styles.reportHeading}>
              <View style={styles.reportEyebrow}>
                <View style={[styles.reportEyebrowDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.reportEyebrowText, { color: colors.primary }]}>REPORTING WORKSPACE</Text>
              </View>
              <Text style={[styles.reportTitle, { color: colors.text }]}>System analytics</Text>
              <Text style={[styles.reportSubtitle, { color: colors.textSecondary }]}>A focused view of service activity, operational health, and academic platform coverage.</Text>
            </View>
            <View style={[styles.reportContext, { backgroundColor: colors.softBlue }]}>
              <AcademicIcon name={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }} color={colors.primary} size={22} />
              <Text style={[styles.reportContextTitle, { color: colors.text }]}>Super Admin view</Text>
              <Text style={[styles.reportContextCaption, { color: colors.textSecondary }]}>Authorized aggregate data</Text>
            </View>
          </SurfaceCard>

          <SurfaceCard style={styles.toolbarCard}>
            <View style={styles.toolbarCopy}>
              <Text style={[styles.toolbarLabel, { color: colors.text }]}>Reporting period</Text>
              <Text style={[styles.toolbarHint, { color: colors.textSecondary }]}>Choose a supported snapshot window</Text>
            </View>
            <View style={styles.toolbarControls}>
              <View style={styles.windowRail}>
                {WINDOWS.map(days => {
                  const selected = windowDays === days;
                  return (
                    <Pressable
                      key={days}
                      onPress={() => setWindowDays(days)}
                      accessibilityRole="button"
                      accessibilityLabel={`Show analytics for the last ${days} days`}
                      accessibilityState={{ selected }}
                      style={({ pressed }) => [styles.windowButton, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                      <Text style={[styles.windowText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{days} days</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={onRefresh}
                disabled={refreshing}
                accessibilityRole="button"
                accessibilityLabel="Refresh analytics"
                accessibilityState={{ disabled: refreshing, busy: refreshing }}
                style={({ pressed }) => [styles.refreshButton, { borderColor: colors.border, backgroundColor: colors.surface }, pressed && styles.pressed, refreshing && styles.refreshDisabled]}>
                <AcademicIcon name={{ ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' }} color={colors.primary} size={17} />
                <Text style={[styles.refreshText, { color: colors.primary }]}>Refresh</Text>
              </Pressable>
            </View>
            {snapshot ? (
              <Text selectable style={[styles.updatedText, { color: colors.textSecondary }]}>
                Updated {new Date(snapshot.generatedAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}
              </Text>
            ) : null}
          </SurfaceCard>

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
                  <View style={styles.healthDetail}>
                    <Text style={[styles.healthDetailLabel, { color: colors.textSecondary }]}>Queue active load</Text>
                    <Text selectable style={[styles.healthDetailValue, { color: colors.text }]}>{queueAnalytics ? compact(number(queueAnalytics.activeLoad)) : '—'}</Text>
                  </View>
                </View>
              </SurfaceCard>
              {queueError ? <Text style={[styles.optionalNote, { color: colors.textSecondary }]}>{queueError} The core system analytics report remains available.</Text> : null}

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

              <BentoGrid style={styles.primaryReportGrid}>
                <BentoPanel size="wide" style={wide ? [styles.column, styles.activityPanelWide] : styles.column}>
                  <SectionHeader title="Activity by service" badge={`${windowDays}-day window`} />
                  <SurfaceCard style={styles.aggregatePanel}>
                    <View style={styles.aggregatePanelIntro}>
                      <View style={styles.aggregatePanelCopy}>
                        <Text style={[styles.aggregatePanelTitle, { color: colors.text }]}>Recent activity volume</Text>
                        <Text style={[styles.aggregatePanelDescription, { color: colors.textSecondary }]}>Real counts returned by the authorized system analytics snapshot.</Text>
                      </View>
                      <View style={styles.aggregatePanelTotal}>
                        <Text selectable style={[styles.aggregatePanelTotalValue, { color: colors.text }]}>{compact(recentActivityTotal)}</Text>
                        <Text style={[styles.aggregatePanelTotalLabel, { color: colors.textSecondary }]}>events</Text>
                      </View>
                    </View>
                    <View style={styles.aggregateBars}>
                      {featureUsage.map(item => <AggregateBar key={item.label} item={item} maximum={largestRecentActivity} />)}
                    </View>
                  </SurfaceCard>
                </BentoPanel>
                <BentoPanel size="compact" style={wide ? [styles.column, styles.signalPanelWide] : [styles.column, styles.signalPanelStacked]}>
                  <SectionHeader title="Operational signals" />
                  <SurfaceCard style={[styles.signalPanel, wide && styles.signalCardWide]}>
                    <View style={[styles.signalRow, styles.signalFirstRow]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.softBlue }]}><AcademicIcon name={{ ios: 'person.2', android: 'groups', web: 'groups' }} color={colors.primary} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Active accounts</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.users.active))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.warningBg }]}><AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.warning} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Pending verification</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.users.pendingVerification))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.errorBg }]}><AcademicIcon name={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }} color={colors.error} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Action required</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.advising.actionRequired))}</Text></View>
                    </View>
                    <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                      <View style={[styles.signalIcon, { backgroundColor: colors.successBg }]}><AcademicIcon name={{ ios: 'doc.text', android: 'description', web: 'description' }} color={colors.success} size={18} /></View>
                      <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Documents processing</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(snapshot.documents.pending))}</Text></View>
                    </View>
                    {queueAnalytics ? (
                      <View style={[styles.signalRow, { borderTopColor: colors.border }]}>
                        <View style={[styles.signalIcon, { backgroundColor: colors.softBlue }]}><AcademicIcon name={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }} color={colors.primary} size={18} /></View>
                        <View style={styles.signalCopy}><Text style={[styles.signalLabel, { color: colors.textSecondary }]}>Queue active load</Text><Text selectable style={[styles.signalValue, { color: colors.text }]}>{compact(number(queueAnalytics.activeLoad))}</Text></View>
                      </View>
                    ) : null}
                  </SurfaceCard>
                </BentoPanel>
              </BentoGrid>

              <BentoGrid style={styles.twoColumn}>
                <BentoPanel size="medium" style={styles.column}>
                  <SectionHeader title="Account Distribution" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Students" value={number(snapshot.users.student)} total={number(snapshot.users.total)} color={Academic.primary} />
                    <DistributionRow label="Faculty" value={number(snapshot.users.faculty)} total={number(snapshot.users.total)} color={Academic.warningText} />
                    <DistributionRow label="Staff" value={number(snapshot.users.staff)} total={number(snapshot.users.total)} color={Academic.success} />
                    <DistributionRow label="Super admins" value={number(snapshot.users.superAdmin)} total={number(snapshot.users.total)} color={Academic.error} />
                  </SurfaceCard>
                </BentoPanel>
                <BentoPanel size="medium" style={styles.column}>
                  <SectionHeader title="Advising Pipeline" />
                  <SurfaceCard style={styles.chartCard}>
                    <DistributionRow label="Submitted" value={number(snapshot.advising.submitted)} total={number(snapshot.advising.total)} color={Academic.primary} />
                    <DistributionRow label="Under evaluation" value={number(snapshot.advising.underEvaluation)} total={number(snapshot.advising.total)} color={Academic.warningText} />
                    <DistributionRow label="Action required" value={number(snapshot.advising.actionRequired)} total={number(snapshot.advising.total)} color={Academic.error} />
                    <DistributionRow label="Resolved" value={number(snapshot.advising.resolved)} total={number(snapshot.advising.total)} color={Academic.success} />
                  </SurfaceCard>
                </BentoPanel>
              </BentoGrid>

              <SectionHeader title="Service activity breakdown" badge="Aggregate report" />
              <SurfaceCard style={styles.activityTable}>
                <View style={[styles.activityTableHeader, compactTable && styles.activityTableHeaderCompact]}>
                  <View style={styles.activityService}>
                    <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>Service area</Text>
                  </View>
                  <View style={styles.activityDetails}>
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>{windowDays} days</Text>
                    </View>
                    <View style={styles.activityMetric}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>All time</Text>
                    </View>
                    <View style={styles.activityStatus}>
                      <Text style={[styles.activityTableHeading, { color: colors.textSecondary }]}>Status</Text>
                    </View>
                  </View>
                </View>
                {featureUsage.map(item => <ActivityTableRow key={item.label} item={item} windowDays={windowDays} compactLayout={compactTable} />)}
              </SurfaceCard>

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
  reportHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.four, padding: Spacing.four },
  reportHeading: { flex: 1, minWidth: 230, gap: Spacing.one },
  reportEyebrow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 3 },
  reportEyebrowDot: { width: 7, height: 7, borderRadius: 4 },
  reportEyebrowText: { fontSize: 11, fontWeight: '600', letterSpacing: 1.1 },
  reportTitle: { fontSize: 30, lineHeight: 36, fontWeight: '600', letterSpacing: -0.7 },
  reportSubtitle: { maxWidth: 650, fontSize: 13, lineHeight: 20 },
  reportContext: { minWidth: 178, padding: Spacing.three, borderRadius: 18, alignItems: 'flex-start', gap: 5 },
  reportContextTitle: { fontSize: 13, fontWeight: '600' },
  reportContextCaption: { fontSize: 11, lineHeight: 16 },
  toolbarCard: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  toolbarCopy: { flex: 1, minWidth: 180, gap: 2 },
  toolbarLabel: { fontSize: 13, fontWeight: '500' },
  toolbarHint: { fontSize: 11, lineHeight: 16 },
  toolbarControls: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.two },
  windowRail: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  windowButton: { minHeight: 36, paddingHorizontal: 13, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  windowText: { fontSize: 12, fontWeight: '500' },
  refreshButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 999, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  refreshText: { fontSize: 12, fontWeight: '500' },
  refreshDisabled: { opacity: 0.6 },
  updatedText: { fontSize: 11, fontWeight: '400', fontVariant: ['tabular-nums'] },
  pressed: { opacity: 0.82, transform: [{ scale: 0.98 }] },
  loadingState: { minHeight: 280, alignItems: 'center', justifyContent: 'center', gap: Spacing.three },
  loadingText: { fontSize: 14, fontWeight: '400' },
  healthCard: { gap: Spacing.three },
  healthHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  healthIcon: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  healthCopy: { flex: 1, gap: 2 },
  healthTitle: { fontSize: 16, fontWeight: '600' },
  healthSubtitle: { fontSize: 12, lineHeight: 17 },
  healthDetails: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: Spacing.three, borderTopWidth: 1, gap: Spacing.three },
  healthDetail: { flex: 1, minWidth: 112, gap: 3 },
  healthDetailLabel: { fontSize: 11, fontWeight: '500' },
  healthDetailValue: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  optionalNote: { fontSize: 11, lineHeight: 16, paddingHorizontal: 3 },
  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  metricGridWide: { gap: Spacing.three },
  overviewMetric: { width: '48%', minWidth: 145, minHeight: 132, justifyContent: 'space-between', gap: 5 },
  overviewMetricWide: { width: '22.8%', flexGrow: 1 },
  metricIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  metricValue: { fontSize: 25, fontWeight: '600', fontVariant: ['tabular-nums'] },
  metricLabel: { fontSize: 13, fontWeight: '500' },
  metricDetail: { fontSize: 11, lineHeight: 16 },
  primaryReportGrid: { gap: Spacing.three, alignItems: 'stretch' },
  activityPanelWide: { flexBasis: '65%' },
  signalPanelWide: { flexBasis: '32%' },
  signalPanelStacked: { flexBasis: '100%' },
  twoColumn: { gap: Spacing.three },
  column: { gap: Spacing.two },
  chartCard: { gap: Spacing.three },
  distributionRow: { gap: 7 },
  distributionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  distributionLabel: { fontSize: 12, fontWeight: '500' },
  distributionValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  barTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  barFill: { height: '100%', borderRadius: 999 },
  aggregatePanel: { gap: Spacing.three },
  aggregatePanelIntro: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  aggregatePanelCopy: { flex: 1, gap: 3 },
  aggregatePanelTitle: { fontSize: 15, fontWeight: '600' },
  aggregatePanelDescription: { fontSize: 12, lineHeight: 17 },
  aggregatePanelTotal: { alignItems: 'flex-end' },
  aggregatePanelTotalValue: { fontSize: 22, fontWeight: '600', fontVariant: ['tabular-nums'] },
  aggregatePanelTotalLabel: { fontSize: 10, fontWeight: '500' },
  aggregateBars: { gap: Spacing.two },
  aggregateRow: { gap: 7 },
  aggregateHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  aggregateLabelGroup: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aggregateIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  aggregateCopy: { flex: 1, minWidth: 0, gap: 1 },
  aggregateLabel: { fontSize: 12, fontWeight: '500' },
  aggregateDescription: { fontSize: 10, lineHeight: 15 },
  aggregateValue: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  aggregateTrack: { height: 5, marginLeft: 44, borderRadius: 999, overflow: 'hidden' },
  aggregateFill: { height: '100%', borderRadius: 999 },
  signalPanel: { paddingVertical: 0 },
  signalCardWide: { flex: 1, justifyContent: 'space-between' },
  signalRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 11, borderTopWidth: 1 },
  signalFirstRow: { borderTopWidth: 0 },
  signalIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  signalCopy: { flex: 1, gap: 2 },
  signalLabel: { fontSize: 11, fontWeight: '500' },
  signalValue: { fontSize: 18, fontWeight: '600', fontVariant: ['tabular-nums'] },
  activityTable: { paddingVertical: 0 },
  activityTableHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderBottomWidth: 1 },
  activityTableHeaderCompact: { display: 'none' },
  activityTableHeading: { fontSize: 10, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.45, textAlign: 'right' },
  activityRow: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingVertical: 10, borderTopWidth: 1 },
  activityRowCompact: { minHeight: 0, flexDirection: 'column', alignItems: 'stretch', gap: Spacing.two, paddingVertical: 12 },
  activityService: { flex: 1, minWidth: 170, flexDirection: 'row', alignItems: 'center', gap: 10 },
  activityServiceCompact: { flex: 0, width: '100%', minWidth: 0 },
  activityDetails: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  activityDetailsCompact: { width: '100%', justifyContent: 'flex-end' },
  activityIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  activityCopy: { flex: 1, minWidth: 0, gap: 1 },
  activityTitle: { fontSize: 12, fontWeight: '600' },
  activityDescription: { fontSize: 10, lineHeight: 15 },
  activityMetric: { width: 82, gap: 2, alignItems: 'flex-end', flexShrink: 0 },
  activityMetricValue: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  activityMetricLabel: { fontSize: 10, lineHeight: 14, textAlign: 'right' },
  activityStatus: { width: 112, alignItems: 'flex-end', flexShrink: 0 },
  coverageCard: { gap: 0 },
  coverageItem: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 11 },
  coverageLabel: { flex: 1, fontSize: 13, fontWeight: '500' },
  coverageValue: { fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] },
  coverageDivider: { height: 1, marginLeft: 32 },
});
