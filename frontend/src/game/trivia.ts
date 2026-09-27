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

const PLACEHOLDER = (departament: string): TriviaQuestion => ({
  question: `TODO: întrebarea de la standul ${departament}.`,
  answers: [
    'TODO: răspunsul 1',
    'TODO: răspunsul 2',
    'TODO: răspunsul 3',
    'TODO: răspunsul 4',
  ],
  correct: 0,
  hint: `TODO: indiciul afișat după un răspuns greșit la ${departament}.`,
})

export const TRIVIA: Record<StandId, TriviaQuestion> = {
  'bal-bobocilor': PLACEHOLDER('Balul Bobocilor'),
  polihack: PLACEHOLDER('Polihack'),
  'sport-sanatate': PLACEHOLDER('Sport și Sănătate'),
  'viitor-inginer': PLACEHOLDER('Viitor Inginer'),
  infotech: PLACEHOLDER('Infotech'),
  divertisment: PLACEHOLDER('Divertisment'),
  imagine: PLACEHOLDER('Imagine'),
  it: PLACEHOLDER('IT'),
  media: PLACEHOLDER('Media'),
  pr: PLACEHOLDER('PR'),
  tehnic: PLACEHOLDER('Tehnic'),
  tineret: PLACEHOLDER('Tineret'),
  financiar: PLACEHOLDER('Financiar'),
}

export const COOLDOWN_MS = 10_000
