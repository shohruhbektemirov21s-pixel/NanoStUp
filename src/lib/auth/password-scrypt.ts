import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const PREFIX = "scrypt$";
const KEYLEN = 64;

function parseStored(stored: string): { salt: Buffer; hash: Buffer } | null {
  if (!stored.startsWith(PREFIX)) {
    return null;
  }
  const rest = stored.slice(PREFIX.length);
  const parts = rest.split("$");
  if (parts.length !== 2) {
    return null;
  }
  const [saltHex, hashHex] = parts;
  if (!/^[0-9a-f]+$/i.test(saltHex) || !/^[0-9a-f]+$/i.test(hashHex)) {
    return null;
  }
  try {
    return { salt: Buffer.from(saltHex, "hex"), hash: Buffer.from(hashHex, "hex") };
  } catch {
    return null;
  }
}

export function hashPasswordScrypt(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, KEYLEN);
  return `${PREFIX}${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function verifyPasswordScrypt(plain: string, stored: string | null | undefined): boolean {
  if (!stored) {
    return false;
  }
  const parsed = parseStored(stored);
  if (!parsed) {
    return false;
  }
  const candidate = scryptSync(plain, parsed.salt, parsed.hash.length);
  if (candidate.length !== parsed.hash.length) {
    return false;
  }
  return timingSafeEqual(candidate, parsed.hash);
}
