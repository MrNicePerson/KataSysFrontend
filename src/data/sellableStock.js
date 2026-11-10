// Defective and quarantined units are stored separately from stockQuantity.
export const availableSellableQuantity = (product) => Math.max(0, Number(product.stockQuantity || 0) - Number(product.reservedQuantity || 0))

export const sellableProducts = (products) => products.filter((product) => product.active !== false && availableSellableQuantity(product) > 0)
