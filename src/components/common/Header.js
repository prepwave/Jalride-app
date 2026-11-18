import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../../theme';
import JalRideLogo from './JalRideLogo';

export default function Header({
  title,
  subtitle,
  onBack,
  rightAction,
  transparent = false,
  showLogo = false,
  style,
}) {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, 12);

  return (
    <View style={[styles.container, { paddingTop: topPadding }, transparent && styles.transparent, style]}>
      <View style={styles.leftRow}>
        {onBack && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={onBack}
            style={styles.backButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}
        {showLogo && <JalRideLogo size={28} variant="badge" style={{ marginRight: spacing.s }} />}
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )}
        </View>
      </View>
      {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.m,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  transparent: {
    backgroundColor: 'transparent',
    borderBottomWidth: 0,
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.mist,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.m,
  },
  backArrow: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.ink,
    marginTop: -2,
  },
  titleWrap: {
    flex: 1,
  },
  title: {
    ...typography.h3,
    color: colors.ink,
  },
  subtitle: {
    ...typography.caption,
    color: colors.gray500,
    marginTop: 2,
  },
  rightAction: {
    marginLeft: spacing.m,
  },
});
