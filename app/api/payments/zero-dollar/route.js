import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongoose';
import { getEmployee } from '@/lib/auth';
import { createCashTransaction, handleTransactionSuccess, createMembershipSubscriptions } from '@/lib/payments/success';
import { Product } from '@/models';

/**
 * Process zero-dollar transactions (100% discount or full credit coverage)
 * This bypasses Stripe entirely but still creates transaction records and memberships
 */
export async function POST(request) {
  await connectDB();
  
  try {
    const { employee } = await getEmployee();
    if (!employee) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { cart, customer, hasMemberships } = await request.json();
    
    // Validate cart total is actually zero
    if (cart.total !== 0) {
      return NextResponse.json({ 
        error: 'This endpoint is only for zero-dollar transactions' 
      }, { status: 400 });
    }

    console.log('💵 Processing zero-dollar transaction');
    console.log('Cart adjustments:', cart.adjustments);
    
    // Use the same transaction creation as cash payments (with $0 received/change)
    // This ensures consistent transaction structure and processing
    const transaction = await createCashTransaction({ 
      cart, 
      employee, 
      received: 0, 
      change: 0 
    });
    
    console.log('✅ Zero-dollar transaction created:', transaction._id);

    // Process memberships if applicable
    if (hasMemberships) {
      console.log('📋 Processing membership records for zero-dollar transaction');
      
      // Build processedCustomers array for createMembershipSubscriptions
      const processedCustomers = [];
      
      for (const product of cart.products) {
        if (product.type === 'membership') {
          // For membership products, customers are stored in prices[].customers[]
          const prices = product.prices || [];
          for (const price of prices) {
            const customers = price.customers || [];
            for (const customerObj of customers) {
              // Extract the customer ID/object from the nested structure
              const customerData = customerObj.customer;
              if (!customerData) continue;
              
              processedCustomers.push({
                customer: customerData,
                product: product,
                price: {
                  ...price,
                  value: 0, // Override price to zero for 100% discount
                  stripePriceId: null // No Stripe price for zero-dollar
                },
                stripeCustomerId: null // No Stripe customer for zero-dollar
              });
            }
          }
        }
      }
      
      if (processedCustomers.length > 0) {
        console.log(`📋 Creating ${processedCustomers.length} zero-dollar membership(s)`);
        
        // Use the shared createMembershipSubscriptions function
        // It will handle membership creation without Stripe subscriptions for zero-dollar amounts
        try {
          await createMembershipSubscriptions({
            cart,
            employee,
            processedCustomers,
            transaction
          });
          console.log('✅ Zero-dollar memberships created successfully');
        } catch (error) {
          console.error('⚠️ Error creating memberships:', error);
          // Don't fail the transaction, just log the error
        }
      }
    }

    // Handle other post-payment tasks (credits, discounts, etc.)
    const successResult = await handleTransactionSuccess({ 
      transaction, 
      cart, 
      employee 
    });
    
    if (successResult && successResult.error) {
      console.error('⚠️ Post-payment processing had issues:', successResult.error);
      // Don't fail the whole transaction, just log the error
    }
    
    return NextResponse.json({ 
      success: true,
      transactionId: transaction._id,
      message: 'Zero-dollar transaction processed successfully'
    });
    
  } catch (error) {
    console.error('❌ Zero-dollar transaction error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to process zero-dollar transaction' 
    }, { status: 500 });
  }
}