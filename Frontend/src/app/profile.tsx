import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  Academic,
  AcademicIcon,
  AppBackdrop,
  RoleHeroHeader,
  SectionHeader,
  StatusBadge,
  SurfaceCard,
} from '@/components/ui/academic-ui';
import { Fonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { type ThemePreference, useAppTheme } from '@/context/theme';
import { useTheme } from '@/hooks/use-theme';
import { supabase } from '@/lib/supabase';

const ROLE_LABEL: Record<string, string> = {
  student: 'Student',
  faculty: 'Faculty',
  staff: 'CAS Staff',
  super_admin: 'Super Administrator',
};

const ROLE_TONE: Record<string, 'blue' | 'warning' | 'success' | 'error'> = {
  student: 'blue',
  faculty: 'warning',
  staff: 'success',
  super_admin: 'error',
};

const THEME_OPTIONS: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: Parameters<typeof AcademicIcon>[0]['name'];
}[] = [
  { value: 'light', label: 'Light', description: 'Always use the light appearance', icon: { ios: 'sun.max', android: 'light_mode', web: 'light_mode' } },
  { value: 'dark', label: 'Dark', description: 'Always use the dark appearance', icon: { ios: 'moon', android: 'dark_mode', web: 'dark_mode' } },
  { value: 'system', label: 'Follow device', description: 'Match your device or browser', icon: { ios: 'circle.lefthalf.filled', android: 'contrast', web: 'contrast' } },
];

