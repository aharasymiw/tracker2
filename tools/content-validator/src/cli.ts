#!/usr/bin/env node
// CLI wrapper around @lod/game-content's loader. Parses all bundled JSON
// content through the package's Zod schemas and either prints a summary or
// exits non-zero with the validation error.

import { loadAllContent } from '@lod/game-content';

function parseArgs(argv: string[]): { contentDir?: string } {
  const out: { contentDir?: string } = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--content-dir') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--content-dir requires a path argument');
      }
      out.contentDir = next;
      i++;
    } else if (arg && arg.startsWith('--content-dir=')) {
      out.contentDir = arg.slice('--content-dir='.length);
    }
  }
  return out;
}

async function main(): Promise<void> {
  const { contentDir } = parseArgs(process.argv.slice(2));
  const content = await loadAllContent(contentDir);
  const { items, weapons, enemies, maps } = content;
  process.stdout.write(
    `Content OK: ${items.length} items, ${weapons.length} weapons, ${enemies.length} enemies, ${maps.length} maps\n`,
  );
}

main().catch((err: unknown) => {
  process.stderr.write('Content validation failed:\n');
  if (err instanceof Error) {
    process.stderr.write(`${err.message}\n`);
    if (err.stack) {
      process.stderr.write(`${err.stack}\n`);
    }
  } else {
    process.stderr.write(`${String(err)}\n`);
  }
  process.exit(1);
});
