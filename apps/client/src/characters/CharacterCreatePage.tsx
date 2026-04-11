import { useMemo, useState, type FormEvent, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';

/**
 * Total stat-point budget for new characters. Distribution is STR/DEX/AGL/HP.
 * HP is stored as "HP max multiplier" — see formulas in game-core. This is a
 * UI-only constraint; the server re-validates on submit.
 */
const STAT_BUDGET = 30;
const STAT_MIN = 1;
const STAT_MAX = 20;

interface StatDistribution {
  str: number;
  dex: number;
  agl: number;
  hp: number;
}

interface CreateCharacterRequest extends StatDistribution {
  name: string;
}

interface CreateCharacterResponse {
  id: string;
}

async function createCharacter(
  input: CreateCharacterRequest,
): Promise<CreateCharacterResponse> {
  const response = await fetch('/api/characters', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(`create failed with status ${response.status}`);
  }
  return (await response.json()) as CreateCharacterResponse;
}

export function CharacterCreatePage(): ReactElement {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [stats, setStats] = useState<StatDistribution>({
    str: 7,
    dex: 8,
    agl: 8,
    hp: 7,
  });

  const total = useMemo(
    () => stats.str + stats.dex + stats.agl + stats.hp,
    [stats],
  );
  const remaining = STAT_BUDGET - total;

  const mutation = useMutation<CreateCharacterResponse, Error, CreateCharacterRequest>({
    mutationFn: createCharacter,
    onSuccess: () => {
      navigate('/characters');
    },
  });

  const handleChange = (key: keyof StatDistribution, value: number): void => {
    setStats((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (total !== STAT_BUDGET) return;
    mutation.mutate({ name, ...stats });
  };

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4 px-4 py-8">
      <h1 className="text-xl font-bold text-toxic-500">Roll a new survivor</h1>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 rounded border border-neutral-800 bg-neutral-900 p-6"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-neutral-400">Name</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={24}
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded border border-neutral-700 bg-neutral-950 px-2 py-2 font-mono text-neutral-100 focus:border-toxic-500 focus:outline-none"
          />
        </label>
        <StatSlider
          label="STR"
          value={stats.str}
          onChange={(value) => handleChange('str', value)}
        />
        <StatSlider
          label="DEX"
          value={stats.dex}
          onChange={(value) => handleChange('dex', value)}
        />
        <StatSlider
          label="AGL"
          value={stats.agl}
          onChange={(value) => handleChange('agl', value)}
        />
        <StatSlider
          label="HP"
          value={stats.hp}
          onChange={(value) => handleChange('hp', value)}
        />
        <div className="flex items-center justify-between border-t border-neutral-800 pt-3 text-sm">
          <span className="text-neutral-400">
            Total: <span className="text-neutral-100">{total}</span> / {STAT_BUDGET}
          </span>
          <span
            className={
              remaining === 0 ? 'text-toxic-400' : 'text-amber-400'
            }
          >
            Remaining: {remaining}
          </span>
        </div>
        <button
          type="submit"
          disabled={total !== STAT_BUDGET || mutation.isPending}
          className="rounded bg-toxic-600 px-3 py-2 text-sm font-bold text-neutral-950 hover:bg-toxic-500 disabled:opacity-60"
        >
          {mutation.isPending ? 'Creating...' : 'Create character'}
        </button>
        {mutation.isError ? (
          <p className="text-sm text-red-400">Creation failed.</p>
        ) : null}
      </form>
    </div>
  );
}

interface StatSliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function StatSlider({ label, value, onChange }: StatSliderProps): ReactElement {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-12 text-neutral-400">{label}</span>
      <input
        type="range"
        min={STAT_MIN}
        max={STAT_MAX}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="flex-1"
      />
      <span className="w-8 text-right text-neutral-100">{value}</span>
    </label>
  );
}
