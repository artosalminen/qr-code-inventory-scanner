# Bilingual EN/FI i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add English/Finnish bilingual support to the QR Code Inventory app using next-intl, with a localStorage-persisted language toggle in the header.

**Architecture:** `NextIntlClientProvider` wraps the app in `_app.tsx`, reading locale from React state (initialized from localStorage on mount). A `LocaleContext` exported from `src/lib/locale.ts` lets any component read and set the active locale. All ~100 hardcoded UI strings are replaced with `useTranslations()` calls.

**Tech Stack:** next-intl, React context, localStorage, Jest + jest-environment-jsdom for locale helper tests

---

## File Map

| Action | File | What changes |
|--------|------|-------------|
| Create | `messages/en.json` | All English strings |
| Create | `messages/fi.json` | All Finnish strings |
| Create | `src/lib/locale.ts` | LocaleContext, getStoredLocale, setStoredLocale |
| Create | `src/__tests__/lib/locale.test.ts` | Unit tests for locale helpers |
| Create | `jest.config.js` | Jest config using next/jest |
| Modify | `src/pages/_app.tsx` | Add NextIntlClientProvider + LocaleContext.Provider |
| Modify | `src/components/Layout.tsx` | Add EN\|FI toggle, translate nav |
| Modify | `src/components/Login.tsx` | Translate all strings |
| Modify | `src/pages/dashboard.tsx` | Translate heading/subtitle |
| Modify | `src/components/Dashboard.tsx` | Translate all strings + state labels |
| Modify | `src/pages/scanner.tsx` | Translate all strings + scan modes |
| Modify | `src/components/QRScanner.tsx` | Translate hint text |
| Modify | `src/pages/admin/index.tsx` | Translate all strings |
| Modify | `src/pages/admin/projects/[id].tsx` | Translate all strings + state/role labels |
| Modify | `src/pages/auth/error.tsx` | Translate all error messages |

---

## Task 1: Install next-intl and set up Jest

**Files:**
- Modify: `package.json`
- Create: `jest.config.js`

- [ ] **Step 1: Install next-intl**

```bash
npm install next-intl
```

Expected: `next-intl` appears in `package.json` dependencies.

- [ ] **Step 2: Install Jest and testing packages**

```bash
npm install --save-dev jest @types/jest jest-environment-jsdom ts-jest
```

- [ ] **Step 3: Create `jest.config.js` at project root**

```js
const nextJest = require('next/jest');
const createJestConfig = nextJest({ dir: './' });

module.exports = createJestConfig({
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
});
```

- [ ] **Step 4: Add test script to `package.json`**

In `package.json`, add to `"scripts"`:
```json
"test": "jest"
```

- [ ] **Step 5: Ensure `resolveJsonModule` is in tsconfig.json**

Open `tsconfig.json`. In `compilerOptions`, verify `"resolveJsonModule": true` is present. If missing, add it.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json jest.config.js tsconfig.json
git commit -m "chore: install next-intl and jest for i18n work"
```

---

## Task 2: Create locale helpers with tests

**Files:**
- Create: `src/lib/locale.ts`
- Create: `src/__tests__/lib/locale.test.ts`

- [ ] **Step 1: Write the failing test first**

Create `src/__tests__/lib/locale.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm test -- --testPathPattern=locale
```

Expected: FAIL — `Cannot find module '@/lib/locale'`

- [ ] **Step 3: Create `src/lib/locale.ts`**

```ts
import { createContext } from 'react';

export type Locale = 'en' | 'fi';

export interface LocaleContextType {
  locale: string;
  setLocale: (locale: string) => void;
}

export const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
});

export const getStoredLocale = (): Locale => {
  if (typeof window === 'undefined') return 'en';
  const stored = localStorage.getItem('locale');
  return stored === 'fi' ? 'fi' : 'en';
};

