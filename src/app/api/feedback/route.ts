import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseId, readJson } from "@/lib/http";
import { getPersonId, unauthorized } from "@/lib/session";

const text = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

// Beta feedback and client error reports, readable in settings
export async function POST(request: NextRequest) {
  const personId = await getPersonId();
  if (!personId) return unauthorized("no_person");

  const body = await readJson(request);
  const message = text(body.message, 2000);
  if (!message) return NextResponse.json({ error: "Opisz problem" }, { status: 400 });

  // Error screens could loop; keep at most 50 automatic reports a day
  if (body.kind === "error") {
    const today = await prisma.feedback.count({
      where: { kind: "error", createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    if (today >= 50) return NextResponse.json({ ok: true });
  }

  await prisma.feedback.create({
    data: {
      kind: body.kind === "error" ? "error" : "report",
      message,
      personId,
      version: text(body.version, 20),
      page: text(body.page, 200),
      userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    },
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function GET() {
  if (!(await getPersonId())) return unauthorized("no_person");
  const items = await prisma.feedback.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json(items, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(request: NextRequest) {
  if (!(await getPersonId())) return unauthorized("no_person");
  const id = parseId(request.nextUrl.searchParams.get("id"));
  if (!id) return NextResponse.json({ error: "Nie znaleziono" }, { status: 404 });
  await prisma.feedback.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
