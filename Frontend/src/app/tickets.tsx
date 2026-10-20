import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  ActionButton,
  AppBackdrop,
  EmptyState,
  IconButton,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import RoleGuard from '@/components/role-guard';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { supabase } from '@/lib/supabase';

const EXEC_E = (5 + 45 + 15) / 3;
const ACTIVE_STATUSES = ['submitted', 'under_evaluation', 'action_required'];

interface QueueMetrics {
  L: number;
  lambda: number;
  W: number | null;
  position: number | null;
  estimatedMinutes: number | null;
}

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at?: string;
}

type RequestFilter = 'active' | 'completed' | 'all';
type ScreenView = 'list' | 'new';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'In Queue',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Completed',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'warning',
  resolved: 'success',
};

const CATEGORIES = [
  'General Inquiry',
  'Grades',
  'Document Request',
  'Others',
];

async function computeQueueMetrics(userId: string): Promise<QueueMetrics> {
  const since24h = new Date(Date.now() - 86_400_000).toISOString();

  const [{ data: unresolved }, { count: lambda }] = await Promise.all([
    supabase
      .from('advising_ticket_pipeline')
      .select('id, student_id, created_at')
      .in('status', ACTIVE_STATUSES)
      .eq('state', 'active')
      .order('created_at', { ascending: true }),
    supabase
      .from('advising_ticket_pipeline')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', since24h),
  ]);

  const L = unresolved?.length ?? 0;
  const lam = lambda ?? 0;
  const W = lam > 0 ? L / lam : null;
  const studentTickets = (unresolved ?? []).filter(t => t.student_id === userId);
  let position: number | null = null;

  if (studentTickets.length > 0) {
    const idx = (unresolved ?? []).findIndex(t => t.id === studentTickets[0].id);
    position = idx + 1;
  }

  const estimatedMinutes = position !== null ? Math.round(EXEC_E * position) : null;
  return { L, lambda: lam, W, position, estimatedMinutes };
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function CurrentTicketCard({
  ticket,
  metrics,
}: {
  ticket: Ticket;
  metrics: QueueMetrics | null;
}) {
  const minutes = metrics?.estimatedMinutes;
  const colors = useTheme();

  return (
    <View style={[styles.currentTicketCard, { backgroundColor: colors.primary }]}>
      <View style={styles.currentText}>
        <Text style={[styles.currentLabel, { color: colors.background }]}>Current Active Ticket</Text>
        <View style={styles.currentRefRow}>
          <Text style={[styles.currentRef, { color: colors.background }]}>{shortRef(ticket.id)}</Text>
          <View style={styles.currentCategoryPill}>
            <Text style={[styles.currentCategoryText, { color: colors.background }]}>{formatCategory(ticket.category)}</Text>
          </View>
        </View>
        <View style={styles.currentStats}>
          <View>
            <Text style={[styles.currentStatLabel, { color: colors.background }]}>Students ahead</Text>
            <Text style={[styles.currentStatValue, { color: colors.background }]}>
              {metrics?.position ? Math.max(metrics.position - 1, 0) : '--'}
            </Text>
          </View>
          <View>
            <Text style={[styles.currentStatLabel, { color: colors.background }]}>Est. wait</Text>
            <Text style={[styles.currentStatValue, { color: colors.background }]}>
              {minutes ? `${minutes} min` : '--'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.currentClock}>
        <AcademicIcon
          name={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
          color="rgba(255,255,255,0.24)"
          size={72}
        />
      </View>
    </View>
  );
}

function RequestListCard({ ticket, onPress }: { ticket: Ticket; onPress: () => void }) {
  const isComplete = ticket.status === 'resolved';
  const tone = STATUS_TONE[ticket.status] ?? 'muted';
  const colors = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open request ${shortRef(ticket.id)}`}
      style={({ pressed }) => [styles.requestPressable, pressed && styles.pressed]}>
      <SurfaceCard style={styles.requestCard}>
      <View style={[styles.requestIcon, { backgroundColor: isComplete ? colors.successBg : colors.muted }]}>
        <AcademicIcon
          name={
            isComplete
              ? { ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }
              : ticket.status === 'under_evaluation'
                ? { ios: 'clock', android: 'schedule', web: 'schedule' }
                : { ios: 'doc.text', android: 'description', web: 'description' }
          }
          color={isComplete ? colors.success : colors.primary}
          size={22}
        />
      </View>
      <View style={styles.requestCardBody}>
        <View style={styles.requestMetaRow}>
          <Text style={[styles.requestRef, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
          <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={tone} />
        </View>
        <Text style={[styles.requestTitle, { color: colors.navy }]} numberOfLines={1}>{formatCategory(ticket.category)}</Text>
        <Text style={[styles.requestDate, { color: colors.textSecondary }]} numberOfLines={1}>
          {isComplete ? 'Completed' : 'Submitted'}: {formatDateTime(ticket.created_at)}
        </Text>
      </View>
      <AcademicIcon
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        color={colors.textTertiary}
        size={18}
      />
      </SurfaceCard>
    </Pressable>
  );
}

type RequestFilterOption = { value: string; label: string };

function RequestFilterSelect({
  label,
  value,
  options,
  expanded,
  onPress,
}: {
  label: string;
  value: string;
  options: RequestFilterOption[];
  expanded: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const selected = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={styles.requestFilterSelect}>
      <Text style={[styles.requestFilterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected}`}
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [styles.requestFilterControl, { backgroundColor: colors.muted, borderColor: expanded ? colors.primary : colors.border }, pressed && styles.pressed]}>
        <Text style={[styles.requestFilterControlText, { color: colors.text }]} numberOfLines={1}>{selected}</Text>
        <AcademicIcon
          name={expanded
            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          color={colors.textSecondary}
          size={16}
          animated={false}
        />
      </Pressable>
    </View>
  );
}

