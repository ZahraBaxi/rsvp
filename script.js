// ============ view switching ============
const viewHome = document.getElementById('view-home');
const viewInvite = document.getElementById('view-invite');
const viewForm = document.getElementById('view-form');
const viewThanks = document.getElementById('view-thanks');

const ALL_VIEWS = [viewHome, viewInvite, viewForm, viewThanks];

function showView(view) {
  ALL_VIEWS.forEach(v => v.hidden = true);
  view.hidden = false;
}

// ============ envelope open animation ============
const envelope = document.getElementById('envelope');

function openEnvelope() {
  if (envelope.classList.contains('is-open')) return;
  envelope.classList.add('is-open');
  viewHome.classList.add('is-leaving');
  setTimeout(() => {
    showView(viewInvite);
    viewHome.classList.remove('is-leaving');
    envelope.classList.remove('is-open');
  }, 800);
}

envelope.addEventListener('click', openEnvelope);
envelope.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    openEnvelope();
  }
});

document.getElementById('btn-show-form').addEventListener('click', () => showView(viewForm));
document.getElementById('btn-back').addEventListener('click', () => showView(viewInvite));
document.getElementById('btn-edit').addEventListener('click', () => showView(viewForm));

// ============ attending toggle ============
const attendingInput = document.getElementById('attending');
const toggleButtons = document.querySelectorAll('.toggle-btn');
const guestsField = document.getElementById('guests-field');

toggleButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    toggleButtons.forEach(b => b.classList.remove('is-selected'));
    btn.classList.add('is-selected');
    attendingInput.value = btn.dataset.value;

    // hide guest count if they can't make it
    guestsField.style.display = btn.dataset.value === 'no' ? 'none' : 'block';
  });
});

// ============ guest stepper ============
const guestsValue = document.getElementById('guests-value');
const guestsInput = document.getElementById('guests');
const minusBtn = document.getElementById('guests-minus');
const plusBtn = document.getElementById('guests-plus');
let guestCount = 1;

function updateGuests() {
  guestsValue.textContent = guestCount;
  guestsInput.value = guestCount;
}
minusBtn.addEventListener('click', () => {
  if (guestCount > 1) { guestCount--; updateGuests(); }
});
plusBtn.addEventListener('click', () => {
  if (guestCount < 10) { guestCount++; updateGuests(); }
});

// ============ form submit ============
const form = document.getElementById('rsvp-form');
const formError = document.getElementById('form-error');
const submitBtn = document.getElementById('btn-submit');
const thanksIcon = document.getElementById('thanks-icon');
const thanksTitle = document.getElementById('thanks-title');
const thanksSubtitle = document.getElementById('thanks-subtitle');

const RSVP_CLASS = 'HousewarmingRSVP';

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const attending = attendingInput.value;

  if (!name || !attending) {
    formError.textContent = "oops — pick a name and let me know if you're coming!";
    formError.hidden = false;
    return;
  }
  formError.hidden = true;

  const rsvp = {
    name,
    attending,
    guests: attending === 'yes' ? Number(guestsInput.value) : 0,
    notes: document.getElementById('notes').value.trim()
  };

  submitBtn.disabled = true;
  submitBtn.textContent = 'sending…';

  try {
    // Saves to the "HousewarmingRSVP" class in Back4App — visible
    // to the host on the admin page (admin.html).
    await createInClass(RSVP_CLASS, rsvp);

    if (attending === 'yes') {
      thanksIcon.textContent = '✦';
      thanksTitle.textContent = `see you there, ${name.split(' ')[0]}`;
      thanksSubtitle.textContent = "can't wait to show you around the new place";
      burstBubbles();
    } else {
      thanksIcon.textContent = '◦';
      thanksTitle.textContent = `we'll miss you, ${name.split(' ')[0]}`;
      thanksSubtitle.textContent = "thanks for letting me know — next hangout, then";
    }
    showView(viewThanks);
  } catch (err) {
    formError.textContent = "hmm, that didn't send — check your connection and try again.";
    formError.hidden = false;
    console.error('RSVP submit failed:', err);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'send my RSVP';
  }
});

// ============ bubble burst animation ============
const bubbleLayer = document.getElementById('bubble-layer');
const bubbleColors = ['#29365e', '#a8442b', '#465785', '#c15f3f', '#1b2440'];

function burstBubbles() {
  const count = 18;
  for (let i = 0; i < count; i++) {
    const bubble = document.createElement('div');
    bubble.className = 'rise-bubble';
    const size = 10 + Math.random() * 26;
    bubble.style.width = `${size}px`;
    bubble.style.height = `${size}px`;
    bubble.style.left = `${Math.random() * 100}%`;
    bubble.style.background = bubbleColors[Math.floor(Math.random() * bubbleColors.length)];
    bubble.style.setProperty('--drift', `${(Math.random() - 0.5) * 120}px`);
    bubble.style.animationDelay = `${Math.random() * 0.6}s`;
    bubbleLayer.appendChild(bubble);
    setTimeout(() => bubble.remove(), 4000);
  }
}
