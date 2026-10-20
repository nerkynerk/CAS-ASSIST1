import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { BentoGrid, BentoPanel, DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { apiGet } from '@/lib/api';

interface TicketRow {
  id: string;
  category: string;
  description: string;
  status: string;
  created_at: string;
  student_id: { display_name: string; email: string } | null;
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

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'warning',
  resolved: 'success',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function StaffDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [documentCounts, setDocumentCounts] = useState<Record<string, number>>({});
  const [urgent, setUrgent] = useState<TicketRow[]>([]);
  const [queueAnalytics, setQueueAnalytics] = useState<QueueAnalytics | null>(null);
  const [queueError, setQueueError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [allTickets, urgentTickets, documents] = await Promise.all([
      supabase
        .from('advising_ticket_pipeline')
        .select('status')
        .eq('state', 'active'),
      supabase
        .from('advising_ticket_pipeline')
        .select('id, category, description, status, created_at, student_id(display_name, email)')
        .in('status', ['submitted', 'action_required'])
        .eq('state', 'active')
        .order('created_at', { ascending: true })
        .limit(5),
      supabase
        .from('document_requests')
        .select('status')
        .eq('state', 'active'),
    ]);

    const c: Record<string, number> = {};
    for (const ticket of (allTickets.data ?? [])) {
      c[ticket.status] = (c[ticket.status] ?? 0) + 1;
    }
    setCounts(c);
    setUrgent((urgentTickets.data as unknown as TicketRow[]) ?? []);
    setLoadError(allTickets.error || urgentTickets.error || documents.error
      ? 'Some operational records could not be loaded. Pull down to retry.'
      : null);
    const documentStatusCounts: Record<string, number> = {};
    for (const document of (documents.data ?? [])) {
      documentStatusCounts[document.status] = (documentStatusCounts[document.status] ?? 0) + 1;
    }
    setDocumentCounts(documentStatusCounts);
  }, []);

  const fetchQueueAnalytics = useCallback(async () => {
    try {
      const data = await apiGet<QueueAnalytics>('/api/queue/analytics?windowHours=168');
      setQueueAnalytics(data);
      setQueueError(null);
    } catch {
      setQueueAnalytics(null);
      setQueueError('Queue analytics are unavailable. The optional operations API may not be configured.');
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchQueueAnalytics()]);
    setLoading(false);
  }, [fetchData, fetchQueueAnalytics]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchQueueAnalytics()]);
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, [load]);

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const total = ['submitted', 'under_evaluation', 'action_required'].reduce((sum, status) => sum + (counts[status] ?? 0), 0);
  const documentsInProgress = ['submitted', 'under_evaluation', 'action_required', 'processing']
    .reduce((sum, status) => sum + (documentCounts[status] ?? 0), 0);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Staff"
          title={`Hello, ${firstName}`}
          subtitle="Monitor daily CAS support operations."
        />

        {loadError ? <View style={[styles.errorBox, { backgroundColor: theme.errorBg }]}><Text style={[styles.errorText, { color: theme.error }]}>{loadError}</Text></View> : null}

        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Waiting requests"
                value={counts.submitted ?? 0}
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                tone="warning"
              />
              <MetricCard
                label="Currently serving"
                value={counts.under_evaluation ?? 0}
                icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                tone="blue"
              />
              <MetricCard
                label="Action required"
                value={counts.action_required ?? 0}
                icon={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }}
                tone="error"
              />
              <MetricCard
                label="Completed"
                value={counts.resolved ?? 0}
                icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
                tone="success"
              />
              <MetricCard
                label="Documents processing"
                value={documentsInProgress}
                icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
                tone="blue"
              />
            </View>
          </>
        )}

        <SectionHeader title="Operations" action={`${total} active`} onAction={() => router.navigate('/admin')} />
        <View style={dashboardActionGridStyles.grid}>
          <DashboardActionCard
            label="Manage Queue"
            caption="Process existing assistance requests."
            size="wide"
            icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
          />
          <DashboardActionCard
            label="Post Announcement"
            caption="Share an authorized department update."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
          />
          <DashboardActionCard
            label="Document Requests"
            caption="Open the existing processing queue."
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })}
          />
          <DashboardActionCard
            label="View Updates"
            caption="Read current department announcements."
            icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
            onPress={() => router.navigate('/explore')}
          />
        </View>

        <BentoGrid style={styles.operationsGrid}>
          <BentoPanel size="medium" style={styles.operationsPanel}>
            <SectionHeader
              title="Queue monitor"
              action="Open ticket queue"
              onAction={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
            />
            {queueError ? (
              <EmptyState
                title="Queue analytics unavailable"
                message={queueError}
                icon={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }}
              />
            ) : queueAnalytics ? (
              <>
                <View style={styles.queueStatGrid}>
                  <View style={[styles.queueStat, { backgroundColor: theme.softBlue }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.activeLoad}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Active load</Text>
                  </View>
                  <View style={[styles.queueStat, { backgroundColor: theme.warningBg }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.arrivalsPerHour.toFixed(2)}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Arrivals / hour</Text>
                  </View>
                  <View style={[styles.queueStat, { backgroundColor: theme.successBg }]}>
                    <Text style={[styles.queueStatValue, { color: theme.navy }]}>{queueAnalytics.resolvedCount}</Text>
                    <Text style={[styles.queueStatLabel, { color: theme.textSecondary }]}>Resolved in window</Text>
                  </View>
                </View>
                <Text style={[styles.queueMethod, { color: theme.textSecondary }]}>Estimated service time: {queueAnalytics.expectedTriangularMinutes ?? queueAnalytics.mostLikelyMinutes ?? '—'} min · {queueAnalytics.estimateSource.replace('_', ' ')}</Text>
              </>
            ) : (
              <ActivityIndicator color={theme.primary} style={styles.loader} />
            )}
          </BentoPanel>
          <BentoPanel size="medium" style={styles.operationsPanel}>
            <SectionHeader title="Document pipeline" action="Open document queue" onAction={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })} />
            {Object.keys(documentCounts).length === 0 ? (
              <EmptyState title="No document activity" message="Authorized document requests will appear here." icon={{ ios: 'doc.text', android: 'description', web: 'description' }} />
            ) : (
              <View style={styles.documentPipeline}>
                {['submitted', 'under_evaluation', 'processing', 'ready_for_pickup', 'completed'].map(status => (
                  <View key={status} style={[styles.documentPipelineRow, { borderBottomColor: theme.border }]}>
                    <Text style={[styles.documentPipelineLabel, { color: theme.textSecondary }]}>{status.replace(/_/g, ' ')}</Text>
                    <Text style={[styles.documentPipelineValue, { color: theme.navy }]}>{documentCounts[status] ?? 0}</Text>
                  </View>
                ))}
              </View>
            )}
          </BentoPanel>
        </BentoGrid>

        <SectionHeader title="Needs Attention" />
        {urgent.length === 0 ? (
          <EmptyState
            title="All queues are current"
            message="No submitted or action-required tickets need immediate staff action."
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        ) : (
          urgent.map(ticket => {
            const student = ticket.student_id;
            return (
              <Pressable key={ticket.id} onPress={() => router.navigate('/admin')}>
                <SurfaceCard style={styles.ticketCard} accent={ticket.status === 'action_required' ? 'warning' : 'blue'}>
                  <View style={styles.ticketTop}>
                    <View style={[styles.ticketIcon, { backgroundColor: theme.softBlue }]}>
                      <AcademicIcon
                        name={{ ios: 'doc.text', android: 'assignment', web: 'assignment' }}
                        color={theme.primary}
                        size={20}
                      />
                    </View>
                    <View style={styles.ticketBody}>
                      <View style={styles.ticketMeta}>
                        <Text style={[styles.ticketRef, { color: theme.primary }]}>{shortRef(ticket.id)}</Text>
                        <StatusBadge
                          label={STATUS_LABEL[ticket.status] ?? ticket.status}
                          tone={STATUS_TONE[ticket.status] ?? 'muted'}
                        />
                      </View>
                      <Text style={[styles.ticketTitle, { color: theme.navy }]} numberOfLines={1}>{formatCategory(ticket.category)}</Text>
                      {student ? (
                        <Text style={[styles.ticketStudent, { color: theme.textSecondary }]} numberOfLines={1}>
                          {student.display_name} - {student.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>
                  <Text style={[styles.ticketDesc, { color: theme.textSecondary }]} numberOfLines={2}>{ticket.description}</Text>
                  <Text style={[styles.ticketDate, { color: theme.textSecondary }]}>{formatDate(ticket.created_at)}</Text>
                </SurfaceCard>
              </Pressable>
            );
          })
        )}

        <SectionHeader title="Ticket status overview" action="Open operations" onAction={() => router.navigate('/admin')} />
        <SurfaceCard style={styles.statusOverview}>
          {['submitted', 'under_evaluation', 'action_required', 'resolved'].map(status => (
            <View key={status} style={[styles.statusSummary, { backgroundColor: theme.surfaceMuted, borderColor: theme.border }]}>
              <StatusBadge label={STATUS_LABEL[status]} tone={STATUS_TONE[status] ?? 'muted'} />
              <Text style={[styles.statusSummaryValue, { color: theme.navy }]}>{counts[status] ?? 0}</Text>
            </View>
          ))}
        </SurfaceCard>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  loader: { marginTop: Spacing.four },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  operationsGrid: { gap: Spacing.three },
  operationsPanel: { gap: Spacing.two },
  queueStatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  queueStat: { flex: 1, minWidth: 92, borderRadius: 14, padding: 11, gap: 3 },
  queueStatValue: { fontSize: 21, fontWeight: '600', fontVariant: ['tabular-nums'] },
  queueStatLabel: { fontSize: 11, lineHeight: 15, fontWeight: '500' },
  queueMethod: { fontSize: 11, lineHeight: 16 },
  documentPipeline: { gap: 0 },
  documentPipelineRow: { minHeight: 35, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  documentPipelineLabel: { fontSize: 12, textTransform: 'capitalize' },
  documentPipelineValue: { fontSize: 15, fontWeight: '600', fontVariant: ['tabular-nums'] },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { fontSize: 13, fontWeight: '500' },
  ticketCard: { gap: 10 },
  ticketTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ticketIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  ticketBody: { flex: 1, gap: 3 },
  ticketMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  ticketRef: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  ticketTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  ticketStudent: { color: Academic.textSecondary, fontSize: 12 },
  ticketDesc: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  ticketDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  statusOverview: { gap: Spacing.two },
  statusSummary: { minHeight: 46, borderRadius: 13, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  statusSummaryValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
