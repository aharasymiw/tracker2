#!/usr/bin/env node
// CLI wrapper around @lod/game-content's loader. Parses all bundled JSON
// content through the package's Zod schemas and either prints a summary or
// exits non-zero with the validation error.

import { loadContentPack } from '@lod/game-content';

function main(): void {
  const pack = loadContentPack();
  process.stdout.write(
    `Content OK: ${pack.items.size} items, ${pack.weapons.size} weapons, ` +
      `${pack.armor.size} armor, ${pack.enemies.size} enemies, ` +
      `${pack.npcs.size} npcs, ${pack.maps.size} maps, ` +
      `${Object.keys(pack.dialogue).length} dialogue nodes\n`,
  );
}

try {
  main();
} catch (err: unknown) {
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
}
