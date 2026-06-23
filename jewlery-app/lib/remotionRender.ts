import { mkdir, readFile, unlink } from "fs/promises";
import os from "os";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import type { ProductCatalogProps } from "./videoCatalog";

let cachedBundleLocation: string | null = null;

async function getBundleLocation() {
  if (cachedBundleLocation) {
    return cachedBundleLocation;
  }

  const entryPoint = path.join(process.cwd(), "remotion", "index.ts");
  cachedBundleLocation = await bundle({ entryPoint });
  return cachedBundleLocation;
}

export async function renderCatalogVideo(
  inputProps: ProductCatalogProps
): Promise<Buffer> {
  const serveUrl = await getBundleLocation();

  const composition = await selectComposition({
    serveUrl,
    id: "ProductCatalog",
    inputProps,
  });

  const tmpDir = path.join(os.tmpdir(), "jewlery-remotion");
  await mkdir(tmpDir, { recursive: true });
  const outputLocation = path.join(tmpDir, `catalogo-${Date.now()}.mp4`);

  try {
    await renderMedia({
      composition,
      serveUrl,
      codec: "h264",
      outputLocation,
      inputProps,
      chromiumOptions: {
        disableWebSecurity: true,
      },
    });

    return await readFile(outputLocation);
  } finally {
    await unlink(outputLocation).catch(() => undefined);
  }
}

export function invalidateRemotionBundleCache() {
  cachedBundleLocation = null;
}
