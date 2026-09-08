/* Praat met de GitHub-API. Alles loopt via een persoonlijke token die in deze browser
   bewaard blijft; er is geen server tussen. */
(function () {
  'use strict';

  var store = {
    get token() { return localStorage.getItem('ga-admin-token') || ''; },
    set token(v) { localStorage.setItem('ga-admin-token', v); },
    get repo() { return localStorage.getItem('ga-admin-repo') || 'Ga722/portfolio-staging'; },
    set repo(v) { localStorage.setItem('ga-admin-repo', v); },
    get branch() { return localStorage.getItem('ga-admin-branch') || 'main'; },
    set branch(v) { localStorage.setItem('ga-admin-branch', v); }
  };

  function b64encode(text) {
    var bytes = new TextEncoder().encode(text);
    var bin = '';
    bytes.forEach(function (b) { bin += String.fromCharCode(b); });
    return btoa(bin);
  }

  function b64decode(base64) {
    var bin = atob(base64.replace(/\n/g, ''));
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  }

  function api(path, options) {
    options = options || {};
    return fetch('https://api.github.com/repos/' + store.repo + path, {
      method: options.method || 'GET',
      headers: {
        Authorization: 'Bearer ' + store.token,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (r) {
      if (r.status === 404 && options.allow404) return null;
      if (!r.ok) return r.json().catch(function () { return {}; }).then(function (e) {
        throw new Error((e && e.message) || ('GitHub gaf ' + r.status));
      });
      return r.status === 204 ? null : r.json();
    });
  }

  /* Eén map uitlezen: geeft naam, pad en sha per bestand. */
  function listDir(dir) {
    return api('/contents/' + dir + '?ref=' + store.branch + '&t=' + Date.now(), { allow404: true })
      .then(function (files) { return files || []; });
  }

  function readJSON(path) {
    return api('/contents/' + encodeURI(path) + '?ref=' + store.branch + '&t=' + Date.now())
      .then(function (f) { return { data: JSON.parse(b64decode(f.content)), sha: f.sha }; });
  }

  function writeJSON(path, data, sha, message) {
    return api('/contents/' + encodeURI(path), {
      method: 'PUT',
      body: {
        message: message || ('CMS: ' + path),
        content: b64encode(JSON.stringify(data, null, 2) + '\n'),
        branch: store.branch,
        sha: sha || undefined
      }
    }).then(function (r) { return r.content.sha; });
  }

  function writeBinary(path, base64, message) {
    return api('/contents/' + encodeURI(path), {
      method: 'PUT',
      body: { message: message || ('CMS: beeld ' + path), content: base64, branch: store.branch }
    }).then(function (r) { return r.content.path; });
  }

  function remove(path, sha, message) {
    return api('/contents/' + encodeURI(path), {
      method: 'DELETE',
      body: { message: message || ('CMS: verwijder ' + path), sha: sha, branch: store.branch }
    });
  }

  function checkToken() {
    return fetch('https://api.github.com/repos/' + store.repo, {
      headers: { Authorization: 'Bearer ' + store.token, Accept: 'application/vnd.github+json' }
    }).then(function (r) {
      if (r.status === 401) throw new Error('De token wordt niet aanvaard. Maak een nieuwe aan.');
      if (r.status === 404) throw new Error('Repo niet gevonden, of de token heeft er geen toegang toe.');
      if (!r.ok) throw new Error('GitHub gaf ' + r.status);
      return true;
    });
  }

  window.gh = {
    store: store, api: api, listDir: listDir, readJSON: readJSON, writeJSON: writeJSON,
    writeBinary: writeBinary, remove: remove, checkToken: checkToken, b64decode: b64decode
  };
})();
