// ==========================================================================
// Laadt de projecten uit content/projects.json — dat bestand wordt door het CMS
// (jouwsite/admin) geschreven. Bewerk je liever met de hand, dan pas je dat
// JSON-bestand aan; deze file hoef je niet meer aan te raken.
//
// Omdat de content nu opgehaald wordt in plaats van meegeleverd, wachten de
// paginascripts op window.gaBoot(). Elk paginascript geeft zijn inhoud daaraan
// mee en wordt uitgevoerd zodra de projecten binnen zijn.
//
// Velden per project — zie de labels in het CMS, of kort:
//   id          komt in de URL: project.html?id=<id>
//   highlight   1..5 = in de "Uitgelicht" rij op de homepage. 0 = niet uitgelicht.
//   image       hoofdbeeld, liggend. Leeg = grijs vlak.
//   fit         'contain' = beeld volledig tonen op wit, nooit snijden.
//   ratio       verhouding van het beeld, bv. '1912 / 916'.
//   process     blokken met een eigen kop, uitleg en beelden.
// ==========================================================================
(function () {
  'use strict';

  var queue = [];
  var ready = false;

  window.gaBoot = function (fn) {
    if (ready) fn(); else queue.push(fn);
  };

  function build(data) {
    window.portfolioData = data.groups || [];
    window.portfolioCategories = data.categories || [];

    // Eén platte lijst, gesorteerd op de volgorde van portfolioCategories.
    window.allProjects = window.portfolioCategories
      .map(function (cat) {
        var group = window.portfolioData.filter(function (c) { return c.category === cat; })[0];
        return group ? group.items.map(function (p) {
          p.category = cat;
          return p;
        }) : [];
      })
      .reduce(function (a, b) { return a.concat(b); }, []);

    // De uitgelichte projecten, gesorteerd op hun highlight-nummer.
    window.highlightProjects = window.allProjects
      .filter(function (p) { return p.highlight; })
      .sort(function (a, b) { return a.highlight - b.highlight; })
      // De rij toont er nooit meer dan vijf, ook niet als er per ongeluk een zesde nummer krijgt.
      .slice(0, 5);

    ready = true;
    queue.forEach(function (fn) { fn(); });
    queue = [];
  }

  /* Het beheerscherm zet een nog niet bewaard project in sessionStorage en opent deze
     pagina met ?preview=1. Dan tonen we dat ontwerp in plaats van de bewaarde versie. */
  function withPreview(data) {
    if (location.search.indexOf('preview=1') === -1) return data;
    var raw = sessionStorage.getItem('ga-preview');
    if (!raw) return data;
    try {
      var p = JSON.parse(raw);
      var group = data.groups.filter(function (g) { return g.category === p.category; })[0];
      if (!group) {
        group = { category: p.category || 'Voorbeeld', items: [] };
        data.categories = data.categories.concat([group.category]);
        data.groups.push(group);
      }
      group.items = group.items.filter(function (i) { return i.id !== p.id; });
      group.items.unshift(p);
    } catch (e) {
      console.error('Voorbeeld kon niet geladen worden:', e);
    }
    return data;
  }

  fetch('content/projects.json', { cache: 'no-cache' })
    .then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    })
    .then(withPreview)
    .then(build)
    .catch(function (err) {
      /* Openen via file:// blokkeert het ophalen. Op een server (GitHub Pages, of
         lokaal met een eenvoudige webserver) werkt het wel. */
      console.error('Projecten konden niet geladen worden:', err);
      build({ categories: [], groups: [] });
    });
})();
