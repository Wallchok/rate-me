import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export async function GET(request: NextRequest) {
  try {
    const format = request.nextUrl.searchParams.get("format") || "json";

    if (!["csv", "json", "excel"].includes(format)) {
      return NextResponse.json(
        { error: "format must be csv, json, or excel" },
        { status: 400 },
      );
    }

    const products = await prisma.product.findMany({
      include: { category: true, store: true, ratings: { include: { person: true } } },
      orderBy: { createdAt: "desc" },
    });

    const rows = products.map((p) => {
      const scores = p.ratings.map((r) => r.score);
      const avgRating = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : null;

      return {
        id: p.id,
        name: p.name,
        category: p.category.name,
        store: p.store?.name ?? "",
        price: p.price,
        calories: p.calories,
        protein: p.protein,
        carbs: p.carbs,
        fat: p.fat,
        avgRating: avgRating != null ? Math.round(avgRating * 100) / 100 : null,
        ratingsCount: scores.length,
      };
    });

    if (format === "json") {
      return NextResponse.json(rows);
    }

    if (format === "csv") {
      const worksheet = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(worksheet);

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": 'attachment; filename="products.csv"',
        },
      });
    }

    // excel
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": 'attachment; filename="products.xlsx"',
      },
    });
  } catch (error) {
    console.error("GET /api/export error:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
