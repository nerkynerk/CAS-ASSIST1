import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
  AppBackdrop,
  EmptyState,
  MetricCard,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

interface Ticket {
  id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
  student_id: { id: string; display_name: string; email: string } | null;
}

interface UserRow {
  id: string;
  display_name: string;
  email: string;
  student_number: string | null;
  role: string;
  state: string;
  created_at: string;
}

interface AnnouncementRow {
  id: string;
  title: string;
  body: string;
  state: string;
  pinned: boolean;
  audience_roles: string[];
  publish_at: string | null;
  created_at: string;
}

interface DocRow {
  id: string;
  document_type: string;
  purpose: string;
  copies: number;
  status: string;
  remarks: string | null;
  requested_at: string;
  student_id: { display_name: string; email: string } | null;
}

interface AuditRow {
  id: number;
  ticket_id: string;
  actor_id: string | null;
  action: string;
  old_data: { status?: string } | null;
  new_data: { status?: string } | null;
  created_at: string;
}

type AdminTab = 'tickets' | 'announce' | 'documents' | 'users' | 'audit';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'muted' | 'error'> = {
  submitted: 'warning',
  under_evaluation: 'blue',
  action_required: 'error',
  resolved: 'success',
};

const NEXT_STATUS: Record<string, string | null> = {
  submitted: 'under_evaluation',
  under_evaluation: 'action_required',
  action_required: 'resolved',
  resolved: null,
};

const NEXT_LABEL: Record<string, string> = {
  submitted: 'Start Evaluation',
  under_evaluation: 'Request Action',
  action_required: 'Resolve',
};

const TICKET_STATUS_FILTERS = ['all', 'submitted', 'under_evaluation', 'action_required', 'resolved'] as const;

const AUDIENCE_OPTIONS = ['all', 'student', 'faculty', 'staff'] as const;
const USER_ROLE_OPTIONS = ['all', 'student', 'faculty', 'staff', 'super_admin'] as const;

const DOC_LABEL: Record<string, string> = {
  transcript_of_records: 'Transcript of Records',
  certificate_of_enrollment: 'Certificate of Enrollment',
  certificate_of_good_moral: 'Certificate of Good Moral',
  honorable_dismissal: 'Honorable Dismissal',
  diploma: 'Diploma',
  other: 'Other',
};

const DOC_STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  processing: 'Processing',
  ready_for_pickup: 'Ready for Pickup',
  completed: 'Completed',
  rejected: 'Rejected',
};

const DOC_STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {
  submitted: 'blue',
  under_evaluation: 'warning',
  action_required: 'error',
  processing: 'warning',
  ready_for_pickup: 'success',
  completed: 'success',
  rejected: 'error',
};

const DOC_NEXT: Record<string, string | null> = {
  submitted: 'under_evaluation',
  under_evaluation: 'processing',
  processing: 'ready_for_pickup',
  ready_for_pickup: 'completed',
  completed: null,
  rejected: null,
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function ManagementCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SurfaceCard style={styles.managementCard}>{children}</SurfaceCard>;
}

type QueueFilterOption = { value: string; label: string };

