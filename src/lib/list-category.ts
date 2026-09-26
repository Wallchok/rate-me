import "server-only";
import { prisma } from "@/lib/prisma";
import { fold, hasWordStart } from "@/lib/text";
import { getAiKey } from "@/lib/secret-settings";
import { askAi, ProviderError } from "@/lib/ai";

const DAILY_LIMIT = 200;

// Category for a plain-text shopping item: first by names (free, instant), then by AI if a key is set.
// "masło orzechowe" has no word in common with "Na chleb", but AI knows it belongs next to "krem orzechowy".
export async function guessCategory(text: string): Promise<number | null> {
  const q = fold(text.trim());
  if (q.length < 3) return null;

  const [categories, products] = await Promise.all([
    prisma.category.findMany({ select: { id: true, name: true } }),
    prisma.product.findMany({ select: { name: true, brand: true, categoryId: true } }),
  ]);

  // Most common category among products whose name or brand contains the phrase
  const byName = (phrase: string) => {
    // Start of a word only: "ser" is not in "desery"
    const hit = categories.find((c) => hasWordStart(c.name, phrase));
    if (hit) return hit.id;
    const counts = new Map<number, number>();
    for (const p of products) {
      if (hasWordStart(p.name, phrase) || (p.brand && hasWordStart(p.brand, phrase))) {
        counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  };
  // Single words are a weak signal ("masło orzechowe" is not butter), so AI goes before them
  const byWords = () => {
    for (const w of q.split(/\s+/).filter((w) => w.length >= 3)) {
      const id = byName(w);
      if (id) return id;
    }
    return null;
  };

  const exact = byName(q);
  if (exact) return exact;

  // Same text added before (e.g. every week) and confirmed with "Wybieram": reuse that category instead
  // of asking AI again. Only confirmed ones, so a wrong guess is not repeated forever.
  const earlier = await prisma.shoppingItem.findFirst({
    where: { text: text.trim(), productId: { not: null }, categoryId: { not: null } },
    orderBy: { createdAt: "desc" },
    select: { categoryId: true },
  });
  if (earlier?.categoryId && categories.some((c) => c.id === earlier.categoryId)) return earlier.categoryId;

  const ai = await getAiKey();
  if (!ai || categories.length === 0) return byWords();

  const counterKey = `classify:${new Date().toISOString().slice(0, 10)}`;
  const usage = await prisma.usageCounter.upsert({
    where: { key: counterKey },
    update: { count: { increment: 1 } },
    create: { key: counterKey, count: 1 },
  });
  if (usage.count > DAILY_LIMIT) return byWords();

  // Examples of what each category holds help with "masło orzechowe" -> category of "krem orzechowy"
  const examples = categories
    .map((c) => {
      const names = products.filter((p) => p.categoryId === c.id).slice(0, 5).map((p) => p.name);
      return names.length ? `${c.name} (np. ${names.join(", ")})` : c.name;
    })
    .join("; ");
  const prompt = `Pozycja z listy zakupów: "${text.trim().slice(0, 120)}".
Do której kategorii produktów spożywczych należy? Wybierz wyłącznie z listy, a jeśli żadna nie pasuje, zwróć null.
Kategorie: ${examples}`;

  try {
    // Short limit: the phone's offline queue waits for this answer
    const answer = await askAi(ai, prompt, { category: { enum: categories.map((c) => c.name) } }, undefined, 5000);
    return categories.find((c) => c.name === answer.category)?.id ?? byWords();
  } catch (error) {
    console.error("Classify failed:", error instanceof ProviderError ? error.message : "network error");
    return byWords();
  }
}
