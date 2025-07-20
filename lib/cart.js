export function calcCartTotals(products, discount = null) {
  const totals = { subtotal: 0, tax: 0, total: 0, discountAmount: 0 }
  
  for (const item of products) {
    if (item.amount) {
      totals.subtotal += item.amount.subtotal || 0
      totals.tax += item.amount.tax || 0
      totals.total += item.amount.total || 0
      // Sum up individual product discounts
      totals.discountAmount += item.amount.discount || 0
    }
  }
  
  return totals
}

export function calcProductDiscount(product, discount) {
  if (!discount || !product.amount) return 0
  
  // Check if this product is eligible for the discount
  const isEligible = discount.products && discount.products.includes(product._id)
  if (!isEligible) return 0
  
  // Calculate discount amount for this specific product
  let discountAmount = 0
  if (discount.type === 'percent') {
    discountAmount = (product.amount.subtotal * discount.value) / 100
  } else if (discount.type === 'amount') {
    // For fixed amount discounts, we need to distribute it across eligible products
    // This is a simplified approach - you might want more sophisticated distribution
    discountAmount = Math.min(discount.value, product.amount.subtotal)
  }
  
  return +discountAmount.toFixed(2)
}

export function applyDiscountToProduct(product, discount) {
  if (!product.amount) return product
  
  const discountAmount = calcProductDiscount(product, discount)
  
  // Update product amount with discount
  const discountedSubtotal = product.amount.subtotal - discountAmount
  const newTax = +(discountedSubtotal * 0.10).toFixed(2)
  const newTotal = +(discountedSubtotal + newTax).toFixed(2)
  
  return {
    ...product,
    amount: {
      ...product.amount,
      discount: discountAmount,
      tax: newTax,
      total: newTotal
    }
  }
}

// export function setCustomerStubs(cart) {

// }