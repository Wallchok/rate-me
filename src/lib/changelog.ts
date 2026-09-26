// What changed for the household, in plain words. Newest first.
// Only changes people notice; technical releases bump package.json but get no entry here.
export interface Release {
  version: string;
  date: string; // YYYY-MM-DD
  title: string;
  changes: string[];
}

export const RELEASES: Release[] = [
  {
    version: "0.9.0",
    date: "2026-09-26",
    title: "Gusty i podpowiedzi na liście",
    changes: [
      "Przy pozycji z listy wpisanej słowami, np. „jogurt”, widać Wasz najlepszy pasujący produkt",
      "Zmiany z drugiego telefonu pojawiają się same po kilkunastu sekundach",
      "Nowy ekran „Gusty” w zakładce Spróbuj: na ile się zgadzacie, w czym się różnicie, wspólni faworyci i odkrycia miesiąca",
    ],
  },
  {
    version: "0.8.0",
    date: "2026-09-26",
    title: "Gotowe do testów",
    changes: [
      "„Zgłoś problem albo pomysł” w Ustawieniach; błędy apki też zapisują się tam same",
      "Podpowiedź, jak dodać apkę do ekranu głównego iPhone'a albo Androida",
      "Jaśniejsze logowanie: skąd wziąć hasło domu, osobny komunikat przy braku internetu",
      "Zmiana hasła domu wylogowuje wszystkie telefony",
      "Większe przyciski i wyraźniejsze kolory",
    ],
  },
  {
    version: "0.7.0",
    date: "2026-09-26",
    title: "Wspólna lista zakupów",
    changes: [
      "Nowa zakładka „Lista”: każdy dopisuje, co kupić, i odhacza, co już kupione",
      "Widać, kto i kiedy kupił; odhaczanie działa też bez zasięgu w sklepie",
      "Przy wpisywaniu apka podpowiada Wasze najlepiej ocenione produkty",
      "Na stronie produktu przycisk „Dodaj do listy”",
      "Gdy kodu nie ma w bazie, apka i tak podpowie producenta",
      "Rozpoznawanie produktu ze zdjęcia opakowania: nazwa, marka i kategoria wpisują się same (włączasz je w Ustawieniach darmowym kluczem Gemini albo kluczem OpenAI)",
    ],
  },
  {
    version: "0.6.0",
    date: "2026-09-26",
    title: "Nowy ekran główny",
    changes: [
      "Filtry nad jedną listą: wybierz osobę i kategorię, np. Klaudia + Słone przekąski",
      "Cała lista od najlepszego, z podziałem na Najlepsze, Może być i Nie brać",
      "Apka pamięta ostatnio wybrane filtry",
    ],
  },
  {
    version: "0.5.0",
    date: "2026-09-26",
    title: "Co nowego",
    changes: [
      "Ta strona: lista zmian w każdej wersji, z datą",
      "Numer wersji w Ustawieniach",
      "Kropka przy Ustawieniach, gdy pojawi się coś nowego",
    ],
  },
  {
    version: "0.4.0",
    date: "2026-09-26",
    title: "Szybciej w sklepie i łatwiej dodawać",
    changes: [
      "Wyszukiwarka w „Dodaj”: wpisz np. „skyr” i dodaj produkt z bazy jednym kliknięciem",
      "Ocena zapisuje się od razu po stuknięciu cyfry, z „Cofnij”",
      "„Nie będę tego oceniać”: produkt przestaje czekać na Twoją ocenę",
      "Ranking: „Najlepsze” od 7 w górę, osobno „Może być” (5-6)",
      "Na ekranie głównym przy kategorii widać, czego nie brać",
      "Szukanie bez polskich znaków i po nazwie kategorii",
      "Przy słabym zasięgu apka otwiera się od razu, zdjęcia z bazy działają bez internetu",
      "Podgląd hasła przy logowaniu, trzy tryby motywu, wyraźniejsze kolory ocen",
    ],
  },
  {
    version: "0.3.1",
    date: "2026-09-26",
    title: "Zdjęcia i nowy adres",
    changes: ["Dodawanie własnych zdjęć działa", "Nowy adres: yummy-rate.vercel.app"],
  },
  {
    version: "0.3.0",
    date: "2026-09-26",
    title: "Wersja dla domu",
    changes: [
      "Logowanie hasłem domu i wybór osoby, każda osoba ocenia na swoim telefonie",
      "„Co kupić?”: w każdej kategorii to, co smakuje Wam najbardziej",
      "Przełącznik Razem / osoba, sekcja „Nie brać”",
      "Skanowanie kodu kreskowego, dane i zdjęcie z Open Food Facts",
      "„Spróbuj”: produkty, które czekają jeszcze na czyjąś ocenę",
      "Działa bez internetu na ostatnio pobranych danych",
    ],
  },
  {
    version: "0.2.0",
    date: "2026-04-07",
    title: "Apka na telefonie",
    changes: ["Można dodać RateMe do ekranu głównego telefonu"],
  },
  {
    version: "0.1.0",
    date: "2026-03-22",
    title: "Pierwsza wersja",
    changes: ["Produkty, oceny 1-10, sklepy, porównywanie produktów, eksport do Excela"],
  },
];

// Version of the running app, from package.json (set in next.config.ts at build time)
export const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? "dev";

// Newest release people should hear about; drives the "something new" dot
export const LATEST_NEWS = RELEASES[0].version;
