/* Het bewerkscherm: formulier links, live voorbeeld rechts. */
(function () {
  'use strict';

  var draft = null;      // het project dat je bewerkt
  var entry = null;      // het bestand waar het vandaan komt (null = nieuw)
  var tab = 'basis';
  var timer = null;

  function el(id) { return document.getElementById(id); }
  function slug(s) {
    return String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }

  function open(id) {
    var st = window.gaAdmin.state;
    entry = id ? window.gaAdmin.byId(id) : null;
    if (entry) {
      draft = JSON.parse(JSON.stringify(entry.data));
    } else {
      var cat = window.gaAdmin.categories()[0] || 'Print';
      draft = { id: '', title: '', category: cat, order: 999, highlight: 0, process: [] };
    }
    if (!draft.process) draft.process = [];
    st.view = 'edit';
    tab = 'basis';
    render();
  }

  /* ------------------------------------------------------------------ velden */
  function text(name, label, opts) {
    opts = opts || {};
    var v = draft[name] == null ? '' : draft[name];
    return '<div class="field"><p class="lbl">' + esc(label) + '</p>' +
      (opts.area
        ? '<textarea data-bind="' + name + '"' + (opts.rows ? ' rows="' + opts.rows + '"' : '') + '>' + esc(v) + '</textarea>'
        : '<input data-bind="' + name + '" value="' + esc(v) + '"' + (opts.placeholder ? ' placeholder="' + esc(opts.placeholder) + '"' : '') + '>') +
      (opts.hint ? '<p class="hint">' + esc(opts.hint) + '</p>' : '') + '</div>';
  }

  function select(name, label, options) {
    return '<div class="field"><p class="lbl">' + esc(label) + '</p><select data-bind="' + name + '">' +
      options.map(function (o) {
        var value = typeof o === 'string' ? o : o.value;
        var text = typeof o === 'string' ? o : o.label;
        return '<option value="' + esc(value) + '"' + (String(draft[name] || '') === String(value) ? ' selected' : '') + '>' + esc(text) + '</option>';
      }).join('') + '</select></div>';
  }

  /* Beeldveld met sleepzone. path = plek in het draft-object, bv. 'image' of 'process.2.images.0'. */
  function imageField(path, label, value) {
    return '<div class="field"><p class="lbl">' + esc(label) + '</p>' +
      '<div class="drop" data-drop="' + esc(path) + '">' +
      '<span class="drop__thumb"' + (value ? ' style="background-image:url(../' + esc(value) + ')"' : '') + '>' + (value ? '' : 'leeg') + '</span>' +
      '<span class="drop__body"><p>' + (value ? esc(value) : 'Sleep een beeld hierheen, of kies een bestand.') + '</p>' +
      '<span style="display:flex;gap:8px"><button class="btn btn--sm" data-pick="' + esc(path) + '">Kies bestand</button>' +
      (value ? '<button class="btn btn--sm btn--danger" data-clear="' + esc(path) + '">Verwijderen</button>' : '') +
      '</span></span></div></div>';
  }

  /* ------------------------------------------------------------------ tabbladen */
  function basisTab() {
    return '<div class="panel"><h3>Het project</h3><p class="hint">Dit staat bovenaan de projectpagina en in de lijst.</p>' +
      text('title', 'Titel') +
      '<div class="grid2">' +
      select('category', 'Categorie', window.gaAdmin.categories()) +
      text('year', 'Jaar') +
      '</div><div class="grid2">' +
      text('client', 'Klant') +
      text('role', 'Rol') +
      '</div>' +
      text('blurb', 'Korte regel in de lijst', { hint: 'Eén zin, verschijnt onder de titel in het overzicht.' }) +
      text('description', 'Inleiding op de projectpagina', { area: true, rows: 6 }) +
      '</div>' +
      '<div class="panel"><h3>Plaats in het overzicht</h3>' +
      '<div class="grid2">' +
      select('highlight', 'Uitgelicht', [
        { value: 0, label: 'Niet uitgelicht' }, { value: 1, label: 'Plaats 1' }, { value: 2, label: 'Plaats 2' },
        { value: 3, label: 'Plaats 3' }, { value: 4, label: 'Plaats 4' }, { value: 5, label: 'Plaats 5' }
      ]) +
      text('order', 'Volgorde binnen de categorie', { hint: 'Laag getal staat vooraan.' }) +
      '</div>' +
      text('id', 'Adres van de pagina', { hint: 'project.html?id=… — wijzig dit niet meer als het project al online staat.' }) +
      '</div>';
  }

  function beeldTab() {
    return '<div class="panel"><h3>Hoofdbeeld</h3><p class="hint">Het beeld in de lijst en bovenaan de projectpagina. Liggend werkt het best.</p>' +
      imageField('image', 'Beeld', draft.image) +
      '<div class="grid2">' +
      text('ratio', 'Verhouding', { placeholder: '1912 / 916', hint: 'Wordt automatisch ingevuld bij het uploaden.' }) +
      select('fit', 'Weergave', [{ value: '', label: 'Vullend (snijdt bij)' }, { value: 'contain', label: 'Volledig tonen op wit' }]) +
      '</div></div>' +
      '<div class="panel"><h3>Extra beelden onderaan</h3><p class="hint">Optioneel, na de procesblokken.</p>' +
      (draft.gallery || []).map(function (g, i) {
        return imageField('gallery.' + i + '.src', 'Beeld ' + (i + 1), g.src);
      }).join('') +
      '<button class="btn btn--sm" data-add="gallery">+ Beeld</button></div>';
  }

  function procesTab() {
    var blocks = draft.process.map(function (b, i) {
      return '<div class="block" data-block="' + i + '"' + (b._open ? ' open' : '') + ' draggable="true">' +
        '<div class="block__head"><span class="handle">⠿</span>' +
        '<strong>' + esc(b.title || 'Naamloos blok') + '</strong>' +
        '<button class="btn btn--sm" data-toggle="' + i + '">' + (b._open ? 'Inklappen' : 'Openen') + '</button>' +
        '<button class="btn btn--sm btn--danger" data-delblock="' + i + '">×</button></div>' +
        '<div class="block__body">' +
        '<div class="field"><p class="lbl">Kop</p><input data-bind="process.' + i + '.title" value="' + esc(b.title || '') + '"></div>' +
        '<div class="field"><p class="lbl">Tekst</p><textarea rows="5" data-bind="process.' + i + '.blurb">' + esc(b.blurb || '') + '</textarea></div>' +
        '<p class="lbl">Beelden</p>' +
        '<div class="drop" data-drop="process.' + i + '.images.new" data-multi="1">' +
        '<span class="drop__body"><p>Sleep hier één of meer beelden.</p>' +
        '<span><button class="btn btn--sm" data-pick="process.' + i + '.images.new" data-multi="1">Kies bestanden</button></span></span></div>' +
        ((b.images || []).length ? '<div class="thumbs">' + b.images.map(function (im, j) {
          var src = typeof im === 'string' ? im : im.src;
          return '<span class="thumb" style="background-image:url(../' + esc(src) + ')">' +
            '<button data-delimg="' + i + '.' + j + '">×</button></span>';
        }).join('') + '</div>' : '') +
        '<label class="field" style="display:flex;align-items:center;gap:9px;margin-top:12px">' +
        '<input type="checkbox" style="width:auto" data-bind="process.' + i + '.tall"' + (b.tall ? ' checked' : '') + '>' +
        '<span>Hoge capture — aangesneden tonen met een knop "volledig tonen"</span></label>' +
        '</div></div>';
    }).join('');

    return '<div class="panel"><h3>Procesblokken</h3>' +
      '<p class="hint">Elk blok is een kop met tekst en eventueel beelden. Sleep aan ⠿ om de volgorde te wijzigen.</p>' +
      (blocks || '<p class="hint">Nog geen blokken.</p>') +
      '<button class="btn btn--sm" data-add="process">+ Blok toevoegen</button></div>';
  }

  function publicatieTab() {
    return '<div class="panel"><h3>Video of doorbladerbare publicatie</h3>' +
      text('embed', 'Embed-adres', { placeholder: 'https://www.youtube.com/embed/CODE', hint: 'Bij YouTube: het adres uit "Insluiten", niet de gewone link.' }) +
      text('embedTitle', 'Kop erboven', { placeholder: 'Bekijk de animatie' }) +
      '</div>' +
      '<div class="panel"><h3>Externe link</h3>' +
      text('link', 'Adres') +
      text('linkLabel', 'Tekst op de knop', { placeholder: 'Bekijk online' }) +
      text('video', 'Videolink (los van de embed)') +
      '</div>' +
      '<div class="panel"><h3>Fijnregeling</h3>' +
      text('processTitle', 'Kop boven de procesblokken', { placeholder: 'Het proces' }) +
      '<div class="grid2">' +
      text('heroRatio', 'Aparte verhouding hoofdbeeld') +
      text('heroFit', 'Aparte fit hoofdbeeld') +
      '</div></div>';
  }

  /* ------------------------------------------------------------------ scherm */
  function render() {
    var tabs = [['basis', 'Basis'], ['beeld', 'Beelden'], ['proces', 'Proces'], ['publicatie', 'Video & links']];
    var body =
      '<div class="editor"><div>' +
      '<div class="tabs">' + tabs.map(function (t) {
        return '<button class="tab" data-tab="' + t[0] + '" aria-selected="' + (tab === t[0]) + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'basis' ? basisTab() : tab === 'beeld' ? beeldTab() : tab === 'proces' ? procesTab() : publicatieTab()) +
      '</div>' +
      '<div class="preview" data-device="desktop" id="preview">' +
      '<div class="preview__bar"><span>Voorbeeld</span><div class="spacer"></div>' +
      '<button class="btn btn--sm" data-device="desktop">Desktop</button>' +
      '<button class="btn btn--sm" data-device="phone">Telefoon</button></div>' +
      '<iframe id="pframe" title="Voorbeeld"></iframe></div></div>';

    var actions =
      '<button class="btn btn--ghost" id="back">← Terug</button>' +
      (entry ? '<button class="btn" id="dup">Dupliceren</button>' +
        '<button class="btn btn--danger" id="del">Verwijderen</button>' +
        '<a class="btn" href="../project.html?id=' + encodeURIComponent(draft.id) + '" target="_blank" rel="noopener">Bekijk op site ↗</a>' : '') +
      '<button class="btn btn--primary" id="save">Bewaren</button>';

    window.gaShell(draft.title || 'Nieuw project', actions, body);
    wire();
    refreshPreview();
  }

  function wire() {
    document.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { tab = b.dataset.tab; render(); };
    });
    el('back').onclick = function () {
      window.gaAdmin.state.view = 'list';
      window.gaAdmin.render();
    };
    el('save').onclick = save;
    if (el('dup')) el('dup').onclick = duplicate;
    if (el('del')) el('del').onclick = remove;

    document.querySelectorAll('.preview [data-device]').forEach(function (b) {
      b.onclick = function () { el('preview').dataset.device = b.dataset.device; };
    });

    /* Invoervelden schrijven rechtstreeks in het draft-object. */
    document.querySelectorAll('[data-bind]').forEach(function (input) {
      input.oninput = input.onchange = function () {
        var value = input.type === 'checkbox' ? input.checked : input.value;
        if (input.dataset.bind === 'order' || input.dataset.bind === 'highlight') value = Number(value) || 0;
        setPath(draft, input.dataset.bind, value);
        if (input.dataset.bind === 'title') {
          var h = document.querySelector('.bar h1');
          if (h) h.textContent = value || 'Nieuw project';
          if (!entry && !draft.id) draft.id = slug(value);
        }
        if (/^process\.\d+\.title$/.test(input.dataset.bind)) {
          var head = input.closest('.block').querySelector('strong');
          head.textContent = value || 'Naamloos blok';
        }
        schedulePreview();
      };
    });

    document.querySelectorAll('[data-add]').forEach(function (b) {
      b.onclick = function () {
        if (b.dataset.add === 'process') draft.process.push({ title: '', blurb: '', images: [], _open: true });
        if (b.dataset.add === 'gallery') (draft.gallery = draft.gallery || []).push({ src: '' });
        render();
      };
    });
    document.querySelectorAll('[data-toggle]').forEach(function (b) {
      b.onclick = function () {
        var i = Number(b.dataset.toggle);
        draft.process[i]._open = !draft.process[i]._open;
        render();
      };
    });
    document.querySelectorAll('[data-delblock]').forEach(function (b) {
      b.onclick = function () {
        draft.process.splice(Number(b.dataset.delblock), 1);
        render();
        schedulePreview();
      };
    });
    document.querySelectorAll('[data-delimg]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.dataset.delimg.split('.');
        draft.process[Number(parts[0])].images.splice(Number(parts[1]), 1);
        render();
        schedulePreview();
      };
    });
    document.querySelectorAll('[data-clear]').forEach(function (b) {
      b.onclick = function () {
        setPath(draft, b.dataset.clear, '');
        render();
        schedulePreview();
      };
    });

    wireUploads();
    wireBlockDrag();
  }

  /* ------------------------------------------------------------------ paden */
  function setPath(obj, path, value) {
    var parts = path.split('.');
    var last = parts.pop();
    var target = parts.reduce(function (o, k) {
      if (o[k] == null) o[k] = /^\d+$/.test(k) ? [] : {};
      return o[k];
    }, obj);
    target[last] = value;
  }

  /* ------------------------------------------------------------------ beelden */
  function wireUploads() {
    document.querySelectorAll('[data-pick]').forEach(function (b) {
      b.onclick = function (e) {
        e.preventDefault();
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = !!b.dataset.multi;
        input.onchange = function () { handleFiles([].slice.call(input.files), b.dataset.pick); };
        input.click();
      };
    });
    document.querySelectorAll('[data-drop]').forEach(function (zone) {
      zone.ondragover = function (e) { e.preventDefault(); zone.classList.add('over'); };
      zone.ondragleave = function () { zone.classList.remove('over'); };
      zone.ondrop = function (e) {
        e.preventDefault();
        zone.classList.remove('over');
        handleFiles([].slice.call(e.dataTransfer.files), zone.dataset.drop);
      };
    });
  }

  function readFileAsBase64(file) {
    return new Promise(function (resolve) {
      var reader = new FileReader();
      reader.onload = function () { resolve(String(reader.result).split(',')[1]); };
      reader.readAsDataURL(file);
    });
  }

  function measure(file) {
    return createImageBitmap(file).then(function (bmp) {
      return bmp.width + ' / ' + bmp.height;
    }).catch(function () { return ''; });
  }

  function handleFiles(files, path) {
    files = files.filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var folder = 'assets/werk/' + (slug(draft.id || draft.title) || 'nieuw');
    toast(files.length > 1 ? files.length + ' beelden uploaden…' : 'Beeld uploaden…');

    files.reduce(function (chain, file) {
      return chain.then(function () {
        var name = slug(file.name.replace(/\.[^.]+$/, '')) + '.' + (file.name.split('.').pop() || 'png').toLowerCase();
        var dest = folder + '/' + name;
        return Promise.all([readFileAsBase64(file), measure(file)]).then(function (r) {
          return gh.writeBinary(dest, r[0]).then(function () {
            if (/\.images\.new$/.test(path)) {
              var i = Number(path.split('.')[1]);
              (draft.process[i].images = draft.process[i].images || []).push({ src: dest, ratio: r[1] });
            } else {
              setPath(draft, path, dest);
              if (path === 'image' && r[1]) draft.ratio = r[1];
              if (/^gallery\.\d+\.src$/.test(path) && r[1]) setPath(draft, path.replace(/\.src$/, '.ratio'), r[1]);
            }
          });
        });
      });
    }, Promise.resolve()).then(function () {
      toast('Beeld' + (files.length > 1 ? 'en' : '') + ' geüpload', 'ok');
      render();
      schedulePreview();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  /* ------------------------------------------------------------------ blokken slepen */
  function wireBlockDrag() {
    var dragging = null;
    var blocks = document.querySelectorAll('.block');
    blocks.forEach(function (block) {
      block.ondragstart = function (e) {
        dragging = block;
        block.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      };
      block.ondragend = function () {
        block.classList.remove('dragging');
        document.querySelectorAll('.block.over').forEach(function (o) { o.classList.remove('over'); });
      };
      block.ondragover = function (e) {
        if (!dragging || dragging === block) return;
        e.preventDefault();
        block.classList.add('over');
      };
      block.ondragleave = function () { block.classList.remove('over'); };
      block.ondrop = function (e) {
        e.preventDefault();
        block.classList.remove('over');
        if (!dragging || dragging === block) return;
        var from = Number(dragging.dataset.block);
        var to = Number(block.dataset.block);
        var moved = draft.process.splice(from, 1)[0];
        draft.process.splice(to, 0, moved);
        render();
        schedulePreview();
      };
    });
  }

  /* ------------------------------------------------------------------ voorbeeld */
  function clean(obj) {
    var copy = JSON.parse(JSON.stringify(obj));
    (copy.process || []).forEach(function (b) { delete b._open; });
    Object.keys(copy).forEach(function (k) {
      if (copy[k] === '' || copy[k] == null) delete copy[k];
      if (Array.isArray(copy[k]) && !copy[k].length) delete copy[k];
    });
    return copy;
  }

  function schedulePreview() {
    clearTimeout(timer);
    timer = setTimeout(refreshPreview, 700);
  }

  function refreshPreview() {
    var frame = el('pframe');
    if (!frame) return;
    var data = clean(draft);
    data.id = data.id || 'voorbeeld';
    sessionStorage.setItem('ga-preview', JSON.stringify(data));
    frame.src = '../project.html?id=' + encodeURIComponent(data.id) + '&preview=1&t=' + Date.now();
  }

  /* ------------------------------------------------------------------ bewaren */
  function save() {
    var data = clean(draft);
    if (!data.title) return toast('Geef het project een titel.', 'error');
    data.id = data.id || slug(data.title);
    data.order = Number(data.order) || 999;
    data.highlight = Number(data.highlight) || 0;

    var path = 'content/projects/' + data.id + '.json';
    var renamed = entry && entry.data.id !== data.id;
    var button = el('save');
    button.disabled = true;
    button.textContent = 'Bewaren…';

    gh.writeJSON(path, data, renamed ? undefined : (entry && entry.sha), 'CMS: ' + data.title)
      .then(function (sha) {
        if (renamed) return gh.remove(entry.path, entry.sha).then(function () { return sha; });
        return sha;
      })
      .then(function (sha) {
        if (entry) {
          entry.data = data;
          entry.sha = sha;
          entry.path = path;
        } else {
          window.gaAdmin.state.projects.push({ file: data.id + '.json', path: path, sha: sha, data: data });
        }
        draft = JSON.parse(JSON.stringify(data));
        draft.process = draft.process || [];
        entry = window.gaAdmin.byId(data.id);
        toast('Bewaard. De site is over een minuut bijgewerkt.', 'ok');
        render();
      })
      .catch(function (e) {
        toast(e.message, 'error');
        button.disabled = false;
        button.textContent = 'Bewaren';
      });
  }

  function duplicate() {
    var copy = clean(draft);
    copy.id = copy.id + '-kopie';
    copy.title = copy.title + ' (kopie)';
    copy.highlight = 0;
    copy.order = (Number(copy.order) || 900) + 5;
    gh.writeJSON('content/projects/' + copy.id + '.json', copy, undefined, 'CMS: kopie van ' + draft.title)
      .then(function (sha) {
        window.gaAdmin.state.projects.push({ file: copy.id + '.json', path: 'content/projects/' + copy.id + '.json', sha: sha, data: copy });
        toast('Kopie aangemaakt', 'ok');
        open(copy.id);
      }).catch(function (e) { toast(e.message, 'error'); });
  }

  function remove() {
    if (!confirm('“' + draft.title + '” verwijderen? Dit kan niet ongedaan gemaakt worden.')) return;
    window.gaAdmin.deleteProject(entry).then(function () {
      toast('Verwijderd', 'ok');
      window.gaAdmin.state.view = 'list';
      window.gaAdmin.render();
    }).catch(function (e) { toast(e.message, 'error'); });
  }

  window.gaEditor = { open: open };
})();
