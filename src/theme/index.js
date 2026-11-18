import { colors, darkColors } from './colors';
import { spacing, radii, shadows } from './spacing';
import { typography } from './typography';

export { colors, darkColors, spacing, radii, shadows, typography };

export const getTheme = (isDark = false) => ({
  colors: isDark ? darkColors : colors,
  spacing,
  radii,
  shadows,
  typography,
  isDark,
});
