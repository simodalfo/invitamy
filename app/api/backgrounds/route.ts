import { put } from "@vercel/blob";
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { isAuthenticated } from "@/lib/auth";
import { isSameOrigin } from "@/lib/request-security";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 4_000_000;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Richiesta non valida. Ricarica la pagina e riprova." }, { status: 403 });
  }

  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "La sessione è scaduta. Accedi di nuovo." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "L’archivio fotografico non è configurato." }, { status: 503 });
  }

  try {
    const form = await request.formData();
    const file = form.get("file");

    if (!(file instanceof File) || !allowedTypes.has(file.type) || file.size === 0) {
      return NextResponse.json({ error: "Scegli una foto JPG, PNG o WebP." }, { status: 400 });
    }

    if (file.size > maxBytes) {
      return NextResponse.json({ error: "La foto è ancora troppo grande. Provane un’altra." }, { status: 413 });
    }

    const extension = file.type === "image/png" ? "png" : file.type === "image/jpeg" ? "jpg" : "webp";
    const blob = await put(`invitamy/${randomUUID()}.${extension}`, file, {
      access: "private",
      addRandomSuffix: true,
      cacheControlMaxAge: 31_536_000,
    });

    return NextResponse.json({ pathname: blob.pathname });
  } catch {
    return NextResponse.json({ error: "Non siamo riusciti a salvare la foto. Riprova." }, { status: 500 });
  }
}
