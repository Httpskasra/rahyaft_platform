import 'dotenv/config';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local', override: true, quiet: true });

export interface ShayganConfig {
  Server: string;
  DBUserName: string;
  DBPassword: string;
  DataBaseName: string;
  AllowRowSecurity: boolean;
  Level: number;
  AuthUser: string;
  AuthPassword: string;
  StartVersion: string | null;
  EndVersion: string | null;
}

const env = (name: string) => process.env[name]?.trim() ?? '';

export function getLiveSettings() {
  return {
    baseUrl: env('SHAYGAN_API_BASE_URL').replace(/\/+$/, ''),
    timeoutMs: Number(env('SHAYGAN_TIMEOUT_MS') || 5000),
    rowCount: Math.max(1, Math.min(Number(env('SHAYGAN_ROW_COUNT') || 2), 5)),
    allowWrites: env('SHAYGAN_ALLOW_WRITE_TESTS').toLowerCase() === 'true',
    config: {
      Server: env('SHAYGAN_SQL_SERVER'),
      DBUserName: env('SHAYGAN_SQL_USER'),
      DBPassword: env('SHAYGAN_SQL_PASSWORD'),
      DataBaseName: env('SHAYGAN_DATABASE_NAME'),
      AllowRowSecurity: false,
      Level: 0,
      AuthUser: env('SHAYGAN_AUTH_USER'),
      AuthPassword: env('SHAYGAN_AUTH_PASSWORD'),
      StartVersion: null,
      EndVersion: null
    } satisfies ShayganConfig
  };
}

export function validateLiveSettings() {
  const settings = getLiveSettings();
  const missing: string[] = [];
  if (!settings.baseUrl) missing.push('SHAYGAN_API_BASE_URL');
  if (!settings.config.DataBaseName) missing.push('SHAYGAN_DATABASE_NAME');
  if (!settings.config.Server) missing.push('SHAYGAN_SQL_SERVER');
  return { settings, missing };
}
