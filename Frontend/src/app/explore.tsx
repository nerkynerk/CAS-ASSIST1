import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatRelative,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  priority: string;
  audience_roles: string[];
  publish_at: string;
  expires_at: string | null;
}

interface RoomChange {
  id: string;
  original_room: string;
  new_room: string;
  subject_code: string | null;
  section_code: string | null;
  reason: string | null;
  effective_at: string;
}

type UpdateFilter = 'all' | 'room' | 'announcements';
type RoomStatusFilter = 'all' | 'pending' | 'acknowledged';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function RoomUpdateCard({
  item,
  acknowledged,
  acknowledging,
  onAcknowledge,
}: {
  item: RoomChange;
  acknowledged: boolean;
  acknowledging: boolean;
  onAcknowledge: () => void;
}) {
  const colors = useTheme();
  return (
    <SurfaceCard accent={acknowledged ? 'success' : 'error'} style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleGroup}>
          <Text style={[styles.roomTitle, { color: colors.navy }]} numberOfLines={1}>
            {[item.subject_code, item.section_code].filter(Boolean).join(' - ') || 'Room Change'}
          </Text>
          <Text style={[styles.roomSub, { color: colors.textSecondary }]}>{formatRelative(item.effective_at)}</Text>
        </View>
        {!acknowledged ? <StatusBadge label="Urgent" tone="error" /> : <StatusBadge label="Acknowledged" tone="success" />}
      </View>
      <View style={[styles.roomCompare, { backgroundColor: colors.muted }]}>
        <View style={styles.roomCol}>
          <Text style={[styles.roomLabel, { color: colors.textSecondary }]}>Previous Room</Text>
          <Text style={[styles.oldRoom, { color: colors.textTertiary }]} numberOfLines={1}>{item.original_room}</Text>
        </View>
        <View style={[styles.pinBubble, { backgroundColor: colors.card }]}>
          <AcademicIcon
            name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            color={colors.primary}
            size={18}
          />
        </View>
        <View style={styles.roomCol}>
          <Text style={[styles.roomLabel, { color: colors.textSecondary }]}>New Room</Text>
          <Text style={[styles.newRoom, { color: colors.primary }]} numberOfLines={1}>{item.new_room}</Text>
        </View>
      </View>
      {item.reason ? <Text style={[styles.roomReason, { color: colors.textSecondary }]} numberOfLines={2}>{item.reason}</Text> : null}
      {acknowledged ? (
        <View style={[styles.ackState, { backgroundColor: colors.successBg }]}>
          <AcademicIcon
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            color={colors.success}
            size={17}
          />
          <Text style={[styles.ackStateText, { color: colors.success }]}>Acknowledged</Text>
        </View>
      ) : (
        <Pressable
          onPress={onAcknowledge}
          disabled={acknowledging}
          style={({ pressed }) => [styles.ackButton, (pressed || acknowledging) && styles.pressed]}>
          {acknowledging ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.ackButtonText}>Acknowledge Change</Text>
          )}
        </Pressable>
      )}
    </SurfaceCard>
  );
}

