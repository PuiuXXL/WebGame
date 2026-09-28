/**
 * Campus layout — PURE DATE, fără logică.
 *
 * ACEST FIȘIER ESTE GENERAT DE EDITORUL DE HARTĂ.
 * Nu-l edita de mână dacă poți evita: rulează `npm run map:edit`, mută ce vrei
 * cu mouse-ul peste fotografia aeriană, apasă Salvează. Editorul rescrie fix
 * acest fișier și nimic altceva.
 *
 * Tipurile, valorile derivate (copaci, lămpi, bănci) și restul logicii stau în
 * campus.ts, care importă de aici.
 */

export const LAYOUT = {
  "world": {
    "width": 8580,
    "height": 4060
  },
  "fence": [
    {
      "id": "gard-principal",
      "label": "Gardul campusului",
      "points": [
        [
          1540,
          1980
        ],
        [
          1540,
          1280
        ],
        [
          5180,
          1160
        ],
        [
          7560,
          1020
        ],
        [
          7540,
          3000
        ],
        [
          1540,
          2980
        ],
        [
          1540,
          2220
        ]
      ],
      "closed": false
    },
    {
      "id": "gard-osut",
      "label": "Gardul Sediului OSUT",
      "points": [
        [
          1340,
          1280
        ],
        [
          1340,
          1420
        ],
        [
          1020,
          1420
        ],
        [
          1020,
          2300
        ],
        [
          1320,
          2300
        ],
        [
          1320,
          3000
        ]
      ],
      "closed": false
    }
  ],
  "roads": [
    {
      "id": "aleea-centrala",
      "points": [
        [
          1680,
          2120
        ],
        [
          2040,
          2120
        ],
        [
          5200,
          2120
        ]
      ],
      "width": 140,
      "surface": "paved"
    },
    {
      "id": "spina-est",
      "points": [
        [
          5180,
          2120
        ],
        [
          5620,
          2100
        ],
        [
          6080,
          1860
        ],
        [
          6660,
          1640
        ],
        [
          7040,
          1620
        ],
        [
          7560,
          1620
        ]
      ],
      "width": 140,
      "surface": "paved"
    },
    {
      "id": "ramura-sud",
      "points": [
        [
          5500,
          2080
        ],
        [
          5740,
          2260
        ],
        [
          5900,
          2440
        ],
        [
          6060,
          2600
        ],
        [
          6320,
          2820
        ],
        [
          6320,
          2980
        ]
      ],
      "width": 130,
      "surface": "paved"
    },
    {
      "id": "acces-nord-1",
      "points": [
        [
          3700,
          1200
        ],
        [
          3700,
          1320
        ],
        [
          3860,
          1520
        ],
        [
          3960,
          1760
        ],
        [
          3980,
          2120
        ]
      ],
      "width": 100,
      "surface": "paved"
    },
    {
      "id": "acces-nord-2",
      "points": [
        [
          4800,
          1180
        ],
        [
          5100,
          1620
        ],
        [
          5180,
          2100
        ]
      ],
      "width": 100,
      "surface": "paved"
    },
    {
      "id": "acces-camin-2",
      "points": [
        [
          5520,
          2120
        ],
        [
          5520,
          1880
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "acces-camin-1",
      "points": [
        [
          6900,
          1640
        ],
        [
          6900,
          1400
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "acces-osut",
      "points": [
        [
          2020,
          1880
        ],
        [
          2020,
          2080
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "acces-teren",
      "points": [
        [
          2020,
          2200
        ],
        [
          2020,
          2380
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "acces-sport-vest",
      "points": [
        [
          2540,
          2200
        ],
        [
          2540,
          2340
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-1",
      "points": [
        [
          3140,
          2140
        ],
        [
          3140,
          1880
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-2",
      "points": [
        [
          4340,
          2080
        ],
        [
          4340,
          1900
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-3",
      "points": [
        [
          4340,
          2380
        ],
        [
          4340,
          2120
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-4",
      "points": [
        [
          5500,
          2400
        ],
        [
          5500,
          2120
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-5",
      "points": [
        [
          3260,
          2400
        ],
        [
          3260,
          2160
        ]
      ],
      "width": 70,
      "surface": "paved"
    },
    {
      "id": "drum-6",
      "points": [
        [
          1440,
          3040
        ],
        [
          1460,
          1280
        ],
        [
          1460,
          1080
        ]
      ],
      "width": 110,
      "surface": "paved"
    },
    {
      "id": "drum-7",
      "points": [
        [
          1680,
          2120
        ],
        [
          1480,
          2120
        ]
      ],
      "width": 140,
      "surface": "paved"
    },
    {
      "id": "drum-8",
      "points": [
        [
          1420,
          1740
        ],
        [
          1240,
          1740
        ]
      ],
      "width": 70,
      "surface": "paved"
    }
  ],
  "buildings": [
    {
      "id": "sediu-osut",
      "label": "Sediul OSUT",
      "kind": "office",
      "parts": [
        {
          "x": 1080,
          "y": 1520,
          "width": 240,
          "height": 360,
          "rotation": 0
        }
      ],
      "door": {
        "x": 1200,
        "y": 1880
      },
      "rotation": 0,
      "labelOffset": [
        8,
        459
      ]
    },
    {
      "id": "pasnic",
      "label": "Decanat Arhitectura",
      "kind": "office",
      "parts": [
        {
          "x": 1860,
          "y": 1520,
          "width": 260,
          "height": 360
        }
      ],
      "door": {
        "x": 2430,
        "y": 1820
      },
      "labelOffset": [
        13,
        252
      ]
    },
    {
      "id": "camin-6",
      "label": "Caminul 6",
      "kind": "dorm",
      "parts": [
        {
          "x": 3260,
          "y": 1620,
          "width": 460,
          "height": 160,
          "rotation": -30
        },
        {
          "x": 2940,
          "y": 1700,
          "width": 400,
          "height": 180,
          "rotation": 0
        }
      ],
      "door": {
        "x": 3360,
        "y": 1820
      },
      "rotation": 1,
      "labelOffset": [
        -204,
        264
      ]
    },
    {
      "id": "camin-4",
      "label": "Caminul 4",
      "kind": "dorm",
      "parts": [
        {
          "x": 4420,
          "y": 1660,
          "width": 420,
          "height": 180,
          "rotation": -25
        },
        {
          "x": 4220,
          "y": 1740,
          "width": 280,
          "height": 180,
          "rotation": -1
        }
      ],
      "door": {
        "x": 4340,
        "y": 1900
      },
      "rotation": 0,
      "labelOffset": [
        -176,
        235
      ]
    },
    {
      "id": "camin-2",
      "label": "Caminul 2",
      "kind": "dorm",
      "parts": [
        {
          "x": 5620,
          "y": 1580,
          "width": 500,
          "height": 200,
          "rotation": -26
        },
        {
          "x": 5340,
          "y": 1680,
          "width": 340,
          "height": 200
        }
      ],
      "door": {
        "x": 5600,
        "y": 1860
      },
      "rotation": 0,
      "labelOffset": [
        -222,
        301
      ]
    },
    {
      "id": "camin-1",
      "label": "Caminul 1",
      "kind": "dorm",
      "parts": [
        {
          "x": 6380,
          "y": 1180,
          "width": 220,
          "height": 520,
          "rotation": 69
        },
        {
          "x": 6680,
          "y": 1240,
          "width": 400,
          "height": 200
        }
      ],
      "door": {
        "x": 6480,
        "y": 1640
      },
      "rotation": -1,
      "labelOffset": [
        251,
        111
      ]
    },
    {
      "id": "camin-7",
      "label": "Caminul 7",
      "kind": "dorm",
      "parts": [
        {
          "x": 2680,
          "y": 2480,
          "width": 520,
          "height": 180,
          "rotation": -21
        },
        {
          "x": 3160,
          "y": 2400,
          "width": 320,
          "height": 160,
          "rotation": 0
        }
      ],
      "door": {
        "x": 2960,
        "y": 2700
      },
      "rotation": 1,
      "labelOffset": [
        271,
        89
      ]
    },
    {
      "id": "camin-5",
      "label": "Caminul 5",
      "kind": "dorm",
      "parts": [
        {
          "x": 3780,
          "y": 2460,
          "width": 480,
          "height": 180,
          "rotation": -22
        },
        {
          "x": 4200,
          "y": 2380,
          "width": 280,
          "height": 160,
          "rotation": -1
        }
      ],
      "door": {
        "x": 4220,
        "y": 2820
      },
      "rotation": 0,
      "labelOffset": [
        248,
        84
      ]
    },
    {
      "id": "camin-3",
      "label": "Caminul 3",
      "kind": "dorm",
      "parts": [
        {
          "x": 4940,
          "y": 2480,
          "width": 460,
          "height": 160,
          "rotation": -19
        },
        {
          "x": 5360,
          "y": 2400,
          "width": 280,
          "height": 160,
          "rotation": 0
        }
      ],
      "door": {
        "x": 5100,
        "y": 2640
      },
      "rotation": 0,
      "labelOffset": [
        226,
        79
      ]
    },
    {
      "id": "cantina",
      "label": "Cantina studențească",
      "kind": "canteen",
      "parts": [
        {
          "x": 6620,
          "y": 1840,
          "width": 680,
          "height": 660
        }
      ],
      "door": {
        "x": 7100,
        "y": 1980
      },
      "labelOffset": [
        7,
        434
      ]
    }
  ],
  "zones": [
    {
      "id": "cinema",
      "label": "Zona de proiecții",
      "kind": "cinema",
      "bounds": {
        "x": 2340,
        "y": 1520,
        "width": 440,
        "height": 340
      },
      "labelOffset": [
        7,
        305
      ]
    },
    {
      "id": "teren-fotbal",
      "label": "Teren sintetic de fotbal",
      "kind": "pitch",
      "bounds": {
        "x": 1780,
        "y": 2280,
        "width": 460,
        "height": 680
      },
      "labelOffset": [
        10,
        369
      ]
    },
    {
      "id": "sport-vest",
      "label": "Zonă de sport",
      "kind": "calisthenics",
      "bounds": {
        "x": 2360,
        "y": 2300,
        "width": 340,
        "height": 260
      },
      "labelOffset": [
        2,
        260
      ]
    },
    {
      "id": "sport-est",
      "label": "Zonă de sport",
      "kind": "calisthenics",
      "bounds": {
        "x": 5980,
        "y": 2020,
        "width": 280,
        "height": 380
      },
      "labelOffset": [
        0,
        377
      ]
    },
    {
      "id": "parcare",
      "label": "Parcare",
      "kind": "parking",
      "bounds": {
        "x": 6540,
        "y": 2600,
        "width": 860,
        "height": 300
      },
      "labelOffset": [
        -486,
        182
      ]
    }
  ],
  "forests": [
    {
      "id": "padure-nord",
      "label": "Pădurea de nord",
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 8580,
        "height": 960
      }
    },
    {
      "id": "padure-sud",
      "label": "Pădurea de sud",
      "bounds": {
        "x": 0,
        "y": 3060,
        "width": 8580,
        "height": 1000
      }
    },
    {
      "id": "padure-vest",
      "label": "Pădurea de vest",
      "bounds": {
        "x": 0,
        "y": 960,
        "width": 960,
        "height": 2100
      }
    },
    {
      "id": "padure-est",
      "label": "Pădurea de est",
      "bounds": {
        "x": 7620,
        "y": 960,
        "width": 960,
        "height": 2100
      }
    }
  ],
  "gates": [
    {
      "id": "vest",
      "label": "Intrarea Ceahlău",
      "x": 1540,
      "y": 2100,
      "main": true,
      "rotation": 90,
      "opening": 280
    },
    {
      "id": "sud",
      "label": "Intrarea Observatorului",
      "x": 6320,
      "y": 2996,
      "main": true,
      "rotation": 0,
      "opening": 280
    },
    {
      "id": "est",
      "label": "Intrarea de Est",
      "x": 7554,
      "y": 1620,
      "main": true,
      "rotation": 90,
      "opening": 280
    },
    {
      "id": "nord-1",
      "label": "Intrare secundară",
      "x": 3701,
      "y": 1209,
      "main": false,
      "rotation": 0,
      "opening": 190
    },
    {
      "id": "nord-2",
      "label": "Intrare secundară",
      "x": 4800,
      "y": 1173,
      "main": false,
      "rotation": 0,
      "opening": 190
    }
  ],
  "stands": [
    {
      "id": "educational",
      "label": "Educațional",
      "x": 4100,
      "y": 2020,
      "color": 6
    },
    {
      "id": "bal-bobocilor",
      "label": "Balul Bobocilor",
      "x": 2720,
      "y": 2020,
      "color": 0
    },
    {
      "id": "sport-sanatate",
      "label": "Sport și Sănătate",
      "x": 4920,
      "y": 2020,
      "color": 2
    },
    {
      "id": "infotech",
      "label": "Infotech",
      "x": 3760,
      "y": 2020,
      "color": 4
    },
    {
      "id": "it",
      "label": "IT",
      "x": 1260,
      "y": 2220,
      "color": 8
    },
    {
      "id": "polihack",
      "label": "Polihack",
      "x": 3000,
      "y": 2340,
      "color": 1
    },
    {
      "id": "viitor-inginer",
      "label": "Viitor Inginer",
      "x": 3520,
      "y": 2340,
      "color": 3
    },
    {
      "id": "divertisment",
      "label": "Divertisment",
      "x": 4020,
      "y": 2340,
      "color": 5
    },
    {
      "id": "imagine",
      "label": "Imagine",
      "x": 4640,
      "y": 2340,
      "color": 7
    },
    {
      "id": "media",
      "label": "Media",
      "x": 6280,
      "y": 2600,
      "color": 9
    },
    {
      "id": "pr",
      "label": "PR",
      "x": 4060,
      "y": 1680,
      "color": 10
    },
    {
      "id": "tehnic",
      "label": "Tehnic",
      "x": 2300,
      "y": 2340,
      "color": 11
    },
    {
      "id": "tineret",
      "label": "Tineret",
      "x": 5260,
      "y": 2340,
      "color": 12
    },
    {
      "id": "financiar",
      "label": "Financiar",
      "x": 6420,
      "y": 1940,
      "color": 13
    }
  ],
  "spawn": {
    "x": 1910,
    "y": 2140
  }
}
