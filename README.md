# Portfolio — Gazmend Aliaj

Statische site: HTML, CSS en JavaScript. Geen build-stap, geen dependencies.

```
index.html            One-pager: Home, Over mij, Portfolio, Contact
projecten.html        Alle projecten, filterbaar
project.html          Projectdetail (?id=…)
css/style.css         Alle styling
js/portfolio-data.js  ← hier pas je je projecten aan
js/ui.js              Menu, navigatie, projectlijst
js/home.js            Uitgelicht, lijst, contactformulier
js/projecten.js       Filterbalk
js/project.js         Projectpagina
assets/               Logo, foto's, iconen, projectbeelden
```

## Op GitHub Pages zetten

Upload de inhoud van deze map naar de root van je repository (`index.html` bovenaan, niet in
een submap). Dan **Settings → Pages → Source: Deploy from a branch**, branch `main`, map `/ (root)`.

## Een project toevoegen

In `js/portfolio-data.js`:

```js
{
  id: 'bric-app',                // URL: project.html?id=bric-app
  highlight: 1,                  // een nummer = in de Uitgelicht-rij, op die plaats.
                                 // 0 = niet uitgelicht. Houd de nummers uniek.
  title: 'BRIC — interactieve quiz-app',
  blurb: 'Korte regel onder de titel.',
  description: 'Tekst bovenaan de projectpagina.',
  role: 'UX, UI, branding',
  client: 'Klantnaam',
  year: '2015',
  image: 'assets/werk/bric/bric-brand.png',   // liggend; leeg = grijs vlak
  fit: 'contain',                             // hele beeld tonen i.p.v. vullen
  gallery: [{ src: '…', caption: '…', ratio: '9 / 16', tall: true }],
  processTitle: 'De vier vakgebieden',        // kop boven de blokken
  process: [{ title: '…', blurb: '…', images: ['…'] }],
  files: [{ label: 'Poster (PDF)', src: '…' }],
  link: 'https://…',             // wordt "Bekijk online"
  embed: 'https://…',            // doorbladerbare publicatie in plaats van een hoofdbeeld
  example: true                  // verzonnen voorbeeld, mag weg
}
```

Lege velden verdwijnen van de pagina. Beelden komen in `assets/werk/<project>/`.
Categorieën staan onderaan het bestand in `window.portfolioCategories`; een categorie zonder
projecten verschijnt niet.

## Nog te doen

- E-mailadres: `gazmend.aliaj@companyname.com` staat als voorbeeld in de drie HTML-bestanden.
- LinkedIn en Instagram in de footer staan op `#`.
- Contactformulier verstuurt niets. Koppel het aan Formspree (`action` + `method` op het
  `<form>`, en de `e.preventDefault()` uit `js/home.js`) of Netlify Forms.
- Jaar ontbreekt bij Drankenacademy en FTRPRF.
- Guido Magazine: rol en beschrijving nog aan te vullen, en er is nog geen coverbeeld
  (`image: ''`), dus in de lijst staat daar een grijs vlak.
- Onderaan `portfolio-data.js` staan nog zes verzonnen voorbeelden onder Video en Animatie,
  elk met `example: true`. Die mogen weg zodra je eigen video- en animatiewerk erin staat.
