import { GOOGLE_AUTH_CONFIG } from "../config/googleAuth";

export type GoogleSignInBackendRequest = {
    id_token: string;
    device_id? : string;
}


export type GoogleSignInBackendResponse = {
    access_token: string;
    refresh_token: string;
    token_type?: string;
    user?: any;
}


export async function loginWithGoogleBackend(
    payload: GoogleSignInBackendRequest
): Promise<GoogleSignInBackendResponse> {
    const response = await fetch (`${GOOGLE_AUTH_CONFIG.apiBaseUrl}/auth/google`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data?.detail || 'Invalid Google token');
    }

    return data;
}