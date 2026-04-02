export const APP_NAME = 'Kindred';
export const CURRENT_SCHEMA_VERSION = 1;

export const entryTypes = [
  'flower',
  'vape',
  'edible',
  'concentrate',
  'tincture',
  'pre-roll',
  'other',
] as const;

export const themePreferences = ['light', 'dark', 'system'] as const;
export const unlockMethods = ['password', 'passkey'] as const;

export type EntryType = (typeof entryTypes)[number];
export type ThemePreference = (typeof themePreferences)[number];
export type UnlockMethod = (typeof unlockMethods)[number];
export type VaultRecordKind = 'entry' | 'goal' | 'intention' | 'preferences';

export interface WrappedKeyEnvelope {
  algorithm: 'password-pbkdf2-aes-gcm' | 'webauthn-prf-aes-gcm';
  saltBase64: string;
  ivBase64: string;
  ciphertextBase64: string;
  iterations?: number;
}

export interface PasskeyCredentialConfig {
  credentialIdBase64: string;
  userIdBase64: string;
  prfSaltBase64: string;
  label: string;
  createdAt: string;
}

export interface VaultMeta {
  schemaVersion: number;
  createdAt: string;
  unlockMethod: UnlockMethod;
  wrappedKey: WrappedKeyEnvelope;
  passkey?: PasskeyCredentialConfig;
}

export interface EncryptedRecordEnvelope {
  id: string;
  kind: VaultRecordKind;
  schemaVersion: number;
  ivBase64: string;
  ciphertextBase64: string;
  updatedAt: string;
}

export interface EntryRecord {
  id: string;
  occurredAt: string;
  type: EntryType;
  alone: boolean;
  amountHits: number;
  note?: string;
  intentionId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GoalPlan {
  id: string;
  baselineDays: number;
  weeklyTargetHits: number;
  createdAt: string;
  updatedAt: string;
}

export interface IntentionPlan {
  id: string;
  statement: string;
  motivation?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppPreferences {
  theme: ThemePreference;
  reducedMotion: boolean;
  lastExportAt?: string;
  updatedAt: string;
}

export interface BackupEnvelope {
  schemaVersion: number;
  exportedAt: string;
  vaultMeta: VaultMeta;
  records: EncryptedRecordEnvelope[];
}

export interface InsightPoint {
  label: string;
  value: number;
}

export interface InsightSeries {
  weeklyHits: InsightPoint[];
  monthlyHits: InsightPoint[];
  sessionsByDay: InsightPoint[];
  typeMix: InsightPoint[];
  socialMix: InsightPoint[];
  heatmap: Array<{ label: string; value: number }>;
  currentWeekHits: number;
  goalTargetHits: number | null;
  goalProgress: number | null;
}

export interface VaultSnapshot {
  entries: EntryRecord[];
  goalPlan: GoalPlan | null;
  intentionPlan: IntentionPlan | null;
  preferences: AppPreferences;
}
