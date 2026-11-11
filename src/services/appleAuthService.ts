import { GOOGLE_AUTH_CONFIG } from '../config/googleAuth';

export type AppleSignInBackendRequest = {
  identity_token: string;
  authorization_code: string;
  raw_nonce: string;
  full_name: string | null;
  // No device_id / email: the backend rejects unknown fields (422).
};

export type AppleSignInBackendResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  is_new_user: boolean;
  needs_phone_verification: boolean;
  user?: any;
};

export class AppleBackendError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

export async function loginWithAppleBackend(
  payload: AppleSignInBackendRequest
): Promise<AppleSignInBackendResponse> {
  const response = await fetch(`${GOOGLE_AUTH_CONFIG.apiBaseUrl}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    // 422 returns `detail` as an array of validation errors, not a string
    const message =
      typeof data?.detail === 'string' ? data.detail : 'Apple sign-in failed';
    throw new AppleBackendError(message, response.status);
  }

  return data;
}