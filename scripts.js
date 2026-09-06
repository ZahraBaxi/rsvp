// ============ view switching ============
var viewHome = document.querySelector('#view-home');
var viewPassword = document.querySelector('#view-password');
var viewInvite = document.querySelector('#view-invite');
var viewForm = document.querySelector('#view-form');
var viewThanks = document.querySelector('#view-thanks');

var ALL_VIEWS = [viewHome, viewPassword, viewInvite, viewForm, viewThanks];

function showView(view) {
  for (var i = 0; i < ALL_VIEWS.length; i++) {
    ALL_VIEWS[i].hidden = true;
  }
  view.hidden = false;
}

// holds the secret party details once the password has been
// accepted, so the thanks screen can use them later without
// asking for the password a second time
var partySecrets = null;

// ============ envelope open animation ============
var envelopeIllustration = document.querySelector('#envelope-illustration');

function openIllustratedEnvelope() {
  if (envelopeIllustration.classList.contains('is-open')) return;
  envelopeIllustration.classList.add('is-open');
  viewHome.classList.add('is-leaving');
  setTimeout(function () {
    showView(viewPassword);
    viewHome.classList.remove('is-leaving');
    envelopeIllustration.classList.remove('is-open');
    document.querySelector('#party-password').focus();
  }, 500);
}

envelopeIllustration.addEventListener('click', openIllustratedEnvelope);
envelopeIllustration.addEventListener('keydown', function (event) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openIllustratedEnvelope();
  }
});

function goToForm() {
  showView(viewForm);
}

document.querySelector('#btn-show-form').addEventListener('click', goToForm);
document.querySelector('#btn-back').addEventListener('click', function () {
  showView(viewInvite);
});

// ============ password gate ============
var passwordForm = document.querySelector('#password-form');
var passwordInput = document.querySelector('#party-password');
var passwordError = document.querySelector('#password-error');
var unlockBtn = document.querySelector('#btn-unlock');

function fillText(id, value) {
  var el = document.querySelector('#' + id);
  if (el) el.textContent = value;
}

function renderParkingCards(parking) {
  var container = document.querySelector('#parking-cards');
  if (!container || !parking) return;

  var html = '';
  for (var i = 0; i < parking.length; i++) {
    var spot = parking[i];
    html += '<div class="info-card">' +
      '<p class="info-card-title">' + spot.title + '</p>' +
      '<p class="info-card-address">' + spot.address + '</p>' +
      '<p class="info-card-text">' + spot.text + '</p>' +
      (spot.mapUrl ? '<div class="info-map"><iframe src="' + spot.mapUrl + '" loading="lazy" title="Map of ' + spot.title + '"></iframe></div>' : '') +
      (spot.googleMapsUrl ? '<a class="info-link info-link--pin" href="' + spot.googleMapsUrl + '" target="_blank" rel="noopener">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z"/><circle cx="12" cy="9" r="2.3"/></svg>' +
        'view on Google Maps</a>' : '') +
      '</div>';
  }
  container.innerHTML = html;
}

function applySecrets(secrets) {
  partySecrets = secrets;
  fillText('venue-text', secrets.venue || '');
  fillText('address-text', secrets.address || '');
  fillText('datetime-text', secrets.datetime || '');
  fillText('phone-text', secrets.phone || '');
  renderParkingCards(secrets.parking);
}

async function handlePasswordSubmit(event) {
  event.preventDefault();
  var password = passwordInput.value;
  if (!password) return;

  passwordError.hidden = true;
  unlockBtn.disabled = true;
  unlockBtn.textContent = 'checking…';

  try {
    // getPartyDetails is a Back4App Cloud Code function — see the
    // separate cloud-code file. It checks the password server-side
    // and only then returns the address/date/time/parking info, so
    // none of that ever lives in this public repo.
    var secrets = await callCloudFunction('getPartyDetails', { password: password });
    applySecrets(secrets);
    showView(viewInvite);
  } catch (err) {
    passwordError.textContent = "hmm, that's not it — try again.";
    passwordError.hidden = false;
    console.error('Password check failed:', err);
  } finally {
    unlockBtn.disabled = false;
    unlockBtn.textContent = 'Unlock Invite';
  }
}

