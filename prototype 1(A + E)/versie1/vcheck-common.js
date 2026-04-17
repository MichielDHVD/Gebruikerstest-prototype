/**
 * vcheck-common.js
 * Gedeelde logica voor alle pagina's van de Vergunningcheck wizard.
 *
 * Gebruik:
 *   <script src="vcheck-common.js"></script>
 *
 * Optioneel: stel vóór het laden van dit script de volgende globale variabelen in
 * om paginaspecifiek gedrag te activeren:
 *
 *   window.VCHECK_CONFIG = {
 *     hoofdWerkzaamheid: 'Naam van de hoofdwerkzaamheid',   // wordt automatisch opgeslagen bij laden
 *     werkzaamheidMapping: {                                 // extra mappings voor radio-antwoorden
 *       'identifier-ja': 'Naam van de werkzaamheid',
 *     },
 *     navigatieVolgende: 'volgende-pagina.html',            // waarheen navigeert de Volgende-knop
 *     navigatieVorige:   'vorige-pagina.html',              // waarheen navigeert de Vorige-knop
 *   };
 */

// ─────────────────────────────────────────────────────────────
// 0. Configuratie met veilige standaardwaarden
// ─────────────────────────────────────────────────────────────
const _cfg = window.VCHECK_CONFIG || {};

/** Hoofd-werkzaamheid die altijd opgeslagen wordt op pagina's die dat vereisen. */
const HOOFD_WERKZAAMHEID = _cfg.hoofdWerkzaamheid || null;

/**
 * Mapping van DSO-selectable identifiers naar werkzaamheidsnamen.
 * Pagina's kunnen deze uitbreiden via VCHECK_CONFIG.werkzaamheidMapping.
 */
const WERKZAAMHEID_MAPPING = Object.assign(
  {
    'wortels-ja':   'Graven in bodem of waterbodem',
    'boom-terug-ja':'Boom planten of beplanting aanbrengen',
    'monument-ja':  'Werkzaamheden in, aan of op een monument of archeologisch monument uitvoeren, of dit anders gebruiken',
    'container-ja': 'Bouwmateriaal, container of ander object tijdelijk plaatsen',
    'slopen-ja': 'Bouwwerk of deel van een bouwwerk slopen, of asbest verwijderen',
  },
  _cfg.werkzaamheidMapping || {}
);

// ─────────────────────────────────────────────────────────────
// 1. In-memory set van gekozen werkzaamheden
// ─────────────────────────────────────────────────────────────

/** Centrale Set; alle functies lezen/schrijven hierin. */
let gekozenItems = new Set();
let subItem = new Set();

// ─────────────────────────────────────────────────────────────
// 2. SessionStorage helpers
// ─────────────────────────────────────────────────────────────

/** Leest de huidige state uit sessionStorage (of geeft een lege state terug). */
function getState() {
  try {
    return JSON.parse(sessionStorage.getItem('vcheck_state') || '{}');
  } catch (e) {
    return {};
  }
}

/** Schrijft de huidige gekozenItems terug naar sessionStorage. */
function slaSessionOp() {
  try {
    const state = getState();
    state.werkzaamheden = Array.from(gekozenItems);
    sessionStorage.setItem('vcheck_state', JSON.stringify(state));
  } catch (e) { /* silent fail */ }
}

/**
 * Laadt eerder opgeslagen werkzaamheden uit de sessie en vult gekozenItems.
 * Zet ook de 'checked'-attributen op eventuele dso-list-buttons (met kleine vertraging).
 */
function herstelSessie() {
  try {
    const state = getState();
    if (state.werkzaamheden && Array.isArray(state.werkzaamheden)) {
      state.werkzaamheden.forEach(naam => gekozenItems.add(naam));
      renderWinkelmandje();

      // Vinkjes herstellen op list-buttons (die kunnen laat renderen)
      setTimeout(() => {
        document.querySelectorAll('dso-list-button').forEach(btn => {
          if (gekozenItems.has(btn.getAttribute('label'))) {
            btn.setAttribute('checked', '');
          }
        });
      }, 100);
    }
  } catch (e) {
    console.error('Fout bij herstellen sessie:', e);
  }
}


// ─────────────────────────────────────────────────────────────
// 3. Winkelmandje (shopping cart)
// ─────────────────────────────────────────────────────────────

