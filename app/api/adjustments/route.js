import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { calculateAdjustments, calculateCustomDiscount, findBestAutoDiscount } from '@/lib/adjustments';
import { Discount } from '@/models';

export async function POST(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      cart, 
      customer, 
      discountCode, 
      discountId, 
      customDiscountAmount,
      autoApply = false, // Flag to indicate if we should auto-find a discount
      isManualSelection = false // Flag to indicate if discount was manually selected from dropdown
    } = body;
    
    // Fetch discount details if discountId is provided
    let discountDetails = null;
    if (discountId) {
      try {
        const discount = await Discount.findById(discountId).lean();
        if (discount) {
          discountDetails = {
            id: discount._id,
            name: discount.name,
            code: discount.code || 'no code',
            autoAssign: discount.autoAssign !== undefined ? discount.autoAssign : 'not set',
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
                `${discount.products.length} product(s): [${discount.products.map(p => p.toString()).join(', ')}]` : 
                'ALL PRODUCTS',
              categories: discount.categories?.length > 0 ? 
                `${discount.categories.length} category(ies): [${discount.categories.map(c => c.toString()).join(', ')}]` : 
                'ALL CATEGORIES'
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
              expiry: discount.expiry ? new Date(discount.expiry).toISOString() : 'no expiry',
              archived: discount.archivedAt ? new Date(discount.archivedAt).toISOString() : 'not archived'
            }
          };
        } else {
          discountDetails = { error: 'Discount not found in database' };
        }
      } catch (error) {
        discountDetails = { error: `Failed to fetch discount: ${error.message}` };
      }
    }
    
    console.log('\n🎯 [API] Adjustment calculation request:', {
      orgId: employee.org._id,
      hasCustomer: !!customer,
      customerId: customer?._id || 'none',
      customerName: customer?.name || 'none',
      discountCode,
      discountId,
      discountDetails,
      customDiscountAmount,
      autoApply,
      isManualSelection,
      cartProductCount: cart?.products?.length,
      cartTotal: cart?.total,
      cartProducts: cart?.products?.map(p => ({
        id: p._id,
        name: p.name,
        category: p.category || 'none',
        type: p.type || 'unknown',
        price: p.amount?.subtotal || 0
      }))
    });

    if (!cart || !cart.products) {
      return NextResponse.json(
        { error: 'Invalid cart data' },
        { status: 400 }
      );
    }

    let updatedCart;
    let finalDiscountId = discountId;
    let finalDiscountCode = discountCode;

    // Handle custom discount amount (manual discount)
    if (customDiscountAmount && customDiscountAmount > 0) {
      console.log(`💵 [API] Applying custom discount of $${customDiscountAmount}`);
      updatedCart = calculateCustomDiscount(cart, customDiscountAmount);
    } else {
      // Auto-find best discount if requested and no discount specified
      if (autoApply && !discountId && !discountCode && customer) {
        console.log('🔍 [API] Auto-finding best discount for customer...');
        const bestDiscount = await findBestAutoDiscount({
          cart,
          customer,
          orgId: employee.org._id
        });
        
        if (bestDiscount) {
          console.log(`🎯 [API] Auto-selected discount: "${bestDiscount.name}" (${bestDiscount._id})`);
          finalDiscountId = bestDiscount._id;
          finalDiscountCode = bestDiscount.code;
        }
      }
      
      // Calculate adjustments with discounts and surcharges
      updatedCart = await calculateAdjustments({
        cart,
        customer,
        discountCode: finalDiscountCode,
        discountId: finalDiscountId,
        orgId: employee.org._id,
        isManualSelection: isManualSelection || (discountId && !autoApply) // Manual if ID provided and not auto-applying
      });
      
      // No longer store legacy discount fields
    }
    
    console.log('🎁 [API] Adjustment calculation complete:', {
      totalDiscounts: updatedCart.adjustments?.discounts?.total || 0,
      totalSurcharges: updatedCart.adjustments?.surcharges?.total || 0,
      error: updatedCart.adjustments?.discountError,
      finalTotal: updatedCart.total
    });

    return NextResponse.json(updatedCart);

  } catch (error) {
    console.error('❌ [API] Error calculating adjustments:', error);
    return NextResponse.json(
      { error: 'Failed to calculate adjustments', details: error.message },
      { status: 500 }
    );
  }
}