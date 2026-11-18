import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';
import Button from './Button';

export default function ErrorState({
  icon = '⚠️',
  title = 'Something Went Wrong',
  message = 'We could not complete your request. Please try again.',
  onRetry,
  style,
}) {
  return (
    <View style={[styles.container, style]}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          onPress={onRetry}
          variant="primary"
          size="medium"
          style={styles.btn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 260,
  },
  icon: {
    fontSize: 44,
    marginBottom: spacing.m,
  },
  title: {
    ...typography.h3,
    color: colors.danger,
    textAlign: 'center',
    marginBottom: spacing.s,
  },
  message: {
    ...typography.body,
    color: colors.gray600,
    textAlign: 'center',
    maxWidth: 290,
    lineHeight: 20,
  },
  btn: {
    marginTop: spacing.xl,
  },
});
