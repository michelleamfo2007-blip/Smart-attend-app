import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'defaultSemiBold' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code' | 'logo';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'title' && styles.title,
        type === 'logo' && styles.logo,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  logo: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 28,
  },
  title: {
    fontFamily: 'Poppins_700Bold',
    fontSize: 24,
  },
  subtitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
  },
  default: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  defaultSemiBold: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
  },
  small: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  smallBold: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
  },
  link: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
  },
  linkPrimary: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: '700' as const }) ?? '500',
    fontSize: 12,
  },
});
