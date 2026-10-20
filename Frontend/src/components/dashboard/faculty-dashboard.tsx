import { useRouter } from 'expo-router';
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
  IconButton,
  MetricCard,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { DashboardActionCard, dashboardActionGridStyles } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const DAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;

interface Schedule {
  id: string;
  day: string;
  subject_code: string;
  subject_name: string;
  section: string;
  room: string;
  time_start: string;
  time_end: string;
}

interface FacultyAssignment {
  id: string;
  subject_code: string;
  subject_title: string;
  section_code: string;
  room: string | null;
}

interface Announcement {
  id: string;
  title: string;
  body: string;
  publish_at: string;
}

interface AckedRoomChange {
  id: string;
  original_room: string;
  new_room: string;
  subject_code: string | null;
  section_code: string | null;
  effective_at: string;
  ack_count: number;
}

type FacultyView = 'main' | 'room-change';
type ScheduleView = 'today' | 'week';

function formatTime(t: string) {
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
}

export default function FacultyDashboard() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();

  const [view, setView] = useState<FacultyView>('main');
  const [scheduleView, setScheduleView] = useState<ScheduleView>('today');
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [assignments, setAssignments] = useState<FacultyAssignment[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [myRoomChanges, setMyRoomChanges] = useState<AckedRoomChange[]>([]);
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [origRoom, setOrigRoom] = useState('');
  const [newRoom, setNewRoom] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [posting, setPosting] = useState(false);
  const [rcError, setRcError] = useState<string | null>(null);
  const [rcSuccess, setRcSuccess] = useState(false);

  const today = DAYS[new Date().getDay()];
  const profileId = profile?.id;

  const fetchData = useCallback(async () => {
    const userId = profileId;
    const [schRes, assignmentRes, annRes] = await Promise.all([
      userId
        ? supabase
            .from('schedules')
            .select('id, day, subject_code, subject_name, section, room, time_start, time_end')
            .eq('faculty_id', userId)
            .eq('state', 'active')
            .order('time_start', { ascending: true })
        : Promise.resolve({ data: [] }),
      userId
        ? supabase
            .from('faculty_assignments')
            .select('id, subject_code, subject_title, section_code, room')
            .eq('faculty_id', userId)
            .eq('is_active', true)
            .order('subject_code', { ascending: true })
        : Promise.resolve({ data: [] }),
      supabase
        .from('announcements')
        .select('id, title, body, publish_at')
        .eq('state', 'published')
        .order('publish_at', { ascending: false })
        .limit(3),
    ]);
    setSchedules(schRes.data ?? []);
    setAssignments((assignmentRes.data as FacultyAssignment[] | null) ?? []);
    setAnnouncements(annRes.data ?? []);
  }, [profileId]);

  const fetchMyRoomChanges = useCallback(async () => {
    if (!profileId) return;
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: logs } = await supabase
      .from('spatial_logs')
      .select('id, original_room, new_room, subject_code, section_code, effective_at')
      .eq('faculty_id', profileId)
      .gte('effective_at', since)
      .order('effective_at', { ascending: false })
      .limit(5);

    if (!logs || logs.length === 0) { setMyRoomChanges([]); return; }

    const ids = logs.map((l: { id: string }) => l.id);
    const { data: acks } = await supabase
      .from('spatial_log_acknowledgments')
      .select('spatial_log_id')
      .in('spatial_log_id', ids);

    const countMap: Record<string, number> = {};
    for (const ack of (acks ?? [])) {
      countMap[ack.spatial_log_id] = (countMap[ack.spatial_log_id] ?? 0) + 1;
    }

    setMyRoomChanges(logs.map((l: Omit<AckedRoomChange, 'ack_count'>) => ({ ...l, ack_count: countMap[l.id] ?? 0 })));
  }, [profileId]);

  const load = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchData(), fetchMyRoomChanges()]);
    setLoading(false);
  }, [fetchData, fetchMyRoomChanges]);

  async function onRefresh() {
    setRefreshing(true);
    await Promise.all([fetchData(), fetchMyRoomChanges()]);
    setRefreshing(false);
  }

  useEffect(() => {
    void load();

    const channel = supabase
      .channel('faculty-acks-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spatial_log_acknowledgments' },
        (payload) => {
          const spatialLogId = (payload.new as { spatial_log_id: string }).spatial_log_id;
          setMyRoomChanges(prev =>
            prev.map(rc => rc.id === spatialLogId ? { ...rc, ack_count: rc.ack_count + 1 } : rc)
          );
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [load]);

  async function handleRoomChange() {
    setRcError(null);
    const assignment = assignments.find(item => item.id === selectedAssignmentId);
    if (!assignment) {
      setRcError('Select one of your active class assignments.');
      return;
    }
    if (!origRoom.trim() || !newRoom.trim()) {
      setRcError('Original room and new room are required.');
      return;
    }
    setPosting(true);

    const { data: insertedLog, error } = await supabase
      .from('spatial_logs')
      .insert({
        faculty_id: profile!.id,
        assignment_id: assignment.id,
        original_room: origRoom.trim(),
        new_room: newRoom.trim(),
        subject_code: assignment.subject_code,
        section_code: assignment.section_code,
        reason: reason.trim() || null,
      })
      .select('id, original_room, new_room, subject_code, section_code, effective_at')
      .single();
    setPosting(false);
    if (error) {
      setRcError(error.message);
    } else {
      if (insertedLog) setMyRoomChanges(prev => [{ ...insertedLog, ack_count: 0 }, ...prev]);
      setSelectedAssignmentId(null); setOrigRoom(''); setNewRoom(''); setReason('');
      setRcSuccess(true);
      setTimeout(() => { setRcSuccess(false); setView('main'); }, 1600);
    }
  }

  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';
  const todayLabel = today.charAt(0).toUpperCase() + today.slice(1);
  const todaySchedules = useMemo(() => schedules.filter(schedule => schedule.day === today), [schedules, today]);
  const visibleSchedules = scheduleView === 'today' ? todaySchedules : schedules;

  function selectAssignment(assignment: FacultyAssignment) {
    setSelectedAssignmentId(assignment.id);
    setOrigRoom(assignment.room ?? '');
    setRcError(null);
  }

  if (view === 'room-change') {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <AppBackdrop />
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.scroll}>
          <View style={styles.formHeader}>
            <IconButton
              icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
              onPress={() => setView('main')}
              label="Back"
              bg={theme.muted}
              color={theme.textSecondary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: theme.navy }]}>Log Room Change</Text>
              <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>Notify students of a classroom relocation.</Text>
            </View>
          </View>

          {rcError ? <View style={[styles.errorBox, { backgroundColor: theme.errorBg }]}><Text style={[styles.errorText, { color: theme.error }]}>{rcError}</Text></View> : null}
          {rcSuccess ? <View style={[styles.successBox, { backgroundColor: theme.successBg }]}><Text style={[styles.successText, { color: theme.success }]}>Room change logged and students notified.</Text></View> : null}

          <SectionHeader title="Class Assignment" />
          {assignments.length === 0 ? (
            <EmptyState
              title="No active class assignments"
              message="A staff administrator must assign a subject and section before you can log a room change."
              icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
            />
          ) : (
            <View style={styles.assignmentList}>
              {assignments.map(assignment => {
                const selected = assignment.id === selectedAssignmentId;
                return (
                  <Pressable
                    key={assignment.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    onPress={() => selectAssignment(assignment)}
                    style={[
                      styles.assignmentOption,
                      {
                        backgroundColor: selected ? theme.softBlue : theme.card,
                        borderColor: selected ? theme.primary : theme.border,
                      },
                    ]}>
                    <View style={styles.assignmentCopy}>
                      <Text style={[styles.assignmentTitle, { color: theme.navy }]}>{assignment.subject_code} - {assignment.subject_title}</Text>
                      <Text style={[styles.assignmentMeta, { color: theme.textSecondary }]}>Section {assignment.section_code} · {assignment.room || 'Room not set'}</Text>
                    </View>
                    <StatusBadge label={selected ? 'Selected' : 'Select'} tone={selected ? 'success' : 'muted'} />
                  </Pressable>
                );
              })}
            </View>
          )}

          {[
            { label: 'Original Room *', value: origRoom, set: setOrigRoom, placeholder: 'e.g. CAS 402' },
            { label: 'New Room *', value: newRoom, set: setNewRoom, placeholder: 'e.g. Main Lib 2' },
          ].map(field => (
            <View key={field.label} style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{field.label}</Text>
              <TextInput
                placeholder={field.placeholder}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.navy, backgroundColor: theme.card, borderColor: theme.border }]}
                value={field.value}
                onChangeText={field.set}
              />
            </View>
          ))}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Reason (optional)</Text>
            <TextInput
              style={[styles.textarea, { color: theme.navy, backgroundColor: theme.card, borderColor: theme.border }]}
              placeholder="e.g. Room maintenance"
              placeholderTextColor={theme.textSecondary}
              value={reason}
              onChangeText={setReason}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.formActions}>
            <Pressable
              style={({ pressed }) => [styles.cancelButton, { backgroundColor: theme.muted }, pressed && styles.pressed]}
              onPress={() => { setRcError(null); setView('main'); }}
              disabled={posting}>
              <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary }, (pressed || posting) && styles.pressed]}
              onPress={handleRoomChange}
              disabled={posting || assignments.length === 0}>
              {posting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Publish notice</Text>}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Faculty"
          title={`Hello, ${firstName}`}
          subtitle="Manage academic concerns and class updates."
        />

        <View style={styles.metricsRow}>
          <MetricCard
            label="Classes today"
            value={todaySchedules.length}
            icon={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
            tone="blue"
          />
          <MetricCard
            label="Room updates"
            value={myRoomChanges.length}
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            tone="warning"
          />
          <MetricCard
            label="Active assignments"
            value={assignments.length}
            icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
            tone="success"
          />
        </View>

        <SectionHeader title="Faculty Actions" />
        <View style={dashboardActionGridStyles.grid}>
          <DashboardActionCard
            label="Log Room Change"
            caption="Notify students using an active assignment."
            size="wide"
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            onPress={() => {
              if (assignments.length === 1) selectAssignment(assignments[0]);
              setView('room-change');
            }}
          />
          <DashboardActionCard
            label="Department Updates"
            caption="Review published CAS announcements."
            icon={{ ios: 'bell', android: 'notifications', web: 'notifications' }}
            onPress={() => router.navigate('/explore')}
          />
        </View>

        <View style={styles.scheduleToolbar}>
          <SectionHeader title={scheduleView === 'today' ? "Today's Classes" : 'Weekly Schedule'} action={scheduleView === 'today' ? todayLabel : `${schedules.length} meetings`} onAction={() => {}} />
          <View style={styles.scheduleFilters}>
            {(['today', 'week'] as const).map(option => {
              const active = scheduleView === option;
              return (
                <Pressable key={option} onPress={() => setScheduleView(option)} style={[styles.scheduleFilter, { backgroundColor: active ? theme.primary : theme.muted }]}>
                  <Text style={[styles.scheduleFilterText, { color: active ? '#FFFFFF' : theme.textSecondary }]}>{option === 'today' ? 'Today' : 'Full week'}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : visibleSchedules.length === 0 ? (
          <EmptyState
            title={scheduleView === 'today' ? 'No classes scheduled today' : 'No weekly schedule published'}
            message={scheduleView === 'today' ? 'There are no active class schedules assigned for today.' : 'There are no active class schedules assigned to your account.'}
            icon={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
          />
        ) : (
          visibleSchedules.map(schedule => (
            <SurfaceCard key={schedule.id} accent="blue" style={styles.scheduleCard}>
              <View style={styles.scheduleTop}>
                <View style={styles.scheduleIcon}>
                  <AcademicIcon
                    name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
                    color={theme.primary}
                    size={21}
                  />
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={[styles.scheduleTitle, { color: theme.navy }]} numberOfLines={1}>
                    {schedule.subject_code} - {schedule.subject_name}
                  </Text>
                  <Text style={[styles.scheduleMeta, { color: theme.textSecondary }]}>
                    {scheduleView === 'week' ? `${schedule.day.charAt(0).toUpperCase()}${schedule.day.slice(1)} · ` : ''}Section {schedule.section} - {schedule.room}
                  </Text>
                </View>
              </View>
              <Text style={[styles.scheduleTime, { color: theme.primary }]}>
                {formatTime(schedule.time_start)} - {formatTime(schedule.time_end)}
              </Text>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="Assigned Classes" action="Log a room change" onAction={() => setView('room-change')} />
        {assignments.length === 0 ? (
          <EmptyState
            title="No active assignments"
            message="Your teaching load is assigned by a CAS administrator."
            icon={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
          />
        ) : (
          assignments.map(assignment => (
            <SurfaceCard key={assignment.id} style={styles.assignmentCard} accent="success">
              <View style={styles.assignmentCardIcon}>
                <AcademicIcon
                  name={{ ios: 'book.closed', android: 'menu_book', web: 'menu_book' }}
                  color={theme.success}
                  size={19}
                  animated={false}
                />
              </View>
              <View style={styles.assignmentCardCopy}>
                <Text style={[styles.assignmentCardTitle, { color: theme.navy }]} numberOfLines={1}>
                  {assignment.subject_code} - {assignment.subject_title}
                </Text>
                <Text style={[styles.assignmentCardMeta, { color: theme.textSecondary }]}>
                  Section {assignment.section_code} - {assignment.room || 'Room not set'}
                </Text>
              </View>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="My Room Changes" />
        {myRoomChanges.length === 0 ? (
          <EmptyState
            title="No active room changes"
            message="Room changes you post in the last 24 hours will show acknowledgment counts here."
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        ) : (
          myRoomChanges.map(change => (
            <SurfaceCard key={change.id} style={styles.roomCard} accent="warning">
              <View style={styles.roomCardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.roomTitle, { color: theme.navy }]} numberOfLines={1}>
                    {`${change.original_room} -> ${change.new_room}`}
                  </Text>
                  <Text style={[styles.roomSub, { color: theme.textSecondary }]}>
                    {[change.subject_code, change.section_code].filter(Boolean).join(' - ') || 'Room relocation'}
                  </Text>
                </View>
                <StatusBadge label={`${change.ack_count} acknowledged`} tone={change.ack_count > 0 ? 'success' : 'muted'} />
              </View>
              <Text style={[styles.roomTime, { color: theme.textSecondary }]}>{formatDate(change.effective_at)}</Text>
            </SurfaceCard>
          ))
        )}

        <SectionHeader title="Recent Announcements" action="See all" onAction={() => router.navigate('/explore')} />
        {announcements.length === 0 ? (
          <EmptyState
            title="No announcements"
            message="Active CAS announcements will appear here."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
          />
        ) : (
          announcements.map(item => {
            const expanded = expandedAnnouncementId === item.id;
            return (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityState={{ expanded }}
                onPress={() => setExpandedAnnouncementId(current => current === item.id ? null : item.id)}>
                <SurfaceCard style={styles.announcementCard}>
                  <Text style={[styles.announcementTitle, { color: theme.navy }]} numberOfLines={expanded ? undefined : 1}>{item.title}</Text>
                  <Text style={[styles.announcementBody, { color: theme.textSecondary }]} numberOfLines={expanded ? undefined : 2}>{item.body}</Text>
                  <View style={styles.announcementFooter}>
                    <Text style={[styles.announcementDate, { color: theme.textSecondary }]}>{formatDate(item.publish_at)}</Text>
                    <Text style={[styles.expandText, { color: theme.primary }]}>{expanded ? 'Show less' : 'Read full announcement'}</Text>
                  </View>
                </SurfaceCard>
              </Pressable>
            );
          })
        )}
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
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  assignmentList: { gap: Spacing.two },
  assignmentOption: {
    minHeight: 68,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  assignmentOptionSelected: { borderColor: Academic.primary, backgroundColor: Academic.softBlue },
  assignmentCopy: { flex: 1, gap: 3 },
  assignmentTitle: { color: Academic.navy, fontSize: 14, fontWeight: '600' },
  assignmentMeta: { color: Academic.textSecondary, fontSize: 12 },
  assignmentCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  assignmentCardIcon: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: Academic.successBg },
  assignmentCardCopy: { flex: 1, gap: 3 },
  assignmentCardTitle: { color: Academic.navy, fontSize: 14, fontWeight: '600' },
  assignmentCardMeta: { color: Academic.textSecondary, fontSize: 12 },
  loader: { marginTop: Spacing.four },
  scheduleToolbar: { gap: Spacing.two },
  scheduleFilters: { flexDirection: 'row', gap: Spacing.two },
  scheduleFilter: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 999 },
  scheduleFilterText: { fontSize: 12, fontWeight: '500' },
  scheduleCard: { gap: 10 },
  scheduleTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  scheduleIcon: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  scheduleInfo: { flex: 1, gap: 2 },
  scheduleTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  scheduleMeta: { color: Academic.textSecondary, fontSize: 13 },
  scheduleTime: { color: Academic.primary, fontSize: 13, fontWeight: '500' },
  roomCard: { gap: 8 },
  roomCardTop: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  roomTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  roomSub: { color: Academic.textSecondary, fontSize: 13 },
  roomTime: { color: Academic.textSecondary, fontSize: 12 },
  announcementCard: { gap: 5 },
  announcementTitle: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  announcementBody: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  announcementFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  announcementDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  expandText: { color: Academic.primary, fontSize: 12, fontWeight: '500' },
  formHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: Spacing.four },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  pageSubtitle: { color: Academic.textSecondary, fontSize: 13, marginTop: 3 },
  fieldGroup: { gap: 7 },
  fieldLabel: { color: Academic.textSecondary, fontSize: 13, fontWeight: '500' },
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
    minHeight: 100,
    borderRadius: 14,
    padding: 14,
    color: Academic.navy,
    backgroundColor: Academic.card,
    borderWidth: 1,
    borderColor: Academic.border,
    fontSize: 15,
  },
  primaryButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  formActions: { flexDirection: 'row', gap: Spacing.two },
  cancelButton: { flex: 1, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cancelButtonText: { fontSize: 15, fontWeight: '500' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '500' },
});
