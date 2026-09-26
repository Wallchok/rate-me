import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col items-center justify-center gap-3 px-6 text-center">
      <p className="text-lg font-semibold">Nie ma takiej strony</p>
      <Link href="/" className="mt-2 flex h-12 w-full items-center justify-center rounded-lg bg-primary font-medium text-primary-foreground">
        Wróć na ekran główny
      </Link>
    </main>
  );
}
