/**
 * Golden-test fixtures: a frozen, representative slice of the Bossard catalog.
 *
 * Frozen deliberately -- the golden test must not change its inputs when the
 * catalog does. Covers every headType, both drives, every variant-bearing norm,
 * threads inside and outside THREAD_D (finding F-1), and the longest part in
 * the catalog (the reduced-length silhouette path).
 *
 * `_why` records why each entry was picked; it is not part of the entry data.
 */
export const FIXTURES = [
  {
    "_why": "button: renderable thread",
    "articleNumber": "9031425",
    "bossardNorm": "BN 2111",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "thread": "M3",
    "headType": "button",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "button: renderable thread",
    "articleNumber": "9031426",
    "bossardNorm": "BN 2111",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "thread": "M3",
    "headType": "button",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 5
  },
  {
    "_why": "button: mid-range",
    "articleNumber": "3645746",
    "bossardNorm": "BN 6404",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "thread": "M2.5",
    "headType": "button",
    "drive": "Torx",
    "material": "Stahl",
    "materialGrade": "",
    "length": 3
  },
  {
    "_why": "countersunk: renderable thread",
    "articleNumber": "3061665",
    "bossardNorm": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "thread": "M2",
    "headType": "countersunk",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "countersunk: renderable thread",
    "articleNumber": "3061666",
    "bossardNorm": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "thread": "M2",
    "headType": "countersunk",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 5
  },
  {
    "_why": "countersunk: mid-range",
    "articleNumber": "3271611",
    "bossardNorm": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "thread": "M4",
    "headType": "countersunk",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 40
  },
  {
    "_why": "insert: renderable thread",
    "articleNumber": "1386840",
    "bossardNorm": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "thread": "M2",
    "headType": "insert",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 4
  },
  {
    "_why": "insert: renderable thread",
    "articleNumber": "1386859",
    "bossardNorm": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "thread": "M2.5",
    "headType": "insert",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 5.8
  },
  {
    "_why": "insert: mid-range",
    "articleNumber": "1386883",
    "bossardNorm": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "thread": "M4",
    "headType": "insert",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 8.2
  },
  {
    "_why": "insert: thread outside THREAD_D (F-1)",
    "articleNumber": "1386875",
    "bossardNorm": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "thread": "M3.5",
    "headType": "insert",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 7.2
  },
  {
    "_why": "low-socket: renderable thread",
    "articleNumber": "3108689",
    "bossardNorm": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "thread": "M2",
    "headType": "low-socket",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 3
  },
  {
    "_why": "low-socket: renderable thread",
    "articleNumber": "3108690",
    "bossardNorm": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "thread": "M2",
    "headType": "low-socket",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "low-socket: mid-range",
    "articleNumber": "3108720",
    "bossardNorm": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "thread": "M4",
    "headType": "low-socket",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 8
  },
  {
    "_why": "nut: renderable thread",
    "articleNumber": "1092448",
    "bossardNorm": "BN 145",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "thread": "M2",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "nut: renderable thread",
    "articleNumber": "1092464",
    "bossardNorm": "BN 145",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "thread": "M2.5",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "nut: mid-range",
    "articleNumber": "3370964",
    "bossardNorm": "BN 20242",
    "title": "Sechskantmuttern ~0,5d",
    "norms": [
      "DIN 439 B (Norm zurückgezogen)",
      "~ISO 4035",
      "~UNI 5589",
      "~ČSN 021403"
    ],
    "thread": "M2.5",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "nut: thread outside THREAD_D (F-1)",
    "articleNumber": "1094912",
    "bossardNorm": "BN 161",
    "title": "Sicherungsmuttern niedrige Form mit Polyamideinlage",
    "norms": [
      "DIN 985 (Norm zurückgezogen)",
      "~UNI 7474"
    ],
    "thread": "M3.5",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "pin: thread outside THREAD_D (F-1)",
    "articleNumber": "9079230",
    "bossardNorm": "BN 31114",
    "title": "Zylinderstifte",
    "norms": [
      "ISO 2338",
      "~DIN 7",
      "~VSM 12771 B",
      "~UNI 1707",
      "~ČSN 022150"
    ],
    "thread": "Ø1",
    "headType": "pin",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A1 / A2",
    "length": 4
  },
  {
    "_why": "pin: thread outside THREAD_D (F-1)",
    "articleNumber": "9079231",
    "bossardNorm": "BN 31114",
    "title": "Zylinderstifte",
    "norms": [
      "ISO 2338",
      "~DIN 7",
      "~VSM 12771 B",
      "~UNI 1707",
      "~ČSN 022150"
    ],
    "thread": "Ø1",
    "headType": "pin",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A1 / A2",
    "length": 5
  },
  {
    "_why": "press-nut: renderable thread",
    "articleNumber": "300104370",
    "bossardNorm": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "thread": "M2",
    "headType": "press-nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "press-nut: renderable thread",
    "articleNumber": "300104371",
    "bossardNorm": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "thread": "M2.5",
    "headType": "press-nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "press-nut: mid-range",
    "articleNumber": "300104372",
    "bossardNorm": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "thread": "M3",
    "headType": "press-nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "set-screw: renderable thread",
    "articleNumber": "1406345",
    "bossardNorm": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "thread": "M2",
    "headType": "set-screw",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2
  },
  {
    "_why": "set-screw: renderable thread",
    "articleNumber": "1080776",
    "bossardNorm": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "thread": "M2",
    "headType": "set-screw",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2.5
  },
  {
    "_why": "set-screw: mid-range",
    "articleNumber": "1235745",
    "bossardNorm": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "thread": "M5",
    "headType": "set-screw",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 10
  },
  {
    "_why": "set-screw: thread outside THREAD_D (F-1)",
    "articleNumber": "1080717",
    "bossardNorm": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "thread": "M1.6",
    "headType": "set-screw",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2.5
  },
  {
    "_why": "socket: renderable thread",
    "articleNumber": "1420526",
    "bossardNorm": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "thread": "M2",
    "headType": "socket",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 3
  },
  {
    "_why": "socket: renderable thread",
    "articleNumber": "1420550",
    "bossardNorm": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "thread": "M2",
    "headType": "socket",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "socket: mid-range",
    "articleNumber": "300217513",
    "bossardNorm": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "thread": "M5",
    "headType": "socket",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 12
  },
  {
    "_why": "socket: thread outside THREAD_D (F-1)",
    "articleNumber": "8303894",
    "bossardNorm": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "thread": "M1.6",
    "headType": "socket",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 6
  },
  {
    "_why": "standoff: renderable thread",
    "articleNumber": "3664347",
    "bossardNorm": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "thread": "M2.5",
    "headType": "standoff",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "length": 5
  },
  {
    "_why": "standoff: renderable thread",
    "articleNumber": "3664348",
    "bossardNorm": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "thread": "M2.5",
    "headType": "standoff",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "length": 6
  },
  {
    "_why": "standoff: mid-range",
    "articleNumber": "1266322",
    "bossardNorm": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "thread": "M6",
    "headType": "standoff",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "length": 100
  },
  {
    "_why": "washer: renderable thread",
    "articleNumber": "1879499",
    "bossardNorm": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "thread": "M2",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "washer: renderable thread",
    "articleNumber": "1267612",
    "bossardNorm": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "thread": "M2",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "washer: mid-range",
    "articleNumber": "1761846",
    "bossardNorm": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "thread": "M8",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "washer: thread outside THREAD_D (F-1)",
    "articleNumber": "1874861",
    "bossardNorm": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "thread": "M1.6",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "variant norm BN 3525",
    "articleNumber": "1714988",
    "bossardNorm": "BN 3525",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "thread": "M3",
    "headType": "nut",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A2"
  },
  {
    "_why": "variant norm BN 161",
    "articleNumber": "1952935",
    "bossardNorm": "BN 161",
    "title": "Sicherungsmuttern niedrige Form mit Polyamideinlage",
    "norms": [
      "DIN 985 (Norm zurückgezogen)",
      "~UNI 7474"
    ],
    "thread": "M2",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "variant norm BN 20242",
    "articleNumber": "3370963",
    "bossardNorm": "BN 20242",
    "title": "Sechskantmuttern ~0,5d",
    "norms": [
      "DIN 439 B (Norm zurückgezogen)",
      "~ISO 4035",
      "~UNI 5589",
      "~ČSN 021403"
    ],
    "thread": "M2",
    "headType": "nut",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "variant norm BN 729",
    "articleNumber": "1269941",
    "bossardNorm": "BN 729",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 9021 (Norm zurückgezogen)",
      "~ISO 7093",
      "~UNI 6593",
      "~ČSN 021726"
    ],
    "thread": "M2.3",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "variant norm BN 726",
    "articleNumber": "1269429",
    "bossardNorm": "BN 726",
    "title": "Scheiben ohne Fase für Zylinderschrauben",
    "norms": [
      "DIN 433 (Norm zurückgezogen)",
      "~ČSN 021703"
    ],
    "thread": "M1",
    "headType": "washer",
    "drive": "",
    "material": "Stahl",
    "materialGrade": ""
  },
  {
    "_why": "variant norm BN 3319",
    "articleNumber": "3664355",
    "bossardNorm": "BN 3319",
    "title": "Distanzhalter Sechskant mit Innengewinde beidseitig",
    "norms": [],
    "thread": "M2.5",
    "headType": "standoff",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "length": 5
  }
]
