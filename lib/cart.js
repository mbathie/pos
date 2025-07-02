export function calcCartTotals(products) {
  const totals = { subtotal: 0, tax: 0, total: 0 }
  for (const item of products) {
    if (item.amount) {
      totals.subtotal += item.amount.subtotal || 0
      totals.tax += item.amount.tax || 0
      totals.total += item.amount.total || 0
    }
  }
  return totals
}

// export function setCustomerStubs(cart) {

// }