import { useEffect, useRef, useState } from 'react';

import { BarChartCard, DonutChartCard, HeatmapCard, StatCard } from '@/components/charts';
import {
  Button,
  Card,
  Field,
  PageHeader,
  PillButton,
  ProgressBar,
  ScreenFrame,
  SectionHeading,
  TextArea,
  TextInput,
  ToggleRow,
} from '@/components/ui/primitives';
import { parseBackupFile, downloadBackupFile } from '@/features/backup/backup';
import { buildGoalProgressSummary } from '@/features/goals/goal-math';
import { buildInsights } from '@/features/insights/insights';
import { applyThemePreference } from '@/features/theme/theme';
import { generateId } from '@/lib/encoding';
import {
  addMinutes,
  formatDateTimeLocalValue,
  formatDisplayDate,
  formatDisplayTime,
  formatRelativeTimeLabel,
  nowIso,
} from '@/lib/time';
import { cn } from '@/lib/utils';
import {
  createPasskeyVault,
  createPasswordVault,
  deleteEntry,
  exportBackupEnvelope,
  importBackupEnvelope,
  loadVaultMeta,
  loadVaultSnapshot,
  saveEntry,
  saveGoalPlan,
  saveIntentionPlan,
  savePreferences,
  seedInitialVaultState,
  resetStoredVault,
  unlockVault,
  unlockVaultWithDevice,
} from '@/storage/vault-repository';
import {
  APP_NAME,
  type AppPreferences,
  type EntryRecord,
  type EntryType,
  type GoalPlan,
  type IntentionPlan,
  type ThemePreference,
  type UnlockMethod,
  type VaultMeta,
  type VaultSnapshot,
  entryTypes,
  themePreferences,
} from '@/types/models';
import { isPlatformPasskeyAvailable } from '@/crypto/passkey';

type AppStatus = 'booting' | 'onboarding' | 'locked' | 'ready';
type Route = 'log' | 'insights' | 'goals' | 'settings';

interface SessionState {
  meta: VaultMeta;
  rawKeyBytes: Uint8Array;
  snapshot: VaultSnapshot;
}

interface OnboardingDraft {
  unlockMethod: UnlockMethod;
  password: string;
  confirmPassword: string;
  deviceLabel: string;
  theme: ThemePreference;
  intentionStatement: string;
  intentionMotivation: string;
  weeklyTargetHits: number;
  baselineDays: number;
}

interface EntryDraft {
  type: EntryType;
  alone: boolean;
  amountHits: number;
  occurredAt: string;
  note: string;
}

const quickTimeOffsets = [0, 30, 60, 180] as const;

function routeFromLocation(): Route {
  const path = window.location.pathname.replace(/^\/+/, '');

  if (path === 'insights' || path === 'goals' || path === 'settings') {
    return path;
  }

  return 'log';
}

function navigateTo(route: Route) {
  const nextPath = route === 'log' ? '/log' : `/${route}`;

  if (window.location.pathname !== nextPath) {
    window.history.pushState({}, '', nextPath);
  }
}

function createOnboardingDraft(): OnboardingDraft {
  return {
    unlockMethod: 'password',
    password: '',
    confirmPassword: '',
    deviceLabel: 'This phone',
    theme: 'system',
    intentionStatement: 'Notice what I reach for and give myself room to pause.',
    intentionMotivation: 'I want steadier evenings and more intentional use.',
    weeklyTargetHits: 14,
    baselineDays: 7,
  };
}

function createEntryDraft(): EntryDraft {
  return {
    type: 'flower',
    alone: true,
    amountHits: 2,
    occurredAt: formatDateTimeLocalValue(new Date()),
    note: '',
  };
}

function buildEntryRecord(draft: EntryDraft, intentionPlan: IntentionPlan | null): EntryRecord {
  const now = nowIso();

  return {
    id: generateId('entry'),
    occurredAt: new Date(draft.occurredAt).toISOString(),
    type: draft.type,
    alone: draft.alone,
    amountHits: draft.amountHits,
    note: draft.note.trim() ? draft.note.trim() : undefined,
    intentionId: intentionPlan?.id,
    createdAt: now,
    updatedAt: now,
  };
}

