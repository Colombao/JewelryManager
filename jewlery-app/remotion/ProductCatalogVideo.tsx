import {
  AbsoluteFill,
  Img,
  interpolate,
  Sequence,
  useCurrentFrame,
} from "remotion";
import {
  FRAMES_PER_PRODUCT,
  INTRO_FRAMES,
  OUTRO_FRAMES,
  type ProductCatalogProps,
} from "./catalogShared";

export type { ProductCatalogProps };

function Intro({ brandName }: { brandName: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });
  const scale = interpolate(frame, [0, 25], [0.92, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        justifyContent: "center",
        alignItems: "center",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 16,
          background: "linear-gradient(135deg, #60a5fa, #2563eb)",
          marginBottom: 28,
        }}
      />
      <h1
        style={{
          color: "#f8fafc",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: -1,
          margin: 0,
        }}
      >
        {brandName}
      </h1>
      <p style={{ color: "#94a3b8", fontSize: 28, marginTop: 16 }}>
        Catálogo de semi joias
      </p>
    </AbsoluteFill>
  );
}

function ProductSlideView({
  product,
  brandName,
}: {
  product: ProductCatalogProps["products"][number];
  brandName: string;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 12, FRAMES_PER_PRODUCT - 12, FRAMES_PER_PRODUCT], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const imageY = interpolate(frame, [0, 18], [30, 0], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
        justifyContent: "center",
        alignItems: "center",
        padding: 48,
        opacity,
      }}
    >
      <p
        style={{
          position: "absolute",
          top: 56,
          color: "#64748b",
          fontSize: 22,
          letterSpacing: 4,
          textTransform: "uppercase",
        }}
      >
        {brandName}
      </p>

      <div
        style={{
          width: 520,
          height: 520,
          borderRadius: 24,
          backgroundColor: "#f8fafc",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden",
          transform: `translateY(${imageY}px)`,
          boxShadow: "0 24px 48px rgba(0,0,0,0.35)",
        }}
      >
        {product.imageUrl ? (
          <Img
            src={product.imageUrl}
            style={{ width: "100%", height: "100%", objectFit: "contain" }}
          />
        ) : (
          <span style={{ color: "#94a3b8", fontSize: 24 }}>Sem imagem</span>
        )}
      </div>

      {product.category && (
        <p
          style={{
            color: "#fbbf24",
            fontSize: 22,
            marginTop: 32,
            marginBottom: 0,
            letterSpacing: 2,
            textTransform: "uppercase",
          }}
        >
          {product.category}
        </p>
      )}

      <h2
        style={{
          color: "#f8fafc",
          fontSize: 42,
          fontWeight: 600,
          textAlign: "center",
          marginTop: product.category ? 12 : 32,
          marginBottom: 0,
          maxWidth: 900,
          lineHeight: 1.2,
        }}
      >
        {product.name}
      </h2>

      <p
        style={{
          color: "#34d399",
          fontSize: 48,
          fontWeight: 700,
          marginTop: 20,
        }}
      >
        {product.price}
      </p>
    </AbsoluteFill>
  );
}

function Outro({ brandName }: { brandName: string }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #0f172a, #1e3a5f)",
        justifyContent: "center",
        alignItems: "center",
        opacity,
      }}
    >
      <h2 style={{ color: "#f8fafc", fontSize: 44, margin: 0 }}>{brandName}</h2>
      <p style={{ color: "#94a3b8", fontSize: 28, marginTop: 20 }}>
        Entre em contato para pedidos
      </p>
    </AbsoluteFill>
  );
}

export const ProductCatalogVideo: React.FC<ProductCatalogProps> = ({
  brandName,
  products,
}) => {
  const productStart = INTRO_FRAMES;

  return (
    <AbsoluteFill style={{ backgroundColor: "#0f172a" }}>
      <Sequence durationInFrames={INTRO_FRAMES}>
        <Intro brandName={brandName} />
      </Sequence>

      {products.map((product, index) => (
        <Sequence
          key={product.id}
          from={productStart + index * FRAMES_PER_PRODUCT}
          durationInFrames={FRAMES_PER_PRODUCT}
        >
          <ProductSlideView product={product} brandName={brandName} />
        </Sequence>
      ))}

      <Sequence
        from={productStart + products.length * FRAMES_PER_PRODUCT}
        durationInFrames={OUTRO_FRAMES}
      >
        <Outro brandName={brandName} />
      </Sequence>
    </AbsoluteFill>
  );
};
