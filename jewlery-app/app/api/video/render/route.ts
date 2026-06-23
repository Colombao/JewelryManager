import { NextRequest, NextResponse } from "next/server";
import { apiUrl } from "@/lib/api";
import { renderCatalogVideo } from "@/lib/remotionRender";
import { parseProductCatalogProps } from "@/lib/videoCatalog";

export const runtime = "nodejs";
export const maxDuration = 300;

async function assertAuthorized(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return false;
  }

  const meResponse = await fetch(`${apiUrl}/me`, {
    headers: { Authorization: authorization },
    cache: "no-store",
  });

  return meResponse.ok;
}

export async function POST(request: NextRequest) {
  if (!(await assertAuthorized(request))) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  let inputProps;
  try {
    inputProps = parseProductCatalogProps(body);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Dados do vídeo inválidos";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const videoBuffer = await renderCatalogVideo(inputProps);
    const filename = `catalogo-${Date.now()}.mp4`;

    return new NextResponse(new Uint8Array(videoBuffer), {
      status: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(videoBuffer.byteLength),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Erro ao renderizar vídeo:", error);
    const message =
      error instanceof Error
        ? error.message
        : "Falha ao gerar o vídeo. Tente novamente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
