import { auth, db } from './firebase-init.js';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  updateProfile
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js';
import {
  collection,
  addDoc,
  doc,
  setDoc,
  getDoc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js';

let currentUser = null;

// ---------- Booking reference ----------
// Generated client-side for now, so it's only a friendly label, not a
// uniqueness guarantee. Once Cloud Functions exist, move generation
// server-side (see project spec, section 11) to rule out collisions and
// double-booking race conditions.
function generateBookingReference() {
  const datePart = new Date().toISOString().slice(2, 10).replace(/-/g, ''); // e.g. 260828
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `H2O-${datePart}${randomPart}`;
}

// ---------- Auth state ----------
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  const guestView = document.getElementById('guestView');
  const loggedInView = document.getElementById('loggedInView');

  if (user) {
    guestView.style.display = 'none';
    loggedInView.style.display = 'block';
    document.getElementById('loggedInEmail').textContent = user.email;

    try {
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      if (profileSnap.exists()) {
        const profile = profileSnap.data();
        document.getElementById('fullName').value = profile.name || '';
        document.getElementById('phone').value = profile.phone || '';
        document.getElementById('email').value = profile.email || user.email || '';
      }
    } catch (err) {
      console.error('Error loading profile:', err);
    }

    loadMyBookings(user.uid);
  } else {
    guestView.style.display = 'block';
    loggedInView.style.display = 'none';
  }
});

// ---------- Login / Signup toggles ----------
document.getElementById('showLoginLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('loginForm').style.display = 'block';
  document.getElementById('signupForm').style.display = 'none';
  clearAccountMessage();
});

document.getElementById('showSignupLink').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('signupForm').style.display = 'block';
  document.getElementById('loginForm').style.display = 'none';
  clearAccountMessage();
});

function showAccountMessage(message, isError = true) {
  const el = document.getElementById('accountMessage');
  el.textContent = message;
  el.style.color = isError ? '#c62828' : '#2e7d32';
  el.style.display = 'block';
}

function clearAccountMessage() {
  document.getElementById('accountMessage').style.display = 'none';
}

function friendlyAuthError(code) {
  switch (code) {
    case 'auth/invalid-email': return "That email address doesn't look right.";
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential': return 'Incorrect email or password.';
    case 'auth/email-already-in-use': return 'An account with that email already exists — try logging in instead.';
    case 'auth/weak-password': return 'Password should be at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    default: return 'Something went wrong. Please try again.';
  }
}

// ---------- Login ----------
document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAccountMessage();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    showAccountMessage(friendlyAuthError(error.code));
  }
});

// ---------- Signup ----------
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearAccountMessage();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const phone = document.getElementById('signupPhone').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(credential.user, { displayName: name });
    await setDoc(doc(db, 'users', credential.user.uid), {
      name,
      email,
      phone,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    showAccountMessage(friendlyAuthError(error.code));
  }
});

// ---------- Forgot password ----------
document.getElementById('forgotPasswordLink').addEventListener('click', async (e) => {
  e.preventDefault();
  clearAccountMessage();
  const email = document.getElementById('loginEmail').value.trim();
  if (!email) {
    showAccountMessage('Enter your email above first, then click "Forgot password?" again.');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    showAccountMessage('Password reset email sent — check your inbox.', false);
  } catch (error) {
    showAccountMessage(friendlyAuthError(error.code));
  }
});

// ---------- Logout ----------
document.getElementById('logoutLink').addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  document.getElementById('bookingForm').reset();
});

// ---------- My bookings (logged-in customers only) ----------
async function loadMyBookings(uid) {
  const listEl = document.getElementById('myBookingsList');
  listEl.innerHTML = '<p>Loading your bookings…</p>';

  try {
    const q = query(
      collection(db, 'bookings'),
      where('customerId', '==', uid),
      orderBy('createdAt', 'desc')
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      listEl.innerHTML = "<p>You haven't made any bookings yet.</p>";
      return;
    }

    listEl.innerHTML = '';
    snap.forEach((docSnap) => {
      const b = docSnap.data();
      const item = document.createElement('div');
      item.className = 'my-booking-item';
      const statusClass = (b.status || 'pending').toLowerCase();
      item.innerHTML = `
        <strong>${b.bookingReference}</strong> — ${b.serviceName}<br>
        ${b.bookingDate} at ${b.bookingTime}
        <span class="status-badge status-${statusClass}">${b.status}</span>
      `;
      listEl.appendChild(item);
    });
  } catch (error) {
    console.error('Error loading bookings:', error);
    listEl.innerHTML = "<p>Couldn't load your bookings right now.</p>";
  }
}

// ---------- Booking form submit ----------
const bookingForm = document.getElementById('bookingForm');
const bookingFormError = document.getElementById('bookingFormError');

bookingForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  bookingFormError.style.display = 'none';

  const submitBtn = bookingForm.querySelector('button[type="submit"]');
  const originalLabel = submitBtn.textContent;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Submitting…';

  const fullName = document.getElementById('fullName').value.trim();
  const phone = document.getElementById('phone').value.trim();
  const email = document.getElementById('email').value.trim();
  const vehicleType = document.getElementById('vehicleType').value;
  const vehicleReg = document.getElementById('vehicleReg').value.trim();
  const serviceSelect = document.getElementById('service');
  const serviceId = serviceSelect.value;
  const serviceName = serviceSelect.options[serviceSelect.selectedIndex]?.text || '';
  const date = document.getElementById('date').value;
  const time = document.getElementById('time').value;
  const notes = document.getElementById('notes').value.trim();

  const bookingReference = generateBookingReference();

  const bookingData = {
    bookingReference,
    customerId: currentUser ? currentUser.uid : null,
    customerName: fullName,
    customerPhone: phone,
    customerEmail: email || null,
    vehicleRegistration: vehicleReg,
    vehicleType,
    serviceId,
    serviceName,
    bookingDate: date,
    bookingTime: time,
    status: 'PENDING',
    customerNotes: notes || null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  try {
    await addDoc(collection(db, 'bookings'), bookingData);
    showConfirmation(bookingReference, bookingData);
    bookingForm.reset();
    if (currentUser) loadMyBookings(currentUser.uid);
  } catch (error) {
    console.error('Error creating booking:', error);
    bookingFormError.textContent = "We couldn't submit your booking. Please check your connection and try again, or contact us directly.";
    bookingFormError.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalLabel;
  }
});

function showConfirmation(reference, bookingData) {
  document.getElementById('bookingForm').style.display = 'none';
  document.getElementById('bookingConfirmation').style.display = 'block';
  document.getElementById('confirmationRef').textContent = reference;

  let message = `Hi h2oAutoSpa, I just booked online.\n`;
  message += `Reference: ${reference}\n`;
  message += `Name: ${bookingData.customerName}\n`;
  message += `Service: ${bookingData.serviceName}\n`;
  message += `Date: ${bookingData.bookingDate}\n`;
  message += `Time: ${bookingData.bookingTime}`;

  const whatsappUrl = `https://wa.me/27637858327?text=${encodeURIComponent(message)}`;
  document.getElementById('confirmationWhatsapp').href = whatsappUrl;
}

document.getElementById('bookAnotherBtn').addEventListener('click', () => {
  document.getElementById('bookingConfirmation').style.display = 'none';
  document.getElementById('bookingForm').style.display = 'block';
});

// Don't let people pick a date in the past
document.getElementById('date').min = new Date().toISOString().split('T')[0];