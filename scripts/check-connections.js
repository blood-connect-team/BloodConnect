// Simple connection checks for Appwrite, EmailJS and WhatsApp link generation
// Usage: npm run check-connections   (loads .env.local if present)
// All credentials come from environment variables only (see .env.example). Values are never printed.

const env = process.env;

const appwriteEndpoint = (env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1').replace(/\/$/, '');
const appwriteHealthUrl = `${appwriteEndpoint}/health`;

import { Client, Databases } from 'appwrite';

// EmailJS configuration: environment only, no hard-coded fallbacks. The server-style names
// (EMAILJS_*) take precedence; the frontend VITE_EMAILJS_* names are accepted as a convenience.
const emailService = env.EMAILJS_SERVICE_ID || env.VITE_EMAILJS_SERVICE_ID || '';
const emailTemplate = env.EMAILJS_TEMPLATE_ID || env.VITE_EMAILJS_TEMPLATE_ID || '';
const emailUser = env.EMAILJS_USER_ID || env.VITE_EMAILJS_PUBLIC_KEY || '';

const testEmail = env.TEST_RECIPIENT_EMAIL || null;
const testName = env.TEST_RECIPIENT_NAME || 'Test Recipient';
const testPhone = env.TEST_RECIPIENT_PHONE || null; // international format without +, e.g. 15551234567

async function checkAppwrite() {
  try {
    if (typeof fetch !== 'undefined') {
      const res = await fetch(appwriteHealthUrl);
      const text = await res.text();
      console.log('\n[Appwrite] URL:', appwriteHealthUrl);
      console.log('[Appwrite] Status:', res.status);
      console.log('[Appwrite] Body:', text.slice(0, 1000));
      return res.ok;
    } else {
      console.log('[Appwrite] fetch not available in this Node; skipping.');
      return null;
    }
  } catch (err) {
    console.error('[Appwrite] Error:', err.message || err);
    return false;
  }
}

async function checkAppwriteDatabase() {
  if (!env.APPWRITE_API_KEY) {
    console.log('\n[Appwrite DB] Skipped: set APPWRITE_API_KEY to run DB checks.');
    return null;
  }

  const client = new Client()
    .setEndpoint(env.VITE_APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1')
    .setProject(env.VITE_APPWRITE_PROJECT_ID)
    .setKey(env.APPWRITE_API_KEY);

  const db = new Databases(client);
  const databaseId = env.VITE_APPWRITE_DATABASE_ID;

  if (!databaseId) {
    console.log('[Appwrite DB] No VITE_APPWRITE_DATABASE_ID set; skipping.');
    return null;
  }

  try {
    const res = await db.listCollections(databaseId);
    console.log('\n[Appwrite DB] listCollections OK. Count:', res.collections ? res.collections.length : 0);
    return true;
  } catch (err) {
    console.error('[Appwrite DB] Error:', err.message || err);
    return false;
  }
}

async function checkEmailJS() {
  if (!testEmail) {
    console.log('\n[EmailJS] Skipped: set TEST_RECIPIENT_EMAIL to run a live send.');
    return null;
  }

  // Fail clearly (without printing any values) when configuration is incomplete.
  // Empty values and untouched .env.example placeholders ("your_...") both count as missing,
  // so no request is sent to EmailJS with template values.
  const isUnset = (value) => !value || /^your_/i.test(value);
  const missing = [
    ['EMAILJS_SERVICE_ID', emailService],
    ['EMAILJS_TEMPLATE_ID', emailTemplate],
    ['EMAILJS_USER_ID (EmailJS public key)', emailUser],
  ]
    .filter(([, value]) => isUnset(value))
    .map(([name]) => name);
  if (missing.length > 0) {
    console.error(`\n[EmailJS] Missing configuration: ${missing.join(', ')}. Set real values as environment variables (see .env.example).`);
    return false;
  }

  const body = {
    service_id: emailService,
    template_id: emailTemplate,
    user_id: emailUser,
    template_params: {
      to_name: testName,
      to_email: testEmail,
      blood_group: 'A+',
      hospital: 'Health Center',
      urgency: 'High'
    }
  };

  try {
    if (typeof fetch === 'undefined') {
      console.log('[EmailJS] fetch not available in this Node; skipping.');
      return null;
    }

    const res = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const text = await res.text();
    console.log('\n[EmailJS] POST to api.emailjs.com');
    console.log('[EmailJS] Status:', res.status);
    console.log('[EmailJS] Response:', text);
    return res.ok;
  } catch (err) {
    console.error('[EmailJS] Error:', err.message || err);
    return false;
  }
}

function generateWhatsAppLink(phone) {
  if (!phone) return null;
  const message = `🚨 Emergency Blood Needed\n\nBlood Group: A+\nHospital: Test Hospital\nUrgency: High\n\nCan you donate immediately? Reply YES if available.`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

async function runChecks() {
  console.log('Running connection checks...');

  const results = {
    appwrite: null,
    emailjs: null,
    whatsapp: null
  };

  results.appwrite = await checkAppwrite();
  results.appwriteDb = await checkAppwriteDatabase();
  results.emailjs = await checkEmailJS();
  results.whatsapp = testPhone ? generateWhatsAppLink(testPhone) : null;

  console.log('\nSummary:');
  console.log('- Appwrite health:', results.appwrite === true ? 'OK' : results.appwrite === false ? 'FAIL' : 'SKIPPED');
  console.log('- Appwrite DB access:', results.appwriteDb === true ? 'OK' : results.appwriteDb === false ? 'FAIL' : 'SKIPPED');
  console.log('- EmailJS send:', results.emailjs === true ? 'OK' : results.emailjs === false ? 'FAIL' : 'SKIPPED');
  console.log('- WhatsApp link:', results.whatsapp || 'SKIPPED (set TEST_RECIPIENT_PHONE)');

  const anyFail = results.appwrite === false || results.emailjs === false;
  process.exit(anyFail ? 1 : 0);
}

runChecks();
