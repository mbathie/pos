import { connectDB } from '@/lib/mongoose';
import { Discount, Customer, Membership, Product } from '@/models';

/**
 * Main function to calculate adjustments (discounts and surcharges) for a cart
 * @param {Object} params
 * @param {Array} params.cart - Cart object with products
 * @param {Object} params.customer - Customer object (optional)
 * @param {String} params.discountCode - Discount code to apply (optional)
 * @param {String} params.discountId - Discount ID to apply directly (optional)
 * @param {String} params.orgId - Organization ID
 * @param {Boolean} params.isManualSelection - True if discount was manually selected from dropdown (optional)
 * @returns {Object} Updated cart with adjustments applied
 */
export async function calculateAdjustments({ cart, customer, discountCode, discountId, orgId, isManualSelection = false }) {
  await connectDB();
  
  console.log(`📊 Starting adjustment calculation`, {
    hasCustomer: !!customer,
    customerId: customer?._id || 'none',
    discountCode,
    discountId,
    isManualSelection,
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
  
  // Initialize adjustment tracking with unified structure
  updatedCart.adjustments = {
    discounts: {
      items: [],
      total: 0
    },
    surcharges: {
      items: [],
      total: 0
    }
  };
  
  // Reset product-level adjustments with unified structure
  updatedCart.products.forEach(product => {
    if (!product.amount) {
      product.amount = {
        subtotal: 0,
        tax: 0,
        total: 0
      };
    }
    // Initialize product adjustments with same structure as cart
    product.adjustments = {
      discounts: {
        items: [],
        total: 0
      },
      surcharges: {
        items: [],
        total: 0
      }
    };
    // Store the original subtotal (before any adjustments or tax)
    product.originalSubtotal = product.amount.subtotal || 0;
    product.adjustedSubtotal = product.amount.subtotal || 0;
  });
  
  // Get all active surcharges first (they apply before discounts)
  const surcharges = await getActiveSurcharges(orgId);
  console.log(`🔄 Found ${surcharges.length} active surcharge(s) - all surcharges auto-apply`);
  
  // Apply surcharges to applicable products (surcharges always auto-apply)
  for (const surcharge of surcharges) {
    // Check day of week restriction for surcharges
    if (surcharge.daysOfWeek) {
      const today = new Date();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayName = dayNames[today.getDay()];
      
      if (!surcharge.daysOfWeek[todayName]) {
        console.log(`⏰ Surcharge "${surcharge.name}" not applied - not valid on ${todayName}`);
        continue;
      }
      console.log(`📅 Surcharge "${surcharge.name}" is valid on ${todayName}`);
    }
    
    const surchargeResult = await applySurcharge(updatedCart, surcharge);
    if (surchargeResult.applied) {
      console.log(`✅ Applied surcharge "${surcharge.name}": +$${surchargeResult.totalAmount.toFixed(2)}`);
      // Add to cart-level adjustments using new structure
      updatedCart.adjustments.surcharges.items.push({
        id: surcharge._id,
        name: surcharge.name,
        amount: surchargeResult.totalAmount,
        value: surchargeResult.value,
        type: surchargeResult.type
      });
      updatedCart.adjustments.surcharges.total += surchargeResult.totalAmount;
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
      autoAssign: discount.autoAssign !== undefined ? discount.autoAssign : 'not set',
      id: discount._id,
      code: discount.code || 'no code',
      mode: discount.mode || 'discount',
      musts: discount.musts ? {
        products: discount.musts.products?.length > 0 ? 
          `${discount.musts.products.length} product(s): [${discount.musts.products.map(p => p.toString()).join(', ')}]` : 
          'none',
        categories: discount.musts.categories?.length > 0 ? 
          `${discount.musts.categories.length} category(ies): [${discount.musts.categories.map(c => c.toString()).join(', ')}]` : 
          'none'
      } : 'no must-have requirements',
      adjustments: discount.adjustments?.length > 0 ? 
        discount.adjustments.map((adj, idx) => ({
          index: idx + 1,
          products: adj.products?.length > 0 ? 
            `${adj.products.length} product(s)` : 'all',
          categories: adj.categories?.length > 0 ? 
            `${adj.categories.length} category(ies)` : 'all',
          adjustment: adj.adjustment ? 
            `${adj.adjustment.value}${adj.adjustment.type === 'percent' ? '%' : '$'}` + 
            (adj.adjustment.maxAmount ? ` (max $${adj.adjustment.maxAmount})` : '') : 
            'undefined'
        })) : 
        'no adjustments',
      daysOfWeek: discount.daysOfWeek ? Object.entries(discount.daysOfWeek)
        .filter(([_, enabled]) => enabled)
        .map(([day]) => day) : 'all days',
      limits: discount.limits ? {
        total: discount.limits.total ? {
          usageLimit: discount.limits.total.usageLimit || 'unlimited',
          frequency: discount.limits.total.frequency ? 
            `${discount.limits.total.frequency.count} per ${discount.limits.total.frequency.period}` : 
            'no frequency limit'
        } : 'no total limits',
        perCustomer: discount.limits.perCustomer || 'no per-customer limit'
      } : 'no limits',
      dates: {
        start: discount.start ? new Date(discount.start).toISOString() : 'no start date',
        expiry: discount.expiry ? new Date(discount.expiry).toISOString() : 'no expiry'
      }
    });
  }
  
  // Apply discount if valid
  if (discount) {
    // Log whether this is manual selection or auto-assignment
    console.log(`📝 Discount application mode:`, {
      isManualSelection,
      discountAutoAssign: discount.autoAssign,
      willApply: isManualSelection || discount.autoAssign !== false
    });
    
    const validationResult = await validateDiscount(discount, customer, updatedCart);
    if (validationResult.isValid) {
      const discountResult = await applyDiscount(updatedCart, discount, customer);
      if (discountResult.applied) {
        console.log(`✅ Applied discount "${discount.name}": -$${discountResult.totalAmount.toFixed(2)} to ${discountResult.affectedProducts.length} product(s)`);
        // Add to cart-level adjustments using new structure
        updatedCart.adjustments.discounts.items.push({
          id: discount._id,
          name: discount.name,
          amount: discountResult.totalAmount,
          value: discountResult.value,
          type: discountResult.type
        });
        updatedCart.adjustments.discounts.total += discountResult.totalAmount;
        
        // Keep for backward compatibility (will remove later)
        updatedCart.appliedDiscountId = discount._id;
        updatedCart.appliedDiscountCode = discount.code;
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
    
    console.log(`📊 Product "${product.name}" calculation:`, {
      originalSubtotal: product.originalSubtotal,
      surchargeTotal: product.adjustments.surcharges.total,
      discountTotal: product.adjustments.discounts.total
    });
    
    // Add surcharges
    if (product.adjustments.surcharges.total > 0) {
      adjustedSubtotal += product.adjustments.surcharges.total;
    }
    
    // Subtract discounts
    if (product.adjustments.discounts.total > 0) {
      adjustedSubtotal -= product.adjustments.discounts.total;
      adjustedSubtotal = Math.max(0, adjustedSubtotal); // Ensure non-negative
    }
    
    product.adjustedSubtotal = adjustedSubtotal;
    
    // Recalculate tax on adjusted subtotal
    const taxRate = 0.10; // 10% tax rate - could be made configurable
    product.amount.tax = +(adjustedSubtotal * taxRate).toFixed(2);
    product.amount.total = +(adjustedSubtotal + product.amount.tax).toFixed(2);
    
    console.log(`📊 Product "${product.name}" totals:`, {
      adjustedSubtotal,
      tax: product.amount.tax,
      total: product.amount.total
    });
    
    // Update cart totals
    updatedCart.subtotal += adjustedSubtotal;
    updatedCart.tax += product.amount.tax;
    updatedCart.total += product.amount.total;
  });
  
  // Round final totals
  updatedCart.subtotal = +updatedCart.subtotal.toFixed(2);
  updatedCart.tax = +updatedCart.tax.toFixed(2);
  updatedCart.total = +updatedCart.total.toFixed(2);
  
  // Round adjustment totals
  updatedCart.adjustments.discounts.total = +updatedCart.adjustments.discounts.total.toFixed(2);
  updatedCart.adjustments.surcharges.total = +updatedCart.adjustments.surcharges.total.toFixed(2);
  
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
    $or: [
      { archivedAt: { $exists: false } },
      { archivedAt: null }
    ],
    $and: [
      { $or: [{ start: { $lte: now } }, { start: { $exists: false } }, { start: null }] },
      { $or: [{ expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null }] }
    ]
  }).lean();
  
  console.log(`🔍 Surcharge query for org ${orgId}:`, {
    found: surcharges.length,
    surcharges: surcharges.map(s => ({ 
      name: s.name, 
      id: s._id, 
      archivedAt: s.archivedAt,
      mode: s.mode 
    }))
  });
  
  return surcharges;
}

