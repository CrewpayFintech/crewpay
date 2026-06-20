const webRedirectUrl =
  typeof window !== 'undefined' && (window as unknown as { location?: { origin?: string } }).location?.origin
    ? `${(window as unknown as { location: { origin: string } }).location.origin}/auth/callback`
    : '';

export const authRedirectUrl =
  process.env?.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() ||
  webRedirectUrl ||
  'crewpay://auth/callback';
