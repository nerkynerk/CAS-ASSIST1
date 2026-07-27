import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Academic, AcademicIcon } from '@/components/ui/academic-ui';
import { Spacing } from '@/constants/theme';
import { type UserProfile, useAuth } from '@/context/auth';

type Role = UserProfile['role'];

export default function RoleGuard({
  allowed,
  children,
}: {
  allowed: readonly Role[];
  children: ReactNode;
}) {
  const { profile } = useAuth();

  if (!profile || !allowed.includes(profile.role)) {
    return (
      <View style={styles.container}>
        <AcademicIcon
          name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
          color={Academic.error}
          size={42}
        />
        <Text style={styles.title}>Access restricted</Text>
        <Text style={styles.message}>Your CAS Assist role does not have access to this section.</Text>
      </View>
    );
  }

  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    padding: Spacing.five,
    backgroundColor: Academic.background,
  },
  title: { color: Academic.navy, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  message: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
