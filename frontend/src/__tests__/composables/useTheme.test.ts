import { describe, it, expect } from 'vitest';
import { useTheme } from '../../composables/useTheme';

describe('useTheme Composable', () => {
  it('provides dark mode reactive state and toggle function', () => {
    const { isDark, toggleDark } = useTheme();

    expect(isDark).toBeDefined();
    expect(typeof toggleDark).toBe('function');
  });
});
