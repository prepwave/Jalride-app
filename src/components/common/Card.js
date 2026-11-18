import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, radii, shadows, spacing } from '../../theme';

export default function Card({
  children,
  style,
  onPress,
  variant = 'elevated', // elevated | outlined | flat
  padding = 'medium', // none | small | medium | large
  ...props
}) {
  const getCardStyles = () => {
    const s = [styles.base];

    if (variant === 'elevated') s.push(styles.elevated);
    else if (variant === 'outlined') s.push(styles.outlined);
    else if (variant === 'flat') s.push(styles.flat);

    if (padding === 'none') s.push(styles.pNone);
    else if (padding === 'small') s.push(styles.pSmall);
    else if (padding === 'large') s.push(styles.pLarge);
    else s.push(styles.pMedium);

    if (style) s.push(style);

    return s;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={onPress}
        style={getCardStyles()}
        {...props}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View style={getCardStyles()} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.white,
    borderRadius: radii.l,
    overflow: 'hidden',
  },
  elevated: {
    ...shadows.soft,
    borderWidth: 1,
    borderColor: colors.line,
  },
  outlined: {
    borderWidth: 1.2,
    borderColor: colors.gray200,
  },
  flat: {
    backgroundColor: colors.gray50,
  },
  pNone: {
    padding: 0,
  },
  pSmall: {
    padding: spacing.s,
  },
  pMedium: {
    padding: spacing.l,
  },
  pLarge: {
    padding: spacing.xl,
  },
});
