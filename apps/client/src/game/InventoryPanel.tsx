import { useState, type ReactElement } from 'react';

/**
 * Collapsible inventory sidebar. Phase 0-2 stub — renders a placeholder
 * message. The real implementation will pull from a dedicated inventory store
 * once the protocol item shapes land.
 */
export function InventoryPanel(): ReactElement {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <aside
      className={
        collapsed
          ? 'flex w-8 flex-col border-l border-neutral-800 bg-neutral-900/80'
          : 'flex w-64 flex-col border-l border-neutral-800 bg-neutral-900/80'
      }
    >
      <button
        type="button"
        onClick={() => setCollapsed((previous) => !previous)}
        className="border-b border-neutral-800 px-2 py-1 text-left text-xs text-neutral-400 hover:text-toxic-400"
      >
        {collapsed ? '>' : 'Inventory'}
      </button>
      {collapsed ? null : (
        <div className="flex-1 overflow-y-auto p-3 text-xs text-neutral-500">
          <p>Empty slots.</p>
        </div>
      )}
    </aside>
  );
}
