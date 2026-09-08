// Booking feature flag.
//
// Keep this false until:
//   1. firebase-config.js has real values from your Firebase project, and
//   2. firestore.rules has been deployed (firebase deploy --only firestore:rules)
//
// While false, the page shows a "coming soon" panel and never touches
// Firebase at all — so a half-configured project can't produce confusing
// errors for real visitors. Flip to true once both are done and tested.
const BOOKING_ENABLED = false;

const comingSoonPanel = document.getElementById('comingSoonPanel');
const accountSection = document.getElementById('accountSection');
const bookingFormSection = document.getElementById('bookingFormSection');

if (BOOKING_ENABLED) {
  comingSoonPanel.style.display = 'none';
  accountSection.style.display = 'block';
  bookingFormSection.style.display = 'block';
  import('./booking-live.js');
} else {
  comingSoonPanel.style.display = 'block';
  accountSection.style.display = 'none';
  bookingFormSection.style.display = 'none';
}