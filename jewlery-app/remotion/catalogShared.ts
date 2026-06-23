export const VIDEO_FPS = 30;
export const VIDEO_WIDTH = 1080;
export const VIDEO_HEIGHT = 1920;
export const FRAMES_PER_PRODUCT = 90;
export const INTRO_FRAMES = 60;
export const OUTRO_FRAMES = 60;

export type ProductSlide = {
  id: number;
  name: string;
  imageUrl: string | null;
  price: string;
  category: string | null;
};

export type ProductCatalogProps = {
  brandName: string;
  products: ProductSlide[];
};

export function catalogDurationInFrames(productCount: number) {
  if (productCount <= 0) return INTRO_FRAMES + OUTRO_FRAMES;
  return INTRO_FRAMES + productCount * FRAMES_PER_PRODUCT + OUTRO_FRAMES;
}

export const defaultCatalogProps: ProductCatalogProps = {
  brandName: "Jewlery",
  products: [
    {
      id: 0,
      name: "Semi joia exemplo",
      imageUrl: null,
      price: "R$ 89,90",
      category: "Anéis",
    },
  ],
};