function AnnouncementCard({
  item,
  expanded,
  onToggle,
}: {
  item: Announcement;
  expanded: boolean;
  onToggle: () => void;
}) {
  const colors = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle}>
      <SurfaceCard style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <View style={styles.announcementIcon}>
            <AcademicIcon
              name={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
              color={colors.primary}
              size={20}
            />
          </View>
          <View style={styles.announcementText}>
            <Text style={[styles.announcementTitle, { color: colors.navy }]} numberOfLines={expanded ? undefined : 2}>{item.title}</Text>
            <Text style={[styles.announcementDate, { color: colors.textSecondary }]}>{formatDate(item.publish_at)}</Text>
          </View>
          <View style={styles.announcementBadges}>
            {item.priority !== 'normal' ? <StatusBadge label={item.priority} tone={item.priority === 'urgent' ? 'error' : 'warning'} /> : null}
            {item.pinned ? <StatusBadge label="Pinned" tone="warning" /> : null}
          </View>
        </View>
        <Text style={[styles.announcementBody, { color: colors.textSecondary }]} numberOfLines={expanded ? undefined : 3}>{item.body}</Text>
        {item.audience_roles.length > 0 ? (
          <Text style={[styles.announcementAudience, { color: colors.textSecondary }]} numberOfLines={1}>
            For {item.audience_roles.map(role => role === 'super_admin' ? 'Super admins' : `${role.charAt(0).toUpperCase()}${role.slice(1)}s`).join(', ')}
          </Text>
        ) : null}
        <Text style={[styles.expandText, { color: colors.primary }]}>{expanded ? 'Show less' : 'Read full announcement'}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

export default function UpdatesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const colors = useTheme();
  const [filter, setFilter] = useState<UpdateFilter>('all');
  const [roomStatus, setRoomStatus] = useState<RoomStatusFilter>('all');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [announcementSort, setAnnouncementSort] = useState<'newest' | 'oldest'>('newest');
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [roomChanges, setRoomChanges] = useState<RoomChange[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [liveTag, setLiveTag] = useState(false);

  const fetchRef = useRef<() => Promise<void>>(async () => {});
  const profileId = profile?.id;
  const isStudent = !profile || profile.role === 'student';
  const canCreateAnnouncements = profile?.role === 'staff' || profile?.role === 'super_admin';

  const fetchAnnouncements = useCallback(async () => {
    setError(null);
    const now = new Date().toISOString();
    const { data, error: dbErr } = await supabase
      .from('announcements')
      .select('id, title, body, pinned, priority, audience_roles, publish_at, expires_at')
      .eq('state', 'published')
      .or(`expires_at.is.null,expires_at.gt.${now}`)
      .order('pinned', { ascending: false })
      .order('publish_at', { ascending: false });

    if (dbErr) {
      setError('Failed to load announcements. Pull down to retry.');
    } else {
      setAnnouncements(data ?? []);
    }
  }, []);

  const fetchRoomChanges = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('spatial_logs')
      .select('id, original_room, new_room, subject_code, section_code, reason, effective_at')
      .gte('effective_at', since)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
      .order('effective_at', { ascending: false })
      .limit(20);

    const changes = (data as unknown as RoomChange[]) ?? [];
    setRoomChanges(changes);

    if (profileId && changes.length > 0) {
      const { data: acks } = await supabase
        .from('spatial_log_acknowledgments')
        .select('spatial_log_id')
        .in('spatial_log_id', changes.map(change => change.id))
        .eq('student_id', profileId);
      setAcknowledgedIds(new Set((acks ?? []).map((ack: { spatial_log_id: string }) => ack.spatial_log_id)));
    }
  }, [profileId]);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchAnnouncements(), isStudent ? fetchRoomChanges() : Promise.resolve()]);
  }, [fetchAnnouncements, fetchRoomChanges, isStudent]);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchAll();
    setLoading(false);
  }, [fetchAll]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }

  async function handleAcknowledge(id: string) {
    if (!profile?.id || acknowledgingId) return;
    setAckError(null);
    setAcknowledgingId(id);
    const { error: rpcError } = await supabase.rpc('acknowledge_room_change', {
      p_spatial_log_id: id,
    });
    if (!rpcError) {
      setAcknowledgedIds(prev => new Set([...prev, id]));
    } else {
      setAckError('We could not record that acknowledgement. Please try again.');
    }
    setAcknowledgingId(null);
  }

  useEffect(() => {
    fetchRef.current = fetchAll;
  }, [fetchAll]);

  useEffect(() => {
    void load();

    const announcementsChannel = supabase
      .channel('announcements-live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'announcements' },
        () => {
          setLiveTag(true);
          fetchRef.current();
          setTimeout(() => setLiveTag(false), 3000);
        },
      )
      .subscribe();

    const roomChannel = supabase
      .channel('updates-room-changes-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'spatial_logs' },
        () => {
          setLiveTag(true);
          fetchRef.current();
          setTimeout(() => setLiveTag(false), 3000);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(announcementsChannel);
      supabase.removeChannel(roomChannel);
    };
  }, [isStudent, load]);

  const showRoom = isStudent && (filter === 'all' || filter === 'room');
  const showAnnouncements = filter === 'all' || filter === 'announcements';
  const visibleRoomChanges = useMemo(() => roomChanges.filter(change => {
    const acknowledged = acknowledgedIds.has(change.id);
    return roomStatus === 'all' || (roomStatus === 'acknowledged' ? acknowledged : !acknowledged);
  }), [acknowledgedIds, roomChanges, roomStatus]);
  const visibleAnnouncements = useMemo(() => {
    const query = announcementSearch.trim().toLowerCase();
    return announcements
      .filter(item => !query || `${item.title} ${item.body} ${item.audience_roles.join(' ')}`.toLowerCase().includes(query))
      .sort((left, right) => {
        const pinnedOrder = Number(right.pinned) - Number(left.pinned);
        if (pinnedOrder !== 0) return pinnedOrder;
        const direction = announcementSort === 'newest' ? -1 : 1;
        return direction * (new Date(left.publish_at).getTime() - new Date(right.publish_at).getTime());
      });
  }, [announcementSearch, announcementSort, announcements]);
  const filters: { id: UpdateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(isStudent ? [{ id: 'room' as const, label: 'Room Changes' }] : []),
    { id: 'announcements', label: 'Announcements' },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label={isStudent ? 'Student updates' : 'Department updates'}
          title="Updates"
          subtitle="Stay current with official announcements and academic changes."
          right={liveTag ? <StatusBadge label="Live" tone="success" /> : undefined}
        />
        {canCreateAnnouncements ? (
          <View style={styles.pageHeaderActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create announcement"
              onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
              style={({ pressed }) => [styles.createButton, pressed && styles.pressed]}>
              <AcademicIcon
                name={{ ios: 'plus', android: 'add', web: 'add' }}
                color="#FFFFFF"
                size={17}
              />
              <Text style={styles.createButtonText}>Create announcement</Text>
            </Pressable>
          </View>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {filters.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {showRoom ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
            {([
              ['all', 'All room changes'],
              ['pending', 'Awaiting acknowledgement'],
              ['acknowledged', 'Acknowledged'],
            ] as const).map(([value, label]) => {
              const active = roomStatus === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => setRoomStatus(value)}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={[styles.filterChip, { backgroundColor: active ? colors.softBlue : colors.muted }, active && styles.filterChipSecondaryActive]}>
                  <Text style={[styles.filterText, { color: active ? colors.primary : colors.textSecondary }, active && styles.filterTextActiveSecondary]}>{label}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        ) : null}

        {showAnnouncements ? (
          <View style={styles.announcementToolbar}>
            <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <AcademicIcon name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }} color={colors.textSecondary} size={18} />
              <TextInput
                value={announcementSearch}
                onChangeText={setAnnouncementSearch}
                placeholder="Search announcements"
                placeholderTextColor={colors.textSecondary}
                style={[styles.searchInput, { color: colors.text }]}
                accessibilityLabel="Search announcements"
              />
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
              {(['newest', 'oldest'] as const).map(value => {
                const active = announcementSort === value;
                return (
                  <Pressable
                    key={value}
                    onPress={() => setAnnouncementSort(value)}
                    style={[styles.filterChip, { backgroundColor: active ? colors.primary : colors.muted }, active && styles.filterChipActive]}>
                    <Text style={[styles.filterText, { color: active ? '#FFFFFF' : colors.textSecondary }, active && styles.filterTextActive]}>{value === 'newest' ? 'Newest first' : 'Oldest first'}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        <View style={styles.metricsRow}>
          <MetricCard
            label="Announcements"
            value={announcements.length}
            tone="blue"
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
          />
          <MetricCard
            label="Room changes"
            value={roomChanges.length}
            tone="warning"
            icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
          />
          <MetricCard
            label="Awaiting acknowledgement"
            value={roomChanges.filter(change => !acknowledgedIds.has(change.id)).length}
            tone="success"
            icon={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
          />
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
          </View>
        ) : null}
        {ackError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{ackError}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={colors.primary} style={styles.loader} />
        ) : (
          <BentoGrid>
            {showRoom ? (
              <BentoPanel size="medium" style={styles.bentoSection}>
                <SectionHeader
                  title="Room Changes"
                  badge={roomChanges.filter(change => !acknowledgedIds.has(change.id)).length
                    ? `${roomChanges.filter(change => !acknowledgedIds.has(change.id)).length} New`
                    : undefined}
                />
                {visibleRoomChanges.length === 0 ? (
                  <EmptyState
                    title={roomChanges.length === 0 ? 'No room changes' : 'No matching room changes'}
                    message={roomChanges.length === 0 ? 'Relocation notices from the last 24 hours will appear here.' : 'Try another acknowledgement filter.'}
                    icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                  />
                ) : (
                  visibleRoomChanges.map(change => (
                    <RoomUpdateCard
                      key={change.id}
                      item={change}
                      acknowledged={acknowledgedIds.has(change.id)}
                      acknowledging={acknowledgingId === change.id}
                      onAcknowledge={() => handleAcknowledge(change.id)}
                    />
                  ))
                )}
              </BentoPanel>
            ) : null}

            {showAnnouncements ? (
              <BentoPanel size="wide" style={styles.bentoSection}>
                <SectionHeader title="Announcements" />
                {visibleAnnouncements.length === 0 ? (
                  <EmptyState
                    title={announcements.length === 0 ? 'No announcements' : 'No matching announcements'}
                    message={announcements.length === 0 ? 'Official CAS academic updates will appear here.' : 'Try a different search term or sort order.'}
                    icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
                  />
                ) : (
                  visibleAnnouncements.map(item => (
                    <AnnouncementCard
                      key={item.id}
                      item={item}
                      expanded={expandedAnnouncementId === item.id}
                      onToggle={() => setExpandedAnnouncementId(current => current === item.id ? null : item.id)}
                    />
                  ))
                )}
              </BentoPanel>
            ) : null}
          </BentoGrid>
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
  },
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '600', letterSpacing: -0.45 },
  pageHeaderActions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  createButton: {
    minHeight: 38,
    paddingHorizontal: 13,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Academic.primary,
  },
  createButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  filterRail: { gap: Spacing.two, paddingRight: Spacing.three },
  announcementToolbar: { gap: Spacing.two },
  searchBox: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1 },
  searchInput: { flex: 1, minHeight: 46, fontSize: 14 },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  bentoSection: { gap: Spacing.three },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Academic.muted,
  },
  filterChipActive: { backgroundColor: Academic.primary },
  filterChipSecondaryActive: { borderWidth: 1, borderColor: Academic.primary },
  filterText: { color: Academic.textSecondary, fontSize: 14, fontWeight: '500' },
  filterTextActive: { color: '#FFFFFF' },
  filterTextActiveSecondary: { color: Academic.primary },
  loader: { marginTop: Spacing.four },
  roomCard: { gap: 13 },
  roomHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  roomTitleGroup: { flex: 1, gap: 2 },
  roomTitle: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
  roomSub: { color: Academic.textSecondary, fontSize: 13 },
  roomCompare: {
    minHeight: 68,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    backgroundColor: Academic.muted,
  },
  roomCol: { flex: 1, gap: 4 },
  roomLabel: { color: Academic.textSecondary, fontSize: 12 },
  oldRoom: {
    color: '#8EA0B8',
    fontSize: 16,
    fontWeight: '400',
    textDecorationLine: 'line-through',
  },
  newRoom: { color: Academic.primary, fontSize: 16, fontWeight: '500' },
  pinBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.card,
    boxShadow: '0 10px 28px rgba(50, 82, 87, 0.11)',
  },
  roomReason: { color: Academic.textSecondary, fontSize: 13, lineHeight: 18 },
  ackButton: {
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  ackButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  ackState: {
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Academic.successBg,
  },
  ackStateText: { color: Academic.success, fontSize: 14, fontWeight: '500' },
  announcementCard: { gap: 12 },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  announcementBadges: { alignItems: 'flex-end', gap: 5 },
  announcementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  announcementText: { flex: 1, gap: 2 },
  announcementTitle: { color: Academic.navy, fontSize: 16, fontWeight: '600' },
  announcementDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  announcementBody: { color: Academic.textSecondary, fontSize: 14, lineHeight: 20 },
  announcementAudience: { color: Academic.textSecondary, fontSize: 12, fontWeight: '400' },
  expandText: { color: Academic.primary, fontSize: 12, fontWeight: '500', textAlign: 'right' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '500' },
});
