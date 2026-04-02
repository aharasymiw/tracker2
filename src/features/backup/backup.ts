import { backupEnvelopeSchema } from '@/schemas/models';

export async function parseBackupFile(file: File) {
  const text = await file.text();
  const parsed = JSON.parse(text);
  return backupEnvelopeSchema.parse(parsed);
}

export function downloadBackupFile(payload: unknown) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `kindred-backup-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
