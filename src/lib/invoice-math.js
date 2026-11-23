/**
 * Invoice totals. Every amount is rounded to whole cents, so tax, discount and
 * shipping cannot drift by a cent between the preview and the PDF.
 */

export function roundMoney(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round((number + Number.EPSILON) * 100) / 100;
}

/** Negative quantities or rates are treated as zero rather than producing a refund. */
export function lineTotal(item) {
  const quantity = Math.max(0, Number(item?.quantity) || 0);
  const rate = Math.max(0, Number(item?.rate) || 0);
  return roundMoney(quantity * rate);
}

export function hasLineItems(state) {
  return Array.isArray(state?.items) && state.items.some((item) => lineTotal(item) > 0);
}

/** Rows worth printing: a description or a rate. A blank default row is skipped. */
export function billableItems(state) {
  const items = Array.isArray(state?.items) ? state.items : [];
  return items.filter(
    (item) => String(item?.description || '').trim() || Number(item?.rate) > 0,
  );
}

export function totalsOf(state) {
  const items = Array.isArray(state?.items) ? state.items : [];
  const subtotal = roundMoney(items.reduce((sum, item) => sum + lineTotal(item), 0));
  const discount = roundMoney(Math.min(Math.max(0, Number(state?.discount) || 0), subtotal));
  const taxable = roundMoney(Math.max(0, subtotal - discount));
  const taxRate = Math.max(0, Number(state?.taxRate) || 0);
  const tax = roundMoney(taxable * (taxRate / 100));
  const shipping = roundMoney(Math.max(0, Number(state?.shipping) || 0));
  return {
    subtotal,
    discount,
    taxable,
    tax,
    shipping,
    total: roundMoney(taxable + tax + shipping),
  };
}
