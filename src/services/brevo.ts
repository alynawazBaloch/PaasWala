/**
 * Brevo (Sendinblue) service for SMS & Email communications.
 *
 * ⚠️ In production, route these calls through a backend (Firebase Cloud Function
 * or your own API server) so the API key is never exposed client-side.
 *
 * Usage from a Cloud Function / backend:
 *   import { sendSMS, sendEmail } from './brevo';
 *   await sendSMS('+923001234567', 'Your OTP is 123456');
 */

import Constants from 'expo-constants';

// Try multiple sources for the API key (ordered by reliability in Expo):
// 1. Constants.expoConfig.extra (resolved from app.json $VAR — most reliable)
// 2. EXPO_PUBLIC_ env var (inlined by Metro)
// 3. process.env fallback (Node/CLI usage)
// 4. Constants.manifest.extra (older Expo pattern)
const resolveApiKey = (): string => {
  const sources: [string, string][] = [
    ['expoConfig.extra.brevoApiKey',       (Constants.expoConfig?.extra as Record<string, any>)?.brevoApiKey],
    ['expoConfig.extra.brevoApiKeyExpoPub', (Constants.expoConfig?.extra as Record<string, any>)?.brevoApiKeyExpoPublic],
    ['process.env.EXPO_PUBLIC_BREVO_API',   process.env.EXPO_PUBLIC_BREVO_API_KEY],
    ['process.env.BREVO_API_KEY',           process.env.BREVO_API_KEY],
    ['manifest.extra.brevoApiKey',          (Constants.manifest?.extra as Record<string, any>)?.brevoApiKey],
  ];
  for (const [label, val] of sources) {
    if (val && typeof val === 'string') {
      const trimmed = val.trim();
      // Skip unresolved $VARNAME templates (e.g. "$BREVO_API_KEY")
      if (trimmed.startsWith('$') || trimmed.length < 20) {
        console.log(`[Brevo] API key skipped ${label}: starts-with-$ or too short`);
        continue;
      }
      const masked = trimmed.slice(0, 10) + '****' + trimmed.slice(-4);
      console.log(`[Brevo] API key resolved from ${label}: ${masked} (len: ${trimmed.length})`);
      return trimmed;
    }
    console.log(`[Brevo] API key skipped ${label}:`, typeof val);
  }
  return '';
};
const BREVO_API_KEY = resolveApiKey();

// Verified sender from Brevo dashboard — configure in .env
const BREVO_SENDER_NAME =
  process.env.EXPO_PUBLIC_BREVO_SENDER_NAME || 'PaasWala';
const BREVO_SENDER_EMAIL =
  process.env.EXPO_PUBLIC_BREVO_SENDER_EMAIL || 'noreply@paaswala.app';

const BREVO_API_BASE = 'https://api.brevo.com/v3';

export interface BrevoSMSOptions {
  to: string;
  content: string;
  sender?: string;
}

export interface BrevoEmailOptions {
  to: { email: string; name?: string }[];
  subject: string;
  htmlContent: string;
  sender?: { email: string; name: string };
}

/**
 * Send an SMS via Brevo's Transactional SMS API.
 */
export const sendSMS = async (options: BrevoSMSOptions): Promise<boolean> => {
  try {
    const response = await fetch(`${BREVO_API_BASE}/transactionalSMS/sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: options.sender || 'PaasWala',
        recipient: options.to,
        content: options.content,
        type: 'transactional',
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`Brevo SMS error ${response.status}:`, body);
    }
    return response.ok;
  } catch (error) {
    console.error('Brevo SMS network error:', error);
    return false;
  }
};

/**
 * Send a transactional email via Brevo's Email API.
 *
 * Requires a verified sender in your Brevo dashboard:
 *   Login → Senders → Add & verify an email address
 * Then set EXPO_PUBLIC_BREVO_SENDER_EMAIL in .env to that email.
 */
export const sendEmail = async (options: BrevoEmailOptions): Promise<boolean> => {
  if (!BREVO_API_KEY) {
    console.error('[Brevo] API key is empty — verify .env is loaded and app.json extra has brevoApiKey');
    return false;
  }
  try {
    const sender = options.sender || {
      email: BREVO_SENDER_EMAIL,
      name: BREVO_SENDER_NAME,
    };
    console.log('[Brevo] Sending email to', options.to[0]?.email, 'via', sender.email);
    const response = await fetch(`${BREVO_API_BASE}/smtp/email`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
        // Some Brevo accounts use api-key, others use x-api-key — send both
        'api-key': BREVO_API_KEY,
        'x-api-key': BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender,
        to: options.to,
        subject: options.subject,
        htmlContent: options.htmlContent,
      }),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => '');
      console.error(`[Brevo] Email error ${response.status}:`, body);
    } else {
      console.log('[Brevo] Email sent successfully to', options.to[0]?.email);
    }
    return response.ok;
  } catch (error) {
    console.error('[Brevo] Email network/fetch error:', error);
    return false;
  }
};

/**
 * Send an OTP code via SMS.
 */
export const sendOTP = async (phone: string, otp: string): Promise<boolean> => {
  return sendSMS({
    to: phone,
    content: `Your PaasWala verification code is: ${otp}. Valid for 10 minutes.`,
    sender: 'PaasWala',
  });
};

/**
 * Send an emergency alert to a list of phone numbers.
 */
export const sendEmergencyAlert = async (
  phones: string[],
  alertTitle: string,
  alertLocation: string,
): Promise<boolean[]> => {
  const results = await Promise.allSettled(
    phones.map((phone) =>
      sendSMS({
        to: phone,
        content: `🚨 EMERGENCY: ${alertTitle} near ${alertLocation}. - PaasWala`,
        sender: 'PaasWala',
      })
    )
  );
  return results.map((r) => r.status === 'fulfilled' && r.value);
};

export default {
  sendSMS,
  sendEmail,
  sendOTP,
  sendEmergencyAlert,
};
