import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Academic, AcademicIcon, ActionButton, AppBackdrop, StatusBadge, SurfaceCard, TextField } from '@/components/ui/academic-ui';
import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAuth } from '@/context/auth';
import { useAppTheme } from '@/context/theme';

interface Props {
  onNavigateToLogin: () => void;
  onChangeAccountType: () => void;
}

export default function RegisterScreen({ onNavigateToLogin, onChangeAccountType }: Props) {
  const { signUp } = useAuth();
  const { colors } = useAppTheme();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function handleRegister() {
    setError(null);
    const trimmedName = displayName.trim();
    const trimmedEmail = email.trim().toLowerCase();
    const normalizedStudentNumber = studentNumber.replace(/\s+/g, '');

    if (!trimmedName) { setError('Full name is required.'); return; }
    if (!trimmedEmail.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph email addresses are allowed.');
      return;
    }
    if (!normalizedStudentNumber) { setError('Student number is required.'); return; }
    if (!/^[0-9-]{5,24}$/.test(normalizedStudentNumber) || normalizedStudentNumber.replace(/\D/g, '').length < 5) {
      setError('Enter a valid student number using 5 to 24 digits and hyphens.');
      return;
    }
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setLoading(true);
    const { error: authError, needsConfirmation } = await signUp(
      trimmedEmail,
      password,
      trimmedName,
      normalizedStudentNumber,
    );
    setLoading(false);

    if (authError) {
      setError(authError);
    } else if (needsConfirmation) {
      setConfirmed(true);
    }
  }

  if (confirmed) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <AppBackdrop />
        <View style={styles.confirmedContainer}>
          <View style={[styles.confirmedIcon, { backgroundColor: colors.softBlue }]}>
            <AcademicIcon
              name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
              color={colors.primary}
              size={34}
            />
          </View>
          <Text style={[styles.confirmedTitle, { color: colors.navy }]}>Check Your Email</Text>
          <Text style={[styles.confirmedBody, { color: colors.textSecondary }]}>
            We sent a confirmation link to {email}. Activate your account, then sign in.
          </Text>
          <ActionButton label="Go to Sign In" onPress={onNavigateToLogin} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <AppBackdrop />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        enabled={Platform.OS === 'ios'}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'none'}
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={[styles.logo, { backgroundColor: colors.primary, borderColor: colors.border }]}>
              <AcademicIcon
                name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
                color="#FFFFFF"
                size={32}
              />
            </View>
            <Text style={[styles.formTitle, { color: colors.navy }]}>Create Account</Text>
            <Text style={[styles.formSub, { color: colors.textSecondary }]}>Self-registration is open to CAS students only.</Text>
          </View>

          <SurfaceCard style={styles.card}>
            <StatusBadge label="Student self-registration" tone="blue" />
            <View style={[styles.rulesBox, { backgroundColor: colors.softBlue, borderColor: colors.border }]}>
              <Text style={[styles.rulesTitle, { color: colors.navy }]}>Before you begin</Text>
              <Text style={[styles.rulesText, { color: colors.textSecondary }]}>Use your NEU email, official student number, and a password with at least 8 characters.</Text>
            </View>
            {error ? <View style={[styles.errorBox, { backgroundColor: colors.errorBg }]}><Text style={[styles.errorText, { color: colors.error }]}>{error}</Text></View> : null}

            <TextField
              label="Full Name"
              placeholder="Juan Dela Cruz"
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              editable={!loading}
            />

            <TextField
              label="NEU Email"
              placeholder="yourname@neu.edu.ph"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!loading}
              hint={email.length > 0 && !email.toLowerCase().endsWith('@neu.edu.ph') ? 'Must end with @neu.edu.ph' : undefined}
            />

            <TextField
              label="Student Number"
              placeholder="e.g. 23-12345-678"
              value={studentNumber}
              onChangeText={value => setStudentNumber(value.replace(/[^0-9-]/g, '').slice(0, 24))}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
              maxLength={24}
              editable={!loading}
              hint="Use the student number issued by NEU."
            />

            <TextField
              label="Password"
              placeholder="Min. 8 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPass}
              editable={!loading}
              trailing={
                <Pressable
                  onPress={() => setShowPass(value => !value)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showPass ? 'Hide password' : 'Show password'}>
                  <Text style={[styles.showText, { color: colors.primary }]}>{showPass ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <TextField
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry={!showConfirm}
              returnKeyType="done"
              onSubmitEditing={handleRegister}
              editable={!loading}
              error={confirm.length > 0 && password !== confirm ? 'Passwords do not match' : undefined}
              trailing={
                <Pressable
                  onPress={() => setShowConfirm(value => !value)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}>
                  <Text style={[styles.showText, { color: colors.primary }]}>{showConfirm ? 'Hide' : 'Show'}</Text>
                </Pressable>
              }
            />

            <ActionButton label="Create Account" onPress={handleRegister} loading={loading} />
          </SurfaceCard>

          <View style={styles.footer}>
            <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
            <Pressable onPress={onNavigateToLogin}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
            <Text style={[styles.footerDivider, { color: colors.border }]}>•</Text>
            <Pressable onPress={onChangeAccountType}>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Change account type</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Academic.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    paddingVertical: 40,
    gap: Spacing.four,
  },
  header: { alignItems: 'center', gap: 8 },
  logo: {
    width: 70,
    height: 70,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    boxShadow: '0 18px 44px rgba(11, 125, 119, 0.24)',
  },
  formTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '600', letterSpacing: -0.45 },
  formSub: { color: Academic.textSecondary, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center' },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 15, padding: Spacing.four },
  rulesBox: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 3 },
  rulesTitle: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, fontWeight: '600' },
  rulesText: { fontFamily: Fonts.sans, fontSize: TypeScale.caption, lineHeight: 17 },
  errorBox: { borderRadius: 12, padding: 11, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: TypeScale.body, fontWeight: '600' },
  showText: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '500' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: Academic.textSecondary, fontSize: 14 },
  footerDivider: { color: Academic.border, fontSize: 14, marginHorizontal: 3 },
  footerLink: { color: Academic.primary, fontSize: 14, fontWeight: '500' },
  confirmedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 18,
  },
  confirmedIcon: {
    width: 84,
    height: 84,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.softBlue,
  },
  confirmedTitle: { color: Academic.navy, fontSize: TypeScale.title, fontWeight: '600', textAlign: 'center' },
  confirmedBody: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
