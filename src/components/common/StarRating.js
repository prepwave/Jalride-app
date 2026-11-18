import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, typography } from '../../theme';

export default function StarRating({
  rating = 5,
  count,
  size = 14,
  showNumber = true,
  style,
}) {
  const rounded = Math.round(rating * 10) / 10;

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.star, { fontSize: size }]}>★</Text>
      {showNumber && <Text style={styles.ratingNumber}>{rounded.toFixed(1)}</Text>}
      {count !== undefined && <Text style={styles.countText}>({count})</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  star: {
    color: colors.sun,
    marginRight: 4,
  },
  ratingNumber: {
    ...typography.bodyMedium,
    color: colors.ink,
    fontWeight: '700',
  },
  countText: {
    ...typography.bodySmall,
    color: colors.gray500,
    marginLeft: spacing.xs,
  },
});
