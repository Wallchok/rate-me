import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, personId, score, note } = body;

    if (!productId || !personId || score == null) {
      return NextResponse.json(
        { error: "productId, personId, and score are required" },
        { status: 400 },
      );
    }

    const scoreNum = Number(score);
    if (!Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 10) {
      return NextResponse.json({ error: "score must be an integer between 1 and 10" }, { status: 400 });
    }

    const rating = await prisma.rating.upsert({
      where: {
        productId_personId: {
          productId: Number(productId),
          personId: Number(personId),
        },
      },
      update: {
        score: scoreNum,
        note: note !== undefined ? note : undefined,
      },
      create: {
        productId: Number(productId),
        personId: Number(personId),
        score: scoreNum,
        note: note || null,
      },
      include: { product: true, person: true },
    });

    return NextResponse.json(rating, { status: 200 });
  } catch (error) {
    console.error("POST /api/ratings error:", error);
    return NextResponse.json({ error: "Failed to save rating" }, { status: 500 });
  }
}
