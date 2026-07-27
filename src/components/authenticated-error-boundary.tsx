import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Academic } from '@/components/ui/academic-ui';

interface Props {
  children: ReactNode;
  onSignOut: () => Promise<void>;
}

export default class AuthenticatedErrorBoundary extends Component<Props, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (__DEV__) {
      console.error('Authenticated application render failed', {
        name: error.name,
        componentStack: info.componentStack,
      });
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.title}>CAS Assist could not display this screen</Text>
        <Text style={styles.message}>Please retry. If the problem continues, sign out and sign in again.</Text>
        <Pressable style={styles.primaryButton} onPress={() => this.setState({ hasError: false })}>
          <Text style={styles.primaryButtonText}>Retry</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => void this.props.onSignOut()}>
          <Text style={styles.secondaryButtonText}>Sign Out</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 32,
    backgroundColor: Academic.background,
  },
  title: { color: Academic.navy, fontSize: 22, fontWeight: '900', textAlign: 'center' },
  message: { color: Academic.textSecondary, fontSize: 15, lineHeight: 22, textAlign: 'center' },
  primaryButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: Academic.primary,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '900' },
  secondaryButton: {
    width: '100%',
    maxWidth: 320,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Academic.border,
  },
  secondaryButtonText: { color: Academic.navy, fontSize: 16, fontWeight: '800' },
});