function QueueFilterSelect({
  label,
  value,
  options,
  expanded,
  onPress,
}: {
  label: string;
  value: string;
  options: QueueFilterOption[];
  expanded: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();
  const selected = options.find(option => option.value === value)?.label ?? value;

  return (
    <View style={styles.queueFilterSelect}>
      <Text style={[styles.queueFilterLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected}`}
        accessibilityState={{ expanded }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.queueFilterControl,
          { backgroundColor: colors.muted, borderColor: expanded ? colors.primary : colors.border },
          pressed && styles.pressed,
        ]}>
        <Text style={[styles.queueFilterControlText, { color: colors.text }]} numberOfLines={1}>{selected}</Text>
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

function AllTickets() {
  const router = useRouter();
  const colors = useTheme();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [sort, setSort] = useState<'updated' | 'newest' | 'oldest'>('updated');
  const [openFilter, setOpenFilter] = useState<'status' | 'priority' | 'category' | 'sort' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchTickets = useCallback(async () => {
    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .select('id, category, description, status, priority, created_at, updated_at, student_id(id, display_name, email)')
      .eq('state', 'active')
      .order('created_at', { ascending: false });

    setLoadError(error ? 'We could not load the ticket queue. Please refresh and try again.' : null);
    setTickets((data as unknown as Ticket[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchTickets(); setLoading(false); }, [fetchTickets]);
  async function onRefresh() { setRefreshing(true); await fetchTickets(); setRefreshing(false); }

  useEffect(() => { void load(); }, [load]);

  async function advance(ticket: Ticket) {
    const next = NEXT_STATUS[ticket.status];
    if (!next) return;
    setActionError(null);
    setUpdating(ticket.id);
    const updates: Record<string, unknown> = { status: next };
    if (next === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase.from('advising_ticket_pipeline').update(updates).eq('id', ticket.id);
    setUpdating(null);
    if (error) {
      setActionError('That status change was not accepted. Refresh and try again.');
      return;
    }
    await fetchTickets();
  }

  const categories = useMemo(() => (
    Array.from(new Set(tickets.map(ticket => ticket.category).filter(Boolean))).sort()
  ), [tickets]);
  const visibleTickets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return tickets
      .filter(ticket => {
        const student = ticket.student_id;
        const searchable = `${shortRef(ticket.id)} ${ticket.category} ${ticket.description} ${student?.display_name ?? ''} ${student?.email ?? ''}`.toLowerCase();
        return (filter === 'all' || ticket.status === filter)
          && (categoryFilter === 'all' || ticket.category === categoryFilter)
          && (priorityFilter === 'all' || ticket.priority === priorityFilter)
          && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sort === 'oldest') return new Date(left.created_at).getTime() - new Date(right.created_at).getTime();
        if (sort === 'newest') return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        return new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime();
      });
  }, [categoryFilter, filter, priorityFilter, query, sort, tickets]);

  function clearFilters() {
    setFilter('all');
    setQuery('');
    setCategoryFilter('all');
    setPriorityFilter('all');
    setSort('updated');
    setOpenFilter(null);
  }

  const statusOptions = useMemo(() => [
    { value: 'all', label: 'All statuses' },
    ...TICKET_STATUS_FILTERS.filter(item => item !== 'all').map(item => ({ value: item, label: STATUS_LABEL[item] ?? formatCategory(item) })),
  ], []);
  const priorityOptions = useMemo(() => [
    { value: 'all', label: 'Any priority' },
    ...['urgent', 'high', 'normal', 'low'].map(value => ({ value, label: formatCategory(value) })),
  ], []);
  const categoryOptions = useMemo(() => [
    { value: 'all', label: 'All categories' },
    ...categories.map(value => ({ value, label: formatCategory(value) })),
  ], [categories]);
  const sortOptions = useMemo(() => [
    { value: 'updated', label: 'Recently updated' },
    { value: 'newest', label: 'Newest first' },
    { value: 'oldest', label: 'Oldest first' },
  ], []);
  const activeFilterOptions = openFilter === 'status'
    ? statusOptions
    : openFilter === 'priority'
      ? priorityOptions
      : openFilter === 'category'
        ? categoryOptions
        : sortOptions;
  const activeFilterLabel = openFilter === 'status'
    ? 'Status'
    : openFilter === 'priority'
      ? 'Priority'
      : openFilter === 'category'
        ? 'Category'
        : 'Sort order';
  const hasFilters = Boolean(query || filter !== 'all' || categoryFilter !== 'all' || priorityFilter !== 'all' || sort !== 'updated');

  function chooseFilter(value: string) {
    if (openFilter === 'status') setFilter(value);
    if (openFilter === 'priority') setPriorityFilter(value);
    if (openFilter === 'category') setCategoryFilter(value);
    if (openFilter === 'sort') setSort(value as 'updated' | 'newest' | 'oldest');
    setOpenFilter(null);
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <BentoGrid style={styles.managementMetrics}>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Authorized tickets" value={tickets.length} tone="blue" icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }} />
        </BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Needs action" value={tickets.filter(ticket => ticket.status === 'action_required').length} tone="warning" icon={{ ios: 'exclamationmark.triangle', android: 'priority_high', web: 'priority_high' }} />
        </BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}>
          <MetricCard label="Resolved" value={tickets.filter(ticket => ticket.status === 'resolved').length} tone="success" icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }} />
        </BentoPanel>
      </BentoGrid>

      {loadError ? <View style={styles.errorBox}><Text style={styles.errorText}>{loadError}</Text></View> : null}
      {actionError ? <View style={styles.errorBox}><Text style={styles.errorText}>{actionError}</Text></View> : null}

      <SurfaceCard style={styles.workspaceFilterCard}>
        <View style={styles.searchFieldShell}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search reference, student, category, or description"
            placeholderTextColor={colors.textTertiary}
            accessibilityLabel="Search ticket queue"
            style={[styles.searchInput, { color: colors.text }]}
          />
        </View>
        <View style={styles.queueFilterToolbar}>
          <QueueFilterSelect label="Status" value={filter} options={statusOptions} expanded={openFilter === 'status'} onPress={() => setOpenFilter(value => value === 'status' ? null : 'status')} />
          <QueueFilterSelect label="Priority" value={priorityFilter} options={priorityOptions} expanded={openFilter === 'priority'} onPress={() => setOpenFilter(value => value === 'priority' ? null : 'priority')} />
          <QueueFilterSelect label="Category" value={categoryFilter} options={categoryOptions} expanded={openFilter === 'category'} onPress={() => setOpenFilter(value => value === 'category' ? null : 'category')} />
          <QueueFilterSelect label="Sort" value={sort} options={sortOptions} expanded={openFilter === 'sort'} onPress={() => setOpenFilter(value => value === 'sort' ? null : 'sort')} />
          <Pressable
            onPress={clearFilters}
            disabled={!hasFilters}
            accessibilityRole="button"
            accessibilityLabel="Reset ticket filters"
            style={({ pressed }) => [styles.queueResetButton, { borderColor: colors.border, backgroundColor: colors.backgroundElement }, !hasFilters && styles.queueResetButtonDisabled, pressed && styles.pressed]}>
            <AcademicIcon name={{ ios: 'arrow.counterclockwise', android: 'restart_alt', web: 'restart_alt' }} color={colors.primary} size={16} animated={false} />
            <Text style={[styles.queueResetText, { color: colors.primary }]}>Reset</Text>
          </Pressable>
        </View>
        {openFilter ? (
          <View style={[styles.queueFilterMenu, { backgroundColor: colors.backgroundElement, borderColor: colors.border }]}>
            <Text style={[styles.queueFilterMenuLabel, { color: colors.textSecondary }]}>Choose {activeFilterLabel.toLowerCase()}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.queueFilterOptions}>
              {activeFilterOptions.map(option => {
                const selected = (openFilter === 'status' && filter === option.value)
                  || (openFilter === 'priority' && priorityFilter === option.value)
                  || (openFilter === 'category' && categoryFilter === option.value)
                  || (openFilter === 'sort' && sort === option.value);
                return (
                  <Pressable
                    key={option.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    onPress={() => chooseFilter(option.value)}
                    style={({ pressed }) => [styles.queueFilterOption, { backgroundColor: selected ? colors.primary : colors.muted }, pressed && styles.pressed]}>
                    <Text style={[styles.queueFilterOptionText, { color: selected ? '#FFFFFF' : colors.textSecondary }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </SurfaceCard>
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{visibleTickets.length} matching ticket{visibleTickets.length === 1 ? '' : 's'}</Text>

      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleTickets.length === 0 ? (
        <EmptyState
          title="No tickets match these filters"
          message="Clear a filter or try a different search to see the authorized queue."
          icon={{ ios: 'tray', android: 'inbox', web: 'inbox' }}
        />
      ) : (
        visibleTickets.map(ticket => {
          const next = NEXT_STATUS[ticket.status];
          const student = ticket.student_id;
          return (
            <Pressable
              key={ticket.id}
              onPress={() => router.push(`/ticket/${ticket.id}` as never)}
              accessibilityRole="button"
              accessibilityLabel={`Open ticket ${shortRef(ticket.id)}`}
              style={({ pressed }) => [styles.ticketPressable, pressed && styles.pressed]}>
              <ManagementCard>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.refText, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
                  <Text style={[styles.itemTitle, { color: colors.navy }]}>{formatCategory(ticket.category)}</Text>
                  {student ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{student.display_name} - {student.email}</Text> : null}
                </View>
                <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={STATUS_TONE[ticket.status] ?? 'muted'} />
              </View>
              <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={2}>{ticket.description}</Text>
              <View style={styles.footerRow}>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Filed {formatDate(ticket.created_at)} · Updated {formatDate(ticket.updated_at)}</Text>
                {next ? (
                  <Pressable
                    style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                    onPress={event => {
                      event.stopPropagation();
                      void advance(ticket);
                    }}
                    disabled={updating === ticket.id}>
                    {updating === ticket.id ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.smallButtonText}>{NEXT_LABEL[ticket.status]}</Text>
                    )}
                  </Pressable>
                ) : null}
              </View>
              </ManagementCard>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function PostAnnouncement({ adminId }: { adminId: string }) {
  const colors = useTheme();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<string>('all');
  const [isPinned, setIsPinned] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [announcements, setAnnouncements] = useState<AnnouncementRow[]>([]);
  const [loadingAnnouncements, setLoadingAnnouncements] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [listAudience, setListAudience] = useState('all');

  const fetchAnnouncements = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('announcements')
      .select('id, title, body, state, pinned, audience_roles, publish_at, created_at')
      .order('created_at', { ascending: false });
    if (fetchError) {
      setError(fetchError.message);
      return;
    }
    setAnnouncements((data as AnnouncementRow[] | null) ?? []);
  }, []);

  useEffect(() => {
    void (async () => {
      setLoadingAnnouncements(true);
      await fetchAnnouncements();
      setLoadingAnnouncements(false);
    })();
  }, [fetchAnnouncements]);

  const visibleAnnouncements = useMemo(() => {
    const query = listSearch.trim().toLowerCase();
    return announcements.filter(item => {
      const matchesSearch = !query || `${item.title} ${item.body} ${item.audience_roles.join(' ')}`.toLowerCase().includes(query);
      const matchesAudience = listAudience === 'all' || item.audience_roles.includes(listAudience);
      return matchesSearch && matchesAudience;
    });
  }, [announcements, listAudience, listSearch]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAnnouncements();
    setRefreshing(false);
  }

  async function handlePost() {
    setError(null);
    if (!title.trim() || !body.trim()) {
      setError('Title and body are required.');
      return;
    }
    setSubmitting(true);
    const { error: dbErr } = await supabase.from('announcements').insert({
      created_by: adminId,
      title: title.trim(),
      body: body.trim(),
      audience_roles: audience === 'all'
        ? ['student', 'faculty', 'staff', 'super_admin']
        : [audience],
      pinned: isPinned,
      state: 'published',
      publish_at: new Date().toISOString(),
    });
    if (dbErr) {
      setError(dbErr.message);
    } else {
      setTitle('');
      setBody('');
      setAudience('all');
      setIsPinned(false);
      setSuccess(true);
      await fetchAnnouncements();
      setTimeout(() => setSuccess(false), 3000);
    }
    setSubmitting(false);
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      contentContainerStyle={styles.subScroll}>
      {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}
      {success ? <View style={[styles.successBox, { backgroundColor: colors.successBg }]}><Text style={[styles.successText, { color: colors.success }]}>Announcement posted successfully.</Text></View> : null}

      <SectionHeader title="Announcement Details" />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Announcement title"
        placeholderTextColor={colors.textSecondary}
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <TextInput
        style={[styles.textarea, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Write your announcement..."
        placeholderTextColor={colors.textSecondary}
        value={body}
        onChangeText={setBody}
        multiline
        numberOfLines={6}
        maxLength={1000}
        textAlignVertical="top"
      />
      <Text style={[styles.charCount, { color: colors.textSecondary }]}>{body.length}/1000</Text>

      <SectionHeader title="Audience" />
      <View style={styles.chipRow}>
        {AUDIENCE_OPTIONS.map(item => {
          const active = audience === item;
          return (
              <Pressable key={item} onPress={() => setAudience(item)} style={[styles.choiceChip, { backgroundColor: colors.card, borderColor: colors.border }, active && { backgroundColor: colors.primary, borderColor: colors.primary }]}>
              <Text style={[styles.choiceText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.choiceTextActive]}>
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable onPress={() => setIsPinned(value => !value)} style={[styles.pinToggle, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.pinLeft}>
          <AcademicIcon
            name={{ ios: 'pin', android: 'push_pin', web: 'push_pin' }}
            color={isPinned ? colors.warning : colors.textSecondary}
            size={18}
          />
          <Text style={[styles.pinText, { color: colors.navy }]}>Pin this announcement</Text>
        </View>
        <StatusBadge label={isPinned ? 'Pinned' : 'Standard'} tone={isPinned ? 'warning' : 'muted'} />
      </Pressable>

      <Pressable
        style={({ pressed }) => [styles.primaryButton, (pressed || submitting) && styles.pressed]}
        onPress={handlePost}
        disabled={submitting}>
        {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Post Announcement</Text>}
      </Pressable>

      <SectionHeader title={`Published Announcements (${visibleAnnouncements.length})`} />
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Search title, content, or audience"
        placeholderTextColor={colors.textSecondary}
        value={listSearch}
        onChangeText={setListSearch}
        accessibilityLabel="Search published announcements"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {['all', 'student', 'faculty', 'staff', 'super_admin'].map(item => {
          const active = listAudience === item;
          return (
            <Pressable
              key={item}
              onPress={() => setListAudience(item)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>
                {item === 'all' ? 'All audiences' : item === 'super_admin' ? 'Super admins' : `${item.charAt(0).toUpperCase()}${item.slice(1)}s`}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loadingAnnouncements ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleAnnouncements.length === 0 ? (
        <EmptyState
          title={announcements.length === 0 ? 'No announcements yet' : 'No matching announcements'}
          message={announcements.length === 0 ? 'Announcements created by CAS staff will appear here.' : 'Try another search term or audience filter.'}
          icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
        />
      ) : (
        visibleAnnouncements.map(item => {
          const expanded = expandedId === item.id;
          const publishedAt = item.publish_at ?? item.created_at;
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              onPress={() => setExpandedId(current => current === item.id ? null : item.id)}>
              <ManagementCard>
                <View style={styles.cardTop}>
                  <View style={styles.cardTitleGroup}>
                    <Text style={[styles.itemTitle, { color: colors.navy }]} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(publishedAt)}</Text>
                  </View>
                  <StatusBadge label={item.pinned ? 'Pinned' : item.state} tone={item.pinned ? 'warning' : 'success'} />
                </View>
                <Text style={[styles.itemBody, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 2}>{item.body}</Text>
                {expanded ? (
                  <View style={styles.announcementDetails}>
                    <Text style={[styles.detailLabel, { color: colors.navy }]}>Audience</Text>
                    <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{item.audience_roles.map(role => role.replace('_', ' ')).join(', ')}</Text>
                  </View>
                ) : null}
                <Text style={[styles.expandLink, { color: colors.primary }]}>{expanded ? 'Hide details' : 'Open announcement'}</Text>
              </ManagementCard>
            </Pressable>
          );
        })
      )}
    </ScrollView>
  );
}

function DocRequests() {
  const colors = useTheme();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const [remarks, setRemarks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('document_requests')
      .select('id, document_type, purpose, copies, status, remarks, requested_at, student_id(display_name, email)')
      .eq('state', 'active')
      .order('requested_at', { ascending: false });
    if (fetchError) {
      setError('Document requests could not be loaded. Pull down to retry.');
      return;
    }
    setError(null);
    setDocs((data as unknown as DocRow[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchDocs(); setLoading(false); }, [fetchDocs]);
  async function onRefresh() { setRefreshing(true); await fetchDocs(); setRefreshing(false); }
  useEffect(() => { void load(); }, [load]);

  const visibleDocs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return docs.filter(doc => {
      const student = doc.student_id;
      const matchesSearch = !query || `${DOC_LABEL[doc.document_type] ?? doc.document_type} ${doc.purpose} ${student?.display_name ?? ''} ${student?.email ?? ''}`.toLowerCase().includes(query);
      return matchesSearch && (statusFilter === 'all' || doc.status === statusFilter);
    });
  }, [docs, search, statusFilter]);

  async function advance(doc: DocRow) {
    const next = DOC_NEXT[doc.status];
    if (!next) return;
    setError(null);
    setNotice(null);
    setUpdating(doc.id);
    const { error: updateError } = await supabase
      .from('document_requests')
      .update({ status: next, remarks: remarks[doc.id] ?? doc.remarks ?? null })
      .eq('id', doc.id);
    setUpdating(null);
    if (updateError) {
      setError('The document request could not be updated. Please try again.');
    } else {
      setNotice(`Request moved to ${DOC_STATUS_LABEL[next]}.`);
      await fetchDocs();
    }
  }

  async function reject(doc: DocRow) {
    setError(null);
    setNotice(null);
    setUpdating(`${doc.id}-reject`);
    const { error: updateError } = await supabase
      .from('document_requests')
      .update({ status: 'rejected', remarks: remarks[doc.id] ?? null })
      .eq('id', doc.id);
    setUpdating(null);
    if (updateError) {
      setError('The document request could not be rejected. Please try again.');
    } else {
      setNotice('Request rejected and the student note was saved.');
      await fetchDocs();
    }
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}
      {notice ? <View style={[styles.successBox, { backgroundColor: colors.successBg }]}><Text style={[styles.successText, { color: colors.success }]}>{notice}</Text></View> : null}
      <TextInput
        style={[styles.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]}
        placeholder="Search student, document, or purpose"
        placeholderTextColor={colors.textSecondary}
        value={search}
        onChangeText={setSearch}
        accessibilityLabel="Search document requests"
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {['all', ...Object.keys(DOC_STATUS_LABEL)].map(status => {
          const active = statusFilter === status;
          return (
            <Pressable
              key={status}
              onPress={() => setStatusFilter(status)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>
                {status === 'all' ? 'All requests' : DOC_STATUS_LABEL[status]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleDocs.length === 0 ? (
        <EmptyState
          title={docs.length === 0 ? 'No document requests' : 'No matching requests'}
          message={docs.length === 0 ? 'Student document requests will appear here.' : 'Try another search term or status filter.'}
          icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
        />
      ) : (
        visibleDocs.map(doc => {
          const next = DOC_NEXT[doc.status];
          const isUpdating = updating === doc.id || updating === `${doc.id}-reject`;
          const student = doc.student_id;
          return (
            <ManagementCard key={doc.id}>
              <View style={styles.cardTop}>
                <View style={styles.cardTitleGroup}>
                  <Text style={[styles.itemTitle, { color: colors.navy }]}>{DOC_LABEL[doc.document_type] ?? formatCategory(doc.document_type)}</Text>
                  {student ? <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{student.display_name} - {student.email}</Text> : null}
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{doc.copies} {doc.copies === 1 ? 'copy' : 'copies'} - {doc.purpose}</Text>
                </View>
                <StatusBadge label={DOC_STATUS_LABEL[doc.status] ?? doc.status} tone={DOC_STATUS_TONE[doc.status] ?? 'muted'} />
              </View>

              {next ? (
                <TextInput
                  style={[styles.remarksInput, { color: colors.text, backgroundColor: colors.muted }]}
                  placeholder="Add a note to the student (optional)"
                  placeholderTextColor={colors.textSecondary}
                  value={remarks[doc.id] ?? ''}
                  onChangeText={value => setRemarks(current => ({ ...current, [doc.id]: value }))}
                />
              ) : doc.remarks ? (
                <Text style={[styles.itemBody, { color: colors.textSecondary }]}>Staff note: {doc.remarks}</Text>
              ) : null}

              <View style={styles.footerRow}>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(doc.requested_at)}</Text>
                {next ? (
                  <View style={styles.actionRow}>
                    <Pressable
                      style={({ pressed }) => [styles.smallButton, pressed && styles.pressed]}
                      onPress={() => advance(doc)}
                      disabled={isUpdating}>
                      <Text style={styles.smallButtonText}>{DOC_STATUS_LABEL[next]}</Text>
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.rejectButton, pressed && styles.pressed]}
                      onPress={() => reject(doc)}
                      disabled={isUpdating}>
                      <Text style={styles.rejectButtonText}>Reject</Text>
                    </Pressable>
                  </View>
                ) : null}
              </View>
            </ManagementCard>
          );
        })
      )}
    </ScrollView>
  );
}

function AuditLog() {
  const colors = useTheme();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const fetchAudit = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('ticket_audit_logs')
      .select('id, ticket_id, actor_id, action, old_data, new_data, created_at')
      .order('created_at', { ascending: false })
      .limit(100);
    setError(fetchError ? 'The protected audit history could not be loaded. Pull down to retry.' : null);
    setRows((data as unknown as AuditRow[]) ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchAudit(); setLoading(false); }, [fetchAudit]);
  async function onRefresh() { setRefreshing(true); await fetchAudit(); setRefreshing(false); }
  useEffect(() => { void load(); }, [load]);

  const actions = useMemo(() => Array.from(new Set(rows.map(row => row.action))).sort(), [rows]);
  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return rows.filter(row => {
      const statusChange = `${row.old_data?.status ?? ''} ${row.new_data?.status ?? ''}`;
      return (actionFilter === 'all' || row.action === actionFilter)
        && (!normalizedQuery || `${shortRef(row.ticket_id)} ${row.action} ${row.actor_id ?? ''} ${statusChange}`.toLowerCase().includes(normalizedQuery));
    });
  }, [actionFilter, query, rows]);

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <SurfaceCard style={styles.auditIntro}>
        <View style={[styles.auditIntroIcon, { backgroundColor: colors.softBlue }]}>
          <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.primary} size={21} />
        </View>
        <View style={styles.auditIntroCopy}>
          <Text style={[styles.itemTitle, { color: colors.navy }]}>Protected ticket history</Text>
          <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Read-only events emitted by the existing advising-ticket audit trigger. Only super administrators can access this view.</Text>
        </View>
      </SurfaceCard>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <View style={styles.workspaceFilterCard}>
        <View style={[styles.searchFieldShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search ticket reference, action, or actor"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search protected audit history"
          />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {['all', ...actions].map(action => {
            const active = actionFilter === action;
            return (
              <Pressable key={action} onPress={() => setActionFilter(action)} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{action === 'all' ? 'All events' : formatCategory(action)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
      <Text style={[styles.resultCount, { color: colors.textSecondary }]}>{visibleRows.length} audit event{visibleRows.length === 1 ? '' : 's'} shown</Text>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleRows.length === 0 ? (
        <EmptyState title="No audit events match" message="Ticket status and lifecycle events will appear here when recorded." icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} />
      ) : visibleRows.map(row => {
        const oldStatus = row.old_data?.status;
        const newStatus = row.new_data?.status;
        return (
          <ManagementCard key={row.id}>
            <View style={styles.auditEvent}>
              <View style={styles.auditEventMain}>
                <Text style={[styles.refText, { color: colors.primary }]}>{shortRef(row.ticket_id)}</Text>
                <Text style={[styles.itemTitle, { color: colors.navy }]}>{formatCategory(row.action)}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>{formatDate(row.created_at)} · {row.actor_id ? `Actor ${shortRef(row.actor_id, 'A')}` : 'System actor'}</Text>
              </View>
              <StatusBadge label={newStatus ? `${oldStatus ?? 'new'} → ${newStatus}` : 'Recorded'} tone={newStatus === 'resolved' ? 'success' : 'blue'} />
            </View>
          </ManagementCard>
        );
      })}
    </ScrollView>
  );
}

function UserList() {
  const colors = useTheme();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [roleFilter, setRoleFilter] = useState<(typeof USER_ROLE_OPTIONS)[number]>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'archived_read_only'>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'newest' | 'oldest' | 'name'>('newest');
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    const { data, error: fetchError } = await supabase
      .from('users_account_registry')
      .select('id, display_name, email, student_number, role, state, created_at')
      .order('created_at', { ascending: false });
    setError(fetchError ? 'The account directory could not be loaded. Pull down to retry.' : null);
    setUsers(data ?? []);
  }, []);

  const load = useCallback(async () => { setLoading(true); await fetchUsers(); setLoading(false); }, [fetchUsers]);
  async function onRefresh() { setRefreshing(true); await fetchUsers(); setRefreshing(false); }

  useEffect(() => { void load(); }, [load]);

  const visibleUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return users
      .filter(user => {
        const searchable = `${user.display_name} ${user.email} ${user.student_number ?? ''}`.toLowerCase();
        return (roleFilter === 'all' || user.role === roleFilter)
          && (statusFilter === 'all' || (statusFilter === 'active' ? user.state === 'active' : user.state === 'archived_read_only'))
          && (!normalizedQuery || searchable.includes(normalizedQuery));
      })
      .sort((left, right) => {
        if (sort === 'name') return left.display_name.localeCompare(right.display_name);
        const direction = sort === 'newest' ? -1 : 1;
        return direction * (new Date(left.created_at).getTime() - new Date(right.created_at).getTime());
      });
  }, [query, roleFilter, sort, statusFilter, users]);

  function clearFilters() {
    setQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setSort('newest');
  }

  return (
    <ScrollView
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.subScroll}>
      <BentoGrid style={styles.managementMetrics}>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="All accounts" value={users.length} tone="blue" icon={{ ios: 'person.2', android: 'groups', web: 'groups' }} /></BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="Active" value={users.filter(user => user.state === 'active').length} tone="success" icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} /></BentoPanel>
        <BentoPanel size="compact" style={styles.managementMetricPanel}><MetricCard label="Read-only" value={users.filter(user => user.state === 'archived_read_only').length} tone="warning" icon={{ ios: 'lock', android: 'lock', web: 'lock' }} /></BentoPanel>
      </BentoGrid>
      {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}
      <SectionHeader title={`${visibleUsers.length} matching account${visibleUsers.length === 1 ? '' : 's'}`} />
      <View style={styles.workspaceFilterCard}>
        <View style={[styles.searchFieldShell, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search name, email, or student number"
            placeholderTextColor={colors.textTertiary}
            style={[styles.searchInput, { color: colors.text }]}
            accessibilityLabel="Search account directory"
          />
        </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
        {USER_ROLE_OPTIONS.map(role => {
          const active = roleFilter === role;
          const label = role === 'all' ? 'All users' : role === 'super_admin' ? 'Super admins' : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`;
          return (
            <Pressable
              key={role}
              onPress={() => setRoleFilter(role)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {(['all', 'active', 'archived_read_only'] as const).map(status => {
            const active = statusFilter === status;
            return (
              <Pressable key={status} onPress={() => setStatusFilter(status)} style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }]}>{status === 'all' ? 'All states' : status === 'active' ? 'Active' : 'Read-only'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.workspaceFilterFooter}>
          <View style={styles.workspaceFilterRow}>
            <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort</Text>
            {(['newest', 'oldest', 'name'] as const).map(value => {
              const active = sort === value;
              return (
                <Pressable key={value} onPress={() => setSort(value)} style={[styles.sortButton, { borderColor: active ? colors.primary : colors.border, backgroundColor: active ? colors.softBlue : 'transparent' }]}>
                  <Text style={[styles.sortText, { color: active ? colors.primary : colors.textSecondary }]}>{value === 'name' ? 'Name' : value === 'newest' ? 'Newest' : 'Oldest'}</Text>
                </Pressable>
              );
            })}
          </View>
          {(query || roleFilter !== 'all' || statusFilter !== 'all' || sort !== 'newest') ? <Pressable onPress={clearFilters} style={styles.clearButton}><Text style={[styles.clearButtonText, { color: colors.primary }]}>Clear filters</Text></Pressable> : null}
        </View>
      </View>
      {loading ? (
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      ) : visibleUsers.length === 0 ? (
        <EmptyState
          title="No matching users"
          message="No authorized accounts match the current search and filters."
          icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
        />
      ) : (
        visibleUsers.map(user => (
          <ManagementCard key={user.id}>
            <View style={styles.userRow}>
              <View style={styles.userAvatar}>
                <Text style={styles.userInitial}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.itemTitle, { color: colors.navy }]} numberOfLines={1}>{user.display_name}</Text>
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]} numberOfLines={1}>{user.email}</Text>
                {user.role === 'student' && user.student_number ? (
                  <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Student No. {user.student_number}</Text>
                ) : null}
                <Text style={[styles.itemMeta, { color: colors.textSecondary }]}>Joined {formatDate(user.created_at)}</Text>
              </View>
              <View style={styles.userBadges}>
                <StatusBadge label={user.role.replace('_', ' ')} tone={user.role === 'super_admin' ? 'error' : user.role === 'staff' ? 'success' : 'blue'} />
                {user.state === 'archived_read_only' ? <StatusBadge label="Archived" tone="warning" /> : null}
              </View>
            </View>
          </ManagementCard>
        ))
      )}
    </ScrollView>
  );
}

export default function AdminScreen() {
  const { profile } = useAuth();
  const colors = useTheme();
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const [activeTab, setActiveTab] = useState<AdminTab>('tickets');
  const isAdmin = profile?.role === 'staff' || profile?.role === 'super_admin';

  useEffect(() => {
    const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
    if (requestedTab === 'tickets' || requestedTab === 'announce' || requestedTab === 'documents' || requestedTab === 'users' || (requestedTab === 'audit' && profile?.role === 'super_admin')) {
      setActiveTab(requestedTab);
    }
  }, [params.tab, profile?.role]);

  if (!isAdmin) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.accessDenied}>
          <AcademicIcon
            name={{ ios: 'lock', android: 'lock', web: 'lock' }}
            color={colors.error}
            size={42}
          />
          <Text style={[styles.accessTitle, { color: colors.navy }]}>Access Restricted</Text>
          <Text style={[styles.accessBody, { color: colors.textSecondary }]}>This section is only available to CAS staff and administrators.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'tickets', label: 'Queue' },
    { id: 'announce', label: 'Announcements' },
    { id: 'documents', label: 'Docs' },
    { id: 'users', label: 'Users' },
    ...(profile?.role === 'super_admin' ? [{ id: 'audit' as const, label: 'Audit' }] : []),
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <View style={styles.header}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.navy }]}>
            {profile?.role === 'super_admin' ? 'Management' : 'Operations'}
          </Text>
          <Text style={[styles.screenSub, { color: colors.textSecondary }]}>CAS service tools and request processing</Text>
        </View>
        <StatusBadge label={profile?.role === 'super_admin' ? 'Super Admin' : 'Staff'} tone={profile?.role === 'super_admin' ? 'error' : 'success'} />
      </View>

      <View style={styles.innerTabBar}>
        {tabs.map(tab => {
          const active = activeTab === tab.id;
          return (
            <Pressable key={tab.id} onPress={() => setActiveTab(tab.id)} style={[styles.innerTab, { backgroundColor: active ? colors.card : 'transparent' }, active && styles.innerTabActive]}>
              <Text style={[styles.innerTabText, { color: active ? colors.navy : colors.textSecondary }, active && styles.innerTabTextActive]}>{tab.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {activeTab === 'tickets' ? <AllTickets /> : null}
      {activeTab === 'announce' ? <PostAnnouncement adminId={profile!.id} /> : null}
      {activeTab === 'documents' ? <DocRequests /> : null}
      {activeTab === 'users' ? <UserList /> : null}
      {activeTab === 'audit' && profile?.role === 'super_admin' ? <AuditLog /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  header: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    paddingBottom: Spacing.two,
  },
  screenTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  screenSub: { color: Academic.textSecondary, fontSize: 13, marginTop: 3 },
  innerTabBar: {
    width: '100%',
    maxWidth: MaxContentWidth - 32,
    alignSelf: 'center',
    flexDirection: 'row',
    marginHorizontal: Spacing.three,
    marginVertical: Spacing.two,
    padding: 4,
    gap: 4,
    borderRadius: 14,
    backgroundColor: Academic.muted,
  },
  innerTab: {
    flex: 1,
    minHeight: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  innerTabActive: {
    backgroundColor: Academic.card,
    boxShadow: '0 8px 24px rgba(50, 82, 87, 0.10)',
  },
  innerTabText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  innerTabTextActive: { color: Academic.navy },
  subScroll: {
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: 128,
    gap: Spacing.three,
  },
  managementMetrics: { alignItems: 'stretch' },
  managementMetricPanel: { minWidth: 0 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  loader: { marginTop: Spacing.four },
  filterRail: { gap: Spacing.two, paddingRight: Spacing.three },
  workspaceFilterCard: { gap: Spacing.two, padding: Spacing.three },
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
  queueFilterToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: Spacing.two },
  queueFilterSelect: { minWidth: 132, flexGrow: 1, gap: 4 },
  queueFilterLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  queueFilterControl: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  queueFilterControlText: { flex: 1, minWidth: 0, fontSize: 12, fontWeight: '500' },
  queueResetButton: { minHeight: 38, borderRadius: 10, borderWidth: 1, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  queueResetButtonDisabled: { opacity: 0.42 },
  queueResetText: { fontSize: 12, fontWeight: '500' },
  queueFilterMenu: { borderWidth: 1, borderRadius: 12, padding: Spacing.two, gap: 7 },
  queueFilterMenuLabel: { fontSize: 11, fontWeight: '500', paddingHorizontal: 2 },
  queueFilterOptions: { gap: 7 },
  queueFilterOption: { minHeight: 32, paddingHorizontal: 10, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  queueFilterOptionText: { fontSize: 11, fontWeight: '500' },
  workspaceFilterRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  workspaceFilterFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two, flexWrap: 'wrap' },
  filterLabel: { fontSize: 12, fontWeight: '500', marginRight: 2 },
  sortButton: { minHeight: 31, paddingHorizontal: 10, borderRadius: 9, borderWidth: 1, justifyContent: 'center' },
  sortText: { fontSize: 11, fontWeight: '500' },
  clearButton: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 4 },
  clearButtonText: { fontSize: 12, fontWeight: '500' },
  resultCount: { fontSize: 12, fontWeight: '400' },
  ticketPressable: { width: '100%', borderRadius: 16 },
  auditIntro: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.two },
  auditIntroIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  auditIntroCopy: { flex: 1, gap: 4 },
  auditEvent: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  auditEventMain: { flex: 1, minWidth: 220, gap: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.muted,
  },
  filterChipActive: { backgroundColor: Academic.primary },
  filterText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  managementCard: { gap: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  cardTitleGroup: { flex: 1, gap: 3 },
  refText: { color: Academic.primary, fontSize: 13, fontWeight: '600' },
  itemTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  itemMeta: { color: Academic.textSecondary, fontSize: 12, lineHeight: 17 },
  itemBody: { color: Academic.textSecondary, fontSize: 13, lineHeight: 19 },
  announcementDetails: { gap: 3, paddingTop: 2 },
  detailLabel: { color: Academic.navy, fontSize: 12, fontWeight: '500' },
  expandLink: { color: Academic.primary, fontSize: 12, fontWeight: '500', textAlign: 'right' },
  footerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  smallButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  smallButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  rejectButton: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.errorBg,
  },
  rejectButtonText: { color: Academic.error, fontSize: 12, fontWeight: '500' },
  input: {
    height: 50,
    borderRadius: 14,
    paddingHorizontal: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  textarea: {
    minHeight: 140,
    borderRadius: 14,
    padding: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  remarksInput: {
    minHeight: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontSize: 13,
  },
  charCount: { color: Academic.textSecondary, fontSize: 12, textAlign: 'right' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  choiceChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  choiceChipActive: { backgroundColor: Academic.primary, borderColor: Academic.primary },
  choiceText: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
  choiceTextActive: { color: '#FFFFFF' },
  pinToggle: {
    minHeight: 52,
    borderRadius: 16,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  pinLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  pinText: { color: Academic.navy, fontSize: 14, fontWeight: '500' },
  primaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  userRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  userAvatar: {
    width: 42,
    height: 42,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  userInitial: { color: Academic.primary, fontSize: 18, fontWeight: '600' },
  userInfo: { flex: 1, gap: 2 },
  userBadges: { alignItems: 'flex-end', gap: 4 },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
  accessDenied: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.five,
    gap: Spacing.three,
  },
  accessTitle: { color: Academic.navy, fontSize: 22, fontWeight: '600' },
  accessBody: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
