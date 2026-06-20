declare const process: {
  env?: Record<string, string | undefined>;
};

declare const window:
  | {
      location?: {
        origin?: string;
      };
    }
  | undefined;

const webRedirectUrl =
  typeof window !== 'undefined' && window.location?.origin
    ? `${window.location.origin}/auth/callback`
    : '';

export const authRedirectUrl =
  process.env?.EXPO_PUBLIC_AUTH_REDIRECT_URL?.trim() ||
  webRedirectUrl ||
  'crewpay://auth/callback';
