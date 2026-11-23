import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { AcademicIcon, ActionButton, StatusBadge, SurfaceCard } from '@/components/ui/academic-ui';
import { MaxContentWidth, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useTheme } from '@/hooks/use-theme';

export default function VerificationPendingScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const colors = useTheme();
  const rejected = profile?.verification_status === 'rejected';
  const pending = profile?.verification_status === 'pending';
  const title = pending ? 'CAS verification pending' : rejected ? 'CAS verification needs review' : 'CAS access requires verification';
  const message = profile?.accessError ?? (pending
    ? 'Your institutional account is signed in and awaiting CAS verification. Protected services will be available after an authorized CAS administrator verifies your account and affiliation.'
    : rejected
      ? 'Your account has not been approved for CAS access. Please contact the CAS office to review your account and affiliation.'
      : 'Your account does not currently have verified active CAS access. Please contact the CAS office to confirm your account and affiliation.');

  return (
    <ScrollView contentContainerStyle={[styles.page, { backgroundColor: colors.background }]}>
      <View style={[styles.icon, { backgroundColor: colors.backgroundSelected }]}>
        <AcademicIcon name={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }} color={colors.primary} size={32} />
      </View>
      <Text style={[styles.brand, { color: colors.textSecondary }]}>CAS ASSIST · NEW ERA UNIVERSITY</Text>
      <SurfaceCard style={styles.card}>
        <StatusBadge label={pending ? 'Pending verification' : rejected ? 'Review required' : 'Access restricted'} tone="warning" />
        <Text accessibilityRole="header" style={[styles.title, { color: colors.navy }]}>{title}</Text>
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>
        <Text selectable style={[styles.email, { color: colors.text }]}>{profile?.email}</Text>
        <ActionButton label="Refresh verification status" onPress={() => void refreshProfile()} />
        <ActionButton label="Sign out" variant="secondary" onPress={() => void signOut()} />
      </SurfaceCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.four, gap: Spacing.three },
  icon: { padding: Spacing.three, borderRadius: Radius.panel },
  brand: { fontSize: TypeScale.caption, letterSpacing: 1, textAlign: 'center' },
  card: { width: '100%', maxWidth: Math.min(MaxContentWidth, 480), padding: Spacing.four, gap: Spacing.three },
  title: { fontSize: TypeScale.title, fontWeight: '600' },
  message: { fontSize: TypeScale.body, lineHeight: 22 },
  email: { fontSize: TypeScale.body },
});
  