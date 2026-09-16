/**
 * Golden-test fixtures: a frozen, representative slice of the Bossard catalog.
 *
 * Frozen deliberately -- the golden test must not change its inputs when the
 * catalog does. Covers every headType, both drives, every variant-bearing norm,
 * threads inside and outside THREAD_D (finding F-1), and the longest part in
 * the catalog (the reduced-length silhouette path).
 *
 * `_why` records why each entry was picked; it is not part of the entry data.
 *
 * Migrated to the normalized catalog schema in Phase 3 by the same adapter that
 * migrated the catalog itself, so the golden outputs must not move.
 */
export const FIXTURES = [
  {
    "_why": "button: renderable thread",
    "sku": "9031425",
    "catalogRef": "BN 2111",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "partType": "screw",
    "headType": "button",
    "thread": "M3",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "button: renderable thread",
    "sku": "9031426",
    "catalogRef": "BN 2111",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "partType": "screw",
    "headType": "button",
    "thread": "M3",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 5
  },
  {
    "_why": "button: mid-range",
    "sku": "3645746",
    "catalogRef": "BN 6404",
    "title": "Linsenschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "~ISO 7380-1",
      "~DIN 34805-1"
    ],
    "partType": "screw",
    "headType": "button",
    "thread": "M2.5",
    "drive": "Torx",
    "material": "Stahl",
    "materialGrade": "",
    "length": 3
  },
  {
    "_why": "countersunk: renderable thread",
    "sku": "3061665",
    "catalogRef": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "partType": "screw",
    "headType": "countersunk",
    "thread": "M2",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "countersunk: renderable thread",
    "sku": "3061666",
    "catalogRef": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "partType": "screw",
    "headType": "countersunk",
    "thread": "M2",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 5
  },
  {
    "_why": "countersunk: mid-range",
    "sku": "3271611",
    "catalogRef": "BN 3803",
    "title": "Senkschrauben mit Innensechsrund, ohne Schaft",
    "norms": [
      "ISO 14581"
    ],
    "partType": "screw",
    "headType": "countersunk",
    "thread": "M4",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 40
  },
  {
    "_why": "insert: renderable thread",
    "sku": "1386840",
    "catalogRef": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "partType": "insert",
    "headType": "insert",
    "thread": "M2",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 4
  },
  {
    "_why": "insert: renderable thread",
    "sku": "1386859",
    "catalogRef": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "partType": "insert",
    "headType": "insert",
    "thread": "M2.5",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 5.8
  },
  {
    "_why": "insert: mid-range",
    "sku": "1386883",
    "catalogRef": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "partType": "insert",
    "headType": "insert",
    "thread": "M4",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 8.2
  },
  {
    "_why": "insert: thread outside THREAD_D (F-1)",
    "sku": "1386875",
    "catalogRef": "BN 1052",
    "title": "Gewindeeinsätze für Wärme- oder Ultraschalleinpressung ohne Kopf, gegenläufige",
    "norms": [],
    "partType": "insert",
    "headType": "insert",
    "thread": "M3.5",
    "drive": "",
    "material": "Messing",
    "materialGrade": "",
    "length": 7.2
  },
  {
    "_why": "low-socket: renderable thread",
    "sku": "3108689",
    "catalogRef": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "partType": "screw",
    "headType": "low-socket",
    "thread": "M2",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 3
  },
  {
    "_why": "low-socket: renderable thread",
    "sku": "3108690",
    "catalogRef": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "partType": "screw",
    "headType": "low-socket",
    "thread": "M2",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "low-socket: mid-range",
    "sku": "3108720",
    "catalogRef": "BN 15857",
    "title": "Zylinderschrauben mit Innensechsrund und niedrigem Kopf, ohne Schaft",
    "norms": [
      "ISO 14580"
    ],
    "partType": "screw",
    "headType": "low-socket",
    "thread": "M4",
    "drive": "Torx",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 8
  },
  {
    "_why": "nut: renderable thread",
    "sku": "1092448",
    "catalogRef": "BN 145",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-square",
    "shape": {
      "nutShape": "square",
      "locking": "none"
    }
  },
  {
    "_why": "nut: renderable thread",
    "sku": "1092464",
    "catalogRef": "BN 145",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M2.5",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-square",
    "shape": {
      "nutShape": "square",
      "locking": "none"
    }
  },
  {
    "_why": "nut: mid-range",
    "sku": "3370964",
    "catalogRef": "BN 20242",
    "title": "Sechskantmuttern ~0,5d",
    "norms": [
      "DIN 439 B (Norm zurückgezogen)",
      "~ISO 4035",
      "~UNI 5589",
      "~ČSN 021403"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M2.5",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-hex-thin",
    "shape": {
      "nutShape": "hex",
      "locking": "none"
    }
  },
  {
    "_why": "nut: thread outside THREAD_D (F-1)",
    "sku": "1094912",
    "catalogRef": "BN 161",
    "title": "Sicherungsmuttern niedrige Form mit Polyamideinlage",
    "norms": [
      "DIN 985 (Norm zurückgezogen)",
      "~UNI 7474"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M3.5",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-nylon",
    "shape": {
      "nutShape": "hex",
      "locking": "nylon"
    }
  },
  {
    "_why": "pin: thread outside THREAD_D (F-1)",
    "sku": "9079230",
    "catalogRef": "BN 31114",
    "title": "Zylinderstifte",
    "norms": [
      "ISO 2338",
      "~DIN 7",
      "~VSM 12771 B",
      "~UNI 1707",
      "~ČSN 022150"
    ],
    "partType": "pin",
    "headType": "pin",
    "thread": "Ø1",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A1 / A2",
    "length": 4
  },
  {
    "_why": "pin: thread outside THREAD_D (F-1)",
    "sku": "9079231",
    "catalogRef": "BN 31114",
    "title": "Zylinderstifte",
    "norms": [
      "ISO 2338",
      "~DIN 7",
      "~VSM 12771 B",
      "~UNI 1707",
      "~ČSN 022150"
    ],
    "partType": "pin",
    "headType": "pin",
    "thread": "Ø1",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A1 / A2",
    "length": 5
  },
  {
    "_why": "press-nut: renderable thread",
    "sku": "300104370",
    "catalogRef": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "partType": "press-nut",
    "headType": "press-nut",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "press-nut: renderable thread",
    "sku": "300104371",
    "catalogRef": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "partType": "press-nut",
    "headType": "press-nut",
    "thread": "M2.5",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "press-nut: mid-range",
    "sku": "300104372",
    "catalogRef": "BN 20706",
    "title": "Einpressmuttern für Printplatten und andere Kunststoffe",
    "norms": [],
    "partType": "press-nut",
    "headType": "press-nut",
    "thread": "M3",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "einsatzgehärtet"
  },
  {
    "_why": "set-screw: renderable thread",
    "sku": "1406345",
    "catalogRef": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "partType": "set-screw",
    "headType": "set-screw",
    "thread": "M2",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2
  },
  {
    "_why": "set-screw: renderable thread",
    "sku": "1080776",
    "catalogRef": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "partType": "set-screw",
    "headType": "set-screw",
    "thread": "M2",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2.5
  },
  {
    "_why": "set-screw: mid-range",
    "sku": "1235745",
    "catalogRef": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "partType": "set-screw",
    "headType": "set-screw",
    "thread": "M5",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 10
  },
  {
    "_why": "set-screw: thread outside THREAD_D (F-1)",
    "sku": "1080717",
    "catalogRef": "BN 617",
    "title": "Gewindestifte mit Innensechskant und Kegelkuppe",
    "norms": [
      "ISO 4026",
      "DIN 913",
      "~UNI 5923",
      "~ČSN 021187"
    ],
    "partType": "set-screw",
    "headType": "set-screw",
    "thread": "M1.6",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 2.5
  },
  {
    "_why": "socket: renderable thread",
    "sku": "1420526",
    "catalogRef": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "partType": "screw",
    "headType": "socket",
    "thread": "M2",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 3
  },
  {
    "_why": "socket: renderable thread",
    "sku": "1420550",
    "catalogRef": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "partType": "screw",
    "headType": "socket",
    "thread": "M2",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 4
  },
  {
    "_why": "socket: mid-range",
    "sku": "300217513",
    "catalogRef": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "partType": "screw",
    "headType": "socket",
    "thread": "M5",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 12
  },
  {
    "_why": "socket: thread outside THREAD_D (F-1)",
    "sku": "8303894",
    "catalogRef": "BN 610",
    "title": "Zylinderschrauben mit Innensechskant, ohne Schaft",
    "norms": [
      "DIN 912 (Norm zurückgezogen)",
      "ISO 4762",
      "~UNI 5931",
      "~ČSN 021143"
    ],
    "partType": "screw",
    "headType": "socket",
    "thread": "M1.6",
    "drive": "Hex",
    "material": "INOX",
    "materialGrade": "A2",
    "length": 6
  },
  {
    "_why": "standoff: renderable thread",
    "sku": "3664347",
    "catalogRef": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "partType": "standoff",
    "headType": "standoff",
    "thread": "M2.5",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "variant": "standoff-mf",
    "length": 5,
    "shape": {
      "standoffEnds": "mf"
    }
  },
  {
    "_why": "standoff: renderable thread",
    "sku": "3664348",
    "catalogRef": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "partType": "standoff",
    "headType": "standoff",
    "thread": "M2.5",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "variant": "standoff-mf",
    "length": 6,
    "shape": {
      "standoffEnds": "mf"
    }
  },
  {
    "_why": "standoff: mid-range",
    "sku": "1266322",
    "catalogRef": "BN 3318",
    "title": "Distanzhalter Sechskant mit Innen- und Aussengewinde",
    "norms": [],
    "partType": "standoff",
    "headType": "standoff",
    "thread": "M6",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "variant": "standoff-mf",
    "length": 100,
    "shape": {
      "standoffEnds": "mf"
    }
  },
  {
    "_why": "washer: renderable thread",
    "sku": "1879499",
    "catalogRef": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-std"
  },
  {
    "_why": "washer: renderable thread",
    "sku": "1267612",
    "catalogRef": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-std"
  },
  {
    "_why": "washer: mid-range",
    "sku": "1761846",
    "catalogRef": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M8",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-std"
  },
  {
    "_why": "washer: thread outside THREAD_D (F-1)",
    "sku": "1874861",
    "catalogRef": "BN 715",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 125 A (Norm zurückgezogen)",
      "~ISO 7089",
      "~VSM 13904",
      "~UNI 6592",
      "~ČSN 021702"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M1.6",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-std"
  },
  {
    "_why": "variant norm BN 3525",
    "sku": "1714988",
    "catalogRef": "BN 3525",
    "title": "Vierkantmuttern",
    "norms": [
      "DIN 562",
      "~UNI 5596",
      "~ČSN 021416"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M3",
    "drive": "",
    "material": "INOX",
    "materialGrade": "A2",
    "variant": "nut-square",
    "shape": {
      "nutShape": "square",
      "locking": "none"
    }
  },
  {
    "_why": "variant norm BN 161",
    "sku": "1952935",
    "catalogRef": "BN 161",
    "title": "Sicherungsmuttern niedrige Form mit Polyamideinlage",
    "norms": [
      "DIN 985 (Norm zurückgezogen)",
      "~UNI 7474"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-nylon",
    "shape": {
      "nutShape": "hex",
      "locking": "nylon"
    }
  },
  {
    "_why": "variant norm BN 20242",
    "sku": "3370963",
    "catalogRef": "BN 20242",
    "title": "Sechskantmuttern ~0,5d",
    "norms": [
      "DIN 439 B (Norm zurückgezogen)",
      "~ISO 4035",
      "~UNI 5589",
      "~ČSN 021403"
    ],
    "partType": "nut",
    "headType": "nut",
    "thread": "M2",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "nut-hex-thin",
    "shape": {
      "nutShape": "hex",
      "locking": "none"
    }
  },
  {
    "_why": "variant norm BN 729",
    "sku": "1269941",
    "catalogRef": "BN 729",
    "title": "Scheiben ohne Fase",
    "norms": [
      "DIN 9021 (Norm zurückgezogen)",
      "~ISO 7093",
      "~UNI 6593",
      "~ČSN 021726"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M2.3",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-large"
  },
  {
    "_why": "variant norm BN 726",
    "sku": "1269429",
    "catalogRef": "BN 726",
    "title": "Scheiben ohne Fase für Zylinderschrauben",
    "norms": [
      "DIN 433 (Norm zurückgezogen)",
      "~ČSN 021703"
    ],
    "partType": "washer",
    "headType": "washer",
    "thread": "M1",
    "drive": "",
    "material": "Stahl",
    "materialGrade": "",
    "variant": "washer-socket"
  },
  {
    "_why": "variant norm BN 3319",
    "sku": "3664355",
    "catalogRef": "BN 3319",
    "title": "Distanzhalter Sechskant mit Innengewinde beidseitig",
    "norms": [],
    "partType": "standoff",
    "headType": "standoff",
    "thread": "M2.5",
    "drive": "",
    "material": "Automatenstahl",
    "materialGrade": "",
    "variant": "standoff-ff",
    "length": 5,
    "shape": {
      "standoffEnds": "ff"
    }
  }
]
