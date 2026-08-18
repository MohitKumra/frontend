// frontend/src/features/auth/hooks/useGoogleOAuthPopup.ts
// Popup-based Google OAuth helpers.
//
// Prior to this change Google OAuth used a full-page redirect. Now we launch a
// centered popup that the backend finishes by postMessage()-ing a result back
// to this window (validated by origin + a per-attempt nonce) and closing itself.
//
// No access/refresh tokens are ever exchanged via postMessage — on success the
// opener re-synchronizes its session through the existing /auth/refresh + /auth/me
// endpoints using the httpOnly cookie that the callback already set.

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { authApi } from '../api';
import { useAuthStore } from '../../../store/authStore';

const POPUP_WIDTH = 500;
const POPUP_HEIGHT = 600;

export type GoogleAuthPurpose = 'signin' | 'calendar-connect';

export interface GoogleOAuthPopupMessage {
  type: 'GOOGLE_AUTH_SUCCESS' | 'GOOGLE_AUTH_ERROR';
  purpose?: GoogleAuthPurpose;
  nonce?: string;
  error?: string;
}

interface UseGoogleOAuthPopupOptions {
  /** Builds the OAuth start URL for a freshly generated nonce. Must be stable (useCallback). */
  buildUrl: (nonce: string) => string;
  onSuccess?: (purpose: GoogleAuthPurpose) => void | Promise<void>;
  onError?: (message: string) => void;
}

export function useGoogleOAuthPopup({ buildUrl, onSuccess, onError }: UseGoogleOAuthPopupOptions) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  const popupRef = useRef<Window | null>(null);
  const nonceRef = useRef('');
  const resolvedRef = useRef(false);
  const pollTimerRef = useRef<number | null>(null);

  // Keep latest callbacks without re-subscribing the message listener.
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  // Messages come from the backend-served callback page, so the sender origin is
  // the BACKEND origin — never trust event.origin === '*'.
  let backendOrigin = '';
  try {
    backendOrigin = new URL(import.meta.env.VITE_BACKEND_URL).origin;
  } catch {
    backendOrigin = '';
  }

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    stopPolling();
    popupRef.current = null;
    nonceRef.current = '';
    resolvedRef.current = false;
    setIsGoogleLoading(false);
    setIsBlocked(false);
  }, [stopPolling]);

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      // Reject messages from any origin other than the backend that serves the callback.
      if (backendOrigin && event.origin !== backendOrigin) return;
      const data = event.data as GoogleOAuthPopupMessage | undefined;
      if (!data || typeof data !== 'object' || !data.type) return;
      // Only accept a message for the auth attempt this page itself initiated.
      if (!nonceRef.current || data.nonce !== nonceRef.current) return;

      resolvedRef.current = true;
      stopPolling();

      if (data.type === 'GOOGLE_AUTH_SUCCESS') {
        // Keep the loading state while we re-sync the backend session.
        setIsGoogleLoading(true);
        Promise.resolve(onSuccessRef.current?.(data.purpose ?? 'signin')).finally(() => reset());
      } else if (data.type === 'GOOGLE_AUTH_ERROR') {
        const message = data.error || 'Google sign-in could not be completed.';
        onErrorRef.current?.(message);
        reset();
      }
    },
    [backendOrigin, reset, stopPolling]
  );

  useEffect(() => {
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      stopPolling();
    };
  }, [handleMessage, stopPolling]);

  const open = useCallback(() => {
    // Guard against opening a second popup while one auth attempt is in flight.
    if (nonceRef.current) return;

    const nonce = crypto.randomUUID();
    nonceRef.current = nonce;
    resolvedRef.current = false;

    const url = buildUrl(nonce);

    // Center the 500x600 popup on the user's screen.
    const left = Math.max(0, Math.round((window.screen.width - POPUP_WIDTH) / 2));
    const top = Math.max(0, Math.round((window.screen.height - POPUP_HEIGHT) / 2));

    let popup: Window | null = null;
    try {
      popup = window.open(
        url,
        'google-oauth',
        `width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=${top},popup=1`
      );
    } catch {
      popup = null;
    }

    // Popup blocked by the browser.
    if (!popup) {
      nonceRef.current = '';
      setIsBlocked(true);
      toast.error('Unable to open Google sign-in. Please allow popups for this site and try again.');
      return;
    }

    popupRef.current = popup;
    setIsBlocked(false);
    setIsGoogleLoading(true);

    // Detect when the user manually closes the popup before auth completes.
    pollTimerRef.current = window.setInterval(() => {
      if (!popupRef.current?.closed) return;
      if (!resolvedRef.current) {
        // User closed it / cancelled — silently return to idle, stay on page.
        reset();
      } else {
        stopPolling();
      }
    }, 500);
  }, [buildUrl, reset, stopPolling]);

  return { open, isGoogleLoading, isBlocked };
}

/**
 * Sign-in / sign-up variant: refreshes the backend session on success and sends
 * the user to the dashboard, exactly like the email/password path.
 */
export function useGoogleSignInPopup() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const buildUrl = useCallback((nonce: string) => {
    const params = new URLSearchParams({
      purpose: 'signin',
      redirect: '1',
      nonce,
      returnTo: `${import.meta.env.VITE_APP_BASE_URL}/google/callback`,
    });
    return `${import.meta.env.VITE_BACKEND_URL}/auth/google/start?${params.toString()}`;
  }, []);

  const onSuccess = useCallback(async () => {
    try {
      const { accessToken } = await authApi.refresh();
      const user = await authApi.getMe();
      setAuth(accessToken, user);
      navigate('/');
    } catch {
      toast.error('Google sign-in succeeded, but your session could not be loaded. Please try again.');
    }
  }, [navigate, setAuth]);

  const onError = useCallback((message: string) => {
    toast.error(message);
  }, []);

  return useGoogleOAuthPopup({ buildUrl, onSuccess, onError });
}

