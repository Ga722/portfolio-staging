/* Alle projecten: filterbalk boven de volledige index. */
window.gaBoot(function () {
  'use strict';

  var bar = document.getElementById('filters');
  var rows = document.getElementById('indexRows');
  if (!bar || !rows) return;

  var categories = window.portfolioCategories.filter(function (cat) {
    return window.allProjects.some(function (p) { return p.category === cat; });
  });
  var filters = ['Alles'].concat(categories);
  var active = 'Alles';

  var index = window.gaUI.renderIndex({
    rows: rows,
    preview: document.getElementById('preview'),
    items: window.allProjects,
    initial: 0
  });

  function paintBar() {
    var shown = active === 'Alles'
      ? window.allProjects
      : window.allProjects.filter(function (p) { return p.category === active; });
    bar.innerHTML = filters.map(function (f) {
      return '<button class="filter" type="button" data-f="' + window.gaUI.esc(f) + '" aria-pressed="' + (f === active) + '">' + window.gaUI.esc(f) + '</button>';
    }).join('') + '<span class="filters__count">' + shown.length + (shown.length === 1 ? ' project' : ' projecten') + '</span>';
    index.setItems(shown);
  }

  bar.addEventListener('click', function (e) {
    var b = e.target.closest('.filter');
    if (!b) return;
    active = b.getAttribute('data-f');
    paintBar();
  });

  paintBar();
});
