export function ensureCardIds(cards) {
  return cards.map((c, i) =>
    c.id ? c : { ...c, id: `gen-${i}-${(c.front || "").slice(0, 20).replace(/\W/g, "")}` }
  );
}
