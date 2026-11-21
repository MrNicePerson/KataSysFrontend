export const normalizeProductSearch = (value) => String(value ?? '').trim().toLowerCase().replace(/[_\s-]+/g, ' ')
const searchValues = (product) => [
  ...['articleName', 'articleNumber', 'article', 'code', 'name', 'productName', 'brandName', 'tanType', 'metersPerTan'].map((key) => normalizeProductSearch(product[key])),
  product.productType === 'tan' || product.tanType || Number(product.metersPerTan) > 0 ? 'tan' : '',
].filter(Boolean)
export const matchesProductSearch = (product, query) => searchValues(product).some((value) => value.includes(normalizeProductSearch(query)))
export const exactProductMatch = (product, query) => searchValues(product).some((value) => value === normalizeProductSearch(query))
