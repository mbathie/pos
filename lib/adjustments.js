import { connectDB } from '@/lib/mongoose';
import { Discount, Customer } from '@/models';

/**
 * Main function to calculate adjustments (discounts and surcharges) for a cart
 * @param {Object} params
 * @param {Array} params.cart - Cart object with products
 * @param {Object} params.customer - Customer object (optional)
 * @param {String} params.discountCode - Discount code to apply (optional)
 * @param {String} params.discountId - Discount ID to apply directly (optional)
 * @param {String} params.orgId - Organization ID
 * @returns {Object} Updated cart with adjustments applied
 */
export async function calculateAdjustments({ cart, customer, discountCode, discountId, orgId }) {
  await connectDB();
  
  console.log(`📊 Starting adjustment calculation`, {
    hasCustomer: !!customer,
    customerId: customer?._id || 'none',
    discountCode,
    discountId,
    productCount: cart.products?.length,
    cartTotal: cart.total,
    cartProducts: cart.products?.map(p => ({
      id: p._id,
      name: p.name,
      category: p.category || 'none',
      type: p.type,
      price: p.amount?.subtotal || 0
    }))
  });
  
  // Clone the cart to avoid mutations
  const updatedCart = JSON.parse(JSON.stringify(cart));
  
  // Initialize adjustment tracking
  updatedCart.adjustments = {
    discounts: [],
    surcharges: [],
    totalDiscountAmount: 0,
    totalSurchargeAmount: 0
  };
  
  // Reset product-level adjustments
  updatedCart.products.forEach(product => {
    if (!product.amount) {
      product.amount = {
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }
    product.amount.discount = 0;
    product.amount.surcharge = 0;
    product.originalSubtotal = product.amount.subtotal || 0;
    product.adjustedSubtotal = product.amount.subtotal || 0;
  });
  
  // Get all active surcharges first (they apply before discounts)
  const surcharges = await getActiveSurcharges(orgId);
  console.log(`🔄 Found ${surcharges.length} active surcharge(s)`);
  
  // Apply surcharges to applicable products
  for (const surcharge of surcharges) {
    const surchargeResult = await applySurcharge(updatedCart, surcharge);
    if (surchargeResult.applied) {
      console.log(`✅ Applied surcharge "${surcharge.name}": +$${surchargeResult.totalAmount.toFixed(2)}`);
      updatedCart.adjustments.surcharges.push(surchargeResult);
    } else {
      console.log(`❌ Surcharge "${surcharge.name}" not applied - no applicable products`);
    }
  }
  
  // Get the discount to apply (either by code or ID)
  let discount = null;
  if (discountCode) {
    discount = await getDiscountByCode(discountCode, orgId);
    if (!discount) {
      console.log(`❌ Discount code "${discountCode}" not found or inactive`);
      updatedCart.adjustments.discountError = `Discount code "${discountCode}" is not valid or has expired`;
    }
  } else if (discountId) {
    discount = await getDiscountById(discountId, orgId);
    if (!discount) {
      console.log(`❌ Discount ID ${discountId} not found or inactive`);
      updatedCart.adjustments.discountError = 'Selected discount is not valid or has expired';
    }
  }
  
  if (discount) {
    console.log(`🎯 Found discount "${discount.name}"`, {
      id: discount._id,
      code: discount.code || 'no code',
      type: discount.type,
      value: `${discount.value}${discount.type === 'percent' ? '%' : '$'}`,
      mode: discount.mode || 'discount',
      maxAmount: discount.maxAmount || 'no limit',
      bogo: discount.bogo?.enabled ? {
        buyQty: discount.bogo.buyQty,
        getQty: discount.bogo.getQty,
        discountPercent: discount.bogo.discountPercent
      } : 'disabled',
      restrictions: {
        products: discount.products?.length > 0 ? 
          `${discount.products.length} specific product(s): [${discount.products.map(p => p.toString()).join(', ')}]` : 
          'no product restrictions',
        categories: discount.categories?.length > 0 ? 
          `${discount.categories.length} specific category(ies): [${discount.categories.map(c => c.toString()).join(', ')}]` : 
          'no category restrictions'
      },
      limits: discount.limits ? {
        usageLimit: discount.limits.usageLimit || 'unlimited',
        perCustomer: discount.limits.perCustomer ? {
          total: discount.limits.perCustomer.total || 'unlimited',
          frequency: discount.limits.perCustomer.frequency ? 
            `${discount.limits.perCustomer.frequency.count} per ${discount.limits.perCustomer.frequency.period}` : 
            'no frequency limit'
        } : 'no per-customer limits'
      } : 'no limits',
      dates: {
        start: discount.start ? new Date(discount.start).toISOString() : 'no start date',
        expiry: discount.expiry ? new Date(discount.expiry).toISOString() : 'no expiry'
      }
    });
  }
  
  // Apply discount if valid
  if (discount) {
    const validationResult = await validateDiscount(discount, customer, updatedCart);
    if (validationResult.isValid) {
      const discountResult = await applyDiscount(updatedCart, discount, customer);
      if (discountResult.applied) {
        console.log(`✅ Applied discount "${discount.name}": -$${discountResult.totalAmount.toFixed(2)} to ${discountResult.affectedProducts.length} product(s)`);
        updatedCart.adjustments.discounts.push(discountResult);
        updatedCart.discount = discount; // Keep for backward compatibility
        updatedCart.discountAmount = discountResult.totalAmount;
        
        // Record discount usage for customer if applicable
        if (customer && customer._id) {
          await recordDiscountUsage(customer._id, discount._id);
          console.log(`📝 Recorded discount usage for customer ${customer._id}`);
        }
      } else {
        console.log(`❌ Discount "${discount.name}" not applied - no applicable products in cart`);
        updatedCart.adjustments.discountError = `Discount "${discount.name}" doesn't apply to any products in your cart`;
      }
    } else {
      console.log(`❌ Discount "${discount.name}" validation failed: ${validationResult.error}`);
      updatedCart.adjustments.discountError = validationResult.error;
    }
  }
  
  // Recalculate cart totals
  updatedCart.subtotal = 0;
  updatedCart.tax = 0;
  updatedCart.total = 0;
  
  updatedCart.products.forEach(product => {
    // Apply adjustments to product
    let adjustedSubtotal = product.originalSubtotal || product.amount.subtotal || 0;
    
    // Add surcharges
    if (product.amount.surcharge > 0) {
      adjustedSubtotal += product.amount.surcharge;
    }
    
    // Subtract discounts
    if (product.amount.discount > 0) {
      adjustedSubtotal -= product.amount.discount;
      adjustedSubtotal = Math.max(0, adjustedSubtotal); // Ensure non-negative
    }
    
    product.adjustedSubtotal = adjustedSubtotal;
    
    // Recalculate tax on adjusted subtotal
    const taxRate = 0.10; // 10% tax rate - could be made configurable
    product.amount.tax = +(adjustedSubtotal * taxRate).toFixed(2);
    product.amount.total = +(adjustedSubtotal + product.amount.tax).toFixed(2);
    
    // Update cart totals
    updatedCart.subtotal += adjustedSubtotal;
    updatedCart.tax += product.amount.tax;
    updatedCart.total += product.amount.total;
  });
  
  // Round final totals
  updatedCart.subtotal = +updatedCart.subtotal.toFixed(2);
  updatedCart.tax = +updatedCart.tax.toFixed(2);
  updatedCart.total = +updatedCart.total.toFixed(2);
  
  // Calculate total adjustment amounts
  updatedCart.adjustments.totalDiscountAmount = updatedCart.adjustments.discounts
    .reduce((sum, d) => sum + d.totalAmount, 0);
  updatedCart.adjustments.totalSurchargeAmount = updatedCart.adjustments.surcharges
    .reduce((sum, s) => sum + s.totalAmount, 0);
  
  return updatedCart;
}

/**
 * Get active surcharges for an organization
 */
async function getActiveSurcharges(orgId) {
  const now = new Date();
  
  const surcharges = await Discount.find({
    org: orgId,
    mode: 'surcharge',
    archivedAt: { $exists: false },
    $and: [
      { $or: [{ start: { $lte: now } }, { start: { $exists: false } }, { start: null }] },
      { $or: [{ expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null }] }
    ]
  }).lean();
  
  return surcharges;
}

/**
 * Get discount by code
 */
async function getDiscountByCode(code, orgId) {
  const now = new Date();
  
  // First try to find the discount without restrictions to see why it might not be valid
  const discountAny = await Discount.findOne({ code: code }).lean();
  
  if (discountAny) {
    // Check why it might not be valid
    const issues = [];
    
    if (discountAny.org?.toString() !== orgId.toString()) {
      issues.push(`wrong org (discount org: ${discountAny.org}, expected: ${orgId})`);
    }
    if (discountAny.mode === 'surcharge') {
      issues.push('is a surcharge, not a discount');
    }
    if (discountAny.archivedAt) {
      issues.push(`archived on ${new Date(discountAny.archivedAt).toISOString()}`);
    }
    if (discountAny.start && new Date(discountAny.start) > now) {
      issues.push(`not yet started (starts: ${new Date(discountAny.start).toISOString()})`);
    }
    if (discountAny.expiry && new Date(discountAny.expiry) < now) {
      issues.push(`expired (expired: ${new Date(discountAny.expiry).toISOString()})`);
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Discount code "${code}" (${discountAny.name}) found but not valid:`, issues.join(', '));
    }
  } else {
    console.log(`⚠️ Discount code "${code}" not found in database`);
  }
  
  // Now do the actual query with all restrictions
  const discount = await Discount.findOne({
    org: orgId,
    code: code,
    mode: { $ne: 'surcharge' }, // Exclude surcharges
    $or: [
      { archivedAt: { $exists: false } },
      { archivedAt: null }
    ],
    $and: [
      { $or: [{ start: { $lte: now } }, { start: { $exists: false } }, { start: null }] },
      { $or: [{ expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null }] }
    ]
  }).lean();
  
  return discount;
}

/**
 * Get discount by ID
 */
async function getDiscountById(discountId, orgId) {
  const now = new Date();
  
  // First try to find the discount without restrictions to see why it might not be valid
  const discountAny = await Discount.findOne({ _id: discountId }).lean();
  
  if (discountAny) {
    // Check why it might not be valid
    const issues = [];
    
    if (discountAny.org?.toString() !== orgId.toString()) {
      issues.push(`wrong org (discount org: ${discountAny.org}, expected: ${orgId})`);
    }
    if (discountAny.mode === 'surcharge') {
      issues.push('is a surcharge, not a discount');
    }
    if (discountAny.archivedAt) {
      issues.push(`archived on ${new Date(discountAny.archivedAt).toISOString()}`);
    }
    if (discountAny.start && new Date(discountAny.start) > now) {
      issues.push(`not yet started (starts: ${new Date(discountAny.start).toISOString()})`);
    }
    if (discountAny.expiry && new Date(discountAny.expiry) < now) {
      issues.push(`expired (expired: ${new Date(discountAny.expiry).toISOString()})`);
    }
    
    if (issues.length > 0) {
      console.log(`⚠️ Discount "${discountAny.name}" (${discountId}) found but not valid:`, issues.join(', '));
    }
  } else {
    console.log(`⚠️ Discount ID ${discountId} not found in database`);
  }
  
  // Now do the actual query with all restrictions
  const discount = await Discount.findOne({
    _id: discountId,
    org: orgId,
    mode: { $ne: 'surcharge' }, // Exclude surcharges
    $or: [
      { archivedAt: { $exists: false } },
      { archivedAt: null }
    ],
    $and: [
      { $or: [{ start: { $lte: now } }, { start: { $exists: false } }, { start: null }] },
      { $or: [{ expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null }] }
    ]
  }).lean();
  
  return discount;
}

/**
 * Validate if a discount can be applied
 */
async function validateDiscount(discount, customer, cart) {
  const result = { isValid: true, error: null };
  
  console.log(`🔍 Validating discount "${discount.name}"...`);
  
  // Check if discount applies to any products in cart
  const applicableProducts = getApplicableProducts(cart.products, discount);
  console.log(`📦 Found ${applicableProducts.length} applicable product(s) out of ${cart.products.length} in cart`);
  
  if (applicableProducts.length === 0) {
    result.isValid = false;
    result.error = 'This discount does not apply to any products in your cart';
    console.log(`❌ No applicable products for discount "${discount.name}":`, {
      discountRestrictions: {
        hasProductRestrictions: discount.products?.length > 0,
        requiredProductIds: discount.products?.map(p => p.toString()) || [],
        hasCategoryRestrictions: discount.categories?.length > 0,
        requiredCategoryIds: discount.categories?.map(c => c.toString()) || []
      },
      cartProducts: cart.products?.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category || 'none'
      }))
    });
    return result;
  }
  
  // Check usage limits
  if (discount.limits) {
    // Check global usage limit
    if (discount.limits.usageLimit) {
      // This would require tracking total uses - simplified for now
      // In production, you'd track this in the discount document or a separate collection
    }
    
    // Check per-customer limits
    if (customer && discount.limits.perCustomer) {
      const customerUsage = await getCustomerDiscountUsage(customer._id, discount._id);
      
      // Check total lifetime limit
      if (discount.limits.perCustomer.total) {
        if (customerUsage.total >= discount.limits.perCustomer.total) {
          result.isValid = false;
          result.error = `You have already used this discount the maximum ${discount.limits.perCustomer.total} times`;
          return result;
        }
      }
      
      // Check frequency limit
      if (discount.limits.perCustomer.frequency) {
        const frequencyViolation = await checkFrequencyLimit(
          customer._id,
          discount._id,
          discount.limits.perCustomer.frequency
        );
        if (frequencyViolation) {
          console.log(`❌ Frequency limit violation: ${frequencyViolation}`);
          result.isValid = false;
          result.error = frequencyViolation;
          return result;
        }
      }
    }
  }
  
  console.log(`✅ Discount validation passed`);
  return result;
}

/**
 * Get products that a discount/surcharge applies to
 */
function getApplicableProducts(products, adjustment) {
  const hasProductRestrictions = adjustment.products && adjustment.products.length > 0;
  const hasCategoryRestrictions = adjustment.categories && adjustment.categories.length > 0;
  
  if (!hasProductRestrictions && !hasCategoryRestrictions) {
    console.log(`  → No restrictions - applies to all ${products.length} products`);
    return products;
  }
  
  const applicable = products.filter(product => {
    // Check if product ID is in the allowed list
    const productIdMatch = hasProductRestrictions && 
      adjustment.products.some(pid => pid.toString() === product._id?.toString());
    
    // Check if product category is in the allowed list
    const categoryMatch = hasCategoryRestrictions && 
      product.category && 
      adjustment.categories.some(cid => cid.toString() === product.category.toString());
    
    const isApplicable = productIdMatch || categoryMatch;
    
    if (!isApplicable && (hasProductRestrictions || hasCategoryRestrictions)) {
      console.log(`  → Product "${product.name}" (ID: ${product._id}, Category: ${product.category || 'none'}) - Not applicable`);
      if (hasProductRestrictions) {
        console.log(`    Required product IDs: [${adjustment.products.map(p => p.toString()).join(', ')}]`);
      }
      if (hasCategoryRestrictions) {
        console.log(`    Required category IDs: [${adjustment.categories.map(c => c.toString()).join(', ')}]`);
      }
    }
    
    return isApplicable;
  });
  
  console.log(`  → ${applicable.length} of ${products.length} products are applicable`);
  return applicable;
}

/**
 * Apply a surcharge to the cart
 */
async function applySurcharge(cart, surcharge) {
  const result = {
    applied: false,
    surchargeId: surcharge._id,
    name: surcharge.name,
    type: surcharge.type,
    value: surcharge.value,
    affectedProducts: [],
    totalAmount: 0
  };
  
  const applicableProducts = getApplicableProducts(cart.products, surcharge);
  if (applicableProducts.length === 0) {
    return result;
  }
  
  for (const product of applicableProducts) {
    let surchargeAmount = 0;
    
    if (surcharge.type === 'percent') {
      surchargeAmount = (product.originalSubtotal * surcharge.value) / 100;
    } else if (surcharge.type === 'amount') {
      // For fixed amount, divide evenly among applicable products
      surchargeAmount = surcharge.value / applicableProducts.length;
    }
    
    surchargeAmount = +surchargeAmount.toFixed(2);
    
    // Add to product's surcharge amount
    product.amount.surcharge = (product.amount.surcharge || 0) + surchargeAmount;
    
    result.affectedProducts.push({
      productId: product._id,
      productName: product.name,
      amount: surchargeAmount
    });
    
    result.totalAmount += surchargeAmount;
  }
  
  result.applied = result.totalAmount > 0;
  return result;
}

/**
 * Apply a discount to the cart
 */
async function applyDiscount(cart, discount, customer) {
  const result = {
    applied: false,
    discountId: discount._id,
    name: discount.name,
    type: discount.type,
    value: discount.value,
    affectedProducts: [],
    totalAmount: 0
  };
  
  const applicableProducts = getApplicableProducts(cart.products, discount);
  if (applicableProducts.length === 0) {
    return result;
  }
  
  // Handle BOGO (Buy One Get One) discounts
  if (discount.bogo && discount.bogo.enabled) {
    return applyBogoDiscount(cart, discount, applicableProducts);
  }
  
  // Handle regular discounts
  let remainingDiscountAmount = discount.type === 'amount' ? discount.value : Infinity;
  
  for (const product of applicableProducts) {
    if (remainingDiscountAmount <= 0) break;
    
    let discountAmount = 0;
    
    // Calculate base discount
    if (discount.type === 'percent') {
      // Apply percentage after surcharges
      const baseAmount = product.originalSubtotal + (product.amount.surcharge || 0);
      discountAmount = (baseAmount * discount.value) / 100;
    } else if (discount.type === 'amount') {
      // For fixed amount, distribute proportionally based on product value
      const totalApplicableValue = applicableProducts.reduce((sum, p) => 
        sum + p.originalSubtotal + (p.amount.surcharge || 0), 0);
      const productValue = product.originalSubtotal + (product.amount.surcharge || 0);
      const productShare = productValue / totalApplicableValue;
      discountAmount = Math.min(discount.value * productShare, productValue);
    }
    
    // Apply max amount cap if specified
    if (discount.maxAmount && discount.type === 'percent') {
      const totalDiscountSoFar = result.totalAmount;
      if (totalDiscountSoFar + discountAmount > discount.maxAmount) {
        discountAmount = Math.max(0, discount.maxAmount - totalDiscountSoFar);
      }
    }
    
    // For fixed amount discounts, ensure we don't exceed the total
    if (discount.type === 'amount') {
      discountAmount = Math.min(discountAmount, remainingDiscountAmount);
      remainingDiscountAmount -= discountAmount;
    }
    
    discountAmount = +discountAmount.toFixed(2);
    
    // Add to product's discount amount
    product.amount.discount = (product.amount.discount || 0) + discountAmount;
    
    result.affectedProducts.push({
      productId: product._id,
      productName: product.name,
      amount: discountAmount
    });
    
    result.totalAmount += discountAmount;
  }
  
  result.applied = result.totalAmount > 0;
  return result;
}

/**
 * Apply BOGO discount
 */
function applyBogoDiscount(cart, discount, applicableProducts) {
  const result = {
    applied: false,
    discountId: discount._id,
    name: discount.name,
    type: 'bogo',
    value: discount.bogo,
    affectedProducts: [],
    totalAmount: 0
  };
  
  const buyQty = discount.bogo.buyQty || 2;
  const getQty = discount.bogo.getQty || 1;
  const discountPercent = discount.bogo.discountPercent || 50;
  
  // Sort products by price (descending) to apply discount to cheaper items
  const sortedProducts = [...applicableProducts].sort((a, b) => 
    (b.originalSubtotal + (b.amount.surcharge || 0)) - 
    (a.originalSubtotal + (a.amount.surcharge || 0))
  );
  
  // Count total quantity
  const totalQty = sortedProducts.reduce((sum, p) => {
    // Get quantity from the product
    let qty = 1; // Default to 1 if no quantity specified
    if (p.qty) {
      qty = p.qty;
    } else if (p.prices) {
      // Sum quantities from all prices
      qty = p.prices.reduce((sum, price) => sum + (price.qty || 0), 0);
    }
    return sum + qty;
  }, 0);
  
  // Check if we have enough items for BOGO
  if (totalQty < buyQty) {
    return result;
  }
  
  // Apply BOGO once per transaction as per requirements
  let itemsProcessed = 0;
  let discountApplied = false;
  
  for (const product of sortedProducts) {
    if (discountApplied) break;
    
    let qty = 1;
    if (product.qty) {
      qty = product.qty;
    } else if (product.prices) {
      qty = product.prices.reduce((sum, price) => sum + (price.qty || 0), 0);
    }
    
    itemsProcessed += qty;
    
    // Apply discount to the qualifying item(s)
    if (itemsProcessed >= buyQty && !discountApplied) {
      const baseAmount = product.originalSubtotal + (product.amount.surcharge || 0);
      const discountAmount = (baseAmount * discountPercent) / 100;
      
      product.amount.discount = (product.amount.discount || 0) + discountAmount;
      
      result.affectedProducts.push({
        productId: product._id,
        productName: product.name,
        amount: discountAmount
      });
      
      result.totalAmount += discountAmount;
      discountApplied = true;
    }
  }
  
  result.applied = result.totalAmount > 0;
  return result;
}

/**
 * Get customer's usage of a specific discount
 */
async function getCustomerDiscountUsage(customerId, discountId) {
  const customer = await Customer.findById(customerId).lean();
  
  if (!customer || !customer.discounts) {
    return { total: 0, recent: [] };
  }
  
  const usage = customer.discounts.filter(d => 
    d.discount && d.discount.toString() === discountId.toString()
  );
  
  return {
    total: usage.length,
    recent: usage.slice(-10) // Last 10 uses
  };
}

/**
 * Check if frequency limit is violated
 */
async function checkFrequencyLimit(customerId, discountId, frequency) {
  const customer = await Customer.findById(customerId).lean();
  
  if (!customer || !customer.discounts) {
    return null;
  }
  
  const now = new Date();
  let periodStart;
  
  switch (frequency.period) {
    case 'day':
      periodStart = new Date(now);
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'week':
      periodStart = new Date(now);
      periodStart.setDate(now.getDate() - now.getDay());
      periodStart.setHours(0, 0, 0, 0);
      break;
    case 'month':
      periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'year':
      periodStart = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      return null;
  }
  
  const usageInPeriod = customer.discounts.filter(d => 
    d.discount && 
    d.discount.toString() === discountId.toString() &&
    new Date(d.createdAt) >= periodStart
  );
  
  if (usageInPeriod.length >= frequency.count) {
    return `You can only use this discount ${frequency.count} time${frequency.count > 1 ? 's' : ''} per ${frequency.period}`;
  }
  
  return null;
}

/**
 * Record discount usage for a customer
 */
async function recordDiscountUsage(customerId, discountId) {
  await Customer.findByIdAndUpdate(
    customerId,
    {
      $push: {
        discounts: {
          discount: discountId,
          createdAt: new Date()
        }
      }
    }
  );
}

/**
 * Calculate adjustments for a simple discount amount (for custom discounts)
 */
export function calculateCustomDiscount(cart, discountAmount) {
  const updatedCart = JSON.parse(JSON.stringify(cart));
  
  // Distribute the discount proportionally across all products
  const totalValue = updatedCart.products.reduce((sum, p) => 
    sum + (p.amount?.subtotal || 0), 0);
  
  if (totalValue === 0) return updatedCart;
  
  let remainingDiscount = discountAmount;
  
  updatedCart.products.forEach(product => {
    if (!product.amount) return;
    
    const productShare = product.amount.subtotal / totalValue;
    const productDiscount = Math.min(
      discountAmount * productShare,
      product.amount.subtotal
    );
    
    product.amount.discount = +productDiscount.toFixed(2);
    remainingDiscount -= product.amount.discount;
    
    // Recalculate product totals
    const discountedSubtotal = product.amount.subtotal - product.amount.discount;
    product.amount.tax = +(discountedSubtotal * 0.10).toFixed(2);
    product.amount.total = +(discountedSubtotal + product.amount.tax).toFixed(2);
  });
  
  // Recalculate cart totals
  updatedCart.subtotal = 0;
  updatedCart.tax = 0;
  updatedCart.total = 0;
  updatedCart.discountAmount = discountAmount;
  
  updatedCart.products.forEach(product => {
    if (product.amount) {
      updatedCart.subtotal += product.amount.subtotal - (product.amount.discount || 0);
      updatedCart.tax += product.amount.tax;
      updatedCart.total += product.amount.total;
    }
  });
  
  updatedCart.subtotal = +updatedCart.subtotal.toFixed(2);
  updatedCart.tax = +updatedCart.tax.toFixed(2);
  updatedCart.total = +updatedCart.total.toFixed(2);
  
  return updatedCart;
}