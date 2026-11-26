// Every Dutch text on the screen is written here, and only here.

const dayFormat = new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const longFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const monthFormat = new Intl.DateTimeFormat('nl-NL', { month: 'short', year: '2-digit', timeZone: 'UTC' });
const shortFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short', timeZone: 'UTC' });

const asDate = (text) => new Date(`${text.length === 7 ? `${text}-01` : text}T00:00:00Z`);

export const formatDay = (date) => dayFormat.format(asDate(date));
export const formatLongDate = (date) => longFormat.format(asDate(date));
export const formatMonth = (key) => monthFormat.format(asDate(key));
export const formatShortDate = (date) => shortFormat.format(asDate(date));

const months = (n) => (n === 1 ? '1 maand' : `${n} maanden`);

export const t = {
  appName: 'Spaarpoes',
  freeName: 'Vrij te besteden',

  nav: { home: 'Thuis', recurring: 'Vast', stats: 'Cijfers', settings: 'Instellingen', label: 'Menu' },

  common: {
    back: 'Terug',
    save: 'Bewaren',
    cancel: 'Annuleren',
    yes: 'Ja',
    ok: 'Oké',
    saved: 'Bewaard 💕',
    amount: 'Bedrag',
    amountHint: '0,00',
    pot: 'Potje',
    note: 'Notitie',
    date: 'Datum',
    today: 'vandaag',
    optional: 'mag leeg blijven',
  },

  home: {
    free: 'Vrij te besteden',
    heap: (money) => `Alles bij elkaar: ${money}`,
    pots: 'Mijn potjes',
    noPots: 'Nog geen potjes. Maak je eerste!',
    newPot: 'Nieuw potje',
    add: 'Uitgave of extra toevoegen',
    soon: 'Binnenkort',
    soonEmpty: 'Niets in de komende 7 dagen.',
    watch: 'Let op',
    below: (name, money) => `${name} staat onder nul (${money})`,
    unused: (name, n) => `${name}: al ${months(n)} niet gebruikt`,
    backupTitle: 'Maak een back-up',
    backupText: 'Zo raak je je potjes nooit kwijt.',
    backupButton: 'Nu bewaren',
    sampleText: 'Dit zijn voorbeeldpotjes, zodat je even kunt rondkijken.',
    sampleButton: 'Voorbeeld wissen',
    sampleInstallFirst: 'Zet de app eerst op je beginscherm, en vul daarna pas je echte bedragen in.',
    sampleConfirm: 'Alle voorbeeldpotjes wissen? Ook wat je er zelf bij hebt gezet verdwijnt dan.',
    sampleCleared: 'Leeg en klaar voor jouw potjes!',
  },

  add: {
    title: 'Toevoegen',
    spend: 'Uitgave',
    extra: 'Extraatje',
    notePlaceholder: 'Waar was het voor?',
    choosePot: 'Kies een potje',
    submitSpend: 'Uitgave bewaren',
    submitExtra: 'Extraatje bewaren',
  },

  pot: {
    addButton: 'Uitgave of extra',
    moveButton: 'Geld verplaatsen',
    unused: (n) => `al ${months(n)} niet gebruikt`,
    toFree: 'Naar vrij te besteden',
    entries: 'Wat er gebeurde',
    noEntries: 'Nog niets gebeurd in dit potje.',
    delete: 'Wissen',
    deleteLabel: (what) => `Wis ${what}`,
    deleteConfirm: (money, date) => `Deze boeking van ${money} op ${date} wissen?`,
    deletePairConfirm: (money, date) => `Dit was een verplaatsing van ${money} op ${date}. Beide kanten wissen?`,
    party: 'Feestje 🎉',
    partyExplain: 'De poes viert feest zodra dit potje dit bedrag haalt.',
    partyAmount: 'Feest bij',
    partyLabel: 'Eigen tekst',
    partyLabelPlaceholder: 'Waar spaar je voor?',
    partySave: 'Feestje bewaren',
    partyRemove: 'Geen feestje meer',
    edit: 'Potje aanpassen',
    name: 'Naam',
    emoji: 'Plaatje (emoji)',
    color: 'Kleur',
    archive: 'Potje opbergen',
    archiveConfirm: (name) => `${name} opbergen? De geschiedenis blijft bewaard.`,
    archived: 'Opgeborgen',
    gone: 'Dit potje is er niet (meer).',
  },

  colors: { rose: 'roze', peach: 'perzik', lemon: 'citroen', mint: 'mint', sky: 'hemelsblauw', lilac: 'lila' },

  newPot: { title: 'Nieuw potje', namePlaceholder: 'Naam van je potje', create: 'Potje maken' },

  move: {
    title: 'Geld verplaatsen',
    from: 'Van',
    to: 'Naar',
    all: 'Alles',
    after: 'Daarna staat er',
    submit: 'Verplaatsen',
    done: (from, fromMoney, to, toMoney) => `Verplaatst. ${from}: ${fromMoney}, ${to}: ${toMoney}`,
    needTwo: 'Maak eerst een potje, dan kun je schuiven.',
  },

  recurring: {
    title: 'Vaste regels',
    explain: 'Dit boekt de poes vanzelf, op de dag dat je de app opent.',
    empty: 'Nog geen vaste regels.',
    add: 'Nieuwe vaste regel',
    edit: 'Aanpassen',
    skip: 'Volgende overslaan',
    stop: 'Stoppen',
    stopConfirm: (name) => `${name} stoppen? Wat al geboekt is blijft staan.`,
    skipConfirm: (name, date) => `${name} op ${date} overslaan?`,
    skipped: (date) => `Overgeslagen: ${date}`,
    unskip: 'Toch wel doen',
    next: (date) => `Volgende keer: ${date}`,
    ended: 'Gestopt',
    newTitle: 'Nieuwe vaste regel',
    editTitle: 'Vaste regel aanpassen',
    editExplain: 'Een aanpassing geldt voor de volgende keren. Wat al geboekt is verandert niet.',
    label: 'Naam',
    labelPlaceholder: 'Bijvoorbeeld: loon',
    kind: 'Wat gebeurt er?',
    kinds: { income: 'Geld komt binnen', allocate: 'Naar een potje', spend: 'Vaste kosten' },
    kindShort: { income: 'binnen', allocate: 'naar potje', spend: 'vaste kosten' },
    every: 'Elke',
    unit: 'Periode',
    units: { week: 'week / weken', month: 'maand(en)', year: 'jaar' },
    dayOfMonth: 'Dag van de maand',
    dayHint: 'Heeft een maand die dag niet, dan wordt het de laatste dag.',
    start: 'Vanaf',
    end: 'Tot en met',
    backfill: (n) => `Deze regel begint in het verleden. Er worden nu ${n} boekingen met een oude datum gemaakt. Goed zo?`,
    saved: 'Vaste regel bewaard',
    gone: 'Deze regel is er niet.',
    frequency(rule) {
      if (rule.unit === 'week') return rule.every === 1 ? 'elke week' : `elke ${rule.every} weken`;
      if (rule.unit === 'year') return rule.every === 1 ? 'elk jaar' : `elke ${rule.every} jaar`;
      const how = rule.every === 1 ? 'elke maand' : `elke ${rule.every} maanden`;
      return `${how} op de ${rule.dayOfMonth}e`;
    },
  },

  kitten: {
    // what the drawing shows, for screen readers and the preview page
    looks: {
      content: 'De spaarpoes is tevreden',
      party: 'De spaarpoes viert feest',
      sleepy: 'De spaarpoes is slaperig',
      worried: 'De spaarpoes kijkt een beetje bezorgd',
    },
    says: {
      content: 'Prrr… alles gaat goed.',
      sleepy: 'Zzz… ik heb al even niets gehoord.',
      worried: 'Oei, er staat iets onder nul.',
    },
  },

  party: {
    title: 'Feestje! 🎉',
    reached: (name, money) => `${name} heeft ${money} gehaald.`,
    close: 'Joepie!',
  },

  week: {
    title: 'Jouw week',
    range: (from, to) => `${from} t/m ${to}`,
    spent: (money) => `Uitgegeven: ${money}`,
    nothing: 'Vorige week niets uitgegeven.',
    top: 'Hier ging het meeste heen',
    parties: 'Gevierd',
    close: 'Gezien',
  },

  stats: {
    title: 'Cijfers',
    range: 'Periode',
    ranges: { 1: 'Maand', 3: '3 mnd', 6: '6 mnd', 12: 'Jaar' },
    nothing: 'Nog niets in deze periode.',
    tap: 'Tik op een balk of punt om de boekingen te zien.',
    noEntries: 'Geen boekingen.',
    more: (n) => `En nog ${n} oudere.`,
    asTable: 'Als tabel',
    total: 'Samen',
    month: 'Maand',
    day: 'Dag',
    perPot: 'Uitgaven per potje',
    perPotUnit: 'Uitgegeven per maand, in euro’s',
    overTime: 'Saldo door de tijd',
    overTimeUnit: 'Wat er aan het eind van elke periode in zat, in euro’s',
    allPots: 'Alles bij elkaar',
    balance: 'Saldo',
    weekUntil: (date) => `week t/m ${date}`,
    inOut: 'Binnen en uit',
    inOutUnit: 'Per maand, in euro’s. Verplaatsen tussen potjes telt niet mee.',
    in: 'Binnen',
    inLegend: 'Binnen (loon en extraatjes)',
    out: 'Uitgegeven',
    salary: 'Loon',
    extra: 'Extraatjes',
    fixed: 'Vaste kosten',
    fixedUnit: 'Lopende vaste kosten, gemiddeld per maand, in euro’s',
    noFixed: 'Er lopen geen vaste kosten.',
    perMonth: 'Per maand',
    perYear: 'Per jaar',
    bookedBy: (name) => `${name}: geboekt in deze periode`,
    weekday: 'Uitgaven per weekdag',
    weekdayUnit: 'Alles wat in deze periode op die dag is uitgegeven, in euro’s',
    weekdaysShort: ['ma', 'di', 'wo', 'do', 'vr', 'za', 'zo'],
    weekdaysLong: ['maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag', 'zondag'],
  },

  settings: {
    title: 'Instellingen',
    backup: 'Back-up',
    backupNow: 'Nu back-up maken',
    lastBackup: (date) => `Laatste back-up: ${date}`,
    neverBackup: 'Laatste back-up: nog nooit',
    backupExplain: 'Je krijgt het deelmenu van je telefoon. Bewaar het bestand buiten deze app, of stuur het naar de computer.',
    backupDone: 'Back-up gedeeld',
    csv: 'Boekingen als tabel (CSV)',
    restore: 'Back-up terugzetten',
    restoreConfirm: 'Alles in de app wordt vervangen door de inhoud van dit bestand. Doorgaan?',
    restored: 'Back-up teruggezet',
    storage: 'Opslag',
    protectedYes: 'Opslag beschermd: ja',
    protectedNo: 'Opslag beschermd: nee',
    protectedUnknown: 'Opslag beschermd: even kijken…',
    protectedUnsupported: 'Opslag beschermd: deze browser kan dat niet zeggen',
    installedYes: 'De app staat op je beginscherm.',
    installedNo: 'Je kijkt nu in de browser. Zet de app op je beginscherm voordat je echte bedragen invult.',
    sound: 'Geluidjes',
    reduceMotion: 'Minder beweging',
    reduceMotionHint: 'Staat "Verminder beweging" op je telefoon aan, dan beweegt er ook niets.',
    order: 'Volgorde van de potjes',
    up: (name) => `${name} omhoog`,
    down: (name) => `${name} omlaag`,
  },

  kinds: { income: 'inkomen', spend: 'uitgave', extra: 'extraatje', allocate: 'in potje gedaan', move: 'verplaatst' },

  movedFrom: (name) => `van ${name}`,
  movedTo: (name) => `naar ${name}`,

  csv: {
    headers: ['datum', 'potje', 'soort', 'bedrag', 'notitie', 'vaste regel'],
    kinds: { income: 'inkomen', spend: 'uitgave', extra: 'extra', allocate: 'verdeeld', move: 'verplaatst' },
  },

  // Invented example pots for the very first opening. One button clears them.
  sample: {
    pots: { treats: 'Koffie & lekkers', books: 'Boeken', outings: 'Uitjes', plants: 'Planten', swim: 'Zwemmen' },
    partyBooks: 'Nieuw boek!',
    partyOutings: 'Dagje weg!',
    salary: 'Loon (voorbeeld)',
    swimFee: 'Zwemabonnement',
    notes: {
      coffee: 'cappuccino', cake: 'taartje', book: 'pocket', museum: 'museum', cinema: 'bioscoop',
      plant: 'stekje', gift: 'gekregen',
    },
  },

  errors: {
    title: 'Er ging iets mis',
    startup: 'De app kan je gegevens niet openen. Er is niets veranderd of gewist.',
    offline: 'De app kan zich niet klaarzetten voor gebruik zonder internet.',
    detail: 'Technische melding:',
    'bad-amount': 'Vul een bedrag in, zoals 12,50.',
    'bad-name': 'Vul een naam in.',
    'bad-date': 'Kies een geldige datum.',
    'future-date': 'Een datum in de toekomst kan hier niet. Gebruik daarvoor een vaste regel.',
    'bad-frequency': 'Vul in hoe vaak: een heel getal vanaf 1.',
    'bad-day': 'De dag van de maand is een getal van 1 tot en met 31.',
    'end-before-start': 'De einddatum ligt vóór de begindatum.',
    'bad-kind': 'Kies wat er moet gebeuren.',
    'bad-field': 'Dit veld klopt niet.',
    'unknown-pot': 'Kies een potje.',
    'unknown-entry': 'Deze boeking is er niet meer.',
    'unknown-rule': 'Deze regel is er niet meer.',
    'same-pot': 'Kies twee verschillende potjes.',
    'free-pot': 'Het vrije potje blijft altijd.',
    'pot-not-empty': 'Er zit nog geld in (of het staat onder nul). Maak het potje eerst precies leeg.',
    'pot-has-rules': 'Er loopt nog een vaste regel voor dit potje. Stop die eerst.',
    'income-needs-free-pot': 'Geld dat binnenkomt gaat naar vrij te besteden.',
    'nothing-to-skip': 'Er is geen volgende keer om over te slaan.',
    'too-late': 'Die dag is al voorbij.',
    'store-conflict': 'De app staat nog ergens anders open. Sluit dat venster en open de app opnieuw.',
    'store-version': 'Deze gegevens zijn van een andere versie van de app.',
    'store-empty': 'De opgeslagen gegevens zijn verdwenen.',
    'share-unsupported': 'Deze browser kan het bestand niet delen. Open de app op je telefoon.',
    'import-not-json': 'Dit is geen back-up van Spaarpoes: het bestand is niet leesbaar. Er is niets veranderd.',
    'import-not-spaarpoes': 'Dit bestand is niet door Spaarpoes gemaakt. Er is niets veranderd.',
    'import-version': 'Deze back-up is van een andere versie van Spaarpoes. Er is niets veranderd.',
    'import-invalid': 'Deze back-up is beschadigd of aangepast. Er is niets veranderd.',
    unknown: 'Onbekende fout. Sluit de app en open haar opnieuw.',
  },

  importProblems: {
    'missing-data': 'er zitten geen gegevens in',
    'free-pot': 'het vrije potje ontbreekt of staat er dubbel in',
    'double-id': 'iets staat er dubbel in',
    field: 'een veld ontbreekt of heeft een verkeerde waarde',
    'unknown-field': 'er staat een onbekend veld in',
    'unknown-pot': 'iets verwijst naar een potje dat niet bestaat',
    'unknown-rule': 'iets verwijst naar een regel die niet bestaat',
    'broken-pair': 'een verplaatsing is niet compleet',
    sign: 'een bedrag staat de verkeerde kant op',
    counter: 'de nummering klopt niet',
  },

  importDetail(details) {
    const what = this.importProblems[details.problem] ?? details.problem;
    const where = [details.where, details.index === undefined ? '' : `nr. ${details.index + 1}`, details.field]
      .filter(Boolean)
      .join(', ');
    return where ? `Reden: ${what} (${where}).` : `Reden: ${what}.`;
  },

  /** The Dutch sentence for an error from the app's logic. */
  errorText(error) {
    const known = this.errors[error?.code];
    if (!known) return `${this.errors.unknown} ${this.errors.detail} ${error?.message ?? error}`;
    return error.code === 'import-invalid' ? `${known} ${this.importDetail(error.details)}` : known;
  },
};