passwordForm.addEventListener('submit', handlePasswordSubmit);

// ============ attending toggle ============
var attendingInput = document.querySelector('#attending');
var toggleButtons = document.querySelectorAll('.toggle-btn');
var guestsField = document.querySelector('#guests-field');

function selectToggle(event) {
  var btn = event.currentTarget;
  for (var i = 0; i < toggleButtons.length; i++) {
    toggleButtons[i].classList.remove('is-selected');
  }
  btn.classList.add('is-selected');
  attendingInput.value = btn.dataset.value;

  // hide guest count if they can't make it
  guestsField.style.display = btn.dataset.value === 'no' ? 'none' : 'block';
}

for (var t = 0; t < toggleButtons.length; t++) {
  toggleButtons[t].addEventListener('click', selectToggle);
}

// ============ guest stepper ============
var guestsValue = document.querySelector('#guests-value');
var guestsInput = document.querySelector('#guests');
var minusBtn = document.querySelector('#guests-minus');
var plusBtn = document.querySelector('#guests-plus');
var guestCount = 1;

function updateGuests() {
  guestsValue.textContent = guestCount;
  guestsInput.value = guestCount;
}
function decreaseGuests() {
  if (guestCount > 1) {
    guestCount--;
    updateGuests();
  }
}
function increaseGuests() {
  if (guestCount < 10) {
    guestCount++;
    updateGuests();
  }
}
minusBtn.addEventListener('click', decreaseGuests);
plusBtn.addEventListener('click', increaseGuests);

// ============ form submit ============
var form = document.querySelector('#rsvp-form');
var formError = document.querySelector('#form-error');
var submitBtn = document.querySelector('#btn-submit');
var thanksIcon = document.querySelector('#thanks-icon');
var thanksTitle = document.querySelector('#thanks-title');
var thanksSubtitle = document.querySelector('#thanks-subtitle');
var thanksExtra = document.querySelector('#thanks-extra');

var RSVP_CLASS = 'HousewarmingRSVP';

async function handleSubmit(event) {
  event.preventDefault();

  var name = document.querySelector('#name').value.trim();
  var attending = attendingInput.value;

  if (!name || !attending) {
    formError.textContent = "oops — pick a name and let me know if you're coming!";
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  var rsvp = {
    name: name,
    email: document.querySelector('#email').value.trim(),
    attending: attending,
    guests: attending === 'yes' ? Number(guestsInput.value) : 0,
    notes: document.querySelector('#notes').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'sending…';

  try {
    // Saves to the "HousewarmingRSVP" class in Back4App — visible
    // to the host on the admin page (admin.html).
    await createInClass(RSVP_CLASS, rsvp);

    if (attending === 'yes') {
      thanksIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12l6 6L20 6"/></svg>';
      thanksTitle.textContent = "Can't wait to see you there " + name.split(' ')[0] + '!';
      thanksSubtitle.textContent = "we're going to have a great time!";
      thanksExtra.hidden = false;
    } else {
      thanksIcon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';
      thanksTitle.textContent = "I'm sorry that we'll miss you " + name.split(' ')[0];
      thanksSubtitle.textContent = "thanks for letting me know. i hope you can come by sometime soon :)";
      thanksExtra.hidden = true;
    }
    showView(viewThanks);
  } catch (err) {
    formError.textContent = "hmm, that didn't send — check your connection and try again.";
    formError.hidden = false;
    console.error('RSVP submit failed:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SEND IT IN!';
  }
}

form.addEventListener('submit', handleSubmit);

// ============ illustration slot fallback ============
var illustrationImg = document.querySelector('#illustration-img');
var illustrationPlaceholder = document.querySelector('#illustration-placeholder');

function showIllustrationPlaceholder() {
  illustrationImg.hidden = true;
  illustrationPlaceholder.hidden = false;
}
illustrationImg.addEventListener('error', showIllustrationPlaceholder);

// the image may have already failed to load before this deferred
// script ran and attached the listener above, so check directly too
if (illustrationImg.complete && illustrationImg.naturalWidth === 0) {
  showIllustrationPlaceholder();
}
