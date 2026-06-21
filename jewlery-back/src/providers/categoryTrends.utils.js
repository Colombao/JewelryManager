import { JEWELRY_TREND_KEYWORDS, normalizeText } from "./marketplace.matching.js";

const PIECE_RULES = [
  { pattern: /^(BR|BRINCO)[-\s]/i, label: "Brinco", termBase: "brinco" },
  { pattern: /^(PUL|PULSEIRA)[-\s]/i, label: "Pulseira", termBase: "pulseira feminina" },
  { pattern: /^(COL|CORRENTE|COLAR)[-\s]/i, label: "Colar", termBase: "colar feminino" },
  { pattern: /^(AN|ANEL)[-\s]/i, label: "Anel", termBase: "anel feminino" },
  { pattern: /^(TOR|TORNOZELEIRA)[-\s]/i, label: "Tornozeleira", termBase: "tornozeleira feminina" },
  { pattern: /^(BER|BERLOQUE)[-\s]/i, label: "Berloque", termBase: "berloque personalizado" },
  { pattern: /^(CJ|CONJUNTO|MIX)[-\s]/i, label: "Conjunto", termBase: "conjunto semi joias" },
  { pattern: /BRINCO/i, label: "Brinco", termBase: "brinco" },
  { pattern: /PULSEIRA/i, label: "Pulseira", termBase: "pulseira feminina" },
  { pattern: /COLAR|CORRENTE|PINGENTE/i, label: "Colar", termBase: "colar feminino" },
  { pattern: /ANEL/i, label: "Anel", termBase: "anel feminino" },
  { pattern: /TORNOZELEIRA/i, label: "Tornozeleira", termBase: "tornozeleira feminina" },
  { pattern: /BERLOQUE/i, label: "Berloque", termBase: "berloque personalizado" },
  { pattern: /CONJUNTO|MIX/i, label: "Conjunto", termBase: "conjunto semi joias" },
];

const MATERIAL_RULES = [
  { pattern: /dourado|ouro|gold|folheado/i, label: "Dourado", modifier: "dourado" },
  { pattern: /prata|rodio|rod[ií]o|925|silver/i, label: "Prata", modifier: "prata" },
  { pattern: /a[cç]o|inox|inoxid/i, label: "Aço", modifier: "aço inoxidável" },
];

export function parseCategoryMeta(categoryName) {
  const name = categoryName || "";
  const normalized = normalizeText(name);

  let tipoPeca = "Outros";
  let termBase = "semi joias";

  for (const rule of PIECE_RULES) {
    if (rule.pattern.test(name) || rule.pattern.test(normalized)) {
      tipoPeca = rule.label;
      termBase = rule.termBase;
      break;
    }
  }

  let material = "Geral";
  let materialModifier = "";

  for (const rule of MATERIAL_RULES) {
    if (rule.pattern.test(name) || rule.pattern.test(normalized)) {
      material = rule.label;
      materialModifier = rule.modifier;
      break;
    }
  }

  const searchTerm = materialModifier
    ? `${termBase} ${materialModifier}`.trim()
    : termBase;

  const searchKey = `${tipoPeca}|${material}`;

  return {
    tipoPeca,
    material,
    searchTerm,
    searchKey,
  };
}

export function getMarketplaceReference(tipoPeca) {
  const tipoNorm = normalizeText(tipoPeca);

  const matches = JEWELRY_TREND_KEYWORDS.filter((item) =>
    item.categories.some((cat) => {
      const catNorm = normalizeText(cat);
      return (
        catNorm.includes(tipoNorm) ||
        tipoNorm.includes(catNorm.split(" ")[0]) ||
        (tipoNorm === "brinco" && catNorm.includes("brinco")) ||
        (tipoNorm === "pulseira" && catNorm.includes("pulseira")) ||
        (tipoNorm === "colar" && (catNorm.includes("colar") || catNorm.includes("corrente"))) ||
        (tipoNorm === "anel" && catNorm.includes("anel")) ||
        (tipoNorm === "tornozeleira" && catNorm.includes("tornozeleira")) ||
        (tipoNorm === "berloque" && catNorm.includes("berloque")) ||
        (tipoNorm === "conjunto" && catNorm.includes("conjunto"))
      );
    })
  );

  if (matches.length === 0) {
    return { demandaReferencia: 0, termoReferencia: null };
  }

  const avgGrowth = Math.round(
    matches.reduce((sum, item) => sum + item.crescimento, 0) / matches.length
  );

  return {
    demandaReferencia: avgGrowth,
    termoReferencia: matches[0].term,
  };
}

export function getTrendStatus(value) {
  if (value >= 75) return "alta";
  if (value >= 50) return "media";
  if (value >= 25) return "baixa";
  return "morta";
}

export function getEffectiveDemand(google, marketplaceRef) {
  if (google?.googleDisponivel && google.value > 0) {
    return {
      score: google.value,
      fonte: "google",
      label: "Google Trends",
    };
  }

  if (marketplaceRef.demandaReferencia > 0) {
    return {
      score: marketplaceRef.demandaReferencia,
      fonte: "mercado",
      label: "Referência Mercado Livre",
    };
  }

  return {
    score: 0,
    fonte: "nenhuma",
    label: "Sem referência externa",
  };
}
