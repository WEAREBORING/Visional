# Visional site-code

De eigen CSS en JavaScript van de Webflow-site van Visional. Webflow laadt ze via jsDelivr, zodat de code niet in de custom-code-velden van Webflow staat (die hebben een limiet).

| Bestand | Wat | In Webflow |
|---|---|---|
| `site.css` | fluid root, rich text, theme-design, focus | site-head, als `<link>` |
| `site.js` | attribuutmodules (`data-v-*`) | site-footer, als `<script>` |
| `test/index.html` | lokale testpagina voor alle modules | niet |

De repository is publiek: zet er nooit sleutels, tokens of interne documentatie in.

## In Webflow

Site settings > Custom code. GTM staat in dezelfde blokken en blijft staan.

```html
<!-- head -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/WEAREBORING/Visional@<tag>/site.min.css">
<!-- footer -->
<script src="https://cdn.jsdelivr.net/gh/WEAREBORING/Visional@<tag>/site.min.js"></script>
```

- Altijd een tag, nooit `@main`: jsDelivr bewaart een branch tot 7 dagen in de cache, een tag verandert nooit.
- Het script zonder `defer` of `async`: `data-v-form` moet draaien vóór webflow.js het formulier start.
- `.min.` maakt jsDelivr zelf.

## Een wijziging uitbrengen

1. Pas `site.js` of `site.css` aan en hoog het versienummer in de eerste commentaarregel op.
2. Test lokaal met `test/index.html`.
3. Commit, tag en push: `git tag vX.Y.Z && git push && git push --tags`. Eén tag per release, ook als maar één bestand wijzigt.
4. Controleer dat jsDelivr de nieuwe versie geeft: `curl -s https://cdn.jsdelivr.net/gh/WEAREBORING/Visional@vX.Y.Z/site.js | head -1`.
5. Lees het head- en footerblok in Webflow (`get_site_freeform_code`), vervang alleen de tag in de link en schrijf het blok terug (`set_site_freeform_code`).
6. Publiceer naar webflow.io en controleer de pagina in de browser.

Terugdraaien: zet de vorige tag terug in Webflow en publiceer.

## Pagina-code

Code die maar op één pagina hoort, komt in `pages/<slug>.js` en gaat als `<script>` in de custom code van die pagina, met dezelfde tag. Gebruik dit alleen als een `data-v-*`-module in `site.js` niet past.
