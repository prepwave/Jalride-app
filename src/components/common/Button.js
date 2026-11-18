import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export default function Button({
  title,
  onPress,
  variant = 'primary', // primary | secondary | outline | danger | ghost | sun
  size = 'medium', // small | medium | large
  disabled = false,
  loading = false,
  icon,
  iconRight,
  style,
  textStyle,
}) {
  const getButtonStyles = () => {
    const s = [styles.base];

    // Sizes
    if (size === 'small') s.push(styles.small);
    else if (size === 'large') s.push(styles.large);
    else s.push(styles.medium);

    // Variants
    if (variant === 'primary') s.push(styles.primary);
    else if (variant === 'secondary') s.push(styles.secondary);
    else if (variant === 'outline') s.push(styles.outline);
    else if (variant === 'danger') s.push(styles.danger);
    else if (variant === 'ghost') s.push(styles.ghost);
    else if (variant === 'sun') s.push(styles.sun);

    if (disabled || loading) s.push(styles.disabled);
    if (style) s.push(style);

    return s;
  };

  const getTextStyles = () => {
    const ts = [styles.text];

    if (size === 'small') ts.push(styles.textSmall);
    else if (size === 'large') ts.push(styles.textLarge);

    if (variant === 'outline' || variant === 'ghost') ts.push(styles.textOutline);
    else if (variant === 'secondary') ts.push(styles.textSecondary);
    else if (variant === 'sun') ts.push(styles.textSun);
    else ts.push(styles.textPrimary);

    if (disabled) ts.push(styles.textDisabled);
    if (textStyle) ts.push(textStyle);

    return ts;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.78}
      onPress={onPress}
      disabled={disabled || loading}
      style={getButtonStyles()}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.teal : colors.white}
        />
      ) : (
        <View style={styles.contentRow}>
          {icon && <View style={styles.iconLeft}>{icon}</View>}
          <Text style={getTextStyles()}>{title}</Text>
          {iconRight && <View style={styles.iconRight}>{iconRight}</View>}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.m,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconLeft: {
    marginRight: spacing.s,
  },
  iconRight: {
    marginLeft: spacing.s,
  },
  // Sizes
  small: {
    paddingVertical: 8,
    paddingHorizontal: spacing.m,
    borderRadius: radii.s,
  },
  medium: {
    paddingVertical: 13,
    paddingHorizontal: spacing.xl,
  },
  large: {
    paddingVertical: 16,
    paddingHorizontal: spacing.xxl,
    borderRadius: radii.l,
  },
  // Variants
  primary: {
    backgroundColor: colors.teal,
    borderWidth: 0,
  },
  secondary: {
    backgroundColor: colors.deep,
    borderWidth: 0,
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.teal,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  danger: {
    backgroundColor: colors.danger,
    borderWidth: 0,
  },
  sun: {
    backgroundColor: colors.sun,
    borderWidth: 0,
  },
  disabled: {
    opacity: 0.5,
  },
  // Text
  text: {
    ...typography.button,
    textAlign: 'center',
  },
  textSmall: {
    fontSize: 13,
  },
  textLarge: {
    fontSize: 16,
    fontWeight: '700',
  },
  textPrimary: {
    color: colors.white,
  },
  textSecondary: {
    color: colors.white,
  },
  textOutline: {
    color: colors.teal,
  },
  textSun: {
    color: colors.ink,
    fontWeight: '700',
  },
  textDisabled: {
    color: colors.gray400,
  },
});
