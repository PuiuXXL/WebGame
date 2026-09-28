import type { StandId } from './campus'

/**
 * Trivia content — un stand pentru fiecare departament OSUT.
 *
 * ACESTA ESTE SINGURUL FIȘIER pe care trebuie să îl editezi ca să pui
 * întrebările reale. Nu atinge nimic din restul jocului.
 *
 * Reguli:
 *  - `answers` trebuie să aibă exact 4 elemente; ordinea lor este ordinea în
 *    care apar pe ecran, numerotate 1-4.
 *  - `correct` este indexul răspunsului corect, de la 0 la 3 (deci răspunsul
 *    numărul 1 înseamnă correct: 0).
 *  - `hint` se arată abia după primul răspuns greșit.
 *
 * Pe controller: SUS = 1, DREAPTA = 2, JOS = 3, STÂNGA = 4.
 */

export type TriviaQuestion = {
  question: string
  answers: [string, string, string, string]
  correct: 0 | 1 | 2 | 3
  hint: string
}

export const TRIVIA: Record<StandId, TriviaQuestion> = {
  // Balul Bobocilor
  'bal-bobocilor': {
    question: "Care este evenimentul care integrează bobocii în universitate?",
    answers: [
      "Viitor Inginer",
      "InfoTech",
      "PoliHack",
      "Balul Bobocilor",
    ],
    correct: 3,
    hint: 'Indiciu',
  },

  // Polihack
  polihack: {
    question: "Cum se numește competiția de 48 de ore de codat din cadrul OSUT Cluj?",
    answers: [
      "CodeContest",
      "HackCode",
      "PoliHack",
      "PoliCode",
    ],
    correct: 2,
    hint: 'Indiciu',
  },

  // Sport și Sănătate
  'sport-sanatate': {
    question: "Cine a castigat cupa Romaniei?",
    answers: [
      "Corvinul",
      "FC Cojasca",
      "Craiova",
      "CNS Cetate Deva",
    ],
    correct: 2,
    hint: 'Indiciu',
  },

  // Viitor Inginer
  'viitor-inginer': {
    question: "În câte județe prezintă Viitor Inginer?",
    answers: [
      "20",
      "23",
      "19",
      "14",
    ],
    correct: 3,
    hint: 'Indiciu',
  },

  // Infotech
  infotech: {
    question: "Cum se numește primul eveniment organizat de InfoTech în acest semestru ?",
    answers: [
      "InfoWeek",
      "ContestNight",
      "Training: How to start a startup?",
      "InfoNight",
    ],
    correct: 3,
    hint: 'Indiciu',
  },

  // Divertisment
  divertisment: {
    question: "Pe ce dată se organizează PPP?",
    answers: [
      "3 octombrie",
      "1 octombrie",
      "31 septembrie",
      "30 septembrie",
    ],
    correct: 3,
    hint: 'Indiciu',
  },

  // Imagine
  imagine: {
    question: "Ce format trebuie să fie un design graphic pentru a putea fi mărit fără să-și piardă din calitate?",
    answers: [
      "Vectorial",
      "Screenshot",
      "PSD",
      "Raster",
    ],
    correct: 0,
    hint: 'Indiciu',
  },

  // IT
  it: {
    question: "Cand a aparut prima data AI-ul?",
    answers: [
      "Mihai Eminescu",
      "67",
      "1956",
      "Claude",
    ],
    correct: 2,
    hint: 'Indiciu',
  },

  // Media
  media: {
    question: "Din ce e făcut semnul media?",
    answers: [
      "Lemn",
      "Mâini",
      "Lentile",
      "Lame",
    ],
    correct: 1,
    hint: 'Indiciu',
  },

  // PR
  pr: {
    question: "Ce reprezinta logoul OSUT Cluj?",
    answers: [
      "Cometa",
      "O minge",
      "Ou tati",
      "Un leu",
    ],
    correct: 0,
    hint: 'Indiciu',
  },

  // Tehnic
  tehnic: {
    question: "Care este vorba departamentului?",
    answers: [
      "Mai bine muncesc decât să cerșesc!",
      "DAAAAANNIIIIIIIIIIII",
      "Tehniku nu doarme!",
      "Unde poți pune sârmă e păcat să pui șurub!",
    ],
    correct: 3,
    hint: 'Indiciu',
  },

  // Tineret
  tineret: {
    question: "Ce a organizat tineretul?",
    answers: [
      "Untold",
      "ZUT",
      "Bech Please",
      "Tumorou Land",
    ],
    correct: 1,
    hint: 'Indiciu',
  },

  // Financiar
  financiar: {
    question: "Cat costa o tigaie Tefal in magazinele din Giurgiu?",
    answers: [
      "Horia Brenciu",
      "42.67 lei",
      "8500 forintz",
      "40 lei",
    ],
    correct: 3,
    hint: 'Indiciu',
  },
  // Educațional
  educational: {
    question: "Care este Biblia UTCN",
    answers: [
      "Regulamentul de Burse",
      "CARTA",
      "CDOS",
      "ECTS",
    ],
    correct: 1,
    hint: 'Indiciu',
  },
}

export const COOLDOWN_MS = 10_000
