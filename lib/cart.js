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
  // Only apply to discount mode; surcharges not supported in cart yet
  if (discount.mode && discount.mode !== 'discount') return 0
  
  // Check if this product is eligible for the discount
  // First check if discount has any restrictions
  const hasProductRestrictions = discount.products && discount.products.length > 0
  const hasCategoryRestrictions = discount.categories && discount.categories.length > 0
  
  // If no restrictions at all, discount applies to all products
  if (!hasProductRestrictions && !hasCategoryRestrictions) {
    // No restrictions, eligible
  } else {
    // Check product restrictions
    const isInProductList = hasProductRestrictions && discount.products.includes(product._id)
    // Check category restrictions
    const isInCategoryList = hasCategoryRestrictions && product.category && discount.categories.includes(product.category)
    
    // Product is eligible if it's in either the product list or category list
    const isEligible = isInProductList || isInCategoryList
    if (!isEligible) return 0
  }
  
  // Calculate discount amount for this specific product
  let discountAmount = 0
  if (discount.type === 'percent') {
    discountAmount = (product.amount.subtotal * discount.value) / 100
  } else if (discount.type === 'amount') {
    // For fixed amount discounts, we need to distribute it across eligible products
    // This is a simplified approach - you might want more sophisticated distribution
    discountAmount = Math.min(discount.value, product.amount.subtotal)
  }
  // Cap by maxAmount if provided
  if (typeof discount.maxAmount === 'number') {
    discountAmount = Math.min(discountAmount, discount.maxAmount)
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
