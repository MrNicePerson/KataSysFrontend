export function prepareSaleDraft(draft) {
  return {
    ...draft,
    items: (draft?.items || []).map((item, index) => ({
      ...item,
      id: item.id || item.lineId || `draft-item-${index + 1}`,
    })),
  }
}
