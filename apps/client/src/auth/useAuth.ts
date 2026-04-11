import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { apiUrl } from '../net/apiBase';
import { useUiStore, type AuthenticatedUser } from '../state/uiStore';

/**
 * Shape of the payload returned by `POST /api/auth/login` and
 * `POST /api/auth/register`. The server sets an HttpOnly session cookie and
 * echoes back a minimal user descriptor the client can render immediately.
 */
export interface AuthResponse {
  user: AuthenticatedUser;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
}

/**
 * Thrown when the auth endpoint responds with a non-2xx status. The body is
 * parsed best-effort so callers can surface server error codes.
 */
export class AuthError extends Error {
  public constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

interface ErrorBodyShape {
  code?: unknown;
  message?: unknown;
}

async function postJson<TReq, TRes>(path: string, body: TReq): Promise<TRes> {
  const response = await fetch(apiUrl(path), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    let code: string | undefined;
    let message = `request failed with status ${response.status}`;
    try {
      const parsed = (await response.json()) as ErrorBodyShape;
      if (typeof parsed.code === 'string') code = parsed.code;
      if (typeof parsed.message === 'string') message = parsed.message;
    } catch {
      // ignore JSON parse errors — use default message
    }
    throw new AuthError(message, response.status, code);
  }
  return (await response.json()) as TRes;
}

export interface UseAuthApi {
  user: AuthenticatedUser | null;
  login: UseMutationResult<AuthResponse, AuthError, LoginInput>;
  register: UseMutationResult<AuthResponse, AuthError, RegisterInput>;
  logout: () => void;
}

/**
 * Minimal auth hook. Wraps the REST endpoints in TanStack Query mutations and
 * mirrors the current user into the Zustand ui store so non-mutating consumers
 * can read it without piping through React Query.
 */
export function useAuth(): UseAuthApi {
  const user = useUiStore((state) => state.user);
  const setUser = useUiStore((state) => state.setUser);

  const login = useMutation<AuthResponse, AuthError, LoginInput>({
    mutationFn: (input) => postJson<LoginInput, AuthResponse>('/api/auth/login', input),
    onSuccess: (data) => {
      setUser(data.user);
    },
  });

  const register = useMutation<AuthResponse, AuthError, RegisterInput>({
    mutationFn: (input) =>
      postJson<RegisterInput, AuthResponse>('/api/auth/register', input),
    onSuccess: (data) => {
      setUser(data.user);
    },
  });

  const logout = (): void => {
    setUser(null);
  };

  return { user, login, register, logout };
}
