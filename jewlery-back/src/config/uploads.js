import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const defaultUploadRoot = path.join(__dirname, "../../uploads");

export const uploadRoot = path.resolve(
  process.env.UPLOAD_ROOT || defaultUploadRoot
);

export const productsUploadDir = path.join(uploadRoot, "products");

export function ensureUploadDirectories() {
  fs.mkdirSync(productsUploadDir, { recursive: true });
}

export function getProductImagePublicPath(filename) {
  return `/uploads/products/${filename}`;
}
