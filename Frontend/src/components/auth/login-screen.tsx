import { useRef, useState } from 'react';
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
  onNavigateToRegister: () => void;
}

export default function LoginScreen({ onNavigateToRegister }: Props) {
  const { signIn, profileError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const passwordInputRef = useRef<TextInput>(null);

  async function handleSignIn() {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedEmail || !password) {
      setError('Please enter your email and password.');
      return;
    }
    if (!trimmedEmail.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph email addresses are allowed.');
      return;
    }

    setLoading(true);
    const { error: authError } = await signIn(trimmedEmail, password);
    setLoading(false);

    if (authError) setError(authError);
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
          <View style={styles.brand}>
            <View style={styles.logo}>
              <AcademicIcon
                name={{ ios: 'building.columns', android: 'account_balance', web: 'account_balance' }}
                color="#FFFFFF"
                size={34}
              />
            </View>
            <Text style={styles.appName}>CAS Assist</Text>
            <Text style={styles.appSub}>College of Arts and Sciences</Text>
            <Text style={styles.appCopy}>AI-assisted department information and helpdesk for New Era University.</Text>
          </View>

          <SurfaceCard style={styles.card}>
            <Text style={styles.formTitle}>Sign in</Text>
            <Text style={styles.formSub}>Use your institutional account to continue.</Text>

            {error || profileError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{error ?? profileError}</Text>
              </View>
            ) : null}

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>NEU Email</Text>
              <TextInput
                style={styles.input}
                placeholder="yourname@neu.edu.ph"
                placeholderTextColor={Academic.textSecondary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
                textContentType="emailAddress"
                importantForAutofill="yes"
                keyboardType="email-address"
                returnKeyType="next"
                submitBehavior="submit"
                onSubmitEditing={() => passwordInputRef.current?.focus()}
                editable={!loading}
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputRow}>
                <TextInput
                  ref={passwordInputRef}
                  style={styles.inputInner}
                  placeholder="Enter your password"
                  placeholderTextColor={Academic.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="current-password"
                  textContentType="password"
                  importantForAutofill="yes"
                  returnKeyType="done"
                  submitBehavior="blurAndSubmit"
                  onSubmitEditing={handleSignIn}
                  editable={!loading}
                />
                <Pressable onPress={() => setShowPass(value => !value)} hitSlop={8}>
                  <Text style={styles.showText}>{showPass ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [styles.primaryButton, (pressed || loading) && styles.pressed]}
              onPress={handleSignIn}
              disabled={loading}>
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Sign In</Text>}
            </Pressable>
          </SurfaceCard>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Don&apos;t have an account?</Text>
            <Pressable onPress={onNavigateToRegister}>
              <Text style={styles.footerLink}>Register</Text>
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
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  brand: { alignItems: 'center', gap: 8 },
  logo: {
    width: 76,
    height: 76,
    borderRadius: Radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Academic.primary,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.60)',
    boxShadow: '0 18px 44px rgba(11, 125, 119, 0.24)',
  },
  appName: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.display, fontWeight: '700', letterSpacing: -0.8 },
  appSub: { color: Academic.primary, fontFamily: Fonts.sans, fontSize: TypeScale.body, fontWeight: '700', letterSpacing: 0.15 },
  appCopy: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20, textAlign: 'center', maxWidth: 340 },
  card: { width: '100%', maxWidth: 460, alignSelf: 'center', gap: 16, padding: Spacing.four },
  formTitle: { color: Academic.navy, fontFamily: Fonts.sans, fontSize: TypeScale.title, fontWeight: '700', letterSpacing: -0.45 },
  formSub: { color: Academic.textSecondary, fontFamily: Fonts.sans, fontSize: TypeScale.body, lineHeight: 20 },
  errorBox: { borderRadius: 12, padding: 11, backgroundColor: Academic.errorBg },
  errorText: { color: Academic.error, fontSize: TypeScale.body, fontWeight: '600' },
  fieldGroup: { gap: 7 },
  label: { color: Academic.navy, fontSize: TypeScale.body, fontWeight: '600' },
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
  footerText: { color: Academic.textSecondary, fontSize: TypeScale.body },
  footerLink: { color: Academic.primary, fontSize: TypeScale.body, fontWeight: '700' },
});
