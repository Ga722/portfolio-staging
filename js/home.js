/* Homepage: uitgelicht-rij, projectindex en het contactformulier. */
window.gaBoot(function () {
  'use strict';

  /* ---- Uitgelicht ---- */
  var track = document.getElementById('railTrack');
  if (track) {
    track.innerHTML = window.highlightProjects.map(window.gaUI.cardHTML).join('');
    var prev = document.getElementById('railPrev');
    var next = document.getElementById('railNext');
    var edges = function () {
      if (!prev || !next) return;
      prev.disabled = track.scrollLeft < 8;
      next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 8;
    };
    var scrollBy = function (dir) {
      track.scrollBy({ left: dir * track.clientWidth * 0.8, behavior: 'smooth' });
    };
    if (prev) prev.addEventListener('click', function () { scrollBy(-1); });
    if (next) next.addEventListener('click', function () { scrollBy(1); });
    track.addEventListener('scroll', edges, { passive: true });
    edges();
  }

  /* ---- Index ---- */
  var rows = document.getElementById('indexRows');
  if (rows) {
    /* De index onder de uitgelichte rij toont wat daar niet al staat, maximaal zes rijen.
       Wie meer wil ziet ze allemaal op projecten.html — vandaar geen "Laad meer". */
    var railIds = (window.highlightProjects || []).map(function (p) { return p.id; });
    var rest = window.allProjects.filter(function (p) { return railIds.indexOf(p.id) === -1; });
    /* Zes vaste rijen, elk uit een ander vakgebied, in deze volgorde. Wijzig de rij hieronder
       om de index te herschikken; een id dat niet bestaat wordt gewoon overgeslagen. */
    var indexOrder = [
      'groeihelden-boterhammendoos',
      'trouwboekjes-website',
      'isic-belgie-poster',
      'agion-jaarverslag-2020',
      'bric-app',
      'foodcoach-pj-flyer'
    ];
    var byId = {};
    rest.forEach(function (p) { byId[p.id] = p; });
    var items = indexOrder.map(function (id) { return byId[id]; }).filter(Boolean).slice(0, 6);
    window.gaUI.renderIndex({
      rows: rows,
      preview: document.getElementById('preview'),
      items: items,
      initial: 6,
      step: 6
    });
  }

  /* ---- Contactformulier ----
     Er zit geen verzendlogica achter: koppel dit aan je eigen mailservice
     (bv. Formspree of Netlify Forms) door de action/method op het <form> te zetten. */
  var form = document.getElementById('contactForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var status = document.getElementById('formStatus');
      var vals = ['voornaam', 'familienaam', 'bericht'].map(function (id) {
        return document.getElementById(id).value.trim();
      });
      if (vals.some(function (v) { return !v; })) {
        status.textContent = 'Vul alle velden in.';
        return;
      }
      status.textContent = 'Bedankt, je bericht is verzonden.';
      form.reset();
    });
  }
});
