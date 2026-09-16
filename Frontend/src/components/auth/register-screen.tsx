import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Academic, AcademicIcon, AppBackdrop, SurfaceCard } from '@/components/ui/academic-ui';
import { Fonts, Radius, Spacing, TypeScale } from '@/constants/theme';
import { useAuth } from '@/context/auth';

interface Props {
  onNavigateToLogin: () => void;
}

export default function RegisterScreen({ onNavigateToLogin }: Props) {
  const { signUp } = useAuth();
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
      <SafeAreaView style={styles.safe}>
        <AppBackdrop />
        <View style={styles.confirmedContainer}>
          <View style={styles.confirmedIcon}>
            <AcademicIcon
              name={{ ios: 'envelope', android: 'mail', web: 'mail' }}
              color={Academic.primary}
              size={34}
            />
          </View>
          <Text style={styles.confirmedTitle}>Check Your Email</Text>
          <Text style={styles.confirmedBody}>
            We sent a confirmation link to {email}. Activate your account, then sign in.
          </Text>
          <Pressable style={styles.primaryButton} onPress={onNavigateToLogin}>
            <Text style={styles.primaryButtonText}>Go to Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
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
            <View style={styles.logo}>
              <AcademicIcon
                name={{ ios: 'person.badge.plus', android: 'person_add', web: 'person_add' }}
                color="#FFFFFF"
                size={32}
              />
            </View>
            <Text style={styles.formTitle}>Create Account</Text>
            <Text style={styles.formSub}>CAS Assist accounts are for NEU institutional users.</Text>
          </View>

          <SurfaceCard style={styles.card}>
            {error ? <View style={styles.errorBox}><Text style={styles.errorText}>{error}</Text></View> : null}

            <Field label="Full Name">
              <TextInput
                style={styles.input}
                placeholder="Juan Dela Cruz"
                placeholderTextColor={Academic.textSecondary}
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
                autoCorrect={false}
                editable={!loading}
              />
            </Field>

            <Field label="NEU Email">
              <TextInput
                style={styles.input}
                placeholder="yourname@neu.edu.ph"
                placeholderTextColor={Academic.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                editable={!loading}
              />
              {email.length > 0 && !email.toLowerCase().endsWith('@neu.edu.ph') ? (
                <Text style={styles.fieldHint}>Must end with @neu.edu.ph</Text>
              ) : null}
            </Field>

            <Field label="Student Number">
              <TextInput
                style={styles.input}
                placeholder="e.g. 23-12345-678"
                placeholderTextColor={Academic.textSecondary}
                value={studentNumber}
                onChangeText={value => setStudentNumber(value.replace(/[^0-9-]/g, '').slice(0, 24))}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType={Platform.OS === 'ios' ? 'numbers-and-punctuation' : 'default'}
                maxLength={24}
                editable={!loading}
              />
              <Text style={styles.neutralHint}>Use the student number issued by NEU.</Text>
            </Field>

            <Field label="Password">
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={Academic.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowPass(value => !value)} hitSlop={8}>
                  <Text style={styles.showText}>{showPass ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </Field>

            <Field label="Confirm Password">
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.inputInner}
                  placeholder="Re-enter your password"
                  placeholderTextColor={Academic.textSecondary}
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry={!showConfirm}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowConfirm(value => !value)} hitSlop={8}>
                  <Text style={styles.showText}>{showConfirm ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
              {confirm.length > 0 && password !== confirm ? (
                <Text style={styles.fieldHint}>Passwords do not match</Text>
              ) : null}
            </Field>

            <Pressable
              style={({ pressed }) => [styles.primaryButton, (pressed || loading) && styles.pressed]}
              onPress={handleRegister}
              disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Create Account</Text>}
            </Pressable>
          </SurfaceCard>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Pressable onPress={onNavigateToLogin}>
              <Text style={styles.footerLink}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
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
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
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
  formTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '700', letterSpacing: -0.45 },
  formSub: { color: Academic.textSecondary, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center' },
  card: { width: '100%', maxWidth: 520, alignSelf: 'center', gap: 15, padding: Spacing.four },
  errorBox: { borderRadius: 12, padding: 11, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: TypeScale.body, fontWeight: '600' },
  fieldGroup: { gap: 7 },
  label: { color: Academic.navy, fontSize: TypeScale.body, fontWeight: '600' },
  fieldHint: { color: Academic.error, fontSize: 12, fontWeight: '700' },
  neutralHint: { color: Academic.textSecondary, fontSize: 12, fontWeight: '600' },
  input: {
    height: 50,
    borderRadius: Radius.control,
    paddingHorizontal: 14,
    color: Academic.navy,
    backgroundColor: Academic.muted,
    fontSize: 16,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  inputRow: {
    height: 50,
    borderRadius: Radius.control,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    backgroundColor: Academic.muted,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  inputInner: { flex: 1, minHeight: 48, color: Academic.navy, fontSize: 16 },
  showText: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '700' },
  primaryButton: {
    height: 52,
    borderRadius: Radius.control,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: TypeScale.control, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 5 },
  footerText: { color: Academic.textSecondary, fontSize: 14 },
  footerLink: { color: Academic.primary, fontSize: 14, fontWeight: '700' },
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
  confirmedTitle: { color: Academic.navy, fontSize: TypeScale.title, fontWeight: '700', textAlign: 'center' },
  confirmedBody: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
});
