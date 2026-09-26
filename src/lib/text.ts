// Lowercase without Polish diacritics, so "zelki" matches "Żelki" and "piatnica" matches "Piątnica"
export function fold(text: string) {
  return text.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/ł/g, "l");
}

// Needle at the start of a word: "ser" matches "Sery" and "Serek", not "Jogurty i desery"
export function hasWordStart(haystack: string, needle: string) {
  if (!needle) return false;
  const escaped = needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}`, "u").test(fold(haystack));
}