function NewTicketForm({
  onBack,
  onSubmitted,
  userId,
}: {
  onBack: () => void;
  onSubmitted: (ticketId: string | null) => Promise<void>;
  userId: string | undefined;
}) {
  const colors = useTheme();
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  async function handleSubmit() {
    setFormError(null);
    if (!category) { setFormError('Please select a category.'); return; }
    if (!description.trim()) { setFormError('Please describe your concern.'); return; }
    if (!userId) { setFormError('User session expired. Please sign in again.'); return; }

    setSubmitting(true);
    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .insert({
        student_id: userId,
        category: category.toLowerCase().replace(/ /g, '_'),
        description: description.trim(),
        priority: 'normal',
        status: 'submitted',
      })
      .select('id')
      .single();
    setSubmitting(false);

    if (error) {
      setFormError('Failed to submit request. Please try again.');
    } else {
      setCategory('');
      setDescription('');
      await onSubmitted(data?.id ?? null);
      onBack();
    }
  }

  return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.scroll}>
        <View style={styles.pageHeader}>
          <IconButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            onPress={onBack}
            label="Back to requests"
            bg={colors.muted}
            color={colors.textSecondary}
          />
          <Text style={[styles.pageTitle, { color: colors.navy }]}>New Request</Text>
        </View>

        <Text style={[styles.formIntro, { color: colors.textSecondary }]}>Choose the service area and describe what the CAS service desk needs to help with. Fields marked required must be completed before submission.</Text>

        {formError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{formError}</Text>
          </View>
        ) : null}

        <SectionHeader title="Request Type · Required" />
        <View style={styles.chipGrid}>
          {CATEGORIES.map(c => {
            const active = category === c;
            return (
              <Pressable
                key={c}
                onPress={() => setCategory(c)}
                style={[styles.choiceChip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
                <Text style={[styles.choiceChipText, { color: active ? colors.background : colors.textSecondary }]}>{c}</Text>
              </Pressable>
            );
          })}
        </View>

        <SectionHeader title="Details · Required" />
        <TextInput
          style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
          placeholder="Please provide as much detail as possible..."
          placeholderTextColor={colors.textSecondary}
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={6}
          maxLength={800}
          textAlignVertical="top"
        />
        <Text style={[styles.charCount, { color: colors.textSecondary }]}>{description.length}/800</Text>

        <Pressable
          onPress={onBack}
          style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]}>
          <Text style={[styles.cancelButtonText, { color: colors.primary }]}>Cancel</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.submitButton, (pressed || submitting) && styles.pressed]}
          onPress={handleSubmit}
          disabled={submitting}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.submitButtonText}>Submit Request</Text>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function TicketsScreenContent() {
  const { profile, session } = useAuth();
  const router = useRouter();
  const colors = useTheme();
  const [view, setView] = useState<ScreenView>('list');
  const [filter, setFilter] = useState<RequestFilter>('active');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [openRequestFilter, setOpenRequestFilter] = useState<'status' | 'category' | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [metrics, setMetrics] = useState<QueueMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updateAlert, setUpdateAlert] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const userId = profile?.id ?? session?.user.id;
  const fetchRef = useRef<(() => Promise<void>) | undefined>(undefined);

  const fetchTickets = useCallback(async () => {
    if (!userId) return;
    const [{ data, error }, queueMetrics] = await Promise.all([
      supabase
        .from('advising_ticket_pipeline')
        .select('id, category, description, status, priority, created_at, updated_at')
        .eq('student_id', userId)
        .eq('state', 'active')
        .order('created_at', { ascending: false }),
      computeQueueMetrics(userId),
    ]);

    setLoadError(error ? 'We could not load your requests. Please refresh and try again.' : null);
    setTickets(data ?? []);
    setMetrics(queueMetrics);
  }, [userId]);

  useEffect(() => { fetchRef.current = fetchTickets; }, [fetchTickets]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchTickets();
    setLoading(false);
  }, [fetchTickets]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchTickets();
    setRefreshing(false);
  }

  useEffect(() => {
    if (!userId) return;
    void load();

    const channel = supabase
      .channel(`tickets-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'advising_ticket_pipeline',
          filter: `student_id=eq.${userId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: string }).status;
          setUpdateAlert(`Your request is now ${STATUS_LABEL[newStatus] ?? newStatus}.`);
          setTimeout(() => setUpdateAlert(null), 4000);
          fetchRef.current?.();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [load, userId]);

  const activeTickets = tickets.filter(t => ACTIVE_STATUSES.includes(t.status));
  const currentTicket = activeTickets[0];

  const categoryOptions = useMemo(() => (
    Array.from(new Set(tickets.map(ticket => ticket.category).filter(Boolean))).sort()
  ), [tickets]);

  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets.filter(ticket => {
      const matchesStatus = filter === 'active'
        ? ACTIVE_STATUSES.includes(ticket.status)
        : filter === 'completed'
          ? ticket.status === 'resolved'
          : true;
      const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
      const searchable = `${shortRef(ticket.id)} ${ticket.category} ${ticket.description}`.toLowerCase();
      return matchesStatus && matchesCategory && (!normalizedQuery || searchable.includes(normalizedQuery));
    });
  }, [categoryFilter, filter, query, tickets]);

  const requestStatusOptions = useMemo(() => [
    { value: 'active', label: 'Active requests' },
    { value: 'completed', label: 'Completed' },
    { value: 'all', label: 'All requests' },
  ], []);
  const requestCategoryOptions = useMemo(() => [
    { value: 'all', label: 'All categories' },
    ...categoryOptions.map(value => ({ value, label: formatCategory(value) })),
  ], [categoryOptions]);
  const openRequestOptions = openRequestFilter === 'status' ? requestStatusOptions : requestCategoryOptions;
  const hasRequestFilters = Boolean(query || categoryFilter !== 'all' || filter !== 'active');

  function chooseRequestFilter(value: string) {
    if (openRequestFilter === 'status') setFilter(value as RequestFilter);
    if (openRequestFilter === 'category') setCategoryFilter(value);
    setOpenRequestFilter(null);
  }

  function resetRequestFilters() {
    setFilter('active');
    setQuery('');
    setCategoryFilter('all');
    setOpenRequestFilter(null);
  }

  async function handleSubmitted(ticketId: string | null) {
    await fetchTickets();
    setUpdateAlert('Request submitted successfully.');
    if (ticketId) {
      router.push(`/ticket/${ticketId}?created=1` as never);
    }
  }

  if (view === 'new') {
    return (
      <NewTicketForm
        onBack={() => setView('list')}
        onSubmitted={handleSubmitted}
        userId={userId}
      />
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="Student services"
          title="My Requests"
          subtitle="Track your assistance queue and request history."
          stackOnMobile
          right={(
            <ActionButton
              label="New Request"
              icon={{ ios: 'plus', android: 'add', web: 'add' }}
              onPress={() => setView('new')}
              accessibilityLabel="Create a new request"
              style={styles.newRequestButton}
            />
          )}
        />

        {updateAlert ? (
          <View style={styles.infoBanner}>
            <Text style={[styles.infoBannerText, { color: colors.primary }]}>{updateAlert}</Text>
          </View>
        ) : null}

        {loadError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{loadError}</Text>
          </View>
        ) : null}

        <SurfaceCard style={styles.filterCard}>
          <View style={styles.searchFieldShell}>
            <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search reference, category, or description"
              placeholderTextColor={colors.textTertiary}
              accessibilityLabel="Search my requests"
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
            />
          </View>
          <View style={styles.requestFilterToolbar}>
            <RequestFilterSelect label="Status" value={filter} options={requestStatusOptions} expanded={openRequestFilter === 'status'} onPress={() => setOpenRequestFilter(value => value === 'status' ? null : 'status')} />
            <RequestFilterSelect label="Category" value={categoryFilter} options={requestCategoryOptions} expanded={openRequestFilter === 'category'} onPress={() => setOpenRequestFilter(value => value === 'category' ? null : 'category')} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Reset request filters"
              disabled={!hasRequestFilters}
              onPress={resetRequestFilters}
              style={({ pressed }) => [styles.requestResetButton, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, !hasRequestFilters && styles.requestResetDisabled, pressed && styles.pressed]}>
              <AcademicIcon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' }} color={colors.primary} size={16} animated={false} />
              <Text style={[styles.requestResetText, { color: colors.primary }]}>Reset</Text>
            </Pressable>
          </View>
          {openRequestFilter ? (
            <View style={[styles.requestFilterMenu, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
              <Text style={[styles.requestFilterMenuLabel, { color: colors.textSecondary }]}>Choose {openRequestFilter === 'status' ? 'status' : 'category'}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.requestFilterOptions}>
                {openRequestOptions.map(option => {
                  const selected = (openRequestFilter === 'status' && filter === option.value)
                    || (openRequestFilter === 'category' && categoryFilter === option.value);
                  return (
                    <Pressable
                      key={option.value}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => chooseRequestFilter(option.value)}
                      style={({ pressed }) => [styles.requestFilterOption, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                      <Text style={[styles.requestFilterOptionText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{option.label}</Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </SurfaceCard>

        <BentoGrid style={styles.metricGrid}>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Active requests"
              value={activeTickets.length}
              tone="blue"
              icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
            />
          </BentoPanel>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Completed"
              value={tickets.filter(ticket => ticket.status === 'resolved').length}
              tone="success"
              icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            />
          </BentoPanel>
          <BentoPanel size="compact" style={styles.metricPanel}>
            <MetricCard
              label="Total requests"
              value={tickets.length}
              tone="muted"
              icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            />
          </BentoPanel>
        </BentoGrid>

        <BentoGrid style={styles.currentTicketGrid}>
          <BentoPanel size="wide" style={styles.fullWidthPanel}>
            {currentTicket ? (
              <CurrentTicketCard ticket={currentTicket} metrics={metrics} />
            ) : (
              <EmptyState
                title="No current active ticket"
                message="A queue position will appear here when you submit a request."
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
              />
            )}
          </BentoPanel>
        </BentoGrid>

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : visibleTickets.length === 0 ? (
          <EmptyState
            title={query || categoryFilter !== 'all' ? 'No requests match these filters' : filter === 'active' ? 'No active requests' : 'No requests found'}
            message={query || categoryFilter !== 'all'
              ? 'Clear a filter or try a different search.'
              : filter === 'active'
              ? 'Submitted requests that are still being processed will appear here.'
              : 'Try another filter or create a new request.'}
            icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
          />
        ) : (
          <View style={styles.requestList}>
            {visibleTickets.map(ticket => (
              <RequestListCard
                key={ticket.id}
                ticket={ticket}
                onPress={() => router.push(`/ticket/${ticket.id}` as never)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

export default function TicketsScreen() {
  return (
    <RoleGuard allowed={['student']}>
      <TicketsScreenContent />
    </RoleGuard>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  scroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: 152,
    gap: Spacing.three,
  },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  pageHeader: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  newRequestButton: { minWidth: 146, alignSelf: 'flex-start' },
  formIntro: { fontSize: 14, lineHeight: 21, marginTop: -Spacing.two },
  infoBanner: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: Academic.softBlue,
  },
  infoBannerText: { color: Academic.primary, fontSize: 13, fontWeight: '500' },
  segmented: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    backgroundColor: Academic.muted,
  },
  metricGrid: { alignItems: 'stretch' },
  metricPanel: { minWidth: 0 },
  currentTicketGrid: { alignItems: 'stretch' },
  fullWidthPanel: { flexBasis: '100%' },
  requestList: { width: '100%', gap: Spacing.two },
  requestPressable: { width: '100%', borderRadius: 16 },
  segment: {
    flex: 1,
    minHeight: 36,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: Academic.card,
    boxShadow: '0 8px 24px rgba(50, 82, 87, 0.11)',
  },
  segmentText: { color: Academic.textSecondary, fontSize: 14, fontWeight: '500' },
  segmentTextActive: { color: Academic.navy },
  currentTicketCard: {
    minHeight: 164,
    borderRadius: 16,
    padding: Spacing.four,
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Academic.primary,
  },
  currentText: { flex: 1, gap: 8 },
  currentLabel: { color: '#FFFFFF', fontSize: 15, fontWeight: '500' },
  currentRefRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8 },
  currentRef: { color: '#FFFFFF', fontSize: 40, lineHeight: 44, fontWeight: '600' },
  currentCategoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  currentCategoryText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  currentStats: { flexDirection: 'row', gap: Spacing.four, marginTop: 2 },
  currentStatLabel: { color: '#FFFFFF', opacity: 0.92, fontSize: 12, fontWeight: '400' },
  currentStatValue: { color: '#FFFFFF', fontSize: 20, fontWeight: '600' },
  currentClock: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    borderWidth: 7,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  requestIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  requestIconDone: { backgroundColor: Academic.successBg },
  requestCardBody: { flex: 1, gap: 3 },
  requestMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  requestRef: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  requestTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  requestDate: { color: Academic.textSecondary, fontSize: 13 },
  filterCard: { gap: Spacing.two, padding: Spacing.three },
  searchFieldShell: {
    minHeight: 46,
    borderRadius: 13,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderWidth: 1,
    borderColor: Academic.border,
    backgroundColor: Academic.muted,
  },
  searchInput: { flex: 1, minWidth: 0, fontSize: 14, paddingVertical: 9 },
  requestFilterToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  requestFilterSelect: { minWidth: 146, flexGrow: 1, gap: 4 },
  requestFilterLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  requestFilterControl: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  requestFilterControlText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '500' },
  requestResetButton: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  requestResetDisabled: { opacity: 0.42 },
  requestResetText: { fontSize: 12, fontWeight: '500' },
  requestFilterMenu: { borderWidth: 1, borderRadius: 12, padding: Spacing.two, gap: 7 },
  requestFilterMenuLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  requestFilterOptions: { gap: 7 },
  requestFilterOption: { minHeight: 32, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  requestFilterOptionText: { fontSize: 11, fontWeight: '500' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  filterLabel: { fontSize: 12, fontWeight: '500', marginRight: 2 },
  filterChip: { minHeight: 32, paddingHorizontal: 11, borderRadius: 999, justifyContent: 'center' },
  filterChipText: { fontSize: 12, fontWeight: '500' },
  clearFilterButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 5 },
  clearFilterText: { fontSize: 12, fontWeight: '500' },
  loader: { marginTop: Spacing.four },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  choiceChipActive: { backgroundColor: Academic.primary, borderColor: Academic.primary },
  choiceChipText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  choiceChipTextActive: { color: '#FFFFFF' },
  textarea: {
    minHeight: 150,
    borderRadius: 16,
    padding: 14,
    fontSize: 15,
    lineHeight: 21,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  charCount: { color: Academic.textSecondary, fontSize: 12, textAlign: 'right' },
  cancelButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 14, fontWeight: '500' },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  errorBox: {
    borderRadius: 14,
    padding: 12,
    backgroundColor: Academic.errorBg,
  },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
});
