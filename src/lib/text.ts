// Lowercase without Polish diacritics, so "zelki" matches "Żelki" and "piatnica" matches "Piątnica"
export function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");
}