/**
 * Get discount by code
 * Note: When getting by code, autoAssign is ignored since the user is explicitly entering the code
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
 * Find the best auto-applicable discount for a customer
 * @param {Object} cart - Cart object with products
 * @param {Object} customer - Customer object
 * @param {String} orgId - Organization ID
 * @returns {Object|null} Best applicable discount or null
 */
export async function findBestAutoDiscount({ cart, customer, orgId }) {
  if (!customer) return null;
  
  const now = new Date();
  
  // Get all active discounts for the org that have autoAssign enabled
  // Only auto-apply discounts that have the autoAssign flag set to true
  const discounts = await Discount.find({
    org: orgId,
    mode: { $ne: 'surcharge' },
    autoAssign: true,  // Only get discounts with auto-assignment enabled
    $or: [
      { archivedAt: { $exists: false } },
      { archivedAt: null }
    ],
    $and: [
      { $or: [{ start: { $lte: now } }, { start: { $exists: false } }, { start: null }] },
      { $or: [{ expiry: { $gte: now } }, { expiry: { $exists: false } }, { expiry: null }] }
    ]
  }).lean();
  
  console.log(`🔍 Found ${discounts.length} discounts with autoAssign=true`);
  console.log(`📅 Current date for comparison: ${now.toISOString()}`);
  
  for (const discount of discounts) {
    console.log(`  Checking "${discount.name}":`, {
      hasCode: !!discount.code,
      code: discount.code || 'none',
      autoAssign: discount.autoAssign,
      start: discount.start ? new Date(discount.start).toISOString() : 'none',
      isStarted: !discount.start || new Date(discount.start) <= now
    });
  }
  
  // Filter to only valid discounts for this customer/cart
  const validDiscounts = [];
  for (const discount of discounts) {
    const validation = await validateDiscount(discount, customer, cart);
    if (validation.isValid) {
      // Calculate potential discount amount to find the best one
      const testCart = JSON.parse(JSON.stringify(cart));
      const result = await applyDiscount(testCart, discount, customer);
      if (result.applied && result.totalAmount > 0) {
        validDiscounts.push({
          discount,
          amount: result.totalAmount
        });
        console.log(`  ✅ "${discount.name}" would save $${result.totalAmount.toFixed(2)}`);
      }
    } else {
      console.log(`  ❌ "${discount.name}" not valid: ${validation.error}`);
    }
  }
  
  // Return the discount that gives the highest savings
  if (validDiscounts.length > 0) {
    validDiscounts.sort((a, b) => b.amount - a.amount);
    const best = validDiscounts[0];
    console.log(`🎯 Best auto-discount: "${best.discount.name}" saves $${best.amount.toFixed(2)}`);
    return best.discount;
  }
  
  console.log(`❌ No auto-applicable discounts found`);
  return null;
}