function App() {
  const [status, setStatus] = useState<AppStatus>('booting');
  const [route, setRoute] = useState<Route>(() => routeFromLocation());
  const [session, setSession] = useState<SessionState | null>(null);
  const [vaultMeta, setVaultMeta] = useState<VaultMeta | null>(null);
  const [onboardingDraft, setOnboardingDraft] = useState<OnboardingDraft>(createOnboardingDraft());
  const [entryDraft, setEntryDraft] = useState<EntryDraft>(createEntryDraft());
  const [passkeyAvailable, setPasskeyAvailable] = useState(false);
  const [busyLabel, setBusyLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [unlockSecret, setUnlockSecret] = useState('');
  const [saveReflection, setSaveReflection] = useState<string | null>(null);
  const [goalDraft, setGoalDraft] = useState({
    weeklyTargetHits: 14,
    baselineDays: 7,
  });
  const [intentionDraft, setIntentionDraft] = useState({
    statement: '',
    motivation: '',
  });
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    isPlatformPasskeyAvailable()
      .then(setPasskeyAvailable)
      .catch(() => false);
  }, []);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromLocation());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        const meta = await loadVaultMeta();

        if (!meta) {
          setStatus('onboarding');
          return;
        }

        setVaultMeta(meta);
        setStatus('locked');
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : 'The local vault could not be opened.',
        );
        setStatus('onboarding');
      }
    };

    bootstrap().catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!session) {
      if (status !== 'onboarding') {
        applyThemePreference('system');
      }

      return;
    }

    applyThemePreference(session.snapshot.preferences.theme);
  }, [session, status]);

  useEffect(() => {
    if (status !== 'onboarding') {
      return;
    }

    applyThemePreference(onboardingDraft.theme);
  }, [onboardingDraft.theme, status]);

  useEffect(() => {
    if (!session) {
      return;
    }

    // The vault key only lives in memory, so we lock quickly when the app is
    // backgrounded or sits idle to reduce accidental exposure on a shared phone.
    let timeoutId = window.setTimeout(lockSession, 5 * 60_000);

    const resetTimer = () => {
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(lockSession, 5 * 60_000);
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        lockSession();
      } else {
        resetTimer();
      }
    };

    window.addEventListener('pointerdown', resetTimer, { passive: true });
    window.addEventListener('keydown', resetTimer);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.clearTimeout(timeoutId);
      window.removeEventListener('pointerdown', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [session]);

  const insights = session
    ? buildInsights(session.snapshot.entries, session.snapshot.goalPlan)
    : null;
  const goalSummary = session
    ? buildGoalProgressSummary(session.snapshot.entries, session.snapshot.goalPlan)
    : null;

  function lockSession() {
    setSession(null);
    setUnlockSecret('');
    setStatus(vaultMeta ? 'locked' : 'onboarding');
    setSaveReflection(null);
  }

  async function handleCreateVault() {
    setErrorMessage(null);

    if (onboardingDraft.unlockMethod === 'password') {
      if (onboardingDraft.password.length < 10) {
        setErrorMessage('Use a password with at least 10 characters.');
        return;
      }

      if (onboardingDraft.password !== onboardingDraft.confirmPassword) {
        setErrorMessage('The password confirmation does not match.');
        return;
      }
    } else if (!onboardingDraft.deviceLabel.trim()) {
      setErrorMessage('Give this device a short label before continuing.');
      return;
    } else if (!passkeyAvailable) {
      setErrorMessage('Device unlock is not available in this browser.');
      return;
    }

    if (onboardingDraft.intentionStatement.trim().length < 3) {
      setErrorMessage('Add a short intention so the app has context from day one.');
      return;
    }

    setBusyLabel('Creating your local vault…');

    try {
      const created =
        onboardingDraft.unlockMethod === 'password'
          ? await createPasswordVault(onboardingDraft.password)
          : await createPasskeyVault(onboardingDraft.deviceLabel.trim());

      const snapshot = await seedInitialVaultState(created.rawKeyBytes, {
        intentionStatement: onboardingDraft.intentionStatement.trim(),
        intentionMotivation: onboardingDraft.intentionMotivation.trim() || undefined,
        weeklyTargetHits: onboardingDraft.weeklyTargetHits,
        baselineDays: onboardingDraft.baselineDays,
        theme: onboardingDraft.theme,
      });

      setGoalDraft({
        weeklyTargetHits: snapshot.goalPlan?.weeklyTargetHits ?? 14,
        baselineDays: snapshot.goalPlan?.baselineDays ?? 7,
      });
      setIntentionDraft({
        statement: snapshot.intentionPlan?.statement ?? '',
        motivation: snapshot.intentionPlan?.motivation ?? '',
      });
      setVaultMeta(created.meta);
      setSession({
        meta: created.meta,
        rawKeyBytes: created.rawKeyBytes,
        snapshot,
      });
      navigateTo('log');
      setRoute('log');
      setStatus('ready');
      setEntryDraft(createEntryDraft());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The local vault could not be created.',
      );
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleUnlockWithPassword() {
    if (!vaultMeta) {
      return;
    }

    setBusyLabel('Unlocking your vault…');
    setErrorMessage(null);

    try {
      const rawKeyBytes = await unlockVault(vaultMeta, unlockSecret);
      const snapshot = await loadVaultSnapshot(rawKeyBytes);

      setGoalDraft({
        weeklyTargetHits: snapshot.goalPlan?.weeklyTargetHits ?? 14,
        baselineDays: snapshot.goalPlan?.baselineDays ?? 7,
      });
      setIntentionDraft({
        statement: snapshot.intentionPlan?.statement ?? '',
        motivation: snapshot.intentionPlan?.motivation ?? '',
      });
      setSession({
        meta: vaultMeta,
        rawKeyBytes,
        snapshot,
      });
      navigateTo('log');
      setRoute('log');
      setStatus('ready');
      setEntryDraft(createEntryDraft());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The vault could not be unlocked.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleUnlockWithDevice() {
    if (!vaultMeta) {
      return;
    }

    setBusyLabel('Checking this device…');
    setErrorMessage(null);

    try {
      const rawKeyBytes = await unlockVaultWithDevice(vaultMeta);
      const snapshot = await loadVaultSnapshot(rawKeyBytes);

      setGoalDraft({
        weeklyTargetHits: snapshot.goalPlan?.weeklyTargetHits ?? 14,
        baselineDays: snapshot.goalPlan?.baselineDays ?? 7,
      });
      setIntentionDraft({
        statement: snapshot.intentionPlan?.statement ?? '',
        motivation: snapshot.intentionPlan?.motivation ?? '',
      });
      setSession({
        meta: vaultMeta,
        rawKeyBytes,
        snapshot,
      });
      navigateTo('log');
      setRoute('log');
      setStatus('ready');
      setEntryDraft(createEntryDraft());
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Device unlock did not succeed.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleSaveEntry() {
    if (!session) {
      return;
    }

    const entry = buildEntryRecord(entryDraft, session.snapshot.intentionPlan);

    setBusyLabel('Saving your entry…');
    setErrorMessage(null);

    try {
      await saveEntry(session.rawKeyBytes, entry);
      setSession({
        ...session,
        snapshot: {
          ...session.snapshot,
          entries: [entry, ...session.snapshot.entries],
        },
      });
      setEntryDraft(createEntryDraft());
      setSaveReflection('Entry saved. Did this line up with your intention?');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The entry could not be saved.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleDeleteEntry(entryId: string) {
    if (!session) {
      return;
    }

    setBusyLabel('Removing that entry…');

    try {
      await deleteEntry(entryId);
      setSession({
        ...session,
        snapshot: {
          ...session.snapshot,
          entries: session.snapshot.entries.filter((entry) => entry.id !== entryId),
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The entry could not be removed.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleSaveGoals() {
    if (!session) {
      return;
    }

    const now = nowIso();
    const nextGoal: GoalPlan = {
      id: session.snapshot.goalPlan?.id ?? generateId('goal'),
      baselineDays: goalDraft.baselineDays,
      weeklyTargetHits: goalDraft.weeklyTargetHits,
      createdAt: session.snapshot.goalPlan?.createdAt ?? now,
      updatedAt: now,
    };
    const nextIntention: IntentionPlan = {
      id: session.snapshot.intentionPlan?.id ?? generateId('intention'),
      statement: intentionDraft.statement.trim(),
      motivation: intentionDraft.motivation.trim() || undefined,
      createdAt: session.snapshot.intentionPlan?.createdAt ?? now,
      updatedAt: now,
    };

    setBusyLabel('Saving your plan…');

    try {
      await saveGoalPlan(session.rawKeyBytes, nextGoal);
      await saveIntentionPlan(session.rawKeyBytes, nextIntention);
      setSession({
        ...session,
        snapshot: {
          ...session.snapshot,
          goalPlan: nextGoal,
          intentionPlan: nextIntention,
        },
      });
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The goal plan could not be saved.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleThemeChange(theme: ThemePreference) {
    if (!session) {
      return;
    }

    const nextPreferences: AppPreferences = {
      ...session.snapshot.preferences,
      theme,
      updatedAt: nowIso(),
    };

    setSession({
      ...session,
      snapshot: {
        ...session.snapshot,
        preferences: nextPreferences,
      },
    });
    applyThemePreference(theme);

    try {
      await savePreferences(session.rawKeyBytes, nextPreferences);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The theme could not be saved.');
    }
  }

  async function handleExportBackup() {
    if (!session) {
      return;
    }

    setBusyLabel('Building your encrypted backup…');

    try {
      const backup = await exportBackupEnvelope();
      downloadBackupFile(backup);

      const nextPreferences: AppPreferences = {
        ...session.snapshot.preferences,
        lastExportAt: nowIso(),
        updatedAt: nowIso(),
      };

      setSession({
        ...session,
        snapshot: {
          ...session.snapshot,
          preferences: nextPreferences,
        },
      });
      await savePreferences(session.rawKeyBytes, nextPreferences);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'The backup could not be exported.');
    } finally {
      setBusyLabel(null);
    }
  }

  async function handleImportBackup(file: File | null) {
    if (!file) {
      return;
    }

    setBusyLabel('Importing your encrypted backup…');
    setErrorMessage(null);

    try {
      const backup = await parseBackupFile(file);
      await importBackupEnvelope(backup);
      const meta = await loadVaultMeta();

      if (!meta) {
        throw new Error('The imported backup did not contain a vault.');
      }

      setVaultMeta(meta);
      setSession(null);
      setStatus('locked');
      setUnlockSecret('');
      setOnboardingDraft(createOnboardingDraft());
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The backup file could not be imported.',
      );
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      setBusyLabel(null);
    }
  }

  async function handleResetVault() {
    const shouldReset = window.confirm(
      'This clears the local vault from this browser. Make sure you exported a backup first.',
    );

    if (!shouldReset) {
      return;
    }

    setBusyLabel('Clearing this browser vault…');

    try {
      await resetStoredVault();
      window.location.assign('/');
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'The local vault could not be cleared.',
      );
    } finally {
      setBusyLabel(null);
    }
  }

  function openImportPicker() {
    fileInputRef.current?.click();
  }

  const recentEntries = session?.snapshot.entries.slice(0, 6) ?? [];

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,rgba(46,145,102,0.2),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(8,57,41,0.26),transparent_28%),linear-gradient(180deg,var(--background),color-mix(in_oklab,var(--background)_85%,var(--secondary)))" />

      {status === 'booting' ? <BootScreen /> : null}

      {status === 'onboarding' ? (
        <OnboardingScreen
          draft={onboardingDraft}
          busyLabel={busyLabel}
          errorMessage={errorMessage}
          passkeyAvailable={passkeyAvailable}
          fileInputRef={fileInputRef}
          onChange={setOnboardingDraft}
          onCreateVault={handleCreateVault}
          onImportClick={openImportPicker}
          onImportFile={handleImportBackup}
        />
      ) : null}

      {status === 'locked' && vaultMeta ? (
        <LockScreen
          meta={vaultMeta}
          busyLabel={busyLabel}
          errorMessage={errorMessage}
          passkeyAvailable={passkeyAvailable}
          secret={unlockSecret}
          onSecretChange={setUnlockSecret}
          onUnlockPassword={handleUnlockWithPassword}
          onUnlockDevice={handleUnlockWithDevice}
        />
      ) : null}

      {status === 'ready' && session && insights && goalSummary ? (
        <AppShell
          route={route}
          session={session}
          insights={insights}
          goalSummary={goalSummary}
          entryDraft={entryDraft}
          goalDraft={goalDraft}
          intentionDraft={intentionDraft}
          busyLabel={busyLabel}
          saveReflection={saveReflection}
          errorMessage={errorMessage}
          recentEntries={recentEntries}
          onNavigate={(nextRoute) => {
            navigateTo(nextRoute);
            setRoute(nextRoute);
          }}
          onEntryDraftChange={setEntryDraft}
          onGoalDraftChange={setGoalDraft}
          onIntentionDraftChange={setIntentionDraft}
          onSaveEntry={handleSaveEntry}
          onDeleteEntry={handleDeleteEntry}
          onSaveGoals={handleSaveGoals}
          onThemeChange={handleThemeChange}
          onExportBackup={handleExportBackup}
          onResetVault={handleResetVault}
          onLockNow={lockSession}
          onDismissReflection={() => setSaveReflection(null)}
        />
      ) : null}
    </div>
  );
}

function BootScreen() {
  return (
    <ScreenFrame className="items-center justify-center text-center">
      <Card className="w-full max-w-sm space-y-4 py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">
          {APP_NAME}
        </p>
        <h1 className="text-3xl font-semibold">Opening your local journal…</h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Everything stays on this phone. The app is just checking whether a local vault already
          lives in this browser.
        </p>
      </Card>
    </ScreenFrame>
  );
}

function OnboardingScreen({
  draft,
  busyLabel,
  errorMessage,
  passkeyAvailable,
  fileInputRef,
  onChange,
  onCreateVault,
  onImportClick,
  onImportFile,
}: {
  draft: OnboardingDraft;
  busyLabel: string | null;
  errorMessage: string | null;
  passkeyAvailable: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onChange: (nextDraft: OnboardingDraft) => void;
  onCreateVault: () => void;
  onImportClick: () => void;
  onImportFile: (file: File | null) => Promise<void>;
}) {
  return (
    <ScreenFrame className="gap-4">
      <PageHeader
        eyebrow={APP_NAME}
        title="Private support that starts with one honest entry"
        description="No account server. No cloud profile. Just a local journal that helps you notice patterns and reduce with care."
      />

      <Card className="space-y-4">
        <SectionHeading
          title="Privacy promise"
          description="Your entries are encrypted on this device before they are stored. The server only ships the app."
        />
        <ul className="space-y-3 text-sm leading-6 text-muted-foreground">
          <li>No usage history is sent to us.</li>
          <li>No analytics or remote profile exists.</li>
          <li>You can export an encrypted backup whenever you want.</li>
        </ul>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onCreateVault} disabled={Boolean(busyLabel)}>
            {busyLabel ?? 'Create local vault'}
          </Button>
          <Button variant="secondary" onClick={onImportClick}>
            Import encrypted backup
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Choose how this phone unlocks your vault"
          description="Password works everywhere. Device unlock uses passkeys and only appears where the browser can derive a local secret safely."
        />
        <div className="grid gap-3">
          <ToggleRow
            label="Password"
            description="Reliable recovery and the broadest browser support."
            active={draft.unlockMethod === 'password'}
            onClick={() => onChange({ ...draft, unlockMethod: 'password' })}
          />
          <ToggleRow
            label="Device unlock"
            description={
              passkeyAvailable
                ? 'Use Face ID, Android biometrics, or your device passkey if the browser supports the secure PRF extension.'
                : 'This browser does not expose the secure passkey flow needed for a local-only vault.'
            }
            active={draft.unlockMethod === 'passkey'}
            onClick={() => passkeyAvailable && onChange({ ...draft, unlockMethod: 'passkey' })}
          />
        </div>

        {draft.unlockMethod === 'password' ? (
          <div className="grid gap-3">
            <Field label="Password">
              <TextInput
                type="password"
                value={draft.password}
                onChange={(event) => onChange({ ...draft, password: event.target.value })}
                placeholder="Use a long memorable phrase"
              />
            </Field>
            <Field label="Confirm password">
              <TextInput
                type="password"
                value={draft.confirmPassword}
                onChange={(event) => onChange({ ...draft, confirmPassword: event.target.value })}
                placeholder="Repeat it once"
              />
            </Field>
          </div>
        ) : (
          <Field
            label="Device label"
            hint="This helps you recognize which phone created the passkey-backed vault."
          >
            <TextInput
              value={draft.deviceLabel}
              onChange={(event) => onChange({ ...draft, deviceLabel: event.target.value })}
              placeholder="This phone"
            />
          </Field>
        )}
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Set the tone for day one"
          description="You can change these later. Starting with a gentle plan makes the app immediately useful."
        />
        <Field label="Theme">
          <div className="grid grid-cols-3 gap-2">
            {themePreferences.map((theme) => (
              <PillButton
                key={theme}
                active={draft.theme === theme}
                onClick={() => onChange({ ...draft, theme })}
              >
                {theme}
              </PillButton>
            ))}
          </div>
        </Field>
        <Field label="Current intention">
          <TextArea
            value={draft.intentionStatement}
            onChange={(event) => onChange({ ...draft, intentionStatement: event.target.value })}
            placeholder="What do you want your use to support?"
          />
        </Field>
        <Field label="Why this matters to you">
          <TextArea
            value={draft.intentionMotivation}
            onChange={(event) => onChange({ ...draft, intentionMotivation: event.target.value })}
            placeholder="A calmer night, better sleep, more intentional use…"
          />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Weekly hit target">
            <TextInput
              type="number"
              min={1}
              max={700}
              value={draft.weeklyTargetHits}
              onChange={(event) =>
                onChange({
                  ...draft,
                  weeklyTargetHits: Number(event.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Baseline window (days)">
            <TextInput
              type="number"
              min={7}
              max={90}
              value={draft.baselineDays}
              onChange={(event) =>
                onChange({
                  ...draft,
                  baselineDays: Number(event.target.value) || 7,
                })
              }
            />
          </Field>
        </div>
      </Card>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/10 text-destructive">
          <p className="text-sm font-medium">{errorMessage}</p>
        </Card>
      ) : null}

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={(event) =>
          onImportFile(event.currentTarget.files?.[0] ?? null).catch(() => undefined)
        }
      />
    </ScreenFrame>
  );
}

function LockScreen({
  meta,
  busyLabel,
  errorMessage,
  passkeyAvailable,
  secret,
  onSecretChange,
  onUnlockPassword,
  onUnlockDevice,
}: {
  meta: VaultMeta;
  busyLabel: string | null;
  errorMessage: string | null;
  passkeyAvailable: boolean;
  secret: string;
  onSecretChange: (value: string) => void;
  onUnlockPassword: () => void;
  onUnlockDevice: () => void;
}) {
  return (
    <ScreenFrame className="justify-center gap-4">
      <Card className="space-y-4">
        <PageHeader
          eyebrow={APP_NAME}
          title="Welcome back"
          description="Your vault is still here on this phone. Unlock it locally to keep logging with context."
        />
        {meta.unlockMethod === 'password' ? (
          <div className="space-y-4">
            <Field label="Password">
              <TextInput
                type="password"
                value={secret}
                onChange={(event) => onSecretChange(event.target.value)}
                placeholder="Unlock your local vault"
              />
            </Field>
            <Button onClick={onUnlockPassword} disabled={Boolean(busyLabel)}>
              {busyLabel ?? 'Unlock with password'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm leading-6 text-muted-foreground">
              This vault was created with device unlock. Use the same passkey or synced platform
              credential to derive the local decryption secret.
            </p>
            <Button onClick={onUnlockDevice} disabled={Boolean(busyLabel) || !passkeyAvailable}>
              {busyLabel ?? 'Unlock with device'}
            </Button>
            {!passkeyAvailable ? (
              <p className="text-sm text-destructive">
                This browser does not expose the secure passkey flow needed to open this vault.
              </p>
            ) : null}
          </div>
        )}
      </Card>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/10 text-destructive">
          <p className="text-sm font-medium">{errorMessage}</p>
        </Card>
      ) : null}
    </ScreenFrame>
  );
}

function AppShell({
  route,
  session,
  insights,
  goalSummary,
  entryDraft,
  goalDraft,
  intentionDraft,
  busyLabel,
  saveReflection,
  errorMessage,
  recentEntries,
  onNavigate,
  onEntryDraftChange,
  onGoalDraftChange,
  onIntentionDraftChange,
  onSaveEntry,
  onDeleteEntry,
  onSaveGoals,
  onThemeChange,
  onExportBackup,
  onResetVault,
  onLockNow,
  onDismissReflection,
}: {
  route: Route;
  session: SessionState;
  insights: ReturnType<typeof buildInsights>;
  goalSummary: ReturnType<typeof buildGoalProgressSummary>;
  entryDraft: EntryDraft;
  goalDraft: { weeklyTargetHits: number; baselineDays: number };
  intentionDraft: { statement: string; motivation: string };
  busyLabel: string | null;
  saveReflection: string | null;
  errorMessage: string | null;
  recentEntries: EntryRecord[];
  onNavigate: (route: Route) => void;
  onEntryDraftChange: (draft: EntryDraft) => void;
  onGoalDraftChange: (draft: { weeklyTargetHits: number; baselineDays: number }) => void;
  onIntentionDraftChange: (draft: { statement: string; motivation: string }) => void;
  onSaveEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveGoals: () => void;
  onThemeChange: (theme: ThemePreference) => void;
  onExportBackup: () => void;
  onResetVault: () => void;
  onLockNow: () => void;
  onDismissReflection: () => void;
}) {
  return (
    <>
      <ScreenFrame className="gap-4 pb-32">
        {route === 'log' ? (
          <LogScreen
            draft={entryDraft}
            busyLabel={busyLabel}
            saveReflection={saveReflection}
            errorMessage={errorMessage}
            recentEntries={recentEntries}
            intentionPlan={session.snapshot.intentionPlan}
            onDraftChange={onEntryDraftChange}
            onSaveEntry={onSaveEntry}
            onDeleteEntry={onDeleteEntry}
            onDismissReflection={onDismissReflection}
          />
        ) : null}

        {route === 'insights' ? (
          <InsightsScreen insights={insights} goalSummary={goalSummary} />
        ) : null}

        {route === 'goals' ? (
          <GoalsScreen
            goalSummary={goalSummary}
            draft={goalDraft}
            intentionDraft={intentionDraft}
            busyLabel={busyLabel}
            onGoalDraftChange={onGoalDraftChange}
            onIntentionDraftChange={onIntentionDraftChange}
            onSaveGoals={onSaveGoals}
          />
        ) : null}

        {route === 'settings' ? (
          <SettingsScreen
            preferences={session.snapshot.preferences}
            meta={session.meta}
            busyLabel={busyLabel}
            onThemeChange={onThemeChange}
            onExportBackup={onExportBackup}
            onLockNow={onLockNow}
            onResetVault={onResetVault}
          />
        ) : null}
      </ScreenFrame>

      <BottomNav route={route} onNavigate={onNavigate} />
    </>
  );
}

function LogScreen({
  draft,
  busyLabel,
  saveReflection,
  errorMessage,
  recentEntries,
  intentionPlan,
  onDraftChange,
  onSaveEntry,
  onDeleteEntry,
  onDismissReflection,
}: {
  draft: EntryDraft;
  busyLabel: string | null;
  saveReflection: string | null;
  errorMessage: string | null;
  recentEntries: EntryRecord[];
  intentionPlan: IntentionPlan | null;
  onDraftChange: (draft: EntryDraft) => void;
  onSaveEntry: () => void;
  onDeleteEntry: (entryId: string) => void;
  onDismissReflection: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Log"
        title="Capture the moment before it gets fuzzy"
        description={
          intentionPlan
            ? `Current intention: ${intentionPlan.statement}`
            : 'Fast, low-friction logging helps the rest of the app stay honest.'
        }
      />

      {saveReflection ? (
        <Card className="space-y-3 border-primary/25 bg-primary/10">
          <p className="text-sm font-medium text-foreground">{saveReflection}</p>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={onDismissReflection}>
              Yes, it did
            </Button>
            <Button variant="ghost" onClick={onDismissReflection}>
              Not quite
            </Button>
          </div>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <SectionHeading
          title="New entry"
          description="The save button stays close to your thumb so logging feels almost automatic."
        />
        <Field label="Type">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {entryTypes.map((type) => (
              <PillButton
                key={type}
                active={draft.type === type}
                onClick={() => onDraftChange({ ...draft, type })}
              >
                {type}
              </PillButton>
            ))}
          </div>
        </Field>
        <Field label="Context">
          <div className="grid grid-cols-2 gap-2">
            <PillButton
              active={draft.alone}
              onClick={() => onDraftChange({ ...draft, alone: true })}
            >
              Alone
            </PillButton>
            <PillButton
              active={!draft.alone}
              onClick={() => onDraftChange({ ...draft, alone: false })}
            >
              With others
            </PillButton>
          </div>
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hits">
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                className="w-14 px-0"
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    amountHits: Math.max(1, draft.amountHits - 1),
                  })
                }
              >
                -
              </Button>
              <TextInput
                className="text-center"
                type="number"
                min={1}
                max={100}
                value={draft.amountHits}
                onChange={(event) =>
                  onDraftChange({
                    ...draft,
                    amountHits: Number(event.target.value) || 1,
                  })
                }
              />
              <Button
                variant="secondary"
                className="w-14 px-0"
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    amountHits: Math.min(100, draft.amountHits + 1),
                  })
                }
              >
                +
              </Button>
            </div>
          </Field>
          <Field label="Time">
            <TextInput
              type="datetime-local"
              value={draft.occurredAt}
              onChange={(event) => onDraftChange({ ...draft, occurredAt: event.target.value })}
            />
          </Field>
        </div>
        <Field label="Quick time">
          <div className="grid grid-cols-4 gap-2">
            {quickTimeOffsets.map((minutes) => (
              <PillButton
                key={minutes}
                active={minutes === 0}
                onClick={() =>
                  onDraftChange({
                    ...draft,
                    occurredAt: formatDateTimeLocalValue(
                      addMinutes(new Date(), minutes === 0 ? 0 : -minutes),
                    ),
                  })
                }
              >
                {formatRelativeTimeLabel(minutes)}
              </PillButton>
            ))}
          </div>
        </Field>
        <Field label="Optional note">
          <TextArea
            value={draft.note}
            onChange={(event) => onDraftChange({ ...draft, note: event.target.value })}
            placeholder="How did you want this moment to feel?"
          />
        </Field>
      </Card>

      <div className="sticky bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-20">
        <Button
          className="w-full py-4 text-base"
          onClick={onSaveEntry}
          disabled={Boolean(busyLabel)}
        >
          {busyLabel ?? 'Save entry'}
        </Button>
      </div>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/10 text-destructive">
          <p className="text-sm font-medium">{errorMessage}</p>
        </Card>
      ) : null}

      <Card className="space-y-4">
        <SectionHeading
          title="Recent entries"
          description="A quick glance helps you confirm the log still matches what really happened."
        />
        {recentEntries.length === 0 ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Your first saved entry will show up here.
          </p>
        ) : (
          <div className="space-y-3">
            {recentEntries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-[1.25rem] border border-border/70 bg-background/55 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold capitalize text-foreground">
                      {entry.type} · {entry.amountHits} hits · {entry.alone ? 'solo' : 'shared'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDisplayDate(entry.occurredAt)} at {formatDisplayTime(entry.occurredAt)}
                    </p>
                    {entry.note ? (
                      <p className="text-sm leading-6 text-muted-foreground">{entry.note}</p>
                    ) : null}
                  </div>
                  <Button
                    variant="ghost"
                    className="px-0 text-destructive"
                    onClick={() => onDeleteEntry(entry.id)}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function InsightsScreen({
  insights,
  goalSummary,
}: {
  insights: ReturnType<typeof buildInsights>;
  goalSummary: ReturnType<typeof buildGoalProgressSummary>;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Patterns, not judgment"
        description="The idea is to make your habits easier to see, so changing them takes less guesswork."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          title="This week"
          value={`${insights.currentWeekHits}`}
          hint="Total hits logged over the last 7 days."
          accent
        />
        <StatCard
          title="Goal pace"
          value={
            goalSummary.targetHits
              ? `${Math.round((goalSummary.currentWeekHits / goalSummary.targetHits) * 100)}%`
              : 'No goal'
          }
          hint={
            goalSummary.targetHits
              ? `Target: ${goalSummary.targetHits} hits this week.`
              : 'Set a weekly target to see pacing here.'
          }
        />
      </div>

      <BarChartCard
        title="Last 7 days"
        description="How total hits are trending day by day."
        points={insights.weeklyHits}
      />
      <BarChartCard
        title="Last 30 days"
        description="A longer view of where the heavier days cluster."
        points={insights.monthlyHits}
      />
      <BarChartCard
        title="Sessions per day"
        description="How often logging happens, separate from amount."
        points={insights.sessionsByDay}
      />
      <DonutChartCard
        title="Type mix"
        description="What forms show up most often in your journal."
        points={insights.typeMix}
      />
      <DonutChartCard
        title="Solo vs shared"
        description="A quick read on whether use is usually social or self-directed."
        points={insights.socialMix}
      />
      <HeatmapCard
        title="Time-of-day rhythm"
        description="When use tends to gather during the day."
        points={insights.heatmap}
      />
    </>
  );
}

function GoalsScreen({
  goalSummary,
  draft,
  intentionDraft,
  busyLabel,
  onGoalDraftChange,
  onIntentionDraftChange,
  onSaveGoals,
}: {
  goalSummary: ReturnType<typeof buildGoalProgressSummary>;
  draft: { weeklyTargetHits: number; baselineDays: number };
  intentionDraft: { statement: string; motivation: string };
  busyLabel: string | null;
  onGoalDraftChange: (draft: { weeklyTargetHits: number; baselineDays: number }) => void;
  onIntentionDraftChange: (draft: { statement: string; motivation: string }) => void;
  onSaveGoals: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Goals"
        title="Lowering use works better with a kind plan"
        description="The goal page keeps the target visible without turning every day into a pass-or-fail score."
      />

      <Card className="space-y-4">
        <SectionHeading
          title="Progress this week"
          description="Think of this as a pacing line, not a moral grade."
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard
            title="Current week"
            value={`${goalSummary.currentWeekHits} hits`}
            hint="Total logged in the last seven days."
          />
          <StatCard
            title="Baseline average"
            value={
              goalSummary.baselineAverageHits ? `${goalSummary.baselineAverageHits}/day` : 'Waiting'
            }
            hint="This starts filling in once enough entries exist."
          />
        </div>
        {goalSummary.targetHits ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Toward weekly target</span>
              <span className="font-semibold text-foreground">
                {goalSummary.currentWeekHits}/{goalSummary.targetHits}
              </span>
            </div>
            <ProgressBar value={goalSummary.currentWeekHits} max={goalSummary.targetHits} />
          </div>
        ) : null}
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Your intention"
          description="A good intention is small, specific, and gentle enough to revisit honestly."
        />
        <Field label="What do you want your use to support right now?">
          <TextArea
            value={intentionDraft.statement}
            onChange={(event) =>
              onIntentionDraftChange({
                ...intentionDraft,
                statement: event.target.value,
              })
            }
          />
        </Field>
        <Field label="Why this matters">
          <TextArea
            value={intentionDraft.motivation}
            onChange={(event) =>
              onIntentionDraftChange({
                ...intentionDraft,
                motivation: event.target.value,
              })
            }
          />
        </Field>
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Reduction plan"
          description="The baseline helps you compare against your own recent pattern rather than an abstract ideal."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Weekly hit target">
            <TextInput
              type="number"
              min={1}
              max={700}
              value={draft.weeklyTargetHits}
              onChange={(event) =>
                onGoalDraftChange({
                  ...draft,
                  weeklyTargetHits: Number(event.target.value) || 1,
                })
              }
            />
          </Field>
          <Field label="Baseline window (days)">
            <TextInput
              type="number"
              min={7}
              max={90}
              value={draft.baselineDays}
              onChange={(event) =>
                onGoalDraftChange({
                  ...draft,
                  baselineDays: Number(event.target.value) || 7,
                })
              }
            />
          </Field>
        </div>
        <Button onClick={onSaveGoals} disabled={Boolean(busyLabel)}>
          {busyLabel ?? 'Save goals'}
        </Button>
      </Card>
    </>
  );
}

function SettingsScreen({
  preferences,
  meta,
  busyLabel,
  onThemeChange,
  onExportBackup,
  onLockNow,
  onResetVault,
}: {
  preferences: AppPreferences;
  meta: VaultMeta;
  busyLabel: string | null;
  onThemeChange: (theme: ThemePreference) => void;
  onExportBackup: () => void;
  onLockNow: () => void;
  onResetVault: () => void;
}) {
  return (
    <>
      <PageHeader
        eyebrow="Settings"
        title="Your phone, your vault, your exit hatch"
        description="Everything here is about control: theme, backups, and how quickly the app gets out of the way."
      />

      <Card className="space-y-4">
        <SectionHeading
          title="Theme"
          description="The theme choice is stored inside the encrypted vault, so the lock screen falls back to system styling."
        />
        <div className="grid grid-cols-3 gap-2">
          {themePreferences.map((theme) => (
            <PillButton
              key={theme}
              active={preferences.theme === theme}
              onClick={() => onThemeChange(theme)}
            >
              {theme}
            </PillButton>
          ))}
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Backup"
          description="Exports are encrypted envelopes. Store them anywhere you trust, but remember the app never sees them again."
        />
        <p className="text-sm leading-6 text-muted-foreground">
          Unlock method: {meta.unlockMethod === 'password' ? 'Password' : 'Device unlock'}
        </p>
        {preferences.lastExportAt ? (
          <p className="text-sm leading-6 text-muted-foreground">
            Last backup: {formatDisplayDate(preferences.lastExportAt)} at{' '}
            {formatDisplayTime(preferences.lastExportAt)}
          </p>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row">
          <Button onClick={onExportBackup} disabled={Boolean(busyLabel)}>
            {busyLabel ?? 'Export encrypted backup'}
          </Button>
          <Button variant="secondary" onClick={onLockNow}>
            Lock now
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <SectionHeading
          title="Hard reset"
          description="Only use this after exporting a backup you trust."
        />
        <Button variant="danger" onClick={onResetVault}>
          Clear this browser vault
        </Button>
      </Card>
    </>
  );
}

function BottomNav({ route, onNavigate }: { route: Route; onNavigate: (route: Route) => void }) {
  const items: Array<{ route: Route; label: string }> = [
    { route: 'log', label: 'Log' },
    { route: 'insights', label: 'Insights' },
    { route: 'goals', label: 'Goals' },
    { route: 'settings', label: 'Settings' },
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
      <div className="mx-auto grid max-w-screen-sm grid-cols-4 gap-2 rounded-[1.8rem] border border-border/80 bg-card/95 p-2 shadow-[0_16px_50px_-30px_rgba(15,23,42,0.7)] backdrop-blur-md">
        {items.map((item) => (
          <button
            key={item.route}
            type="button"
            onClick={() => onNavigate(item.route)}
            className={cn(
              'min-h-12 rounded-[1.2rem] text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              route === item.route
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}

export default App;
