import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface State { hasError: boolean; error?: Error; }

class ErrorBoundary extends React.Component<React.PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  handleRetry = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={styles.container}>
        <Text style={styles.icon}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.message}>
          {this.state.error?.message ?? 'An unexpected error occurred.'}
        </Text>
        <TouchableOpacity style={styles.btn} onPress={this.handleRetry} activeOpacity={0.8}>
          <Text style={styles.btnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: '#fff' },
  icon:      { fontSize: 48, marginBottom: 16 },
  title:     { fontSize: 20, fontWeight: '700', color: '#2f2f2f', marginBottom: 8 },
  message:   { fontSize: 14, color: '#888', textAlign: 'center', marginBottom: 24 },
  btn:       { backgroundColor: '#c24a16', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 },
  btnText:   { color: '#fff', fontWeight: '700', fontSize: 15 },
});

export default ErrorBoundary;
