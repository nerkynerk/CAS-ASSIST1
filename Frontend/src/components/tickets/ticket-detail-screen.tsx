import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
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

import RoleGuard from '@/components/role-guard';
import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  EmptyState,
  IconButton,
  StatusBadge,
  SurfaceCard,
  formatCategory,
  shortRef,
} from '@/components/ui/academic-ui';
import { BentoGrid, BentoPanel } from '@/components/dashboard/dashboard-primitives';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Submitted',
  under_evaluation: 'Under Evaluation',
  action_required: 'Action Required',
  resolved: 'Resolved',
};

const STATUS_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error' | 'muted'> = {
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
  submitted: 'Start evaluation',
  under_evaluation: 'Request action',
  action_required: 'Resolve request',
};

interface TicketRow {
  id: string;
  student_id: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  state: string;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  public_note: string | null;
  assigned_office: string | null;
  assigned_to: string | null;
  flagged: boolean;
}

interface AuditRow {
  id: number;
  action: string;
  actor_id: string | null;
  created_at: string;
}

interface StudentContext {
  display_name: string;
  email: string;
  student_number: string | null;
}

function formatDateTime(iso: string | null | undefined) {
  if (!iso) return 'Not recorded';
  return new Date(iso).toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatAction(action: string) {
  if (action === 'insert') return 'Request recorded';
  if (action === 'update') return 'Request updated';
  if (action === 'delete') return 'Request removed';
  return formatCategory(action);
}

function TicketDetailContent({ ticketId, showCreated }: { ticketId: string | undefined; showCreated: boolean }) {
  const router = useRouter();
  const { profile, session } = useAuth();
  const colors = useTheme();
  const [ticket, setTicket] = useState<TicketRow | null>(null);
  const [student, setStudent] = useState<StudentContext | null>(null);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  const userId = profile?.id ?? session?.user.id;
  const canManage = profile?.role === 'staff' || profile?.role === 'super_admin';
  const isSuperAdmin = profile?.role === 'super_admin';

  const fetchTicket = useCallback(async () => {
    if (!ticketId || !userId) {
      setLoadError('This request link is invalid.');
      setTicket(null);
      return;
    }

    const { data, error } = await supabase
      .from('advising_ticket_pipeline')
      .select('id, student_id, category, description, status, priority, state, created_at, updated_at, resolved_at, public_note, assigned_office, assigned_to, flagged')
      .eq('id', ticketId)
      .maybeSingle();

    if (error || !data) {
      setLoadError('This request could not be found or you do not have access to it.');
      setTicket(null);
      return;
    }

    const nextTicket = data as TicketRow;
    if (profile?.role === 'student' && nextTicket.student_id !== userId) {
      setLoadError('This request could not be found or you do not have access to it.');
      setTicket(null);
      return;
    }

    setLoadError(null);
    setTicket(nextTicket);

    if (canManage) {
      const { data: studentData } = await supabase
        .from('users_account_registry')
        .select('display_name, email, student_number')
        .eq('id', nextTicket.student_id)
        .maybeSingle();
      setStudent((studentData as StudentContext | null) ?? null);
    } else {
      setStudent(null);
    }

    if (isSuperAdmin) {
      const { data: auditData } = await supabase
        .from('ticket_audit_logs')
        .select('id, action, actor_id, created_at')
        .eq('ticket_id', ticketId)
        .order('created_at', { ascending: true });
      setAudit((auditData as AuditRow[]) ?? []);
    } else {
      setAudit([]);
    }
  }, [canManage, isSuperAdmin, profile?.role, ticketId, userId]);

  useEffect(() => {
    setLoading(true);
    void fetchTicket().finally(() => setLoading(false));

    if (!ticketId) return;
    const channel = supabase
      .channel(`ticket-detail-${ticketId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'advising_ticket_pipeline',
          filter: `id=eq.${ticketId}`,
        },
        payload => {
          const status = (payload.new as { status?: string }).status;
          if (status) setActionMessage(`Request updated: ${STATUS_LABEL[status] ?? status}.`);
          void fetchTicket();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchTicket, ticketId]);

  async function onRefresh() {
    setRefreshing(true);
    await fetchTicket();
    setRefreshing(false);
  }

  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(canManage ? '/admin' : '/tickets');
    }
  }

  async function advanceStatus() {
    if (!ticket || !canManage) return;
    const next = NEXT_STATUS[ticket.status];
    if (!next || updating) return;

    setActionError(null);
    setActionMessage(null);
    setUpdating(true);
    const updates: Record<string, unknown> = { status: next };
    if (next === 'resolved') updates.resolved_at = new Date().toISOString();
    const { error } = await supabase
      .from('advising_ticket_pipeline')
      .update(updates)
      .eq('id', ticket.id);
    setUpdating(false);

    if (error) {
      setActionError('That status change was not accepted. Refresh and try again.');
      return;
    }

    setActionMessage(`Request marked ${STATUS_LABEL[next].toLowerCase()}.`);
    await fetchTicket();
  }

  const timeline = useMemo(() => {
    if (!ticket) return [];
    const items = audit.map(item => ({
      id: String(item.id),
      title: formatAction(item.action),
      detail: isSuperAdmin && item.actor_id ? `Authorized actor ${shortRef(item.actor_id, 'A')}` : 'Verified audit record',
      createdAt: item.created_at,
    }));

    if (!audit.length) {
      items.push({
        id: 'created',
        title: 'Request submitted',
        detail: 'The request record was created successfully.',
        createdAt: ticket.created_at,
      });
    }

    if (ticket.public_note) {
      items.push({
        id: 'public-note',
        title: 'Student-visible update',
        detail: ticket.public_note,
        createdAt: ticket.updated_at,
      });
    }

    return items.sort((left, right) => new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime());
  }, [audit, isSuperAdmin, ticket]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <ActivityIndicator color={colors.primary} style={styles.loader} />
      </SafeAreaView>
    );
  }

  if (loadError || !ticket) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.errorState}>
          <EmptyState
            title="Request unavailable"
            message={loadError ?? 'This request is no longer available.'}
            icon={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          />
          <Pressable onPress={goBack} style={[styles.secondaryButton, { backgroundColor: colors.backgroundSelected }]}>
            <Text style={[styles.secondaryButtonText, { color: colors.primary }]}>Back to workspace</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const statusTone = STATUS_TONE[ticket.status] ?? 'muted';
  const next = NEXT_STATUS[ticket.status];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
        contentContainerStyle={styles.scroll}>
        <View style={styles.topBar}>
          <IconButton
            icon={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            onPress={goBack}
            label="Back to workspace"
            bg={colors.muted}
            color={colors.textSecondary}
          />
          <View style={styles.topBarBadges}>
            <StatusBadge label={`${ticket.priority} priority`} tone={ticket.priority === 'urgent' ? 'error' : 'muted'} />
            <StatusBadge label={STATUS_LABEL[ticket.status] ?? ticket.status} tone={statusTone} />
          </View>
        </View>

        {showCreated ? (
          <View style={[styles.infoBox, { backgroundColor: colors.softBlue }]}>
            <Text style={[styles.infoText, { color: colors.primary }]}>Request submitted successfully. This page is your tracking record.</Text>
          </View>
        ) : null}

        <SurfaceCard style={styles.primaryCard}>
          <View style={styles.detailHeader}>
            <View style={styles.detailHeaderCopy}>
              <Text style={[styles.reference, { color: colors.primary }]}>{shortRef(ticket.id)}</Text>
              <Text style={[styles.detailTitle, { color: colors.navy }]}>{formatCategory(ticket.category)}</Text>
              <Text style={[styles.detailSubtitle, { color: colors.textSecondary }]}>Submitted {formatDateTime(ticket.created_at)}</Text>
            </View>
            <View style={[styles.detailIcon, { backgroundColor: colors.softBlue }]}>
              <AcademicIcon name={{ ios: 'doc.text', android: 'description', web: 'description' }} color={colors.primary} size={24} />
            </View>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.description, { color: colors.text }]}>{ticket.description}</Text>
          {ticket.public_note ? (
            <View style={[styles.noteBox, { backgroundColor: colors.successBg }]}>
              <Text style={[styles.noteLabel, { color: colors.success }]}>Student-visible update</Text>
              <Text style={[styles.noteText, { color: colors.text }]}>{ticket.public_note}</Text>
            </View>
          ) : null}
        </SurfaceCard>

        {actionMessage ? (
          <View style={[styles.successBox, { backgroundColor: colors.successBg }]}>
            <Text style={[styles.successText, { color: colors.success }]}>{actionMessage}</Text>
          </View>
        ) : null}
        {actionError ? (
          <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}>
            <Text style={[styles.errorText, { color: colors.error }]}>{actionError}</Text>
          </View>
        ) : null}

        <BentoGrid>
          <BentoPanel size="wide">
            <SurfaceCard style={styles.panelCard}>
              <View style={styles.sectionHeading}>
                <View style={[styles.sectionIcon, { backgroundColor: colors.softBlue }]}>
                  <AcademicIcon name={{ ios: 'clock', android: 'schedule', web: 'schedule' }} color={colors.primary} size={19} />
                </View>
                <View style={styles.sectionHeadingCopy}>
                  <Text style={[styles.sectionTitle, { color: colors.navy }]}>Verified activity</Text>
                  <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Status metadata and authorized records available to this role.</Text>
                </View>
              </View>
              {timeline.length ? timeline.map(item => (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={[styles.timelineDot, { backgroundColor: colors.primary }]} />
                  <View style={styles.timelineCopy}>
                    <Text style={[styles.timelineTitle, { color: colors.navy }]}>{item.title}</Text>
                    <Text style={[styles.timelineDetail, { color: colors.textSecondary }]}>{item.detail}</Text>
                    <Text style={[styles.timelineDate, { color: colors.textTertiary }]}>{formatDateTime(item.createdAt)}</Text>
                  </View>
                </View>
              )) : (
                <Text style={[styles.mutedText, { color: colors.textSecondary }]}>No additional activity is available for this request.</Text>
              )}
            </SurfaceCard>
          </BentoPanel>

          <BentoPanel size="compact">
            <SurfaceCard style={styles.panelCard}>
              <Text style={[styles.sectionTitle, { color: colors.navy }]}>Request record</Text>
              <View style={styles.metadataList}>
                <MetadataRow label="Reference" value={shortRef(ticket.id)} />
                <MetadataRow label="Category" value={formatCategory(ticket.category)} />
                <MetadataRow label="Current status" value={STATUS_LABEL[ticket.status] ?? ticket.status} />
                <MetadataRow label="Priority" value={formatCategory(ticket.priority)} />
                <MetadataRow label="Last updated" value={formatDateTime(ticket.updated_at)} />
                {ticket.resolved_at ? <MetadataRow label="Resolved" value={formatDateTime(ticket.resolved_at)} /> : null}
                {ticket.assigned_office ? <MetadataRow label="Assigned office" value={ticket.assigned_office} /> : null}
              </View>
            </SurfaceCard>

            {canManage ? (
              <SurfaceCard style={styles.panelCard} accent={ticket.status === 'action_required' ? 'error' : 'blue'}>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Authorized action</Text>
                <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>Only the existing next transition is available.</Text>
                {next ? (
                  <Pressable
                    onPress={advanceStatus}
                    disabled={updating}
                    style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary }, (pressed || updating) && styles.pressed]}>
                    {updating ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{NEXT_LABEL[ticket.status]}</Text>}
                  </Pressable>
                ) : (
                  <StatusBadge label="No further transition" tone="success" />
                )}
              </SurfaceCard>
            ) : null}

            {canManage && student ? (
              <SurfaceCard style={styles.panelCard}>
                <Text style={[styles.sectionTitle, { color: colors.navy }]}>Student context</Text>
                <View style={styles.studentRow}>
                  <View style={[styles.studentAvatar, { backgroundColor: colors.softBlue }]}>
                    <AcademicIcon name={{ ios: 'person', android: 'person', web: 'person' }} color={colors.primary} size={19} />
                  </View>
                  <View style={styles.studentCopy}>
                    <Text style={[styles.studentName, { color: colors.navy }]}>{student.display_name}</Text>
                    <Text style={[styles.studentEmail, { color: colors.textSecondary }]}>{student.email}</Text>
                    {student.student_number ? <Text style={[styles.studentEmail, { color: colors.textTertiary }]}>{student.student_number}</Text> : null}
                  </View>
                </View>
              </SurfaceCard>
            ) : null}
          </BentoPanel>
        </BentoGrid>

        <View style={[styles.securityNote, { backgroundColor: colors.muted }]}>
          <AcademicIcon name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} color={colors.textSecondary} size={16} />
          <Text style={[styles.securityText, { color: colors.textSecondary }]}>
            {canManage ? 'Staff-only notes and routing data remain protected by existing database policies.' : 'Only requests owned by your account are shown here.'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  const colors = useTheme();
  return (
    <View style={styles.metadataRow}>
      <Text style={[styles.metadataLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.metadataValue, { color: colors.navy }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function TicketDetailScreen({ ticketId, showCreated = false }: { ticketId: string | undefined; showCreated?: boolean }) {
  return (
    <RoleGuard allowed={['student', 'staff', 'super_admin']}>
      <TicketDetailContent ticketId={ticketId} showCreated={showCreated} />
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
  loader: { marginTop: Spacing.five },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.three, gap: Spacing.three },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.two },
  topBarBadges: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 7, flex: 1 },
  infoBox: { borderRadius: 13, padding: 12 },
  infoText: { fontSize: 13, fontWeight: '500', lineHeight: 19 },
  primaryCard: { gap: Spacing.three, padding: Spacing.four },
  detailHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: Spacing.three },
  detailHeaderCopy: { flex: 1, gap: 4 },
  reference: { fontSize: 13, fontWeight: '600', letterSpacing: 0.35 },
  detailTitle: { fontSize: 25, lineHeight: 31, fontWeight: '600', letterSpacing: -0.45 },
  detailSubtitle: { fontSize: 13, lineHeight: 19 },
  detailIcon: { width: 46, height: 46, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  divider: { height: 1, width: '100%' },
  description: { fontSize: 15, lineHeight: 23 },
  noteBox: { borderRadius: 13, padding: Spacing.three, gap: 5 },
  noteLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.35 },
  noteText: { fontSize: 14, lineHeight: 21 },
  successBox: { borderRadius: 13, padding: 12 },
  successText: { fontSize: 13, fontWeight: '500' },
  errorBox: { borderRadius: 13, padding: 12 },
  errorText: { fontSize: 13, fontWeight: '500' },
  panelCard: { gap: Spacing.three, padding: Spacing.three },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sectionIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  sectionHeadingCopy: { flex: 1, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '600' },
  sectionSubtitle: { fontSize: 12, lineHeight: 18 },
  timelineItem: { flexDirection: 'row', gap: 12, paddingLeft: 4 },
  timelineDot: { width: 9, height: 9, borderRadius: 5, marginTop: 5 },
  timelineCopy: { flex: 1, gap: 2 },
  timelineTitle: { fontSize: 14, fontWeight: '600' },
  timelineDetail: { fontSize: 13, lineHeight: 19 },
  timelineDate: { fontSize: 11, marginTop: 2 },
  mutedText: { fontSize: 13, lineHeight: 19 },
  metadataList: { gap: 10 },
  metadataRow: { gap: 2 },
  metadataLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  metadataValue: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  primaryButton: { minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 13 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  secondaryButton: { minHeight: 44, borderRadius: 13, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { fontSize: 13, fontWeight: '500' },
  studentRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  studentAvatar: { width: 38, height: 38, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  studentCopy: { flex: 1, gap: 2 },
  studentName: { fontSize: 13, fontWeight: '600' },
  studentEmail: { fontSize: 11, lineHeight: 16 },
  securityNote: { minHeight: 42, borderRadius: 13, paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityText: { flex: 1, fontSize: 11, lineHeight: 16 },
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
});
