import { get } from "@vercel/blob";
import { NextResponse } from "next/server";
import { getInvite } from "@/lib/invites";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const invite = await getInvite(token);

  if (!invite?.backgroundPath || !process.env.BLOB_READ_WRITE_TOKEN) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const result = await get(invite.backgroundPath, {
      access: "private",
      ifNoneMatch: request.headers.get("if-none-match") ?? undefined,
    });

    if (!result) return new NextResponse("Not found", { status: 404 });

    if (result.statusCode === 304) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: result.blob.etag,
          "Cache-Control": "private, no-cache",
        },
      });
    }

    return new NextResponse(result.stream, {
      headers: {
        "Content-Type": result.blob.contentType ?? "application/octet-stream",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
        ETag: result.blob.etag,
        "Cache-Control": "private, no-cache",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
