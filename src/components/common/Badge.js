import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii, spacing, typography } from '../../theme';

export default function Badge({
  label,
  variant = 'default', // default | success | danger | warning | info | sun | teal
  size = 'medium', // small | medium
  style,
  textStyle,
}) {
  const getBadgeStyle = () => {
    const s = [styles.base];
    if (size === 'small') s.push(styles.small);

    switch (variant) {
      case 'success':
        s.push(styles.success);
        break;
      case 'danger':
        s.push(styles.danger);
        break;
      case 'warning':
        s.push(styles.warning);
        break;
      case 'info':
        s.push(styles.info);
        break;
      case 'sun':
        s.push(styles.sun);
        break;
      case 'teal':
        s.push(styles.teal);
        break;
      default:
        s.push(styles.default);
        break;
    }
    if (style) s.push(style);
    return s;
  };

  const getTextStyle = () => {
    const ts = [styles.text];
    if (size === 'small') ts.push(styles.textSmall);

    switch (variant) {
      case 'success':
        ts.push(styles.textSuccess);
        break;
      case 'danger':
        ts.push(styles.textDanger);
        break;
      case 'warning':
        ts.push(styles.textWarning);
        break;
      case 'info':
        ts.push(styles.textInfo);
        break;
      case 'sun':
        ts.push(styles.textSun);
        break;
      case 'teal':
        ts.push(styles.textTeal);
        break;
      default:
        ts.push(styles.textDefault);
        break;
    }
    if (textStyle) ts.push(textStyle);
    return ts;
  };

  return (
    <View style={getBadgeStyle()}>
      <Text style={getTextStyle()}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  small: {
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  default: {
    backgroundColor: colors.gray100,
  },
  success: {
    backgroundColor: colors.successMist,
  },
  danger: {
    backgroundColor: colors.dangerMist,
  },
  warning: {
    backgroundColor: colors.warningMist,
  },
  info: {
    backgroundColor: colors.infoMist,
  },
  sun: {
    backgroundColor: colors.sunMist,
  },
  teal: {
    backgroundColor: colors.tealMist,
  },
  // Text
  text: {
    ...typography.caption,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  textSmall: {
    fontSize: 10,
  },
  textDefault: {
    color: colors.gray700,
  },
  textSuccess: {
    color: colors.success,
  },
  textDanger: {
    color: colors.danger,
  },
  textWarning: {
    color: colors.warning,
  },
  textInfo: {
    color: colors.info,
  },
  textSun: {
    color: colors.sunDeep,
  },
  textTeal: {
    color: colors.teal,
  },
});
