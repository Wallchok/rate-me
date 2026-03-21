# RateMe — Plan aplikacji

## Podsumowanie wymagań

| Aspekt | Decyzja |
|---|---|
| Technologia | Next.js + SQLite (Prisma) + Tailwind + shadcn/ui |
| Platforma | Mobile-first PWA, działa też na desktop |
| Auth | Brak — prosty kreator osób + dropdown "kto ocenia" |
| Produkt | Jeden wpis: nazwa, kategoria, sklep, zdjęcie, cena (opcja), makro (opcja) |
| Kategorie/Sklepy | Dynamiczne (user dodaje w locie) |
| Ocena | 1-10 slider + przyciski, opcjonalna notka |
| Zdjęcia | Upload + wyszukiwarka obrazów z sieci |
| AI ze zdjęcia | Later feature (v2) |
| Porównywarka | W ramach jednej kategorii |
| Eksport | CSV/Excel + JSON |
| Design | Dark/light toggle, minimalistyczny |

## Plan implementacji

### Faza 1 — Fundament
1. Inicjalizacja projektu — Next.js, Prisma + SQLite, Tailwind, shadcn/ui
2. Schema bazy danych:
   - `Person` (id, name)
   - `Category` (id, name)
   - `Store` (id, name)
   - `Product` (id, name, categoryId, storeId, imageUrl, price, calories, protein, carbs, fat)
   - `Rating` (id, productId, personId, score, note, createdAt)
3. Dark/light toggle + layout (mobile-first responsive)

### Faza 2 — CRUD produktów
4. Formularz dodawania produktu — z dynamicznym tworzeniem kategorii/sklepu
5. Lista produktów — z filtrami (kategoria, sklep) i sortowaniem (ocena, nazwa, cena)
6. Widok szczegółowy produktu

### Faza 3 — Ocenianie
7. Komponent oceny — slider 1-10 + przyciski + notka
8. Kreator osób + dropdown "kto ocenia"
9. Średnia ocen na karcie produktu (per osoba + globalna)

### Faza 4 — Widoki i nawigacja
10. Widok "Idę do sklepu X" — najlepsze produkty w danym sklepie
11. Widok "Szukam produktu X" — gdzie najlepsza wersja
12. Widok "Top rated" — filtr po kategorii + minimalnej ocenie

### Faza 5 — Porównywarka + eksport
13. Porównywarka — wybór 2-4 produktów z jednej kategorii, side-by-side
14. Eksport — CSV/Excel + JSON

### Faza 6 — Zdjęcia z sieci
15. Wyszukiwarka obrazów — integracja z API (np. Unsplash/Bing Images)

### Later (v2)
- AI rozpoznawanie produktu ze zdjęcia (Claude Vision)
- PWA install prompt + offline support
- Historia cen
- Statystyki i wykresy
