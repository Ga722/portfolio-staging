/* Beheerscherm — lijst, uitgelicht, ontbrekende gegevens en het inloggen.
   Het bewerkscherm zelf staat in editor.js. */
(function () {
  'use strict';

  var root = document.getElementById('root');
  var state = { projects: [], settings: null, filter: 'Alles', search: '', view: 'list' };

  /* ---------------------------------------------------------------- meldingen */
  var toaster = document.createElement('div');
  toaster.className = 'toast';
  document.body.appendChild(toaster);
  function toast(text, kind) {
    var el = document.createElement('div');
    if (kind === 'ok') el.className = 'ok';
    el.textContent = text;
    toaster.appendChild(el);
    setTimeout(function () { el.remove(); }, kind === 'error' ? 7000 : 3200);
  }
  window.toast = toast;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }
  window.esc = esc;

  /* ---------------------------------------------------------------- inloggen */
  function loginView(message) {
    root.innerHTML =
      '<div class="login"><div class="login__box">' +
      '<h1>Portfolio beheren</h1>' +
      '<p>Log in met een GitHub-token. Die blijft in deze browser bewaard.</p>' +
      '<div class="field"><p class="lbl">Repository</p><input id="repo" value="' + esc(gh.store.repo) + '"></div>' +
      '<div class="field"><p class="lbl">Branch</p><input id="branch" value="' + esc(gh.store.branch) + '"></div>' +
      '<div class="field"><p class="lbl">Token</p><input id="token" type="password" placeholder="github_pat_…" value="' + esc(gh.store.token) + '"></div>' +
      '<button class="btn btn--primary" id="go" style="width:100%;justify-content:center">Inloggen</button>' +
      (message ? '<p class="err">' + esc(message) + '</p>' : '') +
      '<ol class="steps">' +
      '<li>Ga naar <a href="https://github.com/settings/personal-access-tokens/new" target="_blank" rel="noopener">github.com/settings/personal-access-tokens</a></li>' +
      '<li>Kies bij <em>Repository access</em> je portfolio-repo.</li>' +
      '<li>Zet bij <em>Permissions → Repository → Contents</em> op <em>Read and write</em>.</li>' +
      '<li>Maak de token aan en plak hem hierboven.</li>' +
      '</ol></div></div>';

    function submit() {
      gh.store.repo = document.getElementById('repo').value.trim();
      gh.store.branch = document.getElementById('branch').value.trim() || 'main';
      gh.store.token = document.getElementById('token').value.trim();
      root.innerHTML = '<div class="empty">Bezig met inloggen…</div>';
      gh.checkToken().then(boot).catch(function (e) { loginView(e.message); });
    }
    document.getElementById('go').onclick = submit;
    document.getElementById('token').onkeydown = function (e) { if (e.key === 'Enter') submit(); };
  }

  /* ---------------------------------------------------------------- laden */
  function boot() {
    root.innerHTML = '<div class="empty">Projecten laden…</div>';
    Promise.all([
      gh.listDir('content/projects'),
      gh.readJSON('content/settings.json')
    ]).then(function (res) {
      state.settings = res[1];
      var files = res[0].filter(function (f) { return /\.json$/.test(f.name); });
      return Promise.all(files.map(function (f) {
        return gh.readJSON(f.path).then(function (r) {
          return { file: f.name, path: f.path, sha: r.sha, data: r.data };
        });
      }));
    }).then(function (list) {
      state.projects = list;
      render();
    }).catch(function (e) { loginView(e.message); });
  }

  function categories() { return (state.settings && state.settings.data.categories) || []; }
  function byId(id) {
    return state.projects.filter(function (p) { return p.data.id === id; })[0];
  }
  function sorted(cat) {
    return state.projects
      .filter(function (p) { return p.data.category === cat; })
      .sort(function (a, b) { return (a.data.order || 999) - (b.data.order || 999); });
  }
  window.gaAdmin = {
    state: state, boot: boot, categories: categories, byId: byId, render: render,
    saveProject: saveProject, deleteProject: deleteProject
  };

  /* ---------------------------------------------------------------- opslaan */
  function saveProject(entry, message) {
    return gh.writeJSON(entry.path, entry.data, entry.sha, message).then(function (sha) {
      entry.sha = sha;
      return entry;
    });
  }

  function deleteProject(entry) {
    return gh.remove(entry.path, entry.sha).then(function () {
      state.projects = state.projects.filter(function (p) { return p !== entry; });
    });
  }

  /* ---------------------------------------------------------------- kader */
  function shell(title, actions, body) {
    var counts = { list: state.projects.length };
    root.innerHTML =
      '<div class="app"><aside class="side">' +
      '<div class="brand"><span>GA</span> Portfolio</div>' +
      navBtn('list', 'Projecten', counts.list) +
      navBtn('highlights', 'Uitgelicht', 5) +
      navBtn('missing', 'Aan te vullen', missing().length || '') +
      navBtn('categories', 'Categorieën', categories().length) +
      '<div class="side__foot">' +
      '<a class="navbtn" href="../index.html" target="_blank" rel="noopener">Bekijk site ↗</a>' +
      '<button class="navbtn" id="logout">Uitloggen</button>' +
      '</div></aside>' +
      '<main class="main"><div class="bar"><h1>' + esc(title) + '</h1><div class="spacer"></div>' + (actions || '') + '</div>' +
      body + '</main></div>';

    root.querySelectorAll('[data-view]').forEach(function (b) {
      b.onclick = function () { state.view = b.dataset.view; render(); };
    });
    var out = document.getElementById('logout');
    if (out) out.onclick = function () {
      gh.store.token = '';
      loginView();
    };
  }
  window.gaShell = shell;

  function navBtn(view, label, count) {
    return '<button class="navbtn" data-view="' + view + '"' + (state.view === view ? ' aria-current="true"' : '') +
      '>' + esc(label) + (count ? '<b>' + count + '</b>' : '') + '</button>';
  }

  function missing() {
    return state.projects.filter(function (p) {
      var d = p.data;
      return !d.year || !d.client || !d.image || !d.blurb;
    });
  }

  /* ---------------------------------------------------------------- lijst */
  function cardHTML(entry) {
    var d = entry.data;
    var gaps = [];
    if (!d.image) gaps.push('geen beeld');
    if (!d.year) gaps.push('geen jaar');
    if (!d.client) gaps.push('geen klant');
    return '<button class="card" draggable="true" data-id="' + esc(d.id) + '">' +
      '<span class="card__img"' + (d.image ? ' style="background-image:url(' + esc(window.gaImg ? window.gaImg(d.image) : '../' + d.image) + ')"' : '') + '>' +
      (d.image ? '' : '<em>geen beeld</em>') +
      (d.highlight ? '<span class="card__badge">Uitgelicht ' + d.highlight + '</span>' : '') +
      '</span>' +
      '<span class="card__body"><h3>' + esc(d.title) + '</h3>' +
      '<span class="card__meta">' + esc([d.client, d.year].filter(Boolean).join(' · ') || '—') + '</span>' +
      (gaps.length ? '<span class="card__flags">' + gaps.map(function (g) {
        return '<span class="flag flag--warn">' + g + '</span>';
      }).join('') + '</span>' : '') +
      '</span></button>';
  }

  function listView() {
    var cats = categories().filter(function (c) { return state.filter === 'Alles' || state.filter === c; });
    var q = state.search.toLowerCase();

    var body = '<div class="wrap"><div class="tools">' +
      '<input type="search" id="search" placeholder="Zoek op titel of klant" value="' + esc(state.search) + '">' +
      '<div class="chips">' + ['Alles'].concat(categories()).map(function (c) {
        return '<button class="chip" data-cat="' + esc(c) + '" aria-pressed="' + (state.filter === c) + '">' + esc(c) + '</button>';
      }).join('') + '</div></div>';

    var any = false;
    cats.forEach(function (cat) {
      var items = sorted(cat).filter(function (p) {
        return !q || (p.data.title + ' ' + (p.data.client || '')).toLowerCase().indexOf(q) > -1;
      });
      if (!items.length) return;
      any = true;
      body += '<section class="group" data-cat="' + esc(cat) + '">' +
        '<div class="group__head"><h2>' + esc(cat) + '</h2><i></i><span class="card__meta">' + items.length + '</span></div>' +
        '<div class="cards">' + items.map(cardHTML).join('') + '</div></section>';
    });
    if (!any) body += '<div class="empty">Niets gevonden.</div>';
    body += '</div>';

    shell('Projecten', '<button class="btn btn--primary" id="new">+ Nieuw project</button>', body);

    document.getElementById('search').oninput = function () {
      state.search = this.value;
      var pos = this.selectionStart;
      render();
      var s = document.getElementById('search');
      s.focus();
      s.setSelectionRange(pos, pos);
    };
    root.querySelectorAll('[data-cat]').forEach(function (c) {
      if (c.classList.contains('chip')) c.onclick = function () { state.filter = c.dataset.cat; render(); };
    });
    document.getElementById('new').onclick = function () { window.gaEditor.open(null); };

    root.querySelectorAll('.card').forEach(function (card) {
      card.onclick = function (e) {
        if (e.defaultPrevented) return;
        window.gaEditor.open(card.dataset.id);
      };
    });
    wireDrag();
  }

  /* Slepen om de volgorde binnen een categorie te wijzigen. */
  function wireDrag() {
    var dragging = null;
    root.querySelectorAll('.cards').forEach(function (list) {
      list.querySelectorAll('.card').forEach(function (card) {
        card.ondragstart = function (e) {
          dragging = card;
          card.classList.add('dragging');
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', card.dataset.id);
        };
        card.ondragend = function () {
          card.classList.remove('dragging');
          root.querySelectorAll('.over').forEach(function (o) { o.classList.remove('over'); });
        };
        card.ondragover = function (e) {
          if (!dragging || dragging === card || dragging.parentNode !== list) return;
          e.preventDefault();
          card.classList.add('over');
        };
        card.ondragleave = function () { card.classList.remove('over'); };
        card.ondrop = function (e) {
          e.preventDefault();
          card.classList.remove('over');
          if (!dragging || dragging === card) return;
          var after = Array.prototype.indexOf.call(list.children, dragging) < Array.prototype.indexOf.call(list.children, card);
          list.insertBefore(dragging, after ? card.nextSibling : card);
          persistOrder(list);
        };
      });
    });
  }

  function persistOrder(list) {
    var ids = [].map.call(list.querySelectorAll('.card'), function (c) { return c.dataset.id; });
    var changed = [];
    ids.forEach(function (id, i) {
      var entry = byId(id);
      if (entry && entry.data.order !== (i + 1) * 10) {
        entry.data.order = (i + 1) * 10;
        changed.push(entry);
      }
    });
    if (!changed.length) return;
    toast('Volgorde opslaan…');
    changed.reduce(function (chain, entry) {
      return chain.then(function () { return saveProject(entry, 'CMS: volgorde ' + entry.data.id); });
    }, Promise.resolve())
      .then(function () { toast('Volgorde bewaard', 'ok'); })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ---------------------------------------------------------------- uitgelicht */
  function highlightsView() {
    var chosen = {};
    state.projects.forEach(function (p) { if (p.data.highlight) chosen[p.data.highlight] = p; });

    var options = state.projects.slice().sort(function (a, b) {
      return a.data.title.localeCompare(b.data.title);
    });

    var slots = '';
    for (var i = 1; i <= 5; i++) {
      var p = chosen[i];
      slots += '<div class="slot"><span class="slot__n">Plaats ' + i + '</span>' +
        '<span class="slot__img"' + (p && p.data.image ? ' style="background-image:url(../' + esc(p.data.image) + ')"' : '') + '></span>' +
        '<select data-slot="' + i + '"><option value="">— leeg —</option>' +
        options.map(function (o) {
          return '<option value="' + esc(o.data.id) + '"' + (p && p.data.id === o.data.id ? ' selected' : '') + '>' + esc(o.data.title) + '</option>';
        }).join('') + '</select></div>';
    }

    shell('Uitgelicht op de homepage', '',
      '<div class="wrap"><p class="hint" style="margin-top:0">Deze vijf projecten staan in de rij bovenaan de homepage, in deze volgorde.</p>' +
      '<div class="slots">' + slots + '</div></div>');

    root.querySelectorAll('[data-slot]').forEach(function (sel) {
      sel.onchange = function () {
        var n = Number(sel.dataset.slot);
        var changed = [];
        state.projects.forEach(function (p) {
          if (p.data.highlight === n && p.data.id !== sel.value) { p.data.highlight = 0; changed.push(p); }
        });
        if (sel.value) {
          var target = byId(sel.value);
          if (target && target.data.highlight !== n) { target.data.highlight = n; changed.push(target); }
        }
        changed.reduce(function (chain, entry) {
          return chain.then(function () { return saveProject(entry, 'CMS: uitgelicht ' + entry.data.id); });
        }, Promise.resolve()).then(function () {
          toast('Uitgelicht bijgewerkt', 'ok');
          render();
        }).catch(function (e) { toast(e.message, 'error'); });
      };
    });
  }

  /* ---------------------------------------------------------------- aan te vullen */
  function missingView() {
    var rows = missing();
    var body = '<div class="wrap">' + (rows.length
      ? '<div class="cards">' + rows.map(cardHTML).join('') + '</div>'
      : '<div class="empty">Alles is ingevuld.</div>') + '</div>';
    shell('Aan te vullen', '', body);
    root.querySelectorAll('.card').forEach(function (card) {
      card.onclick = function () { window.gaEditor.open(card.dataset.id); };
    });
  }

  /* ---------------------------------------------------------------- categorieën */
  function categoriesView() {
    var cats = categories();
    shell('Categorieën', '<button class="btn btn--primary" id="save">Bewaren</button>',
      '<div class="wrap"><div class="panel" style="max-width:560px">' +
      '<h3>Volgorde en namen</h3><p class="hint">De volgorde hier bepaalt de filterbalk en de projectlijst op de site.</p>' +
      '<button class="btn btn--primary btn--sm" id="add" style="margin:0 0 16px">+ Categorie toevoegen</button>' +
      '<div id="rows">' + cats.map(function (c, i) {
        return '<div class="field" style="display:flex;gap:8px"><input value="' + esc(c) + '" data-i="' + i + '">' +
          '<button class="btn btn--sm btn--danger" data-del="' + i + '">×</button></div>';
      }).join('') + '</div></div></div>');

    document.getElementById('add').onclick = function () {
      state.settings.data.categories.unshift('Nieuw');
      render();
      var first = root.querySelector('#rows input');
      if (first) { first.focus(); first.select(); }
    };
    root.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = function () {
        state.settings.data.categories.splice(Number(b.dataset.del), 1);
        render();
      };
    });
    document.getElementById('save').onclick = function () {
      state.settings.data.categories = [].map.call(root.querySelectorAll('#rows input'), function (i) {
        return i.value.trim();
      }).filter(Boolean);
      gh.writeJSON('content/settings.json', state.settings.data, state.settings.sha, 'CMS: categorieën')
        .then(function (sha) {
          state.settings.sha = sha;
          toast('Categorieën bewaard', 'ok');
          render();
        }).catch(function (e) { toast(e.message, 'error'); });
    };
  }

  /* ---------------------------------------------------------------- router */
  function render() {
    if (state.view === 'edit') return;
    if (state.view === 'highlights') return highlightsView();
    if (state.view === 'missing') return missingView();
    if (state.view === 'categories') return categoriesView();
    listView();
  }

  if (gh.store.token) {
    gh.checkToken().then(boot).catch(function (e) { loginView(e.message); });
  } else {
    loginView();
  }
})();
