import * as OTPAuth from 'otpauth';
import QRCode from 'qrcode';
import crypto from 'node:crypto';

const ISSUER = 'MIKE Games';
const BACKUP_CODE_COUNT = 8;

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

export function verifyBackupCode(storedCodes: string[], inputCode: string): { valid: boolean; remaining: string[] } {
  const normalized = inputCode.toUpperCase().replace(/\s/g, '');
  const index = storedCodes.findIndex((c) => c.replace(/-/g, '') === normalized.replace(/-/g, ''));

  if (index === -1) {
    return { valid: false, remaining: storedCodes };
  }

  const remaining = [...storedCodes];
  remaining.splice(index, 1);
  return { valid: true, remaining };
}