/** Tekent het winkelmandje opnieuw op basis van gekozenItems. */
function renderWinkelmandje() {
  const container = document.getElementById('mijn-winkelmandje');
  if (!container) return;

  const items = Array.from(gekozenItems);

  if (items.length === 0) {
    container.innerHTML = `
      <div class="dso-shopping-cart">
        <div class="dso-contents">
          <h3 class="dso-empty">U heeft nog geen werkzaamheden gekozen</h3>
        </div>
      </div>`;
    return;
  }

  const lijstHtml = items.map(naam => `
    <li>
      <span class="werkzaamheid-naam">${naam}</span>
      <button onclick="verwijderUitMandje('${naam.replace(/'/g, "\\'")}')" type="button" class="dso-delete">
        <span class="sr-only">Verwijder ${naam}</span><dso-icon icon="trash"></dso-icon>
      </button>
    </li>`).join('');

  container.innerHTML = `
    <div class="dso-shopping-cart">
      <div class="dso-contents">
        <span class="dso-status">U heeft ${items.length} werkzaamheden gekozen</span>
         <button type="button" class="dso-tertiary alles-verwijderen" onclick="verwijderAllesUitMandje()">
    <span>Alles verwijderen</span><dso-icon icon="trash"></dso-icon>
  </button>
        <ul class="dso-items">${lijstHtml}</ul>
      </div>
    </div>`;
}

/**
 * Verwijdert een werkzaamheid uit het mandje, de sessie en eventuele list-buttons.
 * @param {string} naam
 */
function verwijderUitMandje(naam) {
  gekozenItems.delete(naam);
  slaSessionOp();
  renderWinkelmandje();

  // Verwijder vinkje op eventuele dso-list-buttons in de pagina
  document.querySelectorAll('dso-list-button').forEach(btn => {
    if (btn.getAttribute('label') === naam) {
      btn.removeAttribute('checked');
    }
  });
}

function verwijderAllesUitMandje() {
  // 1. Maak de volledige Set of Map leeg
  gekozenItems.clear();

  // 2. Sla de nu lege staat op in de sessie
  slaSessionOp();

  // 3. Update de weergave van het winkelmandje
  renderWinkelmandje();

  // 4. Verwijder de vinkjes van ALLE knoppen op de pagina
  document.querySelectorAll('dso-list-button').forEach(btn => {
    btn.removeAttribute('checked');
  });
}




// ─────────────────────────────────────────────────────────────
// 4. dsoChange-handler voor dso-selectable (radio/checkbox)
// ─────────────────────────────────────────────────────────────

/**
 * Verwerkt een wijziging op een dso-selectable:
 *  - Voegt de bijbehorende werkzaamheid toe als '-ja' wordt aangevinkt.
 *  - Verwijdert de bijbehorende werkzaamheid als '-nee' wordt aangevinkt.
 */
document.addEventListener('dsoChange', (event) => {
  if (event.target.tagName.toLowerCase() !== 'dso-selectable') return;

  const id = event.target.identifier;
  const isChecked = event.detail.checked;
  if (!id) return;

  const state = getState();
  if (!state.werkzaamheden) state.werkzaamheden = [];

  if (isChecked) {
    if (WERKZAAMHEID_MAPPING[id]) {
      const naam = WERKZAAMHEID_MAPPING[id];
      if (!state.werkzaamheden.includes(naam)) {
        state.werkzaamheden.push(naam);
        gekozenItems.add(naam);
      }
    } else if (id.endsWith('-nee')) {
      const jaId = id.replace('-nee', '-ja');
      const naam = WERKZAAMHEID_MAPPING[jaId];
      if (naam) {
        state.werkzaamheden = state.werkzaamheden.filter(item => item !== naam);
        gekozenItems.delete(naam);
      }
    }
  }

  sessionStorage.setItem('vcheck_state', JSON.stringify(state));
  renderWinkelmandje();
  console.log('Sessie bijgewerkt:', state.werkzaamheden);
});


// ─────────────────────────────────────────────────────────────
// 5. Accordion: één sectie tegelijk open
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  const sections = document.querySelectorAll('dso-accordion-section');

  sections.forEach(section => {
    section.addEventListener('dsoToggleClick', () => {
      const shouldOpen = !section.open;
      sections.forEach(s => { s.open = false; });
      section.open = shouldOpen;
    });
  });
});


