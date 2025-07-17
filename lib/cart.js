export function calcCartTotals(products, discount = null) {
  const totals = { subtotal: 0, tax: 0, total: 0, discountAmount: 0 }
  
  for (const item of products) {
    if (item.amount) {
      totals.subtotal += item.amount.subtotal || 0
      totals.tax += item.amount.tax || 0
      totals.total += item.amount.total || 0
    }
  }
  
  // Apply discount if provided
  if (discount) {
    if (discount.type === 'percent') {
      totals.discountAmount = (totals.subtotal * discount.value) / 100
    } else if (discount.type === 'amount') {
      totals.discountAmount = Math.min(discount.value, totals.subtotal)
    }
    
    // Recalculate total with discount
    const discountedSubtotal = totals.subtotal - totals.discountAmount
    totals.tax = +(discountedSubtotal * 0.10).toFixed(2) // Recalculate tax on discounted amount
    totals.total = +(discountedSubtotal + totals.tax).toFixed(2)
  }
  
  return totals
}

// export function setCustomerStubs(cart) {

// }