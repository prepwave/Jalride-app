import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { colors } from '../../theme';

/**
 * Official JalRide Brand Logo directly from the website (e:\jalride-oauth-final\assets\icons\icon.svg
 * and index.html brand mark).
 *
 * Variants:
 * - 'badge': Official icon badge with deep Ganges teal background (#0a2e36), saffron hull (#e8963c), and mint-white sail (#dcedec).
 * - 'mark': Transparent background mark with boat hull, mast, sail, and river wave.
 * - 'header': Logo mark combined with the official stylized "JALRIDE / जलराइड" brand typography.
 */
export default function JalRideLogo({
  size = 48,
  variant = 'badge',
  textColor,
  style,
}) {
  if (variant === 'mark') {
    return (
      <View style={style}>
        <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          {/* Saffron / Marigold Boat Hull */}
          <Path d="M6 26h28l-4 8H10z" fill="#e8963c" />
          {/* Ganges Teal Mast */}
          <Rect x="19" y="8" width="2.5" height="18" fill="#146b79" />
          {/* Triangular Sail */}
          <Path d="M21.5 10 L30 22 L21.5 22Z" fill="#146b79" />
          {/* Holy Ganga Water Wave */}
          <Path
            d="M8 30q6-3 12 0t12 0"
            stroke="#146b79"
            strokeWidth="1.6"
            fill="none"
            strokeLinecap="round"
          />
        </Svg>
      </View>
    );
  }

  if (variant === 'header') {
    return (
      <View style={[styles.headerRow, style]}>
        <Svg width={size} height={size} viewBox="0 0 40 40" fill="none">
          <Rect width="40" height="40" rx="8" fill="#0a2e36" />
          <Path d="M6 26h28l-4 8H10z" fill="#e8963c" />
          <Rect x="19" y="8" width="2.5" height="18" fill="#dcedec" />
          <Path d="M21.5 10 L30 22 L21.5 22Z" fill="#dcedec" />
        </Svg>
        <View style={styles.headerTextWrap}>
          <Text style={[styles.headerBrandTitle, textColor && { color: textColor }]}>
            JALRIDE
          </Text>
          <Text style={styles.headerBrandSub}>जलराइड · वाराणसी</Text>
        </View>
      </View>
    );
  }

  // Default 'badge' variant (exact replica of website icon.svg / favicon.svg)
  return (
    <View style={style}>
      <Svg width={size} height={size} viewBox="0 0 40 40">
        <Rect width="40" height="40" rx="8" fill="#0a2e36" />
        <Path d="M6 26h28l-4 8H10z" fill="#e8963c" />
        <Rect x="19" y="8" width="2.5" height="18" fill="#dcedec" />
        <Path d="M21.5 10 L30 22 L21.5 22Z" fill="#dcedec" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTextWrap: {
    justifyContent: 'center',
  },
  headerBrandTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0a2e36',
    letterSpacing: 1.2,
  },
  headerBrandSub: {
    fontSize: 11,
    fontWeight: '600',
    color: '#e8963c',
    letterSpacing: 0.8,
  },
});
