async function ensureKitUnits(tx, kitId) {
  const items = await tx.kitItem.findMany({
    where: { kitId },
    include: {
      units: {
        select: { id: true, unitIndex: true },
        orderBy: { unitIndex: "asc" },
      },
    },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });

  for (const item of items) {
    const needed = Math.max(1, item.quantity);
    const existingIndexes = new Set(item.units.map((unit) => unit.unitIndex));

    for (let index = 1; index <= needed; index += 1) {
      if (existingIndexes.has(index)) continue;

      await tx.kitItemUnit.create({
        data: {
          kitItemId: item.id,
          unitIndex: index,
          unitPrice: item.unitPrice,
        },
      });
    }
  }
}

function flattenKitUnits(items) {
  const units = [];

  for (const item of items) {
    const sortedUnits = [...(item.units ?? [])].sort(
      (a, b) => a.unitIndex - b.unitIndex
    );

    for (const unit of sortedUnits) {
      units.push({
        id: unit.id,
        kitItemId: item.id,
        unitIndex: unit.unitIndex,
        pieceLabel:
          item.quantity > 1
            ? `Peça ${unit.unitIndex} de ${item.quantity}`
            : null,
        reference: item.reference,
        description: item.description,
        category: item.category,
        unitPrice: unit.unitPrice,
        soldByOwner: unit.soldByOwner,
        soldByReseller: unit.soldByReseller,
        missingOrLost: unit.missingOrLost,
        product: item.product ?? null,
      });
    }
  }

  return units;
}

function buildCardDescriptionFromKit(kit) {
  const totalQty = kit.totalQty ?? 0;
  const grandTotal = Number(kit.grandTotal ?? 0);

  return `${totalQty} peças · Total ${grandTotal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  })}`;
}

export { buildCardDescriptionFromKit, ensureKitUnits, flattenKitUnits };
