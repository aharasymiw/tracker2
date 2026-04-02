import { base64ToBytes, bytesToBase64, randomBytes } from '@/lib/encoding';
import { type PasskeyCredentialConfig } from '@/types/models';

interface PublicKeyCredentialWithPRF extends PublicKeyCredential {
  getClientExtensionResults(): AuthenticationExtensionsClientOutputs & {
    prf?: {
      enabled?: boolean;
      results?: {
        first: ArrayBuffer;
      };
    };
  };
}

async function derivePrfKey(result: ArrayBuffer) {
  const digest = await crypto.subtle.digest('SHA-256', result);
  return new Uint8Array(digest);
}

function canUsePasskeys() {
  return (
    typeof window !== 'undefined' && 'PublicKeyCredential' in window && 'credentials' in navigator
  );
}

export async function isPlatformPasskeyAvailable() {
  if (!canUsePasskeys()) {
    return false;
  }

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function createPasskeyBinding(label: string) {
  if (!(await isPlatformPasskeyAvailable())) {
    throw new Error('Device unlock is not available on this browser.');
  }

  const challenge = randomBytes(32);
  const userId = randomBytes(16);
  const prfSalt = randomBytes(32);
  const credential = (await navigator.credentials.create({
    publicKey: {
      rp: {
        name: 'Kindred',
        id: window.location.hostname,
      },
      user: {
        id: userId,
        name: 'kindred-user',
        displayName: label,
      },
      challenge,
      pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: 60_000,
      extensions: {
        prf: {
          eval: {
            first: prfSalt,
          },
        },
      },
    } as CredentialCreationOptions['publicKey'],
  })) as PublicKeyCredentialWithPRF | null;

  if (!credential) {
    throw new Error('Device unlock setup was cancelled.');
  }

  const prf = credential.getClientExtensionResults().prf;

  if (!prf?.enabled || !prf.results?.first) {
    throw new Error(
      'This browser does not support the secure passkey extension required for local-only unlock.',
    );
  }

  return {
    config: {
      credentialIdBase64: bytesToBase64(new Uint8Array(credential.rawId)),
      userIdBase64: bytesToBase64(userId),
      prfSaltBase64: bytesToBase64(prfSalt),
      label,
      createdAt: new Date().toISOString(),
    } satisfies PasskeyCredentialConfig,
    secret: await derivePrfKey(prf.results.first),
  };
}

export async function unlockWithPasskey(config: PasskeyCredentialConfig) {
  const credential = (await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          id: base64ToBytes(config.credentialIdBase64),
          type: 'public-key',
        },
      ],
      timeout: 60_000,
      userVerification: 'required',
      extensions: {
        prf: {
          eval: {
            first: base64ToBytes(config.prfSaltBase64),
          },
        },
      },
    } as CredentialRequestOptions['publicKey'],
  })) as PublicKeyCredentialWithPRF | null;

  if (!credential) {
    throw new Error('Device unlock was cancelled.');
  }

  const prf = credential.getClientExtensionResults().prf;

  if (!prf?.results?.first) {
    throw new Error('Device unlock did not return a usable secret.');
  }

  return derivePrfKey(prf.results.first);
}
