import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getPersonId, unauthorized } from "@/lib/session";

// Spreadsheet apps run cells starting with = + - @ as formulas; a leading apostrophe keeps them as text
function safeCell(value: string | null) {
  return value && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}

export async function GET(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");

  const format = request.nextUrl.searchParams.get("format") || "json";
  if (!["csv", "json", "excel"].includes(format)) {
    return NextResponse.json({ error: "format: csv, json albo excel" }, { status: 400 });
  }

  const [persons, products] = await Promise.all([
    prisma.person.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.product.findMany({ include: { category: true, ratings: true }, orderBy: { name: "asc" } }),
  ]);

  // One column per person, so the sheet shows who rated what
  const rows = products.map((p) => {
    const row: Record<string, string | number | null> = {
      nazwa: p.name,
      marka: p.brand,
      kategoria: p.category.name,
      ean: p.ean,
      nutriscore: p.nutriScore?.toUpperCase() ?? null,
      kcal: p.calories,
      "białko (g)": p.protein,
      "węglowodany (g)": p.carbs,
      "cukry (g)": p.sugar,
      "tłuszcz (g)": p.fat,
    };
    for (const person of persons) {
      const r = p.ratings.find((rating) => rating.personId === person.id);
      // Prefixed, so a person called "nazwa" cannot overwrite the product name column
      row[`ocena: ${person.name}`] = r?.score ?? null;
      row[`notatka: ${person.name}`] = r?.note ?? null;
    }
    return row;
  });

  if (format === "json") return NextResponse.json(rows);

  // Escaping only for spreadsheets, JSON keeps the stored values as they are
  const sheetRows = rows.map((row) =>
    Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "string" ? safeCell(v) : v])),
  );
  const sheet = XLSX.utils.json_to_sheet(sheetRows);
  if (format === "csv") {
    // BOM so Excel on Windows reads Polish characters correctly
    return new NextResponse("\uFEFF" + XLSX.utils.sheet_to_csv(sheet), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="rateme.csv"',
      },
    });
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Produkty");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="rateme.xlsx"',
    },
  });
}
