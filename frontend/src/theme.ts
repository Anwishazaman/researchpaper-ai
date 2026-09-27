import { createDarkTheme, createLightTheme, type BrandVariants } from '@fluentui/react-components';

const brandRamp: BrandVariants = {
  10: '#061B0C',
  20: '#0A2D14',
  30: '#0E401D',
  40: '#125325',
  50: '#16692F',
  60: '#23803D',
  70: '#31964B',
  80: '#43AD5C',
  90: '#5CC46F',
  100: '#78D986',
  110: '#98E69F',
  120: '#B5EDB9',
  130: '#CFF3D1',
  140: '#E0F7E2',
  150: '#ECFAED',
  160: '#F5FCF5',
};

export const lightTheme = {
  ...createLightTheme(brandRamp),
  colorNeutralBackground1: '#FFFFFF',
  colorNeutralBackground2: '#F4F7F5',
  colorNeutralBackground3: '#EAF0EC',
  colorNeutralForeground1: '#202B28',
  colorNeutralForeground2: '#65746E',
  colorNeutralStroke1: '#D5DFDA',
  fontFamilyBase: '"IBM Plex Sans", sans-serif',
};

export const darkTheme = {
  ...createDarkTheme(brandRamp),
  colorNeutralBackground1: '#17211C',
  colorNeutralBackground2: '#202C25',
  colorNeutralBackground3: '#2A382F',
  colorNeutralForeground1: '#EEF4F0',
  colorNeutralForeground2: '#A7B6AD',
  colorNeutralStroke1: '#405148',
  fontFamilyBase: '"IBM Plex Sans", sans-serif',
};

export type ThemeMode = 'light' | 'dark' | 'system';

export function readThemeMode(): ThemeMode {
  const stored = window.localStorage.getItem('app-theme');
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}