/* Trip to Tenerife - asetukset ja KAIKKI pelin tekstit (suomeksi).
 * Muokkaa nimiä ja tekstejä vapaasti. Käytä {id} (esim. {a_kid1}) lisätäksesi asetetun nimen.
 * Pidä rivit lyhyinä (noin 60 merkkiä tai alle), jotta ne mahtuvat tekstiruutuun.
 *
 * Perhe 1 (a_*): Mikko, Nelli, Aatos (isompi poika), Oiva (pienempi poika)
 * Perhe 2 (b_*): Ville, Kaisa, Oskari (isompi poika), Joonas (pienempi poika)
 */
window.GAME_CONFIG = {
  language: 'fi',
  names: {
    a_adult1: 'Nelli',
    a_adult2: 'Mikko',
    a_kid1: 'Aatos',
    a_kid2: 'Oiva',
    b_adult1: 'Kaisa',
    b_adult2: 'Ville',
    b_kid1: 'Oskari',
    b_kid2: 'Joonas'
  },
  crtDefault: true,   // juovat / vinjetti / kaareva ruutu päällä alussa
  gateNumber: '7'
};

window.STORY = {
  // Käyttöliittymän lyhyet tekstit
  ui: {
    gear: '⚙ ASETUKSET',
    settings: 'ASETUKSET',
    soundOn: 'ÄÄNI: PÄÄLLÄ', soundOff: 'ÄÄNI: POIS',
    crtOn: 'CRT: PÄÄLLÄ', crtOff: 'CRT: POIS',
    ctlJoy: 'OHJAUS: OHJAUSSAUVA', ctlTap: 'OHJAUS: KOSKETA JA AJA',
    close: 'SULJE',
    beep: 'TUUT TUUT!',
    board: 'SISÄÄN', rentalSign: 'AUTOVUOKRAUS',
    honk: 'TUUT', drop: 'LAITA', stamp: 'LEIMAA', seat: 'ISTU', open: 'AVAA', jump: 'HYPPÄÄ',
    checkinSign: 'LÄHTÖSELVITYS',
    gate: 'PORTTI',
    leg: 'ETAPPI', trip: 'MATKA', hourUnit: 'T', ok: 'OK',
    styleLabel: 'TYYLI', gradeLabel: 'VÄRIT', styleBtn: 'TYYLI >', gradeBtn: 'VÄRIT >',
    optStyle: 'TYYLI: ', optGrade: 'VÄRIT: ', start: 'ALOITA', replay: 'PELAA UUDESTAAN',
    styleNames: { stardew: 'STARDEW', snes: 'SNES-ZELDA', ff: 'FINAL FANTASY', kasin: 'KÄSINTEHTY' },
    gradeNames: { normaali: 'NORMAALI', fosfori: 'FOSFORI', gameboy: 'GAMEBOY', neon: 'NEON' }
  },

  title: { lines: ['TRIP TO', 'TENERIFE'], sub: 'OULUSTA AURINKOON!' },

  // Puhujien nimet ('narrator' ei näytä nimeä)
  speakers: { narrator: '', driver: 'TAKSIKUSKI', clerk: 'VIRKAILIJA', attendant: 'HENKILÖKUNTA', rental_agent: 'VUOKRAAMO' },

  intro: [
    { who: 'narrator', t: 'Kylmä, harmaa syysaamu Oulussa.' },
    { who: 'narrator', t: 'Kaksi perhettä lähtee Teneriffalle. Aurinkoon!' },
    { who: 'driver', t: 'Taksi tuli! Haetaan ensin Nellin ja Mikon perhe.' }
  ],

  hud: {
    toHouse: 'AJA TALOLLE',
    toAirport: 'AJA LENTOKENTÄLLE',
    family: 'PERHE',
    drive: 'VEDÄ AJAAKSESI',
    honk: 'TUUT',
    walk: 'KOSKETA KÄVELLÄKSESI',
    bags: 'PUDOTA LAUKKU',
    stamp: 'LEIMAA LIPPU',
    gate: 'KÄVELE PORTILLE',
    desk: 'KÄVELE TISKILLE',
    seat: 'VALITSE PAIKKA',
    next: 'SEURAAVA',
    boardHint: 'RAAHAA AUTOON',
    load: 'LAITA LAUKKU AUTOON',
    door: 'KOSKETA OVEA',
    jump: 'KOSKETA HYPPÄÄJÄÄ'
  },

  taxiA: {
    hudHouse: 'AJA: PUUTARHAKATU',
    family: 'NELLIN JA MIKON PERHE',
    street: 'PUUTARHAKATU',
    start: [
      { who: 'driver', t: 'Brr, onpa kylmä! Puutarhakadulle, Nellin ja Mikon luo.' }
    ],
    arrive: [{ who: 'driver', t: 'Puutarhakatu! Tuut tuut!' }],
    pickup: {
      a_adult1: 'Huomenta! Mikko, laukut kyytiin!',
      a_adult2: 'Laukut ovat jo mukana. Mennään!',
      a_kid1: 'Minä istun ikkunan viereen! Ykkönen!',
      a_kid2: 'Onko Teneriffalla oikeasti lämmin?'
    },
    full: [{ who: 'driver', t: 'Kaikki kyydissä? Oulun lentokentälle!' }],
    airport: [
      { who: 'driver', t: 'Oulun lentokenttä! Hyvää matkaa!' },
      { who: 'a_kid1', t: 'Missä Oskari ja Joonas ovat?' },
      { who: 'narrator', t: 'Toinen taksi tuo Kaisan ja Villen perheen.' }
    ]
  },

  taxiB: {
    hudHouse: 'AJA: MARTINNIEMENTIE',
    family: 'KAISAN JA VILLEN PERHE',
    street: 'MARTINNIEMENTIE',
    start: [
      { who: 'narrator', t: 'Samaan aikaan toisaalla...' },
      { who: 'driver', t: 'Kaisan ja Villen perhe! Martinniementielle, ole hyvä.' }
    ],
    arrive: [{ who: 'driver', t: 'Tuut tuut! Taksi Teneriffan matkalaisille!' }],
    pickup: {
      b_adult1: 'Hei! Anteeksi, olemme vähän myöhässä.',
      b_adult2: 'Onko joku nähnyt lakkini?',
      b_kid1: 'Minä pakkasin uimahousut ja räpylät!',
      b_kid2: 'Sataa lunta! Hei hei, lumi!'
    },
    full: [{ who: 'driver', t: 'Pitäkää lakeista kiinni! Tie on pitkä ja suora.' }],
    airport: [
      { who: 'driver', t: 'Oulun lentokenttä! Teneriffa, täältä tullaan.' },
      { who: 'b_kid1', t: 'Katso! Aatos ja Oiva ovat tuolla!' },
      { who: 'a_kid1', t: 'Moi Oskari! Ollaanko me jo lomalla?' }
    ]
  },

  checkin: {
    start: [
      { who: 'narrator', t: 'Molemmat perheet tapaavat lähtöselvityksessä.' },
      { who: 'clerk', t: 'Tervetuloa! Kävelkää tiskilleni.' }
    ],
    atDesk: [
      { who: 'clerk', t: 'Kahdeksan matkustajaa ja neljä laukkua. Laukut hihnalle!' }
    ],
    bagLines: ['Heippa, laukku!', 'Nähdään Teneriffalla!', 'Laukku lentää myös!', 'Viimeinen. Huh!'],
    bagWho: ['a_kid1', 'b_kid2', 'a_kid2', 'b_kid1'],
    bagsDone: [{ who: 'clerk', t: 'Hienoa! Nyt leimataan matkaliput.' }],
    stampDone: [
      { who: 'clerk', t: 'Leimaa, leimaa! Portti {gate}. Hyvää matkaa!' },
      { who: 'b_kid1', t: 'Leima otsaan, kiitos!' }
    ]
  },

  gate: {
    start: [{ who: 'narrator', t: 'Portti {gate}. Kone odottaa ulkona.' }],
    atGate: [
      { who: 'attendant', t: 'Matkaliput, kiitos!' },
      { who: 'a_kid2', t: 'Piip! Piip! Minä olen skanneri!' }
    ],
    board: [{ who: 'attendant', t: 'Mukavaa lentoa!' }]
  },

  plane: {
    start: [{ who: 'attendant', t: 'Tervetuloa kyytiin! Etsikää paikkanne.' }],
    seated: [
      { who: 'attendant', t: 'Vyöt kiinni. Nyt lähdetään!' },
      { who: 'b_kid2', t: 'Mikä pamaus! Lennetäänkö avaruuteen?' }
    ],
    cities: ['OULU', 'HELSINKI', 'MADRID', 'TENERIFFA POHJOINEN'],
    legs: [
      {
        talk: [
          { who: 'a_kid1', t: 'Hui! Me lennetään!' },
          { who: 'b_kid1', t: 'Pilvet näyttävät hattaralta!' },
          { who: 'a_adult1', t: 'Seuraavaksi Helsinki.' }
        ],
        end: [{ who: 'narrator', t: 'HELSINKI! Pieni pysähdys, sitten Madridiin.' }]
      },
      {
        talk: [
          { who: 'attendant', t: 'Haluaisitteko juotavaa?' }
        ],
        afterDrinks: [
          { who: 'b_adult2', t: 'Mustikkamehu on paras!' },
          { who: 'a_adult2', t: 'Suomalaisia marjoja Espanjaan asti.' },
          { who: 'a_kid2', t: 'Kauanko vielä aurinkoon?' },
          { who: 'a_adult1', t: 'Enää vähän aikaa.' }
        ],
        end: [{ who: 'narrator', t: 'MADRID! Melkein perillä.' }]
      },
      {
        talk: [
          { who: 'a_kid2', t: 'Näen meren! Se on tosi sininen!' },
          { who: 'b_adult1', t: 'Palmut odottavat meitä.' },
          { who: 'attendant', t: 'Valmistautukaa laskeutumiseen.' }
        ],
        end: [{ who: 'narrator', t: 'TENERIFFA POHJOINEN!' }]
      }
    ],
    drinkAsk: 'Mitä juodaan?',
    // the only drink: mustikkamehu. Three glasses on the tray for eight people, then everybody gets one.
    drinks: [
      { id: 'mustikka', label: 'MUSTIKKAMEHU', sub: 'MARJAMEHU', color: '#4a2f8a', fav: true }
    ],
    trayLines: [
      { who: 'attendant', t: 'Tässä on kolme lasillista mustikkamehua.' },
      { who: 'b_kid2', t: 'Kolme?! Meitä on kahdeksan!' },
      { who: 'a_kid2', t: 'Minä otan ne kaikki!' },
      { who: 'attendant', t: 'Hups. Haen lisää. Kaikille riittää.' }
    ],
    cheers: [
      { who: 'a_kid1', t: 'Mustikkamehu! Siniset huulet!' },
      { who: 'b_kid1', t: 'Kippis!' },
      { who: 'a_adult2', t: 'Kippis kaikille!' }
    ],
    drinkFavTag: 'SUOSIKKI'
  },

  arrival: {
    land: [
      { who: 'narrator', t: 'Tömps! Olemme laskeutuneet Teneriffalle!' },
      { who: 'attendant', t: 'Tervetuloa Teneriffalle. Täällä on 26 astetta!' }
    ],
    door: [{ who: 'a_kid1', t: 'Ovi aukeaa! Näen valoa!' }],
    warm: [
      { who: 'a_kid2', t: 'Voi vitsi, täällä on lämmin!' },
      { who: 'a_adult1', t: 'Takit pois, kaikki!' },
      { who: 'narrator', t: 'Hyvästi harmaa. Hei aurinko!' },
      { who: 'b_kid2', t: 'Aurinko halaa minua!' }
    ]
  },

  rentalDesk: {
    start: [{ who: 'narrator', t: 'Saapumishalli. Seuraavaksi vuokra-auto!' }],
    atDesk: [{ who: 'rental_agent', t: 'Hola! Teillä on varaus. Tässä avaimet!' }],
    keys: [{ who: 'narrator', t: 'Kilin kolin! Avaimet saatu.' }],
    chooseAsk: [{ who: 'rental_agent', t: 'Minkä värisen auton haluatte?' }],
    colours: [
      { label: 'PUNAINEN', color: '#d33a3a', who: 'a_kid1', t: 'Punainen! Se on nopein!' },
      { label: 'VALKOINEN', color: '#f2f2f2', who: 'a_adult1', t: 'Valkoinen pysyy viileänä.' },
      { label: 'SININEN', color: '#3a6fd0', who: 'a_kid2', t: 'Sininen kuin meri!' }
    ],
    loadStart: [{ who: 'a_adult2', t: 'Laukut autoon. Yksi kerrallaan!' }],
    bagLines: ['Hups, painava!', 'Mahtuukohan tämä?', 'Minä työnnän!', 'Viimeinen. Hyvin mahtui!'],
    bagWho: ['a_adult2', 'b_adult2', 'b_kid1', 'b_adult1'],
    board: [
      { who: 'a_adult2', t: 'Minä ajan. Kaikilla vyöt kiinni!' },
      { who: 'a_kid1', t: 'Minä painan ikkunan auki!' }
    ]
  },

  driveRental: {
    hud: 'AJA LOMA-ASUNNOLLE',
    start: [{ who: 'a_adult2', t: 'Oikea puoli tiestä. Nyt mennään!' }],
    chatter: [
      [{ who: 'a_kid2', t: 'Katso, vuohi!' }, { who: 'b_kid2', t: 'Tuuta sille!' }],
      [{ who: 'b_kid1', t: 'Tuolla on tulivuori! Teide!' }, { who: 'a_adult1', t: 'Se on Espanjan korkein vuori.' }],
      [{ who: 'a_kid1', t: 'Onko perillä jo uima-allas?' }, { who: 'b_adult1', t: 'Kohta nähdään.' }]
    ],
    arrive: [{ who: 'a_adult2', t: 'Perillä! Valkoinen talo ja terrakottakatto.' }]
  },

  airbnb: {
    start: [{ who: 'narrator', t: 'Valkoinen huvila. Terrakottakatto ja aurinko.' }],
    unlock: [{ who: 'narrator', t: 'Klik! Ovi aukeaa.' }],
    looks: [
      { who: 'a_adult1', t: 'Voi miten kaunis!' },
      { who: 'a_adult2', t: 'Tässä on tilaa ja aurinkoa.' },
      { who: 'b_adult1', t: 'Katsokaa tuota terassia.' },
      { who: 'b_adult2', t: 'Tämä on parempi kuin kuvissa!' }
    ],
    race: [
      { who: 'b_kid1', t: 'UIMA-ALLAS!' },
      { who: 'a_kid1', t: 'Minä ensin!' },
      { who: 'b_kid2', t: 'Odota minua!' },
      { who: 'a_kid2', t: 'Uima-allas, uima-allas!' }
    ]
  },

  pool: {
    start: [{ who: 'narrator', t: 'Ilta-aurinko. Allas kimaltaa.' }],
    splash: {
      a_kid1: 'Pommi!!',
      a_kid2: 'Roiskis! Kastuin kokonaan!',
      b_kid1: 'Ihan pyöreä pommi!',
      b_kid2: 'Pulik! Vettä nenässä!',
      a_adult2: 'Mikko-sukellus!',
      b_adult2: 'Ville laskee kymmeneen!',
      a_adult1: 'Pläts! Ihanaa!',
      b_adult1: 'Hups! Aurinkolasit!'
    },
    again: 'Kastuin jo, hih!',
    closing: [
      { who: 'narrator', t: 'Aurinko laskee ja kaikilla on hyvä olla.' },
      { who: 'a_kid1', t: 'Paras loma ikinä!' },
      { who: 'a_adult1', t: 'Tässä on hyvä olla.' },
      { who: 'a_adult2', t: 'Eikö olekin ihanaa?' },
      { who: 'b_kid2', t: 'Vielä yksi pommi huomenna!' },
      { who: 'b_adult2', t: 'Kippis lomalle, kaikki!' }
    ]
  },

  ending: {
    title1: 'MATKA',
    title2: 'ALKAA!',
    lines: [
      { who: 'narrator', t: 'Palmuja, sininen meri ja iso keltainen aurinko.' },
      { who: 'narrator', t: 'Kaksi perhettä, yksi seikkailu ja paljon naurua.' },
      { who: 'narrator', t: 'Paras loma alkaa juuri nyt!' }
    ],
    credits: 'Nellin ja Mikon perhe: {a_adult1}, {a_adult2}, {a_kid1}, {a_kid2}. Kaisan ja Villen perhe: {b_adult1}, {b_adult2}, {b_kid1}, {b_kid2}.',
    thanks: 'Hasta luego!',
    replay: 'PELAA UUDESTAAN'
  },

  demoEnd: {
    title1: 'DEMO',
    title2: 'LOPPUU.',
    text: 'Seuraavaksi toinen perhe!'
  }
};
