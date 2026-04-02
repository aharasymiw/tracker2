const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function toUtf8Bytes(value: string) {
  return encoder.encode(value);
}

export function fromUtf8Bytes(value: Uint8Array) {
  return decoder.decode(value);
}

export function bytesToBase64(bytes: Uint8Array) {
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

export function base64ToBytes(value: string) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

export function randomBytes(length: number) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function generateId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}
