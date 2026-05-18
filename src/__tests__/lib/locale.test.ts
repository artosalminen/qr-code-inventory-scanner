import { getStoredLocale, setStoredLocale } from '@/lib/locale';

describe('locale helpers', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns "en" when nothing is stored', () => {
    expect(getStoredLocale()).toBe('en');
  });

  it('returns "fi" when "fi" is stored', () => {
    localStorage.setItem('locale', 'fi');
    expect(getStoredLocale()).toBe('fi');
  });

  it('returns "en" for unknown stored values', () => {
    localStorage.setItem('locale', 'de');
    expect(getStoredLocale()).toBe('en');
  });

  it('stores locale in localStorage', () => {
    setStoredLocale('fi');
    expect(localStorage.getItem('locale')).toBe('fi');
  });
});
