export const normalizeProductSearch = (value) => String(value ?? '').trim().toLowerCase().replace(/[_\s-]+/g, ' ')
const searchValues = (product) => ['articleName', 'articleNumber', 'article', 'code', 'name', 'productName', 'brandName'].map((key) => normalizeProductSearch(product[key])).filter(Boolean)
export const matchesProductSearch = (product, query) => searchValues(product).some((value) => value.includes(normalizeProductSearch(query)))
export const exactProductMatch = (product, query) => searchValues(product).some((value) => value === normalizeProductSearch(query))
