import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AppBackdrop,
  EmptyState,
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

interface RecentUser {
  id: string;
  display_name: string;
  email: string;
  role: string;
  created_at: string;
}

const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {
  student: 'blue',
  faculty: 'warning',
  staff: 'success',
  super_admin: 'error',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminDashboardHome() {
  const router = useRouter();
  const { profile } = useAuth();
  const theme = useTheme();
  const [stats, setStats] = useState({ users: 0, openTickets: 0, actionReq: 0, announcements: 0 });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [userCount, ticketData, actionCount, annCount, latestUsers] = await Promise.all([
      supabase.from('users_account_registry').select('id', { count: 'exact', head: true }),
      supabase.from('advising_ticket_pipeline').select('status').eq('state', 'active'),
      supabase.from('advising_ticket_pipeline').select('id', { count: 'exact', head: true }).eq('status', 'action_required'),
      supabase.from('announcements').select('id', { count: 'exact', head: true }).eq('state', 'published'),
      supabase.from('users_account_registry').select('id, display_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
    ]);

    const openCount = (ticketData.data ?? []).filter(t => t.status === 'submitted').length;
    setStats({
      users: userCount.count ?? 0,
      openTickets: openCount,
      actionReq: actionCount.count ?? 0,
      announcements: annCount.count ?? 0,
    });
    setRecentUsers(latestUsers.data ?? []);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    await fetchData();
    setLoading(false);
  }, [fetchData]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  useEffect(() => { void load(); }, [load]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        contentContainerStyle={styles.scroll}>
        <RoleHeroHeader
          label="CAS Assist Administration"
          title="System Overview"
          subtitle={profile?.email ?? 'Monitor users, operations, and CAS service activity.'}
        />

        {loading ? (
          <ActivityIndicator color={Academic.primary} style={styles.loader} />
        ) : (
          <>
            <View style={styles.metricsRow}>
              <MetricCard
                label="Total users"
                value={stats.users}
                icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
                tone="blue"
              />
              <MetricCard
                label="Open tickets"
                value={stats.openTickets}
                icon={{ ios: 'clock', android: 'schedule', web: 'schedule' }}
                tone="warning"
              />
              <MetricCard
                label="Action required"
                value={stats.actionReq}
                icon={{ ios: 'exclamationmark.circle', android: 'priority_high', web: 'priority_high' }}
                tone="error"
              />
              <MetricCard
                label="Announcements"
                value={stats.announcements}
                icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
                tone="success"
              />
            </View>
          </>
        )}

        <View style={styles.snapshotGrid}>
          <SurfaceCard style={styles.snapshotCard}>
            <SectionHeader title="Service activity" />
            <View style={styles.snapshotRows}>
              <View style={[styles.snapshotRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Open requests</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.openTickets}</Text>
              </View>
              <View style={[styles.snapshotRow, { borderBottomColor: theme.border }]}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Action required</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.actionReq}</Text>
              </View>
              <View style={styles.snapshotRow}>
                <Text style={[styles.snapshotLabel, { color: theme.textSecondary }]}>Published updates</Text>
                <Text style={[styles.snapshotValue, { color: theme.navy }]}>{stats.announcements}</Text>
              </View>
            </View>
          </SurfaceCard>
          <SurfaceCard style={styles.snapshotCard}>
            <SectionHeader title="Account overview" />
            <Text style={[styles.snapshotDescription, { color: theme.textSecondary }]}>The account registry is the source of truth for student, faculty, staff, and administrator access.</Text>
            <View style={[styles.accountCallout, { backgroundColor: theme.softBlue }]}>
              <Text style={[styles.accountCalloutValue, { color: theme.primary }]}>{stats.users}</Text>
              <Text style={[styles.accountCalloutLabel, { color: theme.textSecondary }]}>registered accounts</Text>
            </View>
          </SurfaceCard>
        </View>

        <SectionHeader title="Admin Tools" action="Open panel" onAction={() => router.navigate('/admin')} />
        <View style={dashboardActionGridStyles.grid}>
            <DashboardActionCard
              label="Ticket Operations"
              caption="Review and update active requests."
              size="wide"
            icon={{ ios: 'list.bullet', android: 'format_list_bulleted', web: 'format_list_bulleted' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'tickets' } })}
          />
          <DashboardActionCard
            label="Post Announcement"
            caption="Publish department-wide updates."
            icon={{ ios: 'megaphone', android: 'campaign', web: 'campaign' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'announce' } })}
          />
          <DashboardActionCard
            label="Document Requests"
            caption="Open the authorized document queue."
            icon={{ ios: 'doc.text', android: 'description', web: 'description' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'documents' } })}
          />
          <DashboardActionCard
            label="Users"
            caption="Manage account registry entries."
            icon={{ ios: 'person.crop.circle.badge.checkmark', android: 'manage_accounts', web: 'manage_accounts' }}
            onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'users' } })}
          />
          <DashboardActionCard
            label="System Analytics"
            caption="Review existing service metrics."
            icon={{ ios: 'chart.bar.xaxis', android: 'analytics', web: 'analytics' }}
            onPress={() => router.navigate('/analytics')}
          />
          {profile?.role === 'super_admin' ? (
            <DashboardActionCard
              label="Audit History"
              caption="Review protected ticket events."
              icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
              onPress={() => router.navigate({ pathname: '/admin', params: { tab: 'audit' } })}
            />
          ) : null}
        </View>

        <SectionHeader title="Recently Registered" />
        {recentUsers.length === 0 ? (
          <EmptyState
            title="No users yet"
            message="New account registry entries will appear here."
            icon={{ ios: 'person.2', android: 'groups', web: 'groups' }}
          />
        ) : (
          recentUsers.map(user => (
            <SurfaceCard key={user.id} style={styles.userCard}>
              <View style={[styles.userAvatar, { backgroundColor: theme.softBlue }]}>
                <Text style={[styles.userInitial, { color: theme.primary }]}>{(user.display_name || 'U')[0].toUpperCase()}</Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.navy }]} numberOfLines={1}>{user.display_name}</Text>
                <Text style={[styles.userEmail, { color: theme.textSecondary }]} numberOfLines={1}>{user.email}</Text>
                <Text style={[styles.userDate, { color: theme.textSecondary }]}>Joined {formatDate(user.created_at)}</Text>
              </View>
              <StatusBadge label={user.role.replace('_', ' ')} tone={ROLE_TONE[user.role] ?? 'muted'} />
            </SurfaceCard>
          ))
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
  loader: { marginTop: Spacing.four },
  metricsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  snapshotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.three },
  snapshotCard: { flexGrow: 1, flexBasis: 320, minWidth: 0, gap: Spacing.three },
  snapshotRows: { gap: 0 },
  snapshotRow: { minHeight: 42, borderBottomWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  snapshotLabel: { fontSize: 13, fontWeight: '600' },
  snapshotValue: { fontSize: 20, fontWeight: '600', fontVariant: ['tabular-nums'] },
  snapshotDescription: { fontSize: 13, lineHeight: 19 },
  accountCallout: { minHeight: 58, borderRadius: 15, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  accountCalloutValue: { fontSize: 28, fontWeight: '600', fontVariant: ['tabular-nums'] },
  accountCalloutLabel: { fontSize: 13, fontWeight: '500' },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
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
  userName: { color: Academic.navy, fontSize: 15, fontWeight: '600' },
  userEmail: { color: Academic.textSecondary, fontSize: 12 },
  userDate: { color: Academic.textSecondary, fontSize: 11, fontWeight: '400' },
});
