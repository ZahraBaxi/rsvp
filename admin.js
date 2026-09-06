var RSVP_CLASS = 'HousewarmingRSVP';
var SESSION_KEY = 'b4a_session_token';

var viewLogin = document.querySelector('#view-login');
var viewDashboard = document.querySelector('#view-dashboard');

var loginForm = document.querySelector('#login-form');
var loginError = document.querySelector('#login-error');
var loginBtn = document.querySelector('#login-btn');

var statsEl = document.querySelector('#stats');
var tbody = document.querySelector('#rsvp-tbody');
var copyEmailsBtn = document.querySelector('#copy-emails-btn');
var copyEmailsNote = document.querySelector('#copy-emails-note');

// cache of the latest loaded rows so the copy-emails button doesn't
// need a fresh fetch every time
var latestRows = [];

// ---------------- session on load ----------------
// If a previous login left a session token, try to restore it
// silently so refreshing the page doesn't force a re-login.
async function restoreSession() {
  var saved = localStorage.getItem(SESSION_KEY);
  if (!saved) return;
  try {
    await b4aValidateSession(saved);
    showDashboard();
  } catch (err) {
    localStorage.removeItem(SESSION_KEY);
  }
}
restoreSession();

// ---------------- login ----------------
async function handleLogin(event) {
  event.preventDefault();
  var username = document.querySelector('#login-username').value.trim();
  var password = document.querySelector('#login-password').value;

  loginError.hidden = true;
  loginBtn.disabled = true;
  loginBtn.textContent = 'logging in…';

  try {
    var result = await b4aLogIn(username, password);
    localStorage.setItem(SESSION_KEY, result.sessionToken);
    showDashboard();
  } catch (err) {
    loginError.textContent = err.message || 'Could not log in — check your username and password.';
    loginError.hidden = false;
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'log in';
  }
}
loginForm.addEventListener('submit', handleLogin);

async function handleLogout() {
  await b4aLogOut();
  localStorage.removeItem(SESSION_KEY);
  viewDashboard.hidden = true;
  viewLogin.hidden = false;
}
document.querySelector('#logout-btn').addEventListener('click', handleLogout);

document.querySelector('#refresh-btn').addEventListener('click', loadRsvps);

// ---------------- dashboard ----------------
function showDashboard() {
  viewLogin.hidden = true;
  viewDashboard.hidden = false;
  loadRsvps();
}

async function loadRsvps() {
  tbody.innerHTML = '<tr><td colspan="7" class="empty-row">loading…</td></tr>';
  try {
    var rows = await fetchClass(RSVP_CLASS, '-createdAt');
    latestRows = rows;
    renderStats(rows);
    renderTable(rows);
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">couldn\'t load RSVPs — ' + escapeHtml(err.message || 'try refreshing') + '</td></tr>';
  }
}

function renderStats(rows) {
  var yesRows = [];
  var noRows = [];
  var totalGuests = 0;

  for (var i = 0; i < rows.length; i++) {
    var row = rows[i];
    if (row.attending === 'yes') {
      yesRows.push(row);
      totalGuests += Number(row.guests) || 0;
    } else if (row.attending === 'no') {
      noRows.push(row);
    }
  }

  statsEl.innerHTML =
    '<span class="stat-pill"><strong>' + rows.length + '</strong> responses</span>' +
    '<span class="stat-pill"><strong>' + yesRows.length + '</strong> coming</span>' +
    '<span class="stat-pill"><strong>' + totalGuests + '</strong> total guests</span>' +
    '<span class="stat-pill"><strong>' + noRows.length + '</strong> can\'t make it</span>';
}

function renderTable(rows) {
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-row">no RSVPs yet — share the invite link!</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    html += '<tr data-id="' + r.objectId + '">' +
      '<td>' + escapeHtml(r.name || '—') + '</td>' +
      '<td>' + escapeHtml(r.email || '—') + '</td>' +
      '<td>' + (r.attending === 'yes' ? '<span class="pill-yes">yes 🎉</span>' : '<span class="pill-no">no</span>') + '</td>' +
      '<td>' + (r.attending === 'yes' ? (r.guests != null ? r.guests : 1) : '—') + '</td>' +
      '<td>' + escapeHtml(r.notes || '—') + '</td>' +
      '<td>' + formatDate(r.createdAt) + '</td>' +
      '<td><button class="x-btn" data-delete-rsvp="' + r.objectId + '" data-name="' + escapeHtml(r.name || 'this response') + '" aria-label="Remove response">×</button></td>' +
      '</tr>';
  }
  tbody.innerHTML = html;
}

async function handleTableClick(event) {
  var btn = event.target.closest('[data-delete-rsvp]');
  if (!btn) return;
  var id = btn.dataset.deleteRsvp;
  var name = btn.dataset.name;
  if (!confirm('remove ' + name + '\'s RSVP? this can\'t be undone.')) return;

  btn.disabled = true;
  try {
    await deleteFromClass(RSVP_CLASS, id);
    await loadRsvps();
  } catch (err) {
    alert('couldn\'t remove that RSVP — ' + (err.message || 'try again'));
    btn.disabled = false;
  }
}
tbody.addEventListener('click', handleTableClick);

// ---------------- copy emails (for a future group update) ----------------
async function handleCopyEmails() {
  var emails = [];
  for (var i = 0; i < latestRows.length; i++) {
    var email = (latestRows[i].email || '').trim();
    if (email && emails.indexOf(email) === -1) {
      emails.push(email);
    }
  }

  copyEmailsNote.hidden = false;

  if (!emails.length) {
    copyEmailsNote.textContent = 'no emails collected yet.';
    return;
  }

  var list = emails.join(', ');
  try {
    await navigator.clipboard.writeText(list);
    copyEmailsNote.textContent = 'copied ' + emails.length + ' email' + (emails.length === 1 ? '' : 's') + ' — paste into the BCC field of your update email.';
  } catch (err) {
    copyEmailsNote.textContent = list;
  }
}
copyEmailsBtn.addEventListener('click', handleCopyEmails);

// ---------------- shared helpers ----------------
function formatDate(iso) {
  if (!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
    ' · ' + d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function escapeHtml(str) {
  var div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
