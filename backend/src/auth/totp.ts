import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const ISSUER = 'MIKE Games';
const BACKUP_CODE_COUNT = 8;

function normalizeBackupCode(code: string): string {
  return code.toUpperCase().replace(/\s/g, '').replace(/-/g, '');
}

function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(normalizeBackupCode(code)).digest('hex');
}

function isSha256Hash(value: string): boolean {
  return /^[a-f0-9]{64}$/i.test(value);
}

export function generateTOTPSecret(username: string): { secret: string; uri: string } {
  const totp = new OTPAuth.TOTP({
    issuer: ISSUER,
    label: username,
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  return {
    secret: totp.secret.base32,
    uri: totp.toString(),
  };
}

export function verifyTOTP(secret: string, token: string): boolean {
  const totp = new OTPAuth.TOTP({
    secret: OTPAuth.Secret.fromBase32(secret),
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });

  // Fenster von +/- 1 Periode erlauben
  const delta = totp.validate({ token, window: 1 });
  return delta !== null;
}

export async function generateQRCodeDataURL(uri: string): Promise<string> {
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: '#000', light: '#fff' },
  });
}

export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < BACKUP_CODE_COUNT; i++) {
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return codes;
}

export function hashBackupCodes(codes: string[]): string[] {
  return codes.map(hashBackupCode);
}

export function verifyBackupCode(storedCodes: string[], inputCode: string): { valid: boolean; remaining: string[] } {
  const normalizedInput = normalizeBackupCode(inputCode);
  const hashedInput = hashBackupCode(inputCode);
  const index = storedCodes.findIndex((stored) => {
    if (isSha256Hash(stored)) {
      return stored.toLowerCase() === hashedInput.toLowerCase();
    }
    return normalizeBackupCode(stored) === normalizedInput;
  });

  if (index === -1) {
    return { valid: false, remaining: storedCodes };
  }

  // Legacy-Klartextcodes werden bei erfolgreicher Verwendung auf Hashes migriert.
  const remaining = storedCodes
    .filter((_, i) => i !== index)
    .map((entry) => (isSha256Hash(entry) ? entry.toLowerCase() : hashBackupCode(entry)));
  return { valid: true, remaining };
}
