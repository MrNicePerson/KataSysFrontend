// Saved zero values start as placeholders; user-entered values stay strings.
export const initialDeliveryPrice = (value) => value == null || Number(value) === 0 ? '' : String(value)
export const deliveryPriceForSave = (value) => value === '' ? 0 : value