export const setStoredLocale = (locale: string): void => {
  localStorage.setItem('locale', locale);
};
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npm test -- --testPathPattern=locale
```

Expected: PASS — 4 tests passing

- [ ] **Step 5: Commit**

```bash
git add src/lib/locale.ts src/__tests__/lib/locale.test.ts
git commit -m "feat: add locale helpers with tests"
```

---

## Task 3: Create messages/en.json

**Files:**
- Create: `messages/en.json`

- [ ] **Step 1: Create `messages/en.json` at project root**

```json
{
  "common": {
    "loading": "Loading...",
    "cancel": "Cancel",
    "save": "Save",
    "saving": "Saving...",
    "adding": "Adding...",
    "uploading": "Uploading...",
    "creating": "Creating...",
    "updating": "Updating...",
    "assigning": "Assigning...",
    "processing": "Processing...",
    "edit": "Edit",
    "remove": "Remove",
    "noDescription": "No description",
    "condition": "Condition",
    "conditionOk": "✓ OK",
    "conditionDamaged": "⚠️ Damaged"
  },
  "nav": {
    "dashboard": "Dashboard",
    "scanner": "Scanner",
    "admin": "Admin",
    "signOut": "Sign Out"
  },
  "states": {
    "expected": "Expected",
    "received": "Received",
    "in_use": "In Use",
    "ready_for_checkout": "Ready for Checkout",
    "ready": "Ready",
    "departed": "Departed",
    "all": "All"
  },
  "login": {
    "heading": "Inventory System",
    "subheading": "Real-time equipment tracking and handoff management",
    "featureTrackingTitle": "Real-time Tracking",
    "featureTrackingDesc": "Monitor box status instantly",
    "featureScanTitle": "QR Code Scanning",
    "featureScanDesc": "Quick check-in and check-out",
    "featureTeamTitle": "Team Management",
    "featureTeamDesc": "Role-based access control",
    "signInButton": "Sign in with Google",
    "signingIn": "Signing in...",
    "footer": "Secure authentication with Google OAuth"
  },
  "dashboard": {
    "title": "Dashboard",
    "subtitle": "Track your box inventory in real-time",
    "total": "Total",
    "stateHistory": "State History",
    "noHistory": "No history available",
    "editTitle": "Edit — {label}",
    "describeChange": "Describe the change...",
    "stateLabel": "State",
    "conditionLabel": "Condition",
    "notesOptional": "Notes (optional)",
    "saveFailed": "Failed to save changes"
  },
  "scanner": {
    "title": "Scanner",
    "subtitle": "Scan QR codes to manage box state",
    "confirmScan": "Confirm Scan",
    "qrCode": "QR Code",
    "itemCondition": "Item Condition",
    "notesOptional": "Notes (Optional)",
    "notesPlaceholder": "Add any notes about this scan...",
    "addNewBox": "Add New Box",
    "qrCodeRequired": "QR Code *",
    "qrCodePlaceholder": "QR code...",
    "descriptionOptional": "Description (optional)",
    "descriptionPlaceholder": "Human-readable description...",
    "addAndCheckIn": "Add & Check In",
    "rescan": "Re-scan",
    "openScanner": "Open Scanner",
    "closeScanner": "Close Scanner",
    "addBoxManually": "Add Box Manually",
    "positionCamera": "Position the camera to scan QR codes",
    "pointCamera": "Point camera at QR code to scan",
    "recentScans": "Recent Scans",
    "scanMode": "Scan Mode",
    "checkIn": "Check In",
    "activate": "Activate",
    "return": "Return",
    "checkOut": "Check Out",
    "scanFailed": "Scan failed",
    "addBoxFailed": "Failed to add box",
    "boxAdded": "Box \"{qr}\" added and checked in"
  },
  "admin": {
    "title": "Admin Dashboard",
    "subtitle": "Create and manage projects",
    "createNewProject": "✨ Create New Project",
    "projectNamePlaceholder": "Project name...",
    "projectDescPlaceholder": "Project description (optional)...",
    "createProject": "Create Project",
    "yourProjects": "Your Projects",
    "noProjects": "No projects yet. Create one to get started!",
    "manageProject": "Manage Project →",
    "backToAdmin": "← Back to Admin",
    "manageBoxesTeam": "Manage boxes and team members",
    "addBox": "➕ Add Box",
    "addSingleBox": "Add Single Box",
    "qrCodeRequired": "QR Code *",
    "descriptionOptional": "Description (optional)",
    "addBoxButton": "Add Box",
    "uploadCsv": "📤 Upload CSV",
    "csvFormat": "CSV format: qr_code, label, description",
    "uploadCsvButton": "Upload CSV",
    "boxes": "📦 Boxes",
    "noBoxes": "No boxes in this project yet.",
    "changeState": "Change State",
    "reasonForChange": "Reason for change *",
    "confirmChange": "Confirm Change",
    "editDescription": "Edit Description",
    "boxLabelPlaceholder": "Box label...",
    "assignUsers": "👥 Assign Users",
    "selectUser": "Select user...",
    "assignUser": "Assign User",
    "noUsersAvailable": "No users available. Create a project and login first.",
    "allUsersAssigned": "All available users are already assigned to this project.",
    "teamMembers": "Team Members",
    "noUsersAssigned": "No users assigned to this project yet.",
    "loadingProject": "Loading project...",
    "assignFailed": "Failed to assign user",
    "roleReadOnly": "Read-only",
    "roleInstallation": "Installation",
    "roleInventoryMgmt": "Inventory Mgmt",
    "roleAdmin": "Admin",
    "roleReadOnlyDisplay": "read only",
    "roleInstallationDisplay": "installation",
    "roleInventoryMgmtDisplay": "inventory management",
    "roleAdminDisplay": "admin"
  },
  "errors": {
    "title": "Authentication Error",
    "tryAgain": "Try Again",
    "callback": "There was an issue during authentication. Please try again.",
    "oAuthSignin": "Error connecting to the OAuth provider.",
    "oAuthCallback": "Error completing the OAuth authentication.",
    "emailCreateAccount": "Could not create user account.",
    "oAuthAccountNotLinked": "Email already exists with a different provider.",
    "emailSignInError": "Email sign in failed.",
    "credentialsSignin": "Sign in failed.",
    "sessionCallback": "Session update failed.",
    "default": "An authentication error occurred."
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/en.json
git commit -m "feat: add English message file"
```

---

## Task 4: Create messages/fi.json

**Files:**
- Create: `messages/fi.json`

- [ ] **Step 1: Create `messages/fi.json` at project root**

```json
{
  "common": {
    "loading": "Ladataan...",
    "cancel": "Peruuta",
    "save": "Tallenna",
    "saving": "Tallennetaan...",
    "adding": "Lisätään...",
    "uploading": "Ladataan...",
    "creating": "Luodaan...",
    "updating": "Päivitetään...",
    "assigning": "Lisätään...",
    "processing": "Käsitellään...",
    "edit": "Muokkaa",
    "remove": "Poista",
    "noDescription": "Ei kuvausta",
    "condition": "Kunto",
    "conditionOk": "✓ Kunnossa",
    "conditionDamaged": "⚠️ Vaurioitunut"
  },
  "nav": {
    "dashboard": "Kojelauta",
    "scanner": "Skanneri",
    "admin": "Ylläpito",
    "signOut": "Kirjaudu ulos"
  },
  "states": {
    "expected": "Odotettu",
    "received": "Vastaanotettu",
    "in_use": "Käytössä",
    "ready_for_checkout": "Valmis uloskirjaukseen",
    "ready": "Valmis",
    "departed": "Lähtenyt",
    "all": "Kaikki"
  },
  "login": {
    "heading": "Varastojärjestelmä",
    "subheading": "Reaaliaikainen laitteiden seuranta ja luovutushallinta",
    "featureTrackingTitle": "Reaaliaikainen seuranta",
    "featureTrackingDesc": "Seuraa laatikoiden tilaa välittömästi",
    "featureScanTitle": "QR-koodiskannaus",
    "featureScanDesc": "Nopea sisään- ja uloskirjaus",
    "featureTeamTitle": "Tiiminhallinta",
    "featureTeamDesc": "Roolipohjainen pääsynhallinta",
    "signInButton": "Kirjaudu sisään Googlella",
    "signingIn": "Kirjaudutaan...",
    "footer": "Turvallinen todennus Google OAuth:lla"
  },
  "dashboard": {
    "title": "Kojelauta",
    "subtitle": "Seuraa varastoasi reaaliajassa",
    "total": "Yhteensä",
    "stateHistory": "Tilahistoria",
    "noHistory": "Ei historiaa saatavilla",
    "editTitle": "Muokkaa — {label}",
    "describeChange": "Kuvaile muutos...",
    "stateLabel": "Tila",
    "conditionLabel": "Kunto",
    "notesOptional": "Muistiinpanot (valinnainen)",
    "saveFailed": "Muutosten tallentaminen epäonnistui"
  },
  "scanner": {
    "title": "Skanneri",
    "subtitle": "Skannaa QR-koodeja hallitaksesi laatikoiden tilaa",
    "confirmScan": "Vahvista skannaus",
    "qrCode": "QR-koodi",
    "itemCondition": "Tuotteen kunto",
    "notesOptional": "Muistiinpanot (valinnainen)",
    "notesPlaceholder": "Lisää muistiinpanoja skannauksesta...",
    "addNewBox": "Lisää uusi laatikko",
    "qrCodeRequired": "QR-koodi *",
    "qrCodePlaceholder": "QR-koodi...",
    "descriptionOptional": "Kuvaus (valinnainen)",
    "descriptionPlaceholder": "Ihmisluettava kuvaus...",
    "addAndCheckIn": "Lisää ja kirjaa sisään",
    "rescan": "Skannaa uudelleen",
    "openScanner": "Avaa skanneri",
    "closeScanner": "Sulje skanneri",
    "addBoxManually": "Lisää manuaalisesti",
    "positionCamera": "Aseta kamera skannaamaan QR-koodeja",
    "pointCamera": "Osoita kamera QR-koodia kohti",
    "recentScans": "Viimeisimmät skannaukset",
    "scanMode": "Skannausmoodi",
    "checkIn": "Kirjaa sisään",
    "activate": "Aktivoi",
    "return": "Palauta",
    "checkOut": "Kirjaa ulos",
    "scanFailed": "Skannaus epäonnistui",
    "addBoxFailed": "Laatikon lisääminen epäonnistui",
    "boxAdded": "Laatikko \"{qr}\" lisätty ja kirjattu sisään"
  },
  "admin": {
    "title": "Ylläpitopaneeli",
    "subtitle": "Luo ja hallinnoi projekteja",
    "createNewProject": "✨ Luo uusi projekti",
    "projectNamePlaceholder": "Projektin nimi...",
    "projectDescPlaceholder": "Projektin kuvaus (valinnainen)...",
    "createProject": "Luo projekti",
    "yourProjects": "Projektisi",
    "noProjects": "Ei projekteja vielä. Luo projekti aloittaaksesi!",
    "manageProject": "Hallinnoi projektia →",
    "backToAdmin": "← Takaisin ylläpitoon",
    "manageBoxesTeam": "Hallinnoi laatikoita ja tiimin jäseniä",
    "addBox": "➕ Lisää laatikko",
    "addSingleBox": "Lisää yksittäinen laatikko",
    "qrCodeRequired": "QR-koodi *",
    "descriptionOptional": "Kuvaus (valinnainen)",
    "addBoxButton": "Lisää laatikko",
    "uploadCsv": "📤 Lataa CSV",
    "csvFormat": "CSV-muoto: qr_code, label, description",
    "uploadCsvButton": "Lataa CSV",
    "boxes": "📦 Laatikot",
    "noBoxes": "Ei laatikoita tässä projektissa vielä.",
    "changeState": "Muuta tilaa",
    "reasonForChange": "Muutoksen syy *",
    "confirmChange": "Vahvista muutos",
    "editDescription": "Muokkaa kuvausta",
    "boxLabelPlaceholder": "Laatikon nimiö...",
    "assignUsers": "👥 Lisää käyttäjiä",
    "selectUser": "Valitse käyttäjä...",
    "assignUser": "Lisää käyttäjä",
    "noUsersAvailable": "Ei käyttäjiä saatavilla. Luo projekti ja kirjaudu ensin sisään.",
    "allUsersAssigned": "Kaikki käyttäjät on jo lisätty tähän projektiin.",
    "teamMembers": "Tiimin jäsenet",
    "noUsersAssigned": "Ei käyttäjiä lisätty tähän projektiin vielä.",
    "loadingProject": "Ladataan projektia...",
    "assignFailed": "Käyttäjän lisääminen epäonnistui",
    "roleReadOnly": "Vain luku",
    "roleInstallation": "Asennus",
    "roleInventoryMgmt": "Varastonhallinta",
    "roleAdmin": "Ylläpito",
    "roleReadOnlyDisplay": "vain luku",
    "roleInstallationDisplay": "asennus",
    "roleInventoryMgmtDisplay": "varastonhallinta",
    "roleAdminDisplay": "ylläpito"
  },
  "errors": {
    "title": "Todennusvirhe",
    "tryAgain": "Yritä uudelleen",
    "callback": "Todennuksessa tapahtui virhe. Yritä uudelleen.",
    "oAuthSignin": "Virhe yhdistettäessä OAuth-palveluntarjoajaan.",
    "oAuthCallback": "Virhe OAuth-todennuksen viimeistelyssä.",
    "emailCreateAccount": "Käyttäjätiliä ei voitu luoda.",
    "oAuthAccountNotLinked": "Sähköposti on jo rekisteröity toisella palveluntarjoajalla.",
    "emailSignInError": "Sähköpostikirjautuminen epäonnistui.",
    "credentialsSignin": "Kirjautuminen epäonnistui.",
    "sessionCallback": "Istunnon päivitys epäonnistui.",
    "default": "Todennusvirhe tapahtui."
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add messages/fi.json
git commit -m "feat: add Finnish message file"
```

---

## Task 5: Wire up _app.tsx

**Files:**
- Modify: `src/pages/_app.tsx`

- [ ] **Step 1: Replace `src/pages/_app.tsx` with**

```tsx
import '@/styles/globals.css';
import type { AppProps } from 'next/app';
import { SessionProvider } from 'next-auth/react';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { LocaleContext, getStoredLocale, setStoredLocale } from '@/lib/locale';
import enMessages from '../../messages/en.json';
import fiMessages from '../../messages/fi.json';

const inter = Inter({ subsets: ['latin'] });
const messages = { en: enMessages, fi: fiMessages };

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const [locale, setLocaleState] = useState<'en' | 'fi'>('en');

  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);

  const setLocale = (l: string) => {
    setStoredLocale(l);
    setLocaleState(l as 'en' | 'fi');
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <NextIntlClientProvider locale={locale} messages={messages[locale]}>
        <SessionProvider session={session}>
          <div className={inter.className}>
            <Component {...pageProps} />
          </div>
        </SessionProvider>
      </NextIntlClientProvider>
    </LocaleContext.Provider>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
npm run build
```

Expected: Build succeeds (or shows only pre-existing errors, not new ones from this change).

- [ ] **Step 3: Commit**

```bash
git add src/pages/_app.tsx
git commit -m "feat: add NextIntlClientProvider and LocaleContext to _app"
```

---

## Task 6: Add language toggle to Layout.tsx

**Files:**
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Replace `src/components/Layout.tsx` with**

```tsx
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useContext, useEffect, useState } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { LocaleContext } from '@/lib/locale';

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const { locale, setLocale } = useContext(LocaleContext);
  const t = useTranslations('nav');

  const isActive = (path: string) => router.pathname === path;

  useEffect(() => {
    if (session?.user) {
      axios.get('/api/auth/user')
        .then((res) => setIsAdmin(res.data.isAdmin ?? false))
        .catch(() => setIsAdmin(false));
    }
  }, [session]);

  const navItems = [
    { label: t('dashboard'), path: '/dashboard', icon: '📊' },
    { label: t('scanner'), path: '/scanner', icon: '📱' },
    ...(isAdmin ? [{ label: t('admin'), path: '/admin', icon: '⚙️' }] : []),
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <header className="bg-slate-900 border-b border-slate-700 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-lg">
                📦
              </div>
              <span className="hidden sm:inline text-xl font-bold text-slate-50">
                Inventory
              </span>
            </Link>

            <nav className="hidden md:flex gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={`px-4 py-2 rounded-lg transition flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>

            <div className="flex items-center gap-4">
              {session?.user?.email && (
                <div className="hidden sm:block text-sm text-slate-400">
                  {session.user.email}
                </div>
              )}

              {/* Language toggle */}
              <div className="flex items-center gap-1 text-sm font-medium">
                <button
                  onClick={() => setLocale('en')}
                  className={locale === 'en' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200 transition'}
                >
                  EN
                </button>
                <span className="text-slate-600">|</span>
                <button
                  onClick={() => setLocale('fi')}
                  className={locale === 'fi' ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-200 transition'}
                >
                  FI
                </button>
              </div>

              <button
                onClick={() => signOut({ redirect: true, callbackUrl: '/' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
              >
                {t('signOut')}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-300 hover:bg-slate-800 rounded-lg"
              >
                ☰
              </button>
            </div>
          </div>

          {mobileMenuOpen && (
            <nav className="md:hidden pb-4 border-t border-slate-700">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-3 rounded-lg transition flex items-center gap-2 ${
                    isActive(item.path)
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </nav>
          )}
        </div>
      </header>

      <main className="w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Layout.tsx
git commit -m "feat: add EN|FI language toggle to header"
```

---

## Task 7: Translate Login.tsx

**Files:**
- Modify: `src/components/Login.tsx`

- [ ] **Step 1: Replace `src/components/Login.tsx` with**

```tsx
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

export default function Login() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const t = useTranslations('login');

  useEffect(() => {
    const handleSignIn = async () => {
      setIsLoading(true);
      await signIn('google', { redirect: false });
    };
    if (router.query.signin) {
      handleSignIn();
    }
  }, [router.query.signin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 w-80 h-80 bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 sm:p-12 shadow-2xl backdrop-blur-xl bg-opacity-80">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <span className="text-3xl">📦</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50 text-center mb-2">
            {t('heading')}
          </h1>
          <p className="text-slate-400 text-center text-sm sm:text-base mb-8">
            {t('subheading')}
          </p>

          <div className="space-y-3 mb-8">
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureTrackingTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureTrackingDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureScanTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureScanDesc')}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-blue-400 text-xl mt-1">✓</span>
              <div>
                <p className="text-slate-50 font-medium text-sm">{t('featureTeamTitle')}</p>
                <p className="text-slate-400 text-xs">{t('featureTeamDesc')}</p>
              </div>
            </div>
          </div>

          <button
            onClick={() => signIn('google', { redirect: true, callbackUrl: '/dashboard' })}
            disabled={isLoading}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 active:scale-95"
          >
            {isLoading ? (
              <>
                <span className="animate-spin">⌛</span>
                {t('signingIn')}
              </>
            ) : (
              <>
                <span>🔐</span>
                {t('signInButton')}
              </>
            )}
          </button>

          <p className="text-xs text-slate-500 text-center mt-6">
            {t('footer')}
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Login.tsx
git commit -m "feat: translate Login component"
```

---

## Task 8: Translate dashboard.tsx page

**Files:**
- Modify: `src/pages/dashboard.tsx`

- [ ] **Step 1: Replace `src/pages/dashboard.tsx` with**

```tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Dashboard from '@/components/Dashboard';
import Layout from '@/components/Layout';
import { Project } from '@/types';
import { useTranslations } from 'next-intl';

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">{tCommon('loading')}</div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{t('title')}</h1>
            <p className="text-slate-400 mt-1">{t('subtitle')}</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2 bg-slate-800 border border-slate-600 text-slate-50 rounded-lg hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {selectedProjectId && <Dashboard projectId={selectedProjectId} />}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/dashboard.tsx
git commit -m "feat: translate dashboard page"
```

---

## Task 9: Translate Dashboard.tsx component

**Files:**
- Modify: `src/components/Dashboard.tsx`

- [ ] **Step 1: Replace `src/components/Dashboard.tsx` with**

```tsx
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { useTranslations } from 'next-intl';
import { Box, BoxState, BoxStateHistory, ProjectUser } from '@/types';
import RealtimeSync from './RealtimeSync';

interface DashboardProps {
  projectId: string;
}

const stateColors: Record<BoxState, string> = {
  expected: 'bg-purple-900 border-purple-500 hover:bg-purple-800',
  received: 'bg-blue-900 border-blue-500 hover:bg-blue-800',
  in_use: 'bg-yellow-900 border-yellow-500 hover:bg-yellow-800',
  ready_for_checkout: 'bg-orange-900 border-orange-500 hover:bg-orange-800',
  departed: 'bg-green-900 border-green-500 hover:bg-green-800',
};

interface BoxWithState extends Box {
  currentState?: BoxState;
  stateHistory?: BoxStateHistory[];
}

export default function Dashboard({ projectId }: DashboardProps) {
  const { data: session } = useSession();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const tStates = useTranslations('states');

  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [selectedBox, setSelectedBox] = useState<BoxWithState | null>(null);
  const [history, setHistory] = useState<BoxStateHistory[]>([]);
  const [filterState, setFilterState] = useState<BoxState | 'all'>('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editState, setEditState] = useState<BoxState>('received');
  const [editCondition, setEditCondition] = useState('ok');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    fetchBoxes();
    if (session?.user?.email) {
      fetchProjectRole();
    }
  }, [projectId, session]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_ENABLE_SOCKET === 'true') return;
    const interval = setInterval(fetchBoxes, 10000);
    return () => clearInterval(interval);
  }, [projectId]);

  async function fetchBoxes() {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}/boxes`);
      setBoxes(
        data.map((box: any) => ({
          ...box,
          currentState: (box.stateHistory?.[0]?.state || 'received') as BoxState,
        })),
      );
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    }
  }

  async function fetchProjectRole() {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      const currentUserProject = data.projectUsers?.find(
        (pu: ProjectUser) => pu.userId === (session?.user as any)?.id,
      );
      setUserRole(currentUserProject?.role || null);
    } catch (error) {
      console.error('Failed to fetch project role:', error);
    }
  }

  async function handleSelectBox(box: BoxWithState) {
    setSelectedBox(box);
    try {
      const { data } = await axios.get(`/api/boxes/${box.id}`);
      setHistory(data.stateHistory || []);
    } catch (error) {
      console.error('Failed to fetch box history:', error);
    }
  }

  function handleOpenEdit() {
    setEditState((selectedBox?.currentState || 'received') as BoxState);
    setEditCondition(history[0]?.condition ?? 'ok');
    setEditNotes('');
    setEditError('');
    setEditModalOpen(true);
  }

  async function handleSaveEdit() {
    if (!selectedBox || isSaving) return;
    setIsSaving(true);
    setEditError('');
    try {
      await axios.post(`/api/boxes/${selectedBox.id}/state-override`, {
        newState: editState,
        condition: editCondition,
        notes: editNotes || undefined,
      });
      setEditModalOpen(false);
      fetchBoxes();
      handleSelectBox(selectedBox);
    } catch (error: any) {
      setEditError(error.response?.data?.error || t('saveFailed'));
    } finally {
      setIsSaving(false);
    }
  }

  function handleBoxStateChanged(payload: any) {
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === payload.boxId ? { ...b, currentState: payload.newState as BoxState } : b,
      ),
    );
    if (selectedBox?.id === payload.boxId) {
      setSelectedBox((prev) =>
        prev ? { ...prev, currentState: payload.newState as BoxState } : null,
      );
    }
  }

  const stats = {
    total: boxes.length,
    expected: boxes.filter((b) => b.currentState === 'expected').length,
    received: boxes.filter((b) => b.currentState === 'received').length,
    inUse: boxes.filter((b) => b.currentState === 'in_use').length,
    readyForCheckout: boxes.filter((b) => b.currentState === 'ready_for_checkout').length,
    departed: boxes.filter((b) => b.currentState === 'departed').length,
  };

  const filteredBoxes =
    filterState === 'all' ? boxes : boxes.filter((b) => b.currentState === filterState);

  return (
    <>
      <RealtimeSync projectId={projectId} onBoxStateChanged={handleBoxStateChanged} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{t('total')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-slate-50 mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-800 border border-purple-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{tStates('expected')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-purple-400 mt-2">{stats.expected}</div>
        </div>
        <div className="bg-slate-800 border border-blue-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{tStates('received')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-blue-400 mt-2">{stats.received}</div>
        </div>
        <div className="bg-slate-800 border border-yellow-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{tStates('in_use')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-yellow-400 mt-2">{stats.inUse}</div>
        </div>
        <div className="bg-slate-800 border border-orange-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{tStates('ready')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-orange-400 mt-2">{stats.readyForCheckout}</div>
        </div>
        <div className="bg-slate-800 border border-green-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">{tStates('departed')}</div>
          <div className="text-2xl sm:text-4xl font-bold text-green-400 mt-2">{stats.departed}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'expected', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${
              filterState === state
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {state === 'all' ? tStates('all') : tStates(state)}
          </button>
        ))}
      </div>

      {/* Boxes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4 mb-24 sm:mb-0">
        {filteredBoxes.map((box) => {
          const currentState = (box.currentState || 'received') as BoxState;
          return (
            <button
              key={box.id}
              onClick={() => handleSelectBox(box)}
              className={`p-4 sm:p-6 rounded-lg border-2 cursor-pointer transition active:scale-95 text-left ${
                stateColors[currentState]
              } ${selectedBox?.id === box.id ? 'ring-2 ring-blue-400 bg-opacity-20' : ''}`}
            >
              <div className="font-bold text-sm sm:text-base truncate text-slate-50">
                {box.qrCode}
              </div>
              <div className="text-[10px] leading-tight text-slate-300 mt-1">{box.description || '-'}</div>
              <div className="mt-3 text-sm sm:text-base font-medium text-slate-50">
                {tStates(currentState)}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Sheet - Box Details */}
      {selectedBox && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-600 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto rounded-t-lg sm:rounded-t-xl z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.qrCode}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{selectedBox.description || selectedBox.qrCode}</p>
              </div>
              <div className="flex items-center gap-1">
                {userRole && ['admin', 'inventory_management'].includes(userRole) && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                    title={tCommon('edit')}
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => setSelectedBox(null)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">{t('stateHistory')}</h4>
                {history.length > 0 ? (
                  history.map((h) => (
                    <div key={h.id} className="bg-slate-700 border border-slate-600 p-4 rounded-lg">
                      <div className="font-medium text-slate-50">{tStates(h.state as BoxState)}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                      {h.notes && <div className="mt-2 text-slate-300 text-sm">{h.notes}</div>}
                      {h.condition && (
                        <div className="text-xs font-medium text-slate-400 mt-1">
                          {tCommon('condition')}: {h.condition}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-sm">{t('noHistory')}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedBox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
          onClick={() => setSelectedBox(null)}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 z-50" onClick={() => setEditModalOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-bold text-slate-50">
                  {t('editTitle', { label: selectedBox?.qrCode || selectedBox?.label || '' })}
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('stateLabel')}</label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value as BoxState)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {(['expected', 'received', 'in_use', 'ready_for_checkout', 'departed'] as BoxState[]).map((s) => (
                      <option key={s} value={s}>{tStates(s)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('conditionLabel')}</label>
                  <div className="flex gap-3">
                    {(['ok', 'damaged'] as const).map((val) => (
                      <button
                        key={val}
                        onClick={() => setEditCondition(val)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-sm ${
                          editCondition === val
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {val === 'ok' ? tCommon('conditionOk') : tCommon('conditionDamaged')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">{t('notesOptional')}</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder={t('describeChange')}
                  />
                </div>
                {editError && (
                  <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                    {editError}
                  </p>
                )}
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                >
                  {tCommon('cancel')}
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {isSaving ? tCommon('saving') : tCommon('save')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Dashboard.tsx
git commit -m "feat: translate Dashboard component"
```

---

## Task 10: Translate scanner.tsx page

**Files:**
- Modify: `src/pages/scanner.tsx`

- [ ] **Step 1: Replace `src/pages/scanner.tsx` with**

```tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { BoxState, Project, ScanAction } from '@/types';
import { useTranslations } from 'next-intl';

interface ScanHistoryEntry {
  label: string;
  qrCode: string;
  newState: BoxState;
  timestamp: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const stateBadgeColors: Record<BoxState, string> = {
  expected: 'bg-purple-900/50 text-purple-300 border border-purple-700',
  received: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  in_use: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  ready_for_checkout: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  departed: 'bg-green-900/50 text-green-300 border border-green-700',
};

export default function ScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('scanner');
  const tCommon = useTranslations('common');
  const tStates = useTranslations('states');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanAction>('check_in');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [lastMessageType, setLastMessageType] = useState<'success' | 'error'>('success');
  const [condition, setCondition] = useState('ok');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [addBoxFormOpen, setAddBoxFormOpen] = useState(false);
  const [addBoxQr, setAddBoxQr] = useState('');
  const [addBoxLabel, setAddBoxLabel] = useState('');
  const [addBoxError, setAddBoxError] = useState('');
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [pendingScanQr, setPendingScanQr] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProjectId) fetchProjectRole(selectedProjectId);
  }, [selectedProjectId, session]);

  useEffect(() => {
    setPendingScanQr(null);
    setAddBoxFormOpen(false);
    setAddBoxQr('');
    setAddBoxLabel('');
    setAddBoxError('');
    setLastMessage('');
  }, [selectedProjectId, scanMode]);

  async function fetchProjectRole(projectId: string) {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      const currentUserProject = data.projectUsers?.find(
        (pu: any) => pu.userId === (session?.user as any)?.id,
      );
      setUserRole(currentUserProject?.role || null);
    } catch {
      setUserRole(null);
    }
  }

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function handleScan(qrCode: string) {
    if (!selectedProjectId || isProcessing) return;
    setPendingScanQr(qrCode);
    setScannerOpen(false);
    setLastMessage('');
  }

  async function handleConfirmScan() {
    if (!pendingScanQr || !selectedProjectId || isProcessing) return;
    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/boxes/scan', {
        projectId: selectedProjectId,
        qrCode: pendingScanQr,
        action: scanMode,
        condition,
        notes,
      });
      setLastMessage(`${data.box.label || 'Box'} — ${tStates(data.newState)}`);
      setLastMessageType('success');
      setScanHistory((prev) =>
        [
          {
            label: data.box.label || data.box.qrCode,
            qrCode: data.box.qrCode,
            newState: data.newState as BoxState,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5),
      );
      setPendingScanQr(null);
      setNotes('');
      setCondition('ok');
      setTimeout(() => setScannerOpen(true), 1500);
    } catch (error: any) {
      const isNotFound = error.response?.status === 404;
      if (isNotFound && canAddBoxes) {
        setAddBoxFormOpen(true);
        setAddBoxQr(pendingScanQr);
        setAddBoxLabel('');
        setAddBoxError('');
      } else {
        setLastMessage(error.response?.data?.error || t('scanFailed'));
        setLastMessageType('error');
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleRescan() {
    setPendingScanQr(null);
    setCondition('ok');
    setNotes('');
    setLastMessage('');
    setAddBoxFormOpen(false);
    setScannerOpen(true);
  }

  async function handleAddBox() {
    if (!addBoxQr.trim() || !selectedProjectId || isAddingBox) return;
    setIsAddingBox(true);
    setAddBoxError('');
    try {
      await axios.post(`/api/projects/${selectedProjectId}/boxes`, {
        qrCode: addBoxQr.trim(),
        description: addBoxLabel.trim() || undefined,
        condition,
        notes: notes || undefined,
      });
      setLastMessage(t('boxAdded', { qr: addBoxQr.trim() }));
      setLastMessageType('success');
      setAddBoxFormOpen(false);
      setAddBoxQr('');
      setAddBoxLabel('');
      setScannerOpen(false);
      setScanHistory((prev) =>
        [
          {
            label: addBoxLabel.trim() || addBoxQr.trim(),
            qrCode: addBoxQr.trim(),
            newState: 'received' as BoxState,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5),
      );
    } catch (error: any) {
      setAddBoxError(error.response?.data?.error || t('addBoxFailed'));
    } finally {
      setIsAddingBox(false);
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">{tCommon('loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const canAddBoxes =
    scanMode === 'check_in' && ['admin', 'inventory_management'].includes(userRole ?? '');

  const scanModes: { value: ScanAction; label: string; icon: string }[] = [
    { value: 'check_in', label: t('checkIn'), icon: '📥' },
    { value: 'activate', label: t('activate'), icon: '⚡' },
    { value: 'return', label: t('return'), icon: '↩️' },
    { value: 'check_out', label: t('checkOut'), icon: '📤' },
  ];

  const addBoxForm = (
    <div className="bg-slate-700 border border-green-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-50">{t('addNewBox')}</h3>
        <button onClick={() => setAddBoxFormOpen(false)} className="text-slate-400 hover:text-slate-200 transition">✕</button>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{t('qrCodeRequired')}</label>
        <input type="text" value={addBoxQr} onChange={(e) => setAddBoxQr(e.target.value)} placeholder={t('qrCodePlaceholder')} className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{t('descriptionOptional')}</label>
        <input type="text" value={addBoxLabel} onChange={(e) => setAddBoxLabel(e.target.value)} placeholder={t('descriptionPlaceholder')} className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="text-xs text-slate-400 bg-slate-600 rounded-lg px-3 py-2">
        {tCommon('condition')}: <span className="text-slate-200 font-medium">
          {condition === 'ok' ? tCommon('conditionOk') : tCommon('conditionDamaged')}
        </span>
        {notes && <> · {notes}</>}
      </div>
      {addBoxError && <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{addBoxError}</p>}
      <button onClick={handleAddBox} disabled={isAddingBox || !addBoxQr.trim()} className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95">
        {isAddingBox ? tCommon('adding') : t('addAndCheckIn')}
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{t('title')}</h1>
            <p className="text-slate-400 mt-1">{t('subtitle')}</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-600 text-slate-50 rounded-lg hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {lastMessage && !pendingScanQr && (
          <div className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
            lastMessageType === 'success'
              ? 'bg-green-900 border border-green-600 text-green-200'
              : 'bg-red-900 border border-red-600 text-red-200'
          }`}>
            <span className="text-2xl">{lastMessageType === 'success' ? '✓' : '✗'}</span>
            <span>{lastMessage}</span>
          </div>
        )}

        {pendingScanQr !== null ? (
          <div className="bg-slate-800 border border-blue-600 rounded-lg overflow-hidden">
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-50 mb-1">{t('confirmScan')}</h2>
                <p className="text-slate-400 text-sm">
                  {scanModes.find((m) => m.value === scanMode)?.icon}{' '}
                  {scanModes.find((m) => m.value === scanMode)?.label}
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">{t('qrCode')}</div>
                <div className="font-mono text-slate-50 text-sm break-all">{pendingScanQr}</div>
              </div>

              {['check_in', 'check_out'].includes(scanMode) && (
                <div>
                  <label className="block text-slate-200 font-semibold mb-3">{t('itemCondition')}</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'ok', label: tCommon('conditionOk'), icon: '👍' },
                      { value: 'damaged', label: tCommon('conditionDamaged'), icon: '🔧' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setCondition(opt.value)}
                        className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                          condition === opt.value
                            ? 'bg-green-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        <span>{opt.icon}</span>
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-200 font-semibold mb-3">{t('notesOptional')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              {addBoxFormOpen && addBoxForm}

              {lastMessage && lastMessageType === 'error' && (
                <div className="p-4 rounded-lg font-semibold flex items-center gap-3 bg-red-900 border border-red-600 text-red-200">
                  <span className="text-2xl">✗</span>
                  <span>{lastMessage}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRescan}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition"
                >
                  {t('rescan')}
                </button>
                <button
                  onClick={handleConfirmScan}
                  disabled={isProcessing || addBoxFormOpen}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
                >
                  {isProcessing ? tCommon('processing') : tCommon('confirm')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-slate-200 font-semibold mb-3">{t('scanMode')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scanModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setScanMode(mode.value)}
                      className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                        scanMode === mode.value
                          ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{mode.icon}</span>
                      <span className="text-xs">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {scannerOpen && (
                <div className="rounded-lg overflow-hidden border-2 border-blue-500">
                  <QRScanner isOpen={scannerOpen} onScan={handleScan} />
                </div>
              )}

              <button
                onClick={() => setScannerOpen(!scannerOpen)}
                disabled={isProcessing}
                className={`w-full px-6 py-4 rounded-lg font-semibold transition text-lg active:scale-95 flex items-center justify-center gap-2 ${
                  scannerOpen
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {scannerOpen
                  ? <><span>✕</span> {t('closeScanner')}</>
                  : <><span>📱</span> {t('openScanner')}</>}
              </button>

              {canAddBoxes && !addBoxFormOpen && (
                <button
                  onClick={() => { setAddBoxFormOpen(true); setAddBoxQr(''); setAddBoxLabel(''); setAddBoxError(''); }}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-dashed border-slate-500 text-slate-300 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <span>➕</span> {t('addBoxManually')}
                </button>
              )}

              {addBoxFormOpen && addBoxForm}

              <div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
                💡 {t('positionCamera')}
              </div>
            </div>
          </div>
        )}

        {scanHistory.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-slate-200 text-sm">{t('recentScans')}</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-50 text-sm truncate">{entry.label}</div>
                    <div className="text-xs text-slate-500 truncate">{entry.qrCode}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stateBadgeColors[entry.newState]}`}>
                      {tStates(entry.newState)}
                    </span>
                    <span className="text-xs text-slate-500 w-16 text-right">{timeAgo(entry.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/scanner.tsx
git commit -m "feat: translate scanner page"
```

---

## Task 11: Translate QRScanner.tsx

**Files:**
- Modify: `src/components/QRScanner.tsx`

- [ ] **Step 1: Replace `src/components/QRScanner.tsx` with**

```tsx
import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<any>(null);
  const t = useTranslations('scanner');

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
      return;
    }

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner(
          containerRef.current!.id,
          { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false, rememberLastUsedCamera: true, supportedScanTypes: [] },
          false,
        );
        scannerRef.current = scanner;
        scanner.render(
          (decodedText: string) => { onScan(decodedText); scanner.clear().catch(() => {}); scannerRef.current = null; },
          (_errorMessage: string) => {},
        );
      } catch (error) {
        console.error('Failed to initialize QR scanner:', error);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="w-full space-y-4">
      <div
        ref={containerRef}
        id="qr-scanner-container"
        className="bg-black rounded-lg overflow-hidden shadow-lg"
        style={{ minHeight: '400px' }}
      />
      <div className="text-center">
        <p className="text-slate-300 text-sm">📱 {t('pointCamera')}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/QRScanner.tsx
git commit -m "feat: translate QRScanner component"
```

---

## Task 12: Translate admin/index.tsx

**Files:**
- Modify: `src/pages/admin/index.tsx`

- [ ] **Step 1: Replace `src/pages/admin/index.tsx` with**

```tsx
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Project } from '@/types';
import { useTranslations } from 'next-intl';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      axios.get('/api/auth/user')
        .then((res) => { if (!res.data.isAdmin) router.push('/dashboard'); })
        .catch(() => router.push('/dashboard'));
    }
  }, [status, router]);

  useEffect(() => { fetchProjects(); }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function createProject() {
    if (!newProjectName.trim()) return;
    setLoading(true);
    try {
      const { data } = await axios.post('/api/projects', {
        name: newProjectName,
        description: newProjectDescription || undefined,
      });
      setProjects([...projects, data]);
      setNewProjectName('');
      setNewProjectDescription('');
    } catch (error) {
      console.error('Failed to create project:', error);
    } finally {
      setLoading(false);
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">{tCommon('loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{t('title')}</h1>
          <p className="text-slate-400 mt-2">{t('subtitle')}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('createNewProject')}</h2>
            <div className="space-y-4">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder={t('projectNamePlaceholder')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder={t('projectDescPlaceholder')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
              />
              <button
                onClick={createProject}
                disabled={loading || !newProjectName.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? tCommon('creating') : t('createProject')}
              </button>
            </div>
          </div>
        </div>

        {projects.length > 0 ? (
          <div>
            <h2 className="text-2xl font-bold text-slate-50 mb-4">{t('yourProjects')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-6 hover:border-slate-600 transition group"
                >
                  <div className="flex flex-col justify-between h-full">
                    <div>
                      <h3 className="text-lg font-bold text-slate-50 group-hover:text-blue-400 transition">
                        {project.name}
                      </h3>
                      {project.description && (
                        <p className="text-sm text-slate-400 mt-2 line-clamp-2">{project.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => router.push(`/admin/projects/${project.id}`)}
                      className="mt-4 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition active:scale-95"
                    >
                      {t('manageProject')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">📦</div>
            <p className="text-slate-400">{t('noProjects')}</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/index.tsx
git commit -m "feat: translate admin dashboard page"
```

---

## Task 13: Translate admin/projects/[id].tsx

**Files:**
- Modify: `src/pages/admin/projects/[id].tsx`

- [ ] **Step 1: Replace `src/pages/admin/projects/[id].tsx` with**

```tsx
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import Layout from '@/components/Layout';
import { Project, ProjectUser, User, Box, BoxState } from '@/types';
import { useTranslations } from 'next-intl';

interface BoxWithState extends Box {
  stateHistory?: Array<{ state: BoxState }>;
}

const stateValues: BoxState[] = ['expected', 'received', 'in_use', 'ready_for_checkout', 'departed'];
const roleValues = ['read_only', 'installation', 'inventory_management', 'admin'] as const;

export default function ProjectManagement() {
  const router = useRouter();
  const { id } = router.query;
  const { data: session } = useSession();
  const t = useTranslations('admin');
  const tCommon = useTranslations('common');
  const tStates = useTranslations('states');

  const [project, setProject] = useState<Project | null>(null);
  const [projectUsers, setProjectUsers] = useState<ProjectUser[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [userRole, setUserRole] = useState<string | null>(null);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRole, setSelectedRole] = useState('read_only');
  const [loading, setLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);

  const [showAddBox, setShowAddBox] = useState(false);
  const [boxQrCode, setBoxQrCode] = useState('');
  const [boxLabel, setBoxLabel] = useState('');
  const [boxDescription, setBoxDescription] = useState('');
  const [addingBox, setAddingBox] = useState(false);

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [uploadingCsv, setUploadingCsv] = useState(false);

  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [newState, setNewState] = useState<BoxState>('received');
  const [overrideReason, setOverrideReason] = useState('');
  const [overridingState, setOverridingState] = useState(false);
  const [editingLabelBoxId, setEditingLabelBoxId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState('');
  const [savingLabel, setSavingLabel] = useState(false);
  const [labelError, setLabelError] = useState('');

  const roleLabels: Record<string, string> = {
    read_only: t('roleReadOnly'),
    installation: t('roleInstallation'),
    inventory_management: t('roleInventoryMgmt'),
    admin: t('roleAdmin'),
  };

  const roleDisplayLabels: Record<string, string> = {
    read_only: t('roleReadOnlyDisplay'),
    installation: t('roleInstallationDisplay'),
    inventory_management: t('roleInventoryMgmtDisplay'),
    admin: t('roleAdminDisplay'),
  };

  useEffect(() => {
    if (typeof id === 'string' && session) fetchProjectData();
  }, [id, session]);

  useEffect(() => {
    if (session) {
      axios.get('/api/auth/user')
        .then((res) => { if (!res.data.isAdmin) router.push('/dashboard'); })
        .catch(() => router.push('/dashboard'));
    }
  }, [session, router]);

  async function fetchProjectData() {
    try {
      const projectRes = await axios.get(`/api/projects/${id}`);
      setProject(projectRes.data);
      setProjectUsers(projectRes.data.projectUsers || []);
      if (session?.user?.email) {
        const currentUserProject = projectRes.data.projectUsers?.find(
          (pu: ProjectUser) => pu.userId === (session?.user as any)?.id,
        );
        setUserRole(currentUserProject?.role || null);
      }
      try {
        const usersRes = await axios.get('/api/users');
        setUsers(usersRes.data);
      } catch (e) {
        setUsers([]);
      }
      try {
        const boxesRes = await axios.get(`/api/projects/${id}/boxes`);
        setBoxes(boxesRes.data);
      } catch (e) {
        console.error('Failed to fetch boxes:', e);
      }
    } catch (error) {
      console.error('Failed to fetch project data:', error);
    }
  }

  async function assignUser() {
    if (!selectedUserId || !id) return;
    setLoading(true);
    setAssignmentError(null);
    try {
      await axios.post(`/api/projects/${id}/users`, { userId: selectedUserId, role: selectedRole });
      setSelectedUserId('');
      fetchProjectData();
    } catch (error: any) {
      setAssignmentError(error.response?.data?.error || t('assignFailed'));
      console.error('Failed to assign user:', error);
    } finally {
      setLoading(false);
    }
  }

  async function removeUser(userId: string) {
    try {
      await axios.delete(`/api/projects/${id}/users/${userId}`);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to remove user:', error);
    }
  }

  async function addBox() {
    if (!boxQrCode.trim() || !id) return;
    setAddingBox(true);
    try {
      await axios.post(`/api/projects/${id}/boxes`, { qrCode: boxQrCode, description: boxDescription });
      setBoxQrCode('');
      setBoxDescription('');
      setShowAddBox(false);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to add box:', error);
    } finally {
      setAddingBox(false);
    }
  }

  async function uploadCsv() {
    if (!csvFile || !id) return;
    setUploadingCsv(true);
    try {
      const csvContent = await csvFile.text();
      await axios.post(`/api/projects/${id}/csv-upload`, { csvContent });
      setCsvFile(null);
      fetchProjectData();
    } catch (error) {
      console.error('Failed to upload CSV:', error);
    } finally {
      setUploadingCsv(false);
    }
  }

  async function overrideBoxState(boxId: string) {
    if (!newState || !overrideReason.trim() || !id) return;
    setOverridingState(true);
    try {
      await axios.post(`/api/boxes/${boxId}/state-override`, { newState, notes: overrideReason });
      setSelectedBoxId(null);
      setOverrideReason('');
      setNewState('received');
      fetchProjectData();
    } catch (error) {
      console.error('Failed to override state:', error);
    } finally {
      setOverridingState(false);
    }
  }

  async function saveLabel(boxId: string) {
    if (!id || savingLabel) return;
    setSavingLabel(true);
    setLabelError('');
    try {
      await axios.patch(`/api/projects/${id}/boxes/${boxId}`, { description: editingLabelValue });
      setEditingLabelBoxId(null);
      fetchProjectData();
    } catch (error: any) {
      setLabelError(error.response?.data?.error || 'Failed to save label');
    } finally {
      setSavingLabel(false);
    }
  }

  const canManageBoxes = userRole && ['admin', 'inventory_management'].includes(userRole);
  const isAdmin = userRole === 'admin';

  if (!project)
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">{t('loadingProject')}</p>
          </div>
        </div>
      </Layout>
    );

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <button
            onClick={() => router.push('/admin')}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium mb-4 flex items-center gap-1"
          >
            {t('backToAdmin')}
          </button>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{project.name}</h1>
          <p className="text-slate-400 mt-2">{t('manageBoxesTeam')}</p>
        </div>

        {canManageBoxes && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">{t('addBox')}</h2>
              {!showAddBox ? (
                <button
                  onClick={() => setShowAddBox(true)}
                  className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition active:scale-95"
                >
                  {t('addSingleBox')}
                </button>
              ) : (
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder={t('qrCodeRequired')}
                    value={boxQrCode}
                    onChange={(e) => setBoxQrCode(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <textarea
                    placeholder={t('descriptionOptional')}
                    value={boxDescription}
                    onChange={(e) => setBoxDescription(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2 flex-col sm:flex-row">
                    <button
                      onClick={addBox}
                      disabled={addingBox || !boxQrCode.trim()}
                      className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                    >
                      {addingBox ? tCommon('adding') : t('addBoxButton')}
                    </button>
                    <button
                      onClick={() => setShowAddBox(false)}
                      className="flex-1 sm:flex-initial px-6 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                    >
                      {tCommon('cancel')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {isAdmin && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-50 mb-4">{t('uploadCsv')}</h2>
              <div className="space-y-4">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
                <p className="text-sm text-slate-400">{t('csvFormat')}</p>
                <button
                  onClick={uploadCsv}
                  disabled={uploadingCsv || !csvFile}
                  className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {uploadingCsv ? tCommon('uploading') : t('uploadCsvButton')}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('boxes')} ({boxes.length})</h2>
            {boxes.length > 0 ? (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {boxes.map((box) => {
                  const currentState = (box.stateHistory?.[0]?.state || 'received') as BoxState;
                  return (
                    <div key={box.id} className="bg-slate-700 border border-slate-600 rounded-lg p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-slate-50 truncate">{box.qrCode}</div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-sm text-slate-400 truncate">
                              {box.description || <span className="italic text-slate-500">{tCommon('noDescription')}</span>}
                            </span>
                            {canManageBoxes && (
                              <button
                                onClick={() => {
                                  setEditingLabelBoxId(box.id);
                                  setEditingLabelValue(box.description || '');
                                  setLabelError('');
                                  setSelectedBoxId(null);
                                }}
                                className="text-slate-500 hover:text-slate-300 transition shrink-0"
                                title={tCommon('edit')}
                              >
                                ✏️
                              </button>
                            )}
                          </div>
                          <div className="mt-2 inline-block">
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-600 text-slate-200">
                              {tStates(currentState)}
                            </span>
                          </div>
                        </div>
                        {canManageBoxes && (
                          <button
                            onClick={() => { setSelectedBoxId(box.id); setEditingLabelBoxId(null); }}
                            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium transition active:scale-95"
                          >
                            {t('changeState')}
                          </button>
                        )}
                      </div>

                      {selectedBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <select
                            value={newState}
                            onChange={(e) => setNewState(e.target.value as BoxState)}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            {stateValues.map((s) => (
                              <option key={s} value={s}>{tStates(s)}</option>
                            ))}
                          </select>
                          <textarea
                            placeholder={t('reasonForChange')}
                            value={overrideReason}
                            onChange={(e) => setOverrideReason(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                            rows={3}
                          />
                          <div className="flex gap-2 flex-col sm:flex-row">
                            <button
                              onClick={() => overrideBoxState(box.id)}
                              disabled={overridingState || !overrideReason.trim()}
                              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                            >
                              {overridingState ? tCommon('updating') : t('confirmChange')}
                            </button>
                            <button
                              onClick={() => setSelectedBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              {tCommon('cancel')}
                            </button>
                          </div>
                        </div>
                      )}

                      {editingLabelBoxId === box.id && (
                        <div className="mt-4 pt-4 border-t border-slate-600 space-y-3">
                          <label className="block text-sm font-medium text-slate-300">{t('editDescription')}</label>
                          <input
                            type="text"
                            value={editingLabelValue}
                            onChange={(e) => setEditingLabelValue(e.target.value)}
                            placeholder={t('boxLabelPlaceholder')}
                            className="w-full px-4 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onKeyDown={(e) => { if (e.key === 'Enter') saveLabel(box.id); if (e.key === 'Escape') setEditingLabelBoxId(null); }}
                            autoFocus
                          />
                          {labelError && <p className="text-sm text-red-400">{labelError}</p>}
                          <div className="flex gap-2">
                            <button
                              onClick={() => saveLabel(box.id)}
                              disabled={savingLabel}
                              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium transition"
                            >
                              {savingLabel ? tCommon('saving') : tCommon('save')}
                            </button>
                            <button
                              onClick={() => setEditingLabelBoxId(null)}
                              className="flex-1 sm:flex-initial px-4 py-2 bg-slate-600 hover:bg-slate-500 text-slate-200 rounded-lg font-medium transition"
                            >
                              {tCommon('cancel')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-slate-400">{t('noBoxes')}</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('assignUsers')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('selectUser')}</option>
                  {users
                    .filter((u) => !projectUsers.find((pu) => pu.userId === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>{u.email}</option>
                    ))}
                </select>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {roleValues.map((role) => (
                    <option key={role} value={role}>{roleLabels[role]}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={assignUser}
                disabled={loading || !selectedUserId}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
              >
                {loading ? tCommon('assigning') : t('assignUser')}
              </button>
              {assignmentError && (
                <p className="text-sm text-red-400 bg-red-950 border border-red-800 p-3 rounded-lg">
                  {assignmentError}
                </p>
              )}
              {users.length === 0 && (
                <p className="text-sm text-slate-400">{t('noUsersAvailable')}</p>
              )}
              {projectUsers.length > 0 &&
                users.filter((u) => !projectUsers.find((pu) => pu.userId === u.id)).length === 0 && (
                  <p className="text-sm text-slate-400">{t('allUsersAssigned')}</p>
                )}
            </div>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-slate-50 mb-4">{t('teamMembers')}</h2>
            {projectUsers.length > 0 ? (
              <div className="space-y-2">
                {projectUsers.map((pu) => (
                  <div key={pu.id} className="flex items-center justify-between p-4 bg-slate-700 rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-50 truncate">
                        {pu.user?.name || pu.user?.email || pu.userId}
                      </div>
                      {pu.user?.name && pu.user?.email && (
                        <div className="text-xs text-slate-500 truncate">{pu.user.email}</div>
                      )}
                      <div className="text-sm text-slate-400">{roleDisplayLabels[pu.role] || pu.role.replace(/_/g, ' ')}</div>
                    </div>
                    <button
                      onClick={() => removeUser(pu.userId)}
                      className="ml-4 px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-900 hover:bg-opacity-20 rounded-lg font-medium transition text-sm"
                    >
                      {tCommon('remove')}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-400">{t('noUsersAssigned')}</p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/admin/projects/\[id\].tsx
git commit -m "feat: translate project management page"
```

---

## Task 14: Translate auth/error.tsx

**Files:**
- Modify: `src/pages/auth/error.tsx`

- [ ] **Step 1: Replace `src/pages/auth/error.tsx` with**

```tsx
import { useRouter } from 'next/router';
import { useSession, signIn } from 'next-auth/react';
import { useTranslations } from 'next-intl';

export default function AuthError() {
  const router = useRouter();
  const { error } = router.query;
  const { data: session } = useSession();
  const t = useTranslations('errors');

  if (session) {
    router.replace('/dashboard');
    return null;
  }

  const errorMessages: Record<string, string> = {
    Callback: t('callback'),
    OAuthSignin: t('oAuthSignin'),
    OAuthCallback: t('oAuthCallback'),
    EmailCreateAccount: t('emailCreateAccount'),
    OAuthAccountNotLinked: t('oAuthAccountNotLinked'),
    EmailSignInError: t('emailSignInError'),
    CredentialsSignin: t('credentialsSignin'),
    SessionCallback: t('sessionCallback'),
    default: t('default'),
  };

  const message = typeof error === 'string'
    ? errorMessages[error] || errorMessages.default
    : errorMessages.default;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold text-red-600 mb-4">{t('title')}</h1>
        <p className="text-gray-700 mb-6">{message}</p>
        <button
          onClick={() => signIn('google')}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
        >
          {t('tryAgain')}
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/auth/error.tsx
git commit -m "feat: translate auth error page"
```

---

## Task 15: Smoke test

- [ ] **Step 1: Run the build to verify no TypeScript errors**

```bash
npm run build
```

Expected: Build succeeds with no new errors.

- [ ] **Step 2: Run the dev server**

```bash
npm run dev
```

- [ ] **Step 3: Manual verification checklist**

Open `http://localhost:3000` and verify:

1. Login page shows English text by default
2. Navigate to dashboard — header shows `EN | FI` toggle
3. Click `FI` — all nav items switch to Finnish (Kojelauta, Skanneri, etc.)
4. Click `EN` — switches back to English
5. Switch to `FI`, refresh the page — Finnish persists (localStorage working)
6. Open browser DevTools → Application → localStorage — confirm `locale: "fi"` is set
7. Go to Scanner page in Finnish — check scan mode buttons, confirm dialog all show Finnish
8. Go to Admin page in Finnish — verify form labels and buttons in Finnish
9. Switch back to `EN` — verify everything returns to English

- [ ] **Step 4: Commit final state if any fixes were needed**

```bash
git add -A
git commit -m "feat: complete bilingual EN/FI i18n implementation"
```
