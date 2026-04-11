import { useEffect, type ReactElement } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

/**
 * Minimal character summary shape returned by `GET /api/characters`. Will be
 * tightened once the REST schema lands alongside the server implementation.
 */
export interface CharacterSummary {
  id: string;
  name: string;
  level: number;
  sector: string;
}

class HttpError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

async function fetchCharacters(): Promise<CharacterSummary[]> {
  const response = await fetch('/api/characters', { credentials: 'include' });
  if (!response.ok) {
    throw new HttpError(`failed to load characters (${response.status})`, response.status);
  }
  return (await response.json()) as CharacterSummary[];
}

export function CharacterListPage(): ReactElement {
  const navigate = useNavigate();
  const query = useQuery<CharacterSummary[], HttpError>({
    queryKey: ['characters'],
    queryFn: fetchCharacters,
    retry: false,
  });

  useEffect(() => {
    if (query.error instanceof HttpError && query.error.status === 401) {
      navigate('/login', { replace: true });
    }
  }, [query.error, navigate]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-toxic-500">Your characters</h1>
        <Link
          to="/characters/new"
          className="rounded bg-toxic-600 px-3 py-1 text-sm font-bold text-neutral-950 hover:bg-toxic-500"
        >
          Create character
        </Link>
      </div>
      {query.isLoading ? <p className="text-neutral-400">Loading...</p> : null}
      {query.isError ? (
        <p className="text-sm text-red-400">Could not load characters.</p>
      ) : null}
      {query.data !== undefined && query.data.length === 0 ? (
        <p className="text-neutral-400">No characters yet.</p>
      ) : null}
      {query.data !== undefined && query.data.length > 0 ? (
        <ul className="flex flex-col divide-y divide-neutral-800 rounded border border-neutral-800">
          {query.data.map((character) => (
            <li
              key={character.id}
              className="flex items-center justify-between px-3 py-2"
            >
              <div>
                <div className="font-bold text-neutral-100">{character.name}</div>
                <div className="text-xs text-neutral-500">
                  Level {character.level} · {character.sector}
                </div>
              </div>
              <Link
                to="/game"
                className="text-xs text-toxic-400 underline hover:text-toxic-300"
              >
                Enter wasteland
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
