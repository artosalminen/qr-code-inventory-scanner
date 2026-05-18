# Bilingual EN/FI i18n Design

**Date:** 2026-05-18  
**Status:** Approved  
**Library:** next-intl (no routing mode)  
**Languages:** English (default), Finnish  
**Locale storage:** localStorage

---

## Overview

Add bilingual English/Finnish support to the QR Code Inventory app. All ~100 hardcoded UI strings are extracted into translation files. Users toggle language via a header control; preference persists in localStorage across sessions.

---

## Translation File Structure

Two JSON files at the project root:

```
messages/
  en.json
  fi.json
```

Strings are grouped into namespaces matching the app's logical sections:

| Namespace   | Contents |
|-------------|----------|
| `common`    | Shared strings: Loading, Cancel, Save, Edit, Remove, etc. |
| `nav`       | Navigation: Dashboard, Scanner, Admin, Sign Out |
| `states`    | Box state names: Received, In Use, Ready for Checkout, Departed, Expected |
| `login`     | Login page: heading, feature bullets, sign-in button |
| `dashboard` | Dashboard page: title, stats labels, filter tabs, empty states |
| `scanner`   | Scanner page: scan actions, confirm dialog, condition labels, notes |
| `admin`     | Admin pages: project creation, box management, user assignment, CSV upload |
| `errors`    | Auth error page: all error messages, Try Again button |

Dynamic strings with variables use next-intl interpolation syntax:

```json
{ "editTitle": "Edit — {label}" }
```

```tsx
t('editTitle', { label: box.label })
```

---

## Provider & Locale Switching

**No URL-based routing.** Locale is held in React state and persisted to localStorage.

### `src/lib/locale.ts` (new file)

```ts
export const getStoredLocale = () =>
  (typeof window !== 'undefined' && localStorage.getItem('locale')) || 'en';

export const setStoredLocale = (locale: string) =>
  localStorage.setItem('locale', locale);
```

### `src/pages/_app.tsx` changes

1. Import both message files statically
2. Add `LocaleContext` — exports `locale` string and `setLocale` callback
3. On mount, read locale from localStorage via `getStoredLocale()`
4. Hold locale in `useState`
5. Wrap app in `<NextIntlClientProvider locale={locale} messages={messages[locale]}>`

```tsx
import enMessages from '../../messages/en.json';
import fiMessages from '../../messages/fi.json';

const messages = { en: enMessages, fi: fiMessages };

export const LocaleContext = createContext({ locale: 'en', setLocale: (_: string) => {} });

export default function App({ Component, pageProps }: AppProps) {
  const [locale, setLocaleState] = useState('en');

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = (l: string) => {
    setStoredLocale(l);
    setLocaleState(l);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <SessionProvider session={pageProps.session}>
          <Component {...pageProps} />
        </SessionProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
```

### Locale change flow

1. User clicks EN or FI toggle in header
2. `setLocale('fi')` → writes localStorage + updates React state
3. `NextIntlClientProvider` re-renders with Finnish messages
4. All `useTranslations()` calls return Finnish strings immediately — no page reload

---

## Language Toggle UI

Added to `src/components/Layout.tsx` header, right of navigation links and left of Sign Out:

```
[Dashboard]  [Scanner]  [Admin]        [EN | FI]  [Sign Out]
```

Implementation:

```tsx
const { locale, setLocale } = useContext(LocaleContext);

<button onClick={() => setLocale('en')}
  className={locale === 'en' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}>
  EN
</button>
<span className="text-slate-600">|</span>
<button onClick={() => setLocale('fi')}
  className={locale === 'fi' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200'}>
  FI
</button>
```

- Active language: white + semibold
- Inactive language: slate-400 (dimmed), hover lightens
- Matches existing dark slate theme with no new visual components

---

## String Replacement

Each component/page adds one `useTranslations(namespace)` call and replaces hardcoded strings with `t('key')`.

**Files to update (9 total):**

| File | Namespace(s) |
|------|--------------|
| `src/components/Login.tsx` | `login`, `common` |
| `src/components/Layout.tsx` | `nav` |
| `src/components/Dashboard.tsx` | `dashboard`, `states`, `common` |
| `src/components/QRScanner.tsx` | `scanner`, `common` |
| `src/pages/dashboard.tsx` | `dashboard`, `common` |
| `src/pages/scanner.tsx` | `scanner`, `common` |
| `src/pages/admin/index.tsx` | `admin`, `common` |
| `src/pages/admin/projects/[id].tsx` | `admin`, `common` |
| `src/pages/auth/error.tsx` | `errors`, `common` |

**New files:**

| File | Purpose |
|------|---------|
| `messages/en.json` | All English strings |
| `messages/fi.json` | All Finnish strings |
| `src/lib/locale.ts` | localStorage read/write helpers |

---

## Known Limitations

- **SSR locale flash:** On first page load, Next.js renders server-side with `locale = 'en'` (localStorage is unavailable server-side). The `useEffect` in `_app.tsx` then fires and switches to the stored locale. This causes a brief English flash before Finnish appears. This is acceptable given the app's usage pattern (authenticated, interactive tool).

---

## Out of Scope

- URL-based locale routing (not needed for this app)
- Backend/database locale storage (localStorage is sufficient)
- RTL layout support (Finnish is LTR)
- Pluralization rules beyond what next-intl handles by default
