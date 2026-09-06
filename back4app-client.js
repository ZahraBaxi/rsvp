/* ============================================================
   back4app-client.js, Housewarming RSVP

   Reuses the same Back4App app/keys as your other projects
   (Urban Monk Rule / wardrobe) rather than standing up a new
   app — so the login you already have works here too. RSVP
   data lives in its own Parse class, "HousewarmingRSVP", which
   shows up as its own tab/table in the Back4App dashboard
   alongside your other classes; it doesn't touch or overlap
   with Monk 3Garment/etc data.

   Same generic REST pattern as before: createInClass to save a
   guest's RSVP (no login needed — anyone with the link can
   RSVP), fetchClass + login/session helpers for the admin page,
   which does require being logged in with your existing
   Back4App user account.
   ============================================================ */

var B4A_ID = 'rLyvaf4wL6oXTKqKyOXLLHjQJWBAU2aJqmOb08Pg';
var B4A_KEY = 'w4NctSGaJFTBRPWfbgDPxd07EIvJzQVBLiNhjwOI';

var B4A_URL = 'https://parseapi.back4app.com';

// Set once a login succeeds (or restored from localStorage on
// page load). Every authenticated request carries it.
var B4A_SESSION_TOKEN = null;

function b4aHeaders(extra) {
  var base = {
    'X-Parse-Application-Id': B4A_ID,
    'X-Parse-Client-Key': B4A_KEY
  };
  if (B4A_SESSION_TOKEN) base['X-Parse-Session-Token'] = B4A_SESSION_TOKEN;
  return Object.assign(base, extra || {});
}

/* ---------------- auth (admin page only) ---------------- */

async function b4aLogIn(username, password) {
  var qs = 'username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password);
  var res = await fetch(B4A_URL + '/login?' + qs, { headers: b4aHeaders() });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Incorrect username or password');
  B4A_SESSION_TOKEN = data.sessionToken;
  return { username: data.username, sessionToken: data.sessionToken };
}

async function b4aValidateSession(sessionToken) {
  var res = await fetch(B4A_URL + '/users/me', {
    headers: b4aHeaders({ 'X-Parse-Session-Token': sessionToken })
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Session expired');
  B4A_SESSION_TOKEN = sessionToken;
  return { username: data.username, sessionToken: sessionToken };
}

async function b4aLogOut() {
  if (!B4A_SESSION_TOKEN) return;
  try {
    await fetch(B4A_URL + '/logout', { method: 'POST', headers: b4aHeaders() });
  } catch (e) {
    // fine either way, we're clearing the local token next regardless
  }
  B4A_SESSION_TOKEN = null;
}

/* ---------------- generic class CRUD ---------------- */

async function fetchClass(className, order, where) {
  var results = [];
  var skip = 0;
  var limit = 1000;
  while (true) {
    var qs = 'limit=' + limit + '&skip=' + skip + (order ? '&order=' + order : '');
    if (where) qs += '&where=' + encodeURIComponent(JSON.stringify(where));
    var res = await fetch(B4A_URL + '/classes/' + className + '?' + qs, { headers: b4aHeaders() });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || ('could not load ' + className));
    results = results.concat(data.results || []);
    if (!data.results || data.results.length < limit) break;
    skip += limit;
  }
  return results;
}

async function createInClass(className, fields) {
  var res = await fetch(B4A_URL + '/classes/' + className, {
    method: 'POST',
    headers: b4aHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(fields)
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || ('could not create ' + className + ' record'));
  return data; // { objectId, createdAt }
}

async function deleteFromClass(className, objectId) {
  var res = await fetch(B4A_URL + '/classes/' + className + '/' + objectId, {
    method: 'DELETE',
    headers: b4aHeaders()
  });
  if (res.status === 204 || res.status === 200) return true;
  var data = await res.json().catch(function () { return {}; });
  throw new Error(data.error || ('could not delete ' + className + ' record'));
}

/* ---------------- cloud functions ---------------- */

async function callCloudFunction(name, params) {
  var res = await fetch(B4A_URL + '/functions/' + name, {
    method: 'POST',
    headers: b4aHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(params || {})
  });
  var data = await res.json();
  if (!res.ok) throw new Error(data.error || ('call to ' + name + ' failed'));
  return data.result;
}