/**
 * Get discount by ID
 * Note: This is used for manual selection from dropdown, so autoAssign is ignored
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
  
  // Check day of week restriction
  if (discount.daysOfWeek) {
    const today = new Date();
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const todayName = dayNames[today.getDay()];
    
    if (!discount.daysOfWeek[todayName]) {
      result.isValid = false;
      result.error = `This discount is not valid on ${todayName.charAt(0).toUpperCase() + todayName.slice(1)}`;
      console.log(`❌ Discount not valid on ${todayName}`);
      return result;
    }
  }
  
  // Check if "must have" requirements are met (for new schema)
  if (discount.musts) {
    const mustHaveProducts = discount.musts.products || [];
    const mustHaveCategories = discount.musts.categories || [];
    
    if (mustHaveProducts.length > 0 || mustHaveCategories.length > 0) {
      // First check if required items are in cart
      let hasRequiredItems = cart.products.some(product => {
        const productMatch = mustHaveProducts.some(pid => 
          pid.toString() === product._id?.toString()
        );
        const categoryMatch = mustHaveCategories.some(cid => 
          product.category && cid.toString() === product.category.toString()
        );
        return productMatch || categoryMatch;
      });
      
      // If not in cart and customer is provided, check for membership products
      if (!hasRequiredItems && customer && mustHaveProducts.length > 0) {
        console.log(`🔍 Checking customer's active memberships for must-have products...`);
        
        // Get membership product IDs from must-have list
        const membershipProductIds = [];
        for (const productId of mustHaveProducts) {
          const product = await Product.findById(productId).lean();
          if (product && product.type === 'membership') {
            membershipProductIds.push(productId.toString());
            console.log(`  → Found membership product requirement: ${product.name} (${productId})`);
          }
        }
        
        // If there are membership products in the must-have list, check customer's memberships
        if (membershipProductIds.length > 0) {
          const now = new Date();
          const activeMemberships = await Membership.find({
            customer: customer._id,
            product: { $in: membershipProductIds },
            nextBillingDate: { $gt: now }, // Active if next billing date is in the future
            status: { $ne: 'cancelled' }
          }).lean();
          
          if (activeMemberships.length > 0) {
            hasRequiredItems = true;
            console.log(`✅ Customer has ${activeMemberships.length} active membership(s) matching must-have requirements`);
            for (const membership of activeMemberships) {
              console.log(`  → Active membership: Product ${membership.product}, expires ${membership.nextBillingDate}`);
            }
          } else {
            console.log(`❌ Customer has no active memberships matching requirements`);
          }
        }
      }
      
      if (!hasRequiredItems) {
        result.isValid = false;
        result.error = 'Your cart must contain specific items or you must have an active membership to use this discount';
        console.log(`❌ Must-have requirements not met`);
        return result;
      }
    }
  }
  
  // For new schema with adjustments array
  if (discount.adjustments && discount.adjustments.length > 0) {
    // Check if any adjustment applies to cart products
    let hasApplicableProducts = false;
    for (const adj of discount.adjustments) {
      const applicableProducts = getApplicableProducts(cart.products, adj);
      if (applicableProducts.length > 0) {
        hasApplicableProducts = true;
        break;
      }
    }
    
    if (!hasApplicableProducts) {
      result.isValid = false;
      result.error = 'This discount does not apply to any products in your cart';
      console.log(`❌ No applicable products for any adjustment`);
      return result;
    }
  }
  
  // Check usage limits
  if (discount.limits) {
    // Check global usage limit
    if (discount.limits.total?.usageLimit) {
      // This would require tracking total uses - simplified for now
      // In production, you'd track this in the discount document or a separate collection
    }
    
    // Check per-customer limits
    if (customer && discount.limits.perCustomer) {
      const customerUsage = await getCustomerDiscountUsage(customer._id, discount._id);
      
      // Check total lifetime limit
      if (customerUsage.total >= discount.limits.perCustomer) {
        result.isValid = false;
        result.error = `You have already used this discount the maximum ${discount.limits.perCustomer} times`;
        return result;
      }
    }
    
    // Check frequency limit
    if (customer && discount.limits.total?.frequency) {
      const frequencyViolation = await checkFrequencyLimit(
        customer._id,
        discount._id,
        discount.limits.total.frequency
      );
      if (frequencyViolation) {
        console.log(`❌ Frequency limit violation: ${frequencyViolation}`);
        result.isValid = false;
        result.error = frequencyViolation;
        return result;
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
    affectedProducts: [],
    totalAmount: 0,
    value: null,
    type: null
  };
  
  // Handle new schema with adjustments array
  if (surcharge.adjustments && surcharge.adjustments.length > 0) {
    // Apply each adjustment to its applicable products
    for (const adjustment of surcharge.adjustments) {
      const applicableProducts = getApplicableProducts(cart.products, adjustment);
      
      if (applicableProducts.length === 0) {
        continue;
      }
      
      // Store the first adjustment's value and type for display
      if (!result.value && adjustment.adjustment) {
        result.value = adjustment.adjustment.value;
        result.type = adjustment.adjustment.type;
      }
      
      // Apply surcharge adjustment
      for (const product of applicableProducts) {
        let surchargeAmount = 0;
        
        if (adjustment.adjustment.type === 'percent') {
          surchargeAmount = (product.originalSubtotal * adjustment.adjustment.value) / 100;
        } else if (adjustment.adjustment.type === 'amount') {
          // For fixed amount, divide evenly among applicable products
          surchargeAmount = adjustment.adjustment.value / applicableProducts.length;
        }
        
        // Apply max amount cap if specified
        if (adjustment.adjustment.maxAmount && adjustment.adjustment.type === 'percent') {
          surchargeAmount = Math.min(surchargeAmount, adjustment.adjustment.maxAmount);
        }
        
        surchargeAmount = +surchargeAmount.toFixed(2);
        
        // Add to product's adjustments using new structure
        product.adjustments.surcharges.items.push({
          id: surcharge._id,
          name: surcharge.name,
          amount: surchargeAmount
        });
        product.adjustments.surcharges.total += surchargeAmount;
        
        result.affectedProducts.push({
          productId: product._id,
          productName: product.name,
          amount: surchargeAmount
        });
        
        result.totalAmount += surchargeAmount;
      }
    }
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
    affectedProducts: [],
    totalAmount: 0,
    value: null,
    type: null
  };
  
  // Handle new schema with adjustments array
  if (discount.adjustments && discount.adjustments.length > 0) {
    // Apply each adjustment to its applicable products
    for (const adjustment of discount.adjustments) {
      const applicableProducts = getApplicableProducts(cart.products, adjustment);
      
      if (applicableProducts.length === 0) {
        continue;
      }
      
      // Store the first adjustment's value and type for display
      if (!result.value && adjustment.adjustment) {
        result.value = adjustment.adjustment.value;
        result.type = adjustment.adjustment.type;
      }
      
      const adjResult = applyAdjustmentToProducts(
        applicableProducts, 
        adjustment.adjustment
      );
      
      // Add to product discount amounts and track results
      for (const productResult of adjResult.affectedProducts) {
        const product = cart.products.find(p => p._id === productResult.productId);
        if (product) {
          // Add to product's adjustments using new structure
          product.adjustments.discounts.items.push({
            id: discount._id,
            name: discount.name,
            amount: productResult.amount
          });
          product.adjustments.discounts.total += productResult.amount;
          
          result.affectedProducts.push(productResult);
          result.totalAmount += productResult.amount;
        }
      }
    }
  }
  
  result.applied = result.totalAmount > 0;
  return result;
}

/**
 * Apply an adjustment to a set of products
 */
