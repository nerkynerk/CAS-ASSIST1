import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  SectionHeader,
  StatusBadge,
  SurfaceCard,
  formatRelative,
} from '@/components/ui/academic-ui';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { supabase } from '@/lib/supabase';

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
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

type UpdateFilter = 'all' | 'room' | 'announcements' | 'academic';

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
  return (
    <SurfaceCard accent={acknowledged ? 'success' : 'error'} style={styles.roomCard}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleGroup}>
          <Text style={styles.roomTitle} numberOfLines={1}>
            {[item.subject_code, item.section_code].filter(Boolean).join(' - ') || 'Room Change'}
          </Text>
          <Text style={styles.roomSub}>{formatRelative(item.effective_at)}</Text>
        </View>
        {!acknowledged ? <StatusBadge label="Urgent" tone="error" /> : <StatusBadge label="Acknowledged" tone="success" />}
      </View>
      <View style={styles.roomCompare}>
        <View style={styles.roomCol}>
          <Text style={styles.roomLabel}>Previous Room</Text>
          <Text style={styles.oldRoom} numberOfLines={1}>{item.original_room}</Text>
        </View>
        <View style={styles.pinBubble}>
          <AcademicIcon
            name={{ ios: 'location', android: 'location_on', web: 'location_on' }}
            color={Academic.primary}
            size={18}
          />
        </View>
        <View style={styles.roomCol}>
          <Text style={styles.roomLabel}>New Room</Text>
          <Text style={styles.newRoom} numberOfLines={1}>{item.new_room}</Text>
        </View>
      </View>
      {item.reason ? <Text style={styles.roomReason} numberOfLines={2}>{item.reason}</Text> : null}
      {acknowledged ? (
        <View style={styles.ackState}>
          <AcademicIcon
            name={{ ios: 'checkmark.circle', android: 'check_circle', web: 'check_circle' }}
            color={Academic.success}
            size={17}
          />
          <Text style={styles.ackStateText}>Acknowledged</Text>
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
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded }} onPress={onToggle}>
      <SurfaceCard style={styles.announcementCard}>
        <View style={styles.announcementHeader}>
          <View style={styles.announcementIcon}>
            <AcademicIcon
              name={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
              color={Academic.primary}
              size={20}
            />
          </View>
          <View style={styles.announcementText}>
            <Text style={styles.announcementTitle} numberOfLines={expanded ? undefined : 2}>{item.title}</Text>
            <Text style={styles.announcementDate}>{formatDate(item.publish_at)}</Text>
          </View>
          {item.pinned ? <StatusBadge label="Pinned" tone="warning" /> : null}
        </View>
        <Text style={styles.announcementBody} numberOfLines={expanded ? undefined : 3}>{item.body}</Text>
        <Text style={styles.expandText}>{expanded ? 'Show less' : 'Read full announcement'}</Text>
      </SurfaceCard>
    </Pressable>
  );
}

export default function UpdatesScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const [filter, setFilter] = useState<UpdateFilter>('all');
  const [expandedAnnouncementId, setExpandedAnnouncementId] = useState<string | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [roomChanges, setRoomChanges] = useState<RoomChange[]>([]);
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      .select('id, title, body, pinned, publish_at, expires_at')
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
    setAcknowledgingId(id);
    const { error: rpcError } = await supabase.rpc('acknowledge_room_change', {
      p_spatial_log_id: id,
    });
    if (!rpcError) {
      setAcknowledgedIds(prev => new Set([...prev, id]));
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
  const showAnnouncements = filter === 'all' || filter === 'announcements' || filter === 'academic';
  const filters: { id: UpdateFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...(isStudent ? [{ id: 'room' as const, label: 'Room Changes' }] : []),
    { id: 'announcements', label: 'Announcements' },
    { id: 'academic', label: 'Academic' },
  ];

  return (
    <SafeAreaView style={styles.safe}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Academic.primary} />}
        contentContainerStyle={styles.scroll}>
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Updates</Text>
          <View style={styles.pageHeaderActions}>
            {liveTag ? <StatusBadge label="Live" tone="success" /> : null}
            {canCreateAnnouncements ? (
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
                <Text style={styles.createButtonText}>Create</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRail}>
          {filters.map(item => {
            const active = filter === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, active && styles.filterChipActive]}>
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : (
          <>
            {showRoom ? (
              <>
                <SectionHeader
                  title="Room Changes"
                  badge={roomChanges.filter(change => !acknowledgedIds.has(change.id)).length
                    ? `${roomChanges.filter(change => !acknowledgedIds.has(change.id)).length} New`
                    : undefined}
                />
                {roomChanges.length === 0 ? (
                  <EmptyState
                    title="No room changes"
                    message="Relocation notices from the last 24 hours will appear here."
                    icon={{ ios: 'location', android: 'location_on', web: 'location_on' }}
                  />
                ) : (
                  roomChanges.map(change => (
                    <RoomUpdateCard
                      key={change.id}
                      item={change}
                      acknowledged={acknowledgedIds.has(change.id)}
                      acknowledging={acknowledgingId === change.id}
                      onAcknowledge={() => handleAcknowledge(change.id)}
                    />
                  ))
                )}
              </>
            ) : null}

            {showAnnouncements ? (
              <>
                <SectionHeader title="Announcements" />
                {announcements.length === 0 ? (
                  <EmptyState
                    title="No announcements"
                    message="Official CAS academic updates will appear here."
                    icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
                  />
                ) : (
                  announcements.map(item => (
                    <AnnouncementCard
                      key={item.id}
                      item={item}
                      expanded={expandedAnnouncementId === item.id}
                      onToggle={() => setExpandedAnnouncementId(current => current === item.id ? null : item.id)}
                    />
                  ))
                )}
              </>
            ) : null}
          </>
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
  pageTitle: { color: Academic.navy, fontSize: 26, fontWeight: '700', letterSpacing: -0.45 },
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
  createButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  filterRail: { gap: Spacing.two, paddingRight: Spacing.three },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: Academic.muted,
  },
  filterChipActive: { backgroundColor: Academic.primary },
  filterText: { color: Academic.textSecondary, fontSize: 14, fontWeight: '900' },
  filterTextActive: { color: '#FFFFFF' },
  loader: { marginTop: Spacing.four },
  roomCard: { gap: 13 },
  roomHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.two },
  roomTitleGroup: { flex: 1, gap: 2 },
  roomTitle: { color: Academic.navy, fontSize: 16, fontWeight: '900' },
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
    fontWeight: '800',
    textDecorationLine: 'line-through',
  },
  newRoom: { color: Academic.primary, fontSize: 16, fontWeight: '900' },
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
  ackButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  ackState: {
    minHeight: 40,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Academic.successBg,
  },
  ackStateText: { color: Academic.success, fontSize: 14, fontWeight: '900' },
  announcementCard: { gap: 12 },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  announcementIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  announcementText: { flex: 1, gap: 2 },
  announcementTitle: { color: Academic.navy, fontSize: 16, fontWeight: '900' },
  announcementDate: { color: Academic.textSecondary, fontSize: 12, fontWeight: '700' },
  announcementBody: { color: Academic.textSecondary, fontSize: 14, lineHeight: 20 },
  expandText: { color: Academic.primary, fontSize: 12, fontWeight: '900', textAlign: 'right' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '800' },
});
