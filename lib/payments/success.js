import { addToSchedule } from '@/lib/schedule'
import { addToCasual } from '@/lib/casual'
import { addToOrder } from '@/lib/order'
import { updateProductQuantities } from '@/lib/product'
import { calcCartTotals } from '@/lib/cart'
import { Transaction } from '@/models'
import { Types } from 'mongoose'

/**
 * Extracts the first customer from cart products (for transactions with multiple customers)
 * @param {Object} cart - The cart object
 * @returns {Object|null} - First customer found or null
 */
export function getFirstCustomer({ cart }) {
  for (const product of cart.products || []) {
    for (const variation of product.variations || []) {
      for (const price of variation.prices || []) {
        for (const customerEntry of price.customers || []) {
          if (customerEntry?.customer?._id) {
            return customerEntry.customer;
          }
        }
      }
    }
  }
  return null;
}

/**
 * Determines the customer for the transaction based on cart data
 * @param {Object} cart - The cart object
 * @returns {Types.ObjectId|undefined} - Customer ObjectId or undefined
 */
export function resolveTransactionCustomer({ cart }) {
  const first = getFirstCustomer({ cart });
  return first?._id
    ? new Types.ObjectId(first._id)
    : cart.customer?._id
      ? new Types.ObjectId(cart.customer._id)
      : undefined;
}

/**
 * Prepares cart data for transaction storage (removes thumbnails, etc.)
 * @param {Object} cart - The cart object
 * @returns {Object} - Cleaned cart object
 */
export function prepareCartForTransaction(cart) {
  return {
    ...cart,
    products: cart.products.map(p => {
      const { thumbnail, ...rest } = p;
      return rest;
    })
  };
}

/**
 * Creates a cash transaction
 * @param {Object} params - Parameters
 * @param {Object} params.cart - Cart data
 * @param {Object} params.employee - Employee data
 * @param {number} params.received - Amount received
 * @param {number} params.change - Change given
 * @returns {Object} - Created transaction
 */
export async function createCashTransaction({ cart, employee, received, change }) {
  const cleanCart = prepareCartForTransaction(cart);
  const txnCustomer = resolveTransactionCustomer({ cart: cleanCart });
  const totals = calcCartTotals(cleanCart.products, cleanCart.discount);

  return await Transaction.create({
    org: employee.org._id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount || 0,
    discount: cleanCart.discount?._id || null,
    employee: employee._id,
    customer: txnCustomer,
    location: employee.selectedLocationId,
    paymentMethod: "cash",
    cart: cleanCart,
    cash: {
      currency: "AUD",
      received: parseFloat(received).toFixed(2),
      change: parseFloat(change).toFixed(2),
    },
    status: "succeeded"
  });
}

/**
 * Creates a stripe transaction (for payment intent)
 * @param {Object} params - Parameters
 * @param {Object} params.cart - Cart data
 * @param {Object} params.employee - Employee data
 * @param {Object} params.customer - Customer data from request
 * @param {Object} params.paymentIntent - Stripe payment intent
 * @returns {Object} - Created transaction
 */
export async function createStripeTransaction({ cart, employee, customer, paymentIntent }) {
  const cleanCart = prepareCartForTransaction(cart);
  const txnCustomer = resolveTransactionCustomer({ cart: cleanCart });
  const totals = calcCartTotals(cleanCart.products, cleanCart.discount);
  
  return await Transaction.create({
    org: employee.org._id,
    paymentIntentId: paymentIntent.id,
    total: totals.total,
    tax: totals.tax,
    subtotal: totals.subtotal,
    discountAmount: totals.discountAmount || 0,
    discount: cleanCart.discount?._id || null,
    paymentMethod: "stripe",
    location: employee.selectedLocationId,
    customer: txnCustomer || (customer?._id ? Types.ObjectId.createFromHexString(customer._id) : undefined),
    employee: employee._id,
    cart: cleanCart,
    stripe: {
      paymentIntent
    },
    status: paymentIntent.status
  });
}

/**
 * Handles all post-transaction success operations
 * @param {Object} params - The parameters object
 * @param {Object} params.transaction - The created transaction object
 * @param {Object} params.cart - The cart data
 * @param {Object} params.employee - The employee object
 */
export async function handleTransactionSuccess({ transaction, cart, employee }) {
  try {
    // Add products to schedules (for class bookings)
    await addToSchedule({ transaction, cart, employee });
    
    // Add products to casual bookings
    await addToCasual({ transaction, cart, employee });
    
    // Add products to orders (for retail items)
    await addToOrder({ transaction, cart, employee });
    
    // Update product quantities/stock levels
    await updateProductQuantities(cart.products);
    
    console.log(`✅ Post-transaction success operations completed for transaction: ${transaction._id}`);
  } catch (error) {
    console.error('❌ Error in post-transaction success operations:', error);
    // Don't throw error to prevent transaction rollback
    // Log the error for debugging but continue
  }
} 