function applyAdjustmentToProducts(products, adjustment) {
  const result = {
    affectedProducts: [],
    totalAmount: 0
  };
  
  // Apply discount individually to each product
  let remainingDiscountAmount = adjustment.type === 'amount' ? adjustment.value : Infinity;
  
  for (const product of products) {
    if (remainingDiscountAmount <= 0) break;
    
    let discountAmount = 0;
    
    if (adjustment.type === 'percent') {
      const baseAmount = product.originalSubtotal + (product.amount.surcharge || 0);
      discountAmount = (baseAmount * adjustment.value) / 100;
    } else if (adjustment.type === 'amount') {
      // For fixed amount, distribute proportionally
      const totalApplicableValue = products.reduce((sum, p) => 
        sum + p.originalSubtotal + (p.amount.surcharge || 0), 0);
      const productValue = product.originalSubtotal + (product.amount.surcharge || 0);
      const productShare = totalApplicableValue > 0 ? productValue / totalApplicableValue : 0;
      discountAmount = Math.min(adjustment.value * productShare, productValue);
    }
    
    // Apply max amount cap if specified
    if (adjustment.maxAmount && adjustment.type === 'percent') {
      const totalDiscountSoFar = result.totalAmount;
      if (totalDiscountSoFar + discountAmount > adjustment.maxAmount) {
        discountAmount = Math.max(0, adjustment.maxAmount - totalDiscountSoFar);
      }
    }
    
    // For fixed amount discounts, ensure we don't exceed the total
    if (adjustment.type === 'amount') {
      discountAmount = Math.min(discountAmount, remainingDiscountAmount);
      remainingDiscountAmount -= discountAmount;
    }
    
    discountAmount = +discountAmount.toFixed(2);
    
    result.affectedProducts.push({
      productId: product._id,
      productName: product.name,
      amount: discountAmount
    });
    
    result.totalAmount += discountAmount;
  }
  
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
  
  // Calculate actual discount applied
  let actualDiscountApplied = 0;
  
  updatedCart.products.forEach(product => {
    if (product.amount) {
      const productDiscount = product.amount.discount || 0;
      actualDiscountApplied += productDiscount;
      updatedCart.subtotal += product.amount.subtotal - productDiscount;
      updatedCart.tax += product.amount.tax || 0;
      updatedCart.total += product.amount.total || 0;
    }
  });
  
  updatedCart.discountAmount = +actualDiscountApplied.toFixed(2);
  updatedCart.subtotal = +updatedCart.subtotal.toFixed(2);
  updatedCart.tax = +updatedCart.tax.toFixed(2);
  updatedCart.total = +updatedCart.total.toFixed(2);
  
  // Set up adjustments structure for UI consistency
  updatedCart.adjustments = {
    discounts: [{
      discountId: 'custom',
      name: 'Custom',
      code: null,
      type: 'amount',
      value: discountAmount,
      totalDiscountAmount: +actualDiscountApplied.toFixed(2),
      affectedProducts: updatedCart.products
        .filter(p => p.amount?.discount > 0)
        .map(p => ({
          productId: p._id,
          productName: p.name,
          amount: +(p.amount?.discount || 0).toFixed(2)
        }))
    }],
    surcharges: [],
    totalDiscountAmount: +actualDiscountApplied.toFixed(2),
    totalSurchargeAmount: 0
  };
  
  return updatedCart;
}
