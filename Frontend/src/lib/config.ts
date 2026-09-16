const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

function isHttpsUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

export const publicConfigError = !isHttpsUrl(supabaseUrl)
  ? 'CAS Assist is missing a valid Supabase URL. Install a correctly configured build or contact the administrator.'
  : !supabaseAnonKey
    ? 'CAS Assist is missing its Supabase publishable key. Install a correctly configured build or contact the administrator.'
    : null;

export const publicConfig = {
  // Invalid placeholders prevent an import-time SDK crash. The root configuration
  // gate blocks authentication and data access whenever publicConfigError is set.
  supabaseUrl: supabaseUrl ?? 'https://invalid.local',
  supabaseAnonKey: supabaseAnonKey ?? 'invalid-public-key',
};

