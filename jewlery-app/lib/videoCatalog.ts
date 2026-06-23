import {
  formatBRL,
  getDisplayPrice,
  type Product,
  resolveImageUrl,
} from "@/app/kit/kitUtils";
import {
  catalogDurationInFrames,
  defaultCatalogProps,
  FRAMES_PER_PRODUCT,
  INTRO_FRAMES,
  OUTRO_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
  type ProductCatalogProps,
  type ProductSlide,
} from "../remotion/catalogShared";

export {
  catalogDurationInFrames,
  defaultCatalogProps,
  FRAMES_PER_PRODUCT,
  INTRO_FRAMES,
  OUTRO_FRAMES,
  VIDEO_FPS,
  VIDEO_HEIGHT,
  VIDEO_WIDTH,
};
export type { ProductCatalogProps, ProductSlide };

export function productToSlide(product: Product): ProductSlide {
  return {
    id: product.id,
    name: product.name,
    imageUrl: resolveImageUrl(product.image),
    price: formatBRL(getDisplayPrice(product)),
    category: product.category?.name ?? null,
  };
}

function isProductSlide(value: unknown): value is ProductSlide {
  if (!value || typeof value !== "object") return false;
  const slide = value as Record<string, unknown>;
  return (
    typeof slide.id === "number" &&
    typeof slide.name === "string" &&
    (slide.imageUrl === null || typeof slide.imageUrl === "string") &&
    typeof slide.price === "string" &&
    (slide.category === null || typeof slide.category === "string")
  );
}

export function parseProductCatalogProps(data: unknown): ProductCatalogProps {
  if (!data || typeof data !== "object") {
    throw new Error("Dados do vídeo inválidos");
  }

  const payload = data as Record<string, unknown>;
  const brandName =
    typeof payload.brandName === "string" ? payload.brandName.trim() : "";

  if (!brandName) {
    throw new Error("Informe o nome da marca");
  }

  if (!Array.isArray(payload.products) || payload.products.length === 0) {
    throw new Error("Selecione ao menos um produto");
  }

  if (payload.products.length > 30) {
    throw new Error("Máximo de 30 produtos por vídeo");
  }

  const products = payload.products.filter(isProductSlide);
  if (products.length !== payload.products.length) {
    throw new Error("Lista de produtos inválida");
  }

  return { brandName, products };
}