// ─────────────────────────────────────────────────────────────
// 6. Hoofd-werkzaamheid registreren bij paginaladen
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  if (!HOOFD_WERKZAAMHEID) return;

  const state = getState();
  if (!state.werkzaamheden) state.werkzaamheden = [];

  if (!state.werkzaamheden.includes(HOOFD_WERKZAAMHEID)) {
    state.werkzaamheden.push(HOOFD_WERKZAAMHEID);
    sessionStorage.setItem('vcheck_state', JSON.stringify(state));
  }

  // Zorg ook dat de in-memory Set klopt
  gekozenItems.add(HOOFD_WERKZAAMHEID);
});


// ─────────────────────────────────────────────────────────────
// 7. Navigatiefuncties
// ─────────────────────────────────────────────────────────────

/**
 * De werkzaamheid die de bedrijfstak-tussenstap activeert.
 * Wanneer deze in het mandje zit wordt bedrijfstak.html ingevoegd
 * tussen extra-werkzaamheden en werkzaamheden-overzicht.
 */
const GARAGE_WERKZAAMHEID = 'Garagebedrijf, autoschadeherstelbedrijf, autowasstraat of bedrijf voor carrosseriebouw';

/** Geeft true terug als de garage-werkzaamheid momenteel in het mandje zit. */
function heeftGarageWerkzaamheid() {
  return gekozenItems.has(GARAGE_WERKZAAMHEID);
}

/**
 * Sla de huidige gekozenItems op en navigeer naar de opgegeven pagina.
 * @param {string} url
 */
function slaOpEnGaNaar(url) {
  const target = url || _cfg.navigatieVolgende;
  if (!target) { console.warn('slaOpEnGaNaar: geen doel-URL opgegeven.'); return; }
  slaSessionOp();
  window.location.href = target;
}

/** Navigeer naar de vorige pagina (zonder extra opslag). */
function gaNaarVorige() {
  const target = _cfg.navigatieVorige;
  if (!target) { console.warn('gaNaarVorige: geen vorige-URL geconfigureerd.'); return; }
  window.location.href = target;
}

// Overige specifieke navigatiefuncties die vanuit HTML worden aangeroepen.
// Ze delegeren naar slaOpEnGaNaar zodat de sessie altijd bijgewerkt is.

function gaNaarWerkzaamheden()        { window.location.href = 'werkzaamheden.html'; }
function gaNaarLocatie()              { window.location.href = 'locatie.html'; }
function gaNaarExWKZ()                { slaOpEnGaNaar('werkzaamheden-overzicht.html'); }
function gaNaarOverzicht()            { window.location.href = 'werkzaamheden-overzicht.html'; }
function gaNaarVragen()               { window.location.href = 'vragen-bomen.html'; }
function gaNaarConclusie()            { window.location.href = 'conclusie.html'; }

/**
 * Volgende-knop op extra-werkzaamheden:
 * → bedrijfstak als garage in mandje, anders → werkzaamheden-overzicht.
 */
function gaNaarVolgendeVanuitExtraWerkzaamheden() {
  slaSessionOp();
  window.location.href = heeftGarageWerkzaamheid()
    ? 'bedrijfstak.html'
    : 'werkzaamheden-overzicht.html';
}

/**
 * Vorige-knop op werkzaamheden-overzicht:
 * → bedrijfstak als garage in mandje, anders → extra-werkzaamheden.
 */
function gaNaarVorigeVanuitOverzicht() {
  window.location.href = heeftGarageWerkzaamheid()
    ? 'bedrijfstak.html'
    : 'extra-werkzaamheden.html';
}

function slaOpEnGaNaarExtraBoomOfGarage() {
  slaSessionOp();
  window.location.href = heeftGarageWerkzaamheid()
    ? 'extra-werkzaamheden-garage.html'
    : 'extra-werkzaamheden.html';

}



// ─────────────────────────────────────────────────────────────
// 8. Initialisatie bij DOMContentLoaded
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  herstelSessie();
});


// ─────────────────────────────────────────────────────────────
// 9 Header opzetten
// ─────────────────────────────────────────────────────────────


document.getElementById('main-header').mainMenu = [
        { label: 'Home', url: 'home.html' },
        { label: 'Vergunningcheck', url: 'landingspagina_Vergunningcheck.html' },
        { label: 'Aanvragen' },
        { label: 'Regels op de kaart' },
        { label: 'Maatregelen op maat' },
      ];
      