export default function ProfileScreen() {
  const { profile, signOut } = useAuth();
  const { preference, setPreference } = useAppTheme();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const wideLayout = width >= 900;
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const role = profile?.role ?? 'student';
  const firstName = profile?.display_name?.split(' ')[0] ?? 'there';

  async function handleSave() {
    if (!displayName.trim()) { setSaveError('Name cannot be empty.'); return; }
    setSaveError(null);
    setSaving(true);

    const { error } = await supabase
      .from('users_account_registry')
      .update({ display_name: displayName.trim() })
      .eq('id', profile!.id);

    setSaving(false);
    if (error) {
      setSaveError('Failed to update. Please try again.');
    } else {
      setSaveSuccess(true);
      setEditing(false);
      setTimeout(() => setSaveSuccess(false), 3000);
    }
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <AppBackdrop />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <RoleHeroHeader
          label="CAS Assist Profile"
          title={`Hello, ${firstName}`}
          subtitle="Manage your institutional account details."
          right={
            <View style={styles.avatar}>
              <Text style={styles.avatarLetter}>{(profile?.display_name ?? 'U')[0].toUpperCase()}</Text>
            </View>
          }
        />

        <SurfaceCard style={styles.identityCard}>
          {!editing ? (
            <Text style={styles.displayName}>{profile?.display_name ?? 'No name set'}</Text>
          ) : (
            <TextInput
              style={[
                styles.nameInput,
                { color: theme.text, backgroundColor: theme.muted, borderColor: theme.border },
              ]}
              value={displayName}
              onChangeText={setDisplayName}
              autoFocus
              selectTextOnFocus
              maxLength={60}
              placeholder="Display name"
              placeholderTextColor={Academic.textSecondary}
            />
          )}
          <View style={styles.badgeRow}>
            <StatusBadge label={ROLE_LABEL[role] ?? role} tone={ROLE_TONE[role] ?? 'blue'} />
            <StatusBadge
              label={profile?.state === 'archived_read_only' ? 'Read-only' : 'Active'}
              tone={profile?.state === 'archived_read_only' ? 'warning' : 'success'}
            />
          </View>
        </SurfaceCard>

        {saveError ? <View style={styles.errorBox}><Text style={styles.errorText}>{saveError}</Text></View> : null}
        {saveSuccess ? <View style={styles.successBox}><Text style={styles.successText}>Profile updated successfully.</Text></View> : null}

        <View style={[styles.sectionGrid, wideLayout && styles.sectionGridWide]}>
          <View style={styles.sectionColumn}>
            <SectionHeader title="Account" />
            <SurfaceCard style={styles.infoCard}>
              <InfoRow icon={{ ios: 'envelope', android: 'mail', web: 'mail' }} label="Email" value={profile?.email ?? '-'} />
              {role === 'student' ? (
                <>
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                  <InfoRow
                    icon={{ ios: 'number', android: 'badge', web: 'badge' }}
                    label="Student Number"
                    value={profile?.student_number ?? 'Not recorded'}
                  />
                </>
              ) : null}
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <InfoRow icon={{ ios: 'person.badge.key', android: 'badge', web: 'badge' }} label="Role" value={ROLE_LABEL[role] ?? role} />
              <View style={[styles.separator, { backgroundColor: theme.border }]} />
              <InfoRow
                icon={{ ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' }}
                label="Status"
                value={profile?.state === 'archived_read_only' ? 'Archived read-only' : 'Active'}
              />
            </SurfaceCard>
          </View>

          <View style={styles.sectionColumn}>
            <SectionHeader title="Appearance" />
            <SurfaceCard style={styles.appearanceCard}>
              {THEME_OPTIONS.map((option, index) => {
                const selected = preference === option.value;
                return (
                  <View key={option.value}>
                    {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.border }]} /> : null}
                    <Pressable
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      onPress={() => setPreference(option.value)}
                      style={({ pressed }) => [
                        styles.themeOption,
                        selected && { backgroundColor: Academic.softBlue },
                        pressed && styles.pressed,
                      ]}>
                      <View style={[styles.themeIcon, { backgroundColor: selected ? Academic.softBlue : Academic.muted }]}>
                        <AcademicIcon name={option.icon} color={selected ? Academic.primary : Academic.textSecondary} size={20} />
                      </View>
                      <View style={styles.themeCopy}>
                        <Text style={styles.themeLabel}>{option.label}</Text>
                        <Text style={styles.themeDescription}>{option.description}</Text>
                      </View>
                      <AcademicIcon
                        name={selected
                          ? { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }
                          : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
                        color={selected ? Academic.primary : Academic.textSecondary}
                        size={21}
                      />
                    </Pressable>
                  </View>
                );
              })}
            </SurfaceCard>
          </View>
        </View>

        <SectionHeader title="Institution" />
        <SurfaceCard style={styles.infoCard}>
          <InfoRow icon={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }} label="System" value="CAS Assist v1.0" />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <InfoRow icon={{ ios: 'graduationcap', android: 'school', web: 'school' }} label="College" value="College of Arts and Sciences" />
          <View style={[styles.separator, { backgroundColor: theme.border }]} />
          <InfoRow icon={{ ios: 'building.2', android: 'domain', web: 'domain' }} label="School" value="New Era University" />
        </SurfaceCard>

        {!editing ? (
          <Pressable
            style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
            onPress={() => { setEditing(true); setDisplayName(profile?.display_name ?? ''); }}>
            <Text style={styles.secondaryButtonText}>Edit Display Name</Text>
          </Pressable>
        ) : (
          <View style={styles.editRow}>
            <Pressable style={({ pressed }) => [styles.cancelButton, pressed && styles.pressed]} onPress={() => setEditing(false)}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.saveButton, (pressed || saving) && styles.pressed]}
              onPress={handleSave}
              disabled={saving}>
              {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveButtonText}>Save</Text>}
            </Pressable>
          </View>
        )}

        <Pressable style={({ pressed }) => [styles.signOutButton, pressed && styles.pressed]} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: Parameters<typeof AcademicIcon>[0]['name'];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoLeft}>
        <AcademicIcon name={icon} color={Academic.textSecondary} size={18} />
        <Text style={styles.infoLabel}>{label}</Text>
      </View>
      <Text style={styles.infoValue} numberOfLines={2}>{value}</Text>
    </View>
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
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  avatarLetter: { color: '#FFFFFF', fontSize: 22, fontWeight: '900' },
  identityCard: { gap: Spacing.two },
  displayName: { color: Academic.navy, fontSize: 22, fontWeight: '700', letterSpacing: -0.35 },
  nameInput: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontFamily: Fonts.sans,
    fontSize: 18,
    fontWeight: '700',
  },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  sectionGrid: { gap: Spacing.three },
  sectionGridWide: { flexDirection: 'row', alignItems: 'stretch' },
  sectionColumn: { flex: 1, gap: Spacing.two, minWidth: 0 },
  infoCard: { paddingVertical: 4 },
  appearanceCard: { padding: 6 },
  themeOption: {
    minHeight: 66,
    borderRadius: 14,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeCopy: { flex: 1, gap: 2 },
  themeLabel: { color: Academic.navy, fontSize: 14, fontWeight: '900' },
  themeDescription: { color: Academic.textSecondary, fontSize: 12, lineHeight: 16, fontWeight: '600' },
  infoRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  infoLabel: { color: Academic.textSecondary, fontSize: 13, fontWeight: '800' },
  infoValue: { color: Academic.navy, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'right' },
  separator: { height: 1, backgroundColor: Academic.border },
  secondaryButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  secondaryButtonText: { color: Academic.primary, fontSize: 15, fontWeight: '900' },
  editRow: { flexDirection: 'row', gap: Spacing.two },
  cancelButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.muted,
  },
  cancelButtonText: { color: Academic.textSecondary, fontSize: 15, fontWeight: '900' },
  saveButton: {
    flex: 2,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  saveButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  signOutButton: {
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.errorBg,
  },
  signOutText: { color: Academic.error, fontSize: 15, fontWeight: '900' },
  errorBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: 13, fontWeight: '800' },
  successBox: { borderRadius: 14, padding: 12, backgroundColor: Academic.successBg },
  successText: { color: Academic.success, fontSize: 13, fontWeight: '800' },
});
