import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { sendEmail, getFromAddress } from '../mailer';

/**
 * Generate QR code as data URL with logo
 * @param {string} text - Text to encode in QR code
 * @param {string} logoLetter - Letter to display in center (e.g., 'C' for Cultcha)
 * @returns {Promise<string>} - Data URL of QR code image with logo
 */
async function generateQRCodeWithLogo(text, logoLetter = 'C') {
  try {
    // Generate QR code with higher error correction to allow for logo overlay
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H', // High error correction allows up to 30% obstruction
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    
    // For email embedding, we'll create an HTML representation with the logo overlay
    // Since we can't manipulate canvas in email, we'll use HTML/CSS positioning
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

/**
 * Format currency amount
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
function formatCurrency(amount) {
  return `$${parseFloat(amount || 0).toFixed(2)}`;
}

/**
 * Generate HTML for shop items
 * @param {Array} products - Shop products
 * @returns {string} - HTML string
 */
function generateShopItemsHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    const modifiers = product.item?.mods?.map(mod => 
      `${mod.name}${mod.amount && parseFloat(mod.amount) > 0 ? ` (+${formatCurrency(mod.amount)})` : ''}`
    ).join(', ') || '';
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${product.name}
            ${product.item?.variation ? ` - ${product.item.variation}` : ''}
            ${modifiers ? `<div style="color: #8898aa; font-size: 13px; margin-top: 2px;">+ ${modifiers}</div>` : ''}
            ${product.qty > 1 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 2px;">Quantity: ${product.qty}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Generate HTML for class bookings
 * @param {Array} products - Class products
 * @returns {string} - HTML string
 */
function generateClassBookingsHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    const dates = [];
    const attendees = [];
    
    product.variations?.forEach(variation => {
      // Get selected times
      variation.timesCalc?.filter(time => time.selected).forEach(time => {
        dates.push(dayjs(time.value).format('MMM D, YYYY h:mm A'));
      });
      
      // Get attendees
      variation.prices?.forEach(price => {
        price.customers?.forEach(customer => {
          if (customer.customer) {
            attendees.push(`${customer.customer.name} (${price.name})`);
          }
        });
      });
    });
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-weight: 500; font-size: 14px;">
              Class: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Instructions →
              </a>
            </div>
          ` : ''}
          ${dates.length > 0 ? `
            <div style="margin-top: 8px;">
              ${dates.map(date => `
                <span style="
                  display: inline-block;
                  background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 12px;
                  font-weight: 500;
                  margin-right: 6px;
                  margin-bottom: 6px;
                  letter-spacing: 0.3px;
                ">
                  📅 ${date}
                </span>
              `).join('')}
            </div>
          ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Generate HTML for courses
 * @param {Array} products - Course products
 * @returns {string} - HTML string
 */
function generateCoursesHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    const startDate = product.variations?.[0]?.times?.[0]?.start 
      ? dayjs(product.variations[0].times[0].start).format('MMM D, YYYY h:mm A')
      : null;
    
    const attendees = [];
    product.variations?.forEach(variation => {
      variation.prices?.forEach(price => {
        price.customers?.forEach(customer => {
          if (customer.customer) {
            attendees.push(`${customer.customer.name} (${price.name})`);
          }
        });
      });
    });
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-weight: 500; font-size: 14px;">
              Course: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Instructions →
              </a>
            </div>
          ` : ''}
          ${startDate ? `
            <div style="margin-top: 8px;">
              <span style="
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: 0.3px;
              ">
                🚀 Starts: ${startDate}
              </span>
            </div>
          ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Generate HTML for memberships
 * @param {Array} products - Membership products
 * @returns {string} - HTML string
 */
function generateMembershipsHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    let billingPeriod = '';
    
    if (product.item) {
      // Use cart item data for billing period
      const variation = product.item.variation;
      const unit = product.item.unit;
      billingPeriod = variation === "1" && unit === "month" ? "Monthly" :
                     variation === "1" && unit === "year" ? "Yearly" :
                     `${variation} ${unit}${parseInt(variation) > 1 ? 's' : ''}`;
    }
    
    const subscribers = [];
    product.variations?.forEach(variation => {
      variation.prices?.forEach(price => {
        price.customers?.forEach(customer => {
          if (customer.customer) {
            subscribers.push(`${customer.customer.name} (${price.name})`);
          }
        });
      });
    });
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-weight: 500; font-size: 14px;">
              Membership: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions" 
                 style="color: #10b981; font-size: 12px; text-decoration: none;">
                View Instructions →
              </a>
            </div>
          ` : ''}
          ${billingPeriod ? `
            <div style="margin-top: 8px;">
              <span style="
                display: inline-block;
                background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                color: white;
                padding: 4px 10px;
                border-radius: 6px;
                font-size: 13px;
                font-weight: 500;
                letter-spacing: 0.3px;
              ">
                💳 ${billingPeriod} Subscription
              </span>
            </div>
          ` : ''}
            ${subscribers.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Subscribers: ${subscribers.join(', ')}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Generate HTML for casual entries
 * @param {Array} products - Casual products
 * @returns {string} - HTML string
 */
function generateCasualEntriesHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    const durations = product.variations?.map(v => `${v.name} ${v.unit}`).join(', ') || '';
    
    const attendees = [];
    product.variations?.forEach(variation => {
      variation.prices?.forEach(price => {
        price.customers?.forEach(customer => {
          if (customer.customer) {
            attendees.push(`${customer.customer.name} (${price.name})`);
          }
        });
      });
    });
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-weight: 500; font-size: 14px;">
              ${product.name}
            </div>
            ${durations ? `
              <div style="margin-top: 8px;">
                <span style="
                  display: inline-block;
                  background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 13px;
                  font-weight: 500;
                  letter-spacing: 0.3px;
                ">
                  🎟️ ${durations} Pass
                </span>
              </div>
            ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Generate HTML for general entries
 * @param {Array} products - General products
 * @returns {string} - HTML string
 */
function generateGeneralEntriesHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = '';
  
  products.forEach((product, index) => {
    const attendees = [];
    product.variations?.forEach(variation => {
      variation.prices?.forEach(price => {
        price.customers?.forEach(customer => {
          if (customer.customer) {
            attendees.push(`${customer.customer.name} (${price.name})`);
          }
        });
      });
    });
    
    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: 12px 0; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-weight: 500; font-size: 14px;">
              ${product.name}
            </div>
            ${product._id ? `
              <div style="margin-top: 4px;">
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms" 
                   style="color: #10b981; font-size: 12px; text-decoration: none;">
                  View Terms & Conditions →
                </a>
              </div>
            ` : ''}
            ${product._id && product.instructionsContent ? `
              <div style="margin-top: 4px;">
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions" 
                   style="color: #10b981; font-size: 12px; text-decoration: none;">
                  View Instructions →
                </a>
              </div>
            ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="text-align: right; color: #424770; font-weight: 500; font-size: 14px; vertical-align: top;">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });
  
  return html;
}

/**
 * Send transaction receipt email
 * @param {Object} params - Email parameters
 * @param {Object} params.transaction - Transaction object with populated references
 * @param {string} params.recipientEmail - Recipient email address
 * @param {Object} params.org - Organization object
 * @returns {Promise} - Email send result
 */
export async function sendTransactionReceipt({ transaction, recipientEmail, org }) {
  try {
    if (!transaction || !recipientEmail) {
      throw new Error('Transaction and recipient email are required');
    }

    // Group products by type
    const productsByType = {};
    transaction.cart?.products?.forEach(product => {
      const type = product.type || 'shop';
      if (!productsByType[type]) {
        productsByType[type] = [];
      }
      productsByType[type].push(product);
    });

    // Determine if we need to generate QR code (for classes, courses, memberships, or general entries)
    const needsQRCode = productsByType.class || productsByType.course || productsByType.membership || productsByType.general;
    let qrCodeDataUrl = null;
    
    // Get customer for QR code
    const customer = transaction.customer;
    const logoLetter = org?.name?.charAt(0)?.toUpperCase() || 'C';
    if (needsQRCode && customer?._id) {
      qrCodeDataUrl = await generateQRCodeWithLogo(customer._id.toString(), logoLetter);
    }

    // Generate HTML sections for each product type
    let productsHTML = '';
    
    if (productsByType.shop) {
      productsHTML += generateShopItemsHTML(productsByType.shop);
    }
    
    if (productsByType.class) {
      productsHTML += generateClassBookingsHTML(productsByType.class);
    }
    
    if (productsByType.course) {
      productsHTML += generateCoursesHTML(productsByType.course);
    }
    
    if (productsByType.membership) {
      productsHTML += generateMembershipsHTML(productsByType.membership);
    }
    
    if (productsByType.casual) {
      productsHTML += generateCasualEntriesHTML(productsByType.casual);
    }
    
    if (productsByType.general) {
      productsHTML += generateGeneralEntriesHTML(productsByType.general);
    }

    // Build email HTML with Stripe-inspired design
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Receipt from ${org?.name || 'POS System'}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #424770; background-color: #f6f9fc; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.07);">
          
          <!-- Header with light gray gradient background -->
          <div style="position: relative; background: linear-gradient(135deg, #e5e7eb 0%, #4b5563 100%); border-radius: 8px 8px 0 0; padding: 40px 40px 80px 40px; text-align: center;">
            ${org?.logo ? `
              <div style="margin-bottom: 20px;">
                <img src="${org.logo.startsWith('http') ? org.logo : `${process.env.NEXT_PUBLIC_DOMAIN}/api/c/orgs/${org._id}/logo`}" 
                     alt="${org.name}" 
                     style="max-height: 60px; max-width: 180px; filter: brightness(0) invert(1); border-radius: 8px;" />
              </div>
            ` : `
              <div style="display: inline-block; width: 60px; height: 60px; background-color: white; border-radius: 50%; padding: 15px; margin-bottom: 20px;">
                <div style="color: #6b7280; font-size: 20px; font-weight: bold; line-height: 60px;">
                  ${org?.name?.charAt(0)?.toUpperCase() || 'R'}
                </div>
              </div>
            `}
            <h1 style="color: white; margin: 0; font-size: 18px; font-weight: 500;">
              Receipt from ${org?.name || 'POS System'}
            </h1>
            <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0; font-size: 14px;">
              Receipt #${transaction._id.toString().slice(-8).toUpperCase()}
            </p>
          </div>
          
          <!-- White angled overlay -->
          <div style="background-color: white; margin-top: -40px; position: relative; z-index: 1; border-radius: 8px;">
            
            <!-- Summary section -->
            <div style="padding: 40px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td style="width: 33.33%;">
                    <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      AMOUNT PAID
                    </div>
                    <div style="font-size: 16px; font-weight: 600; color: #424770;">
                      ${formatCurrency(transaction.total)}
                    </div>
                  </td>
                  <td style="width: 33.33%; text-align: center;">
                    <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      DATE PAID
                    </div>
                    <div style="font-size: 14px; color: #424770;">
                      ${dayjs(transaction.createdAt).format('MMMM D, YYYY')}
                    </div>
                  </td>
                  <td style="width: 33.33%; text-align: right;">
                    <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                      PAYMENT METHOD
                    </div>
                    <div style="font-size: 14px; color: #424770;">
                      ${transaction.paymentMethod === 'stripe' ? 
                        'Card – ••••' + (transaction.stripe?.paymentIntent?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '') : 
                        'Cash'}
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Items section -->
              <div style="margin-top: 40px;">
                <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
                  SUMMARY
                </div>
                
                <div style="background-color: #f6f9fc; border-radius: 6px; padding: 20px;">
                  ${productsHTML}
                  
                  <!-- Totals -->
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e3e8ee;">
                    ${transaction.discountAmount > 0 ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #8898aa;">Subtotal</td>
                        <td style="text-align: right; color: #424770;">${formatCurrency(transaction.subtotal + transaction.discountAmount)}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #32c832;">Discount</td>
                        <td style="text-align: right; color: #32c832;">-${formatCurrency(transaction.discountAmount)}</td>
                      </tr>
                    </table>
                    ` : `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #8898aa;">Subtotal</td>
                        <td style="text-align: right; color: #424770;">${formatCurrency(transaction.subtotal)}</td>
                      </tr>
                    </table>
                    `}
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #8898aa;">Tax</td>
                        <td style="text-align: right; color: #424770;">${formatCurrency(transaction.tax)}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="font-weight: 600; margin-top: 16px; padding-top: 16px; border-top: 2px solid #e3e8ee;">
                      <tr>
                        <td>Total</td>
                        <td style="text-align: right;">${formatCurrency(transaction.total)}</td>
                      </tr>
                    </table>
                    ${transaction.paymentMethod === 'cash' && transaction.cash ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px; font-size: 14px;">
                      <tr>
                        <td style="color: #424770;">Cash Tendered</td>
                        <td style="text-align: right; color: #424770;">${formatCurrency(transaction.cash.received)}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px; font-size: 14px;">
                      <tr>
                        <td style="color: #424770;">Change</td>
                        <td style="text-align: right; color: #424770;">${formatCurrency(transaction.cash.change)}</td>
                      </tr>
                    </table>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              ${qrCodeDataUrl && customer ? `
              <!-- QR Code section with logo -->
              <div style="margin-top: 40px; text-align: center; padding: 30px; background-color: #f6f9fc; border-radius: 6px;">
                <div style="color: #8898aa; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
                  SCAN THIS CODE AT THE ENTRANCE OF YOUR GYM
                </div>
                <div style="position: relative; display: inline-block;">
                  <img src="${qrCodeDataUrl}" alt="Check-in QR Code" style="max-width: 180px; height: auto; display: block;" />
                  <!-- Logo overlay in center of QR code -->
                  <div style="
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    width: 36px;
                    height: 36px;
                    background: white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  ">
                    <span style="
                      color: #6b7280;
                      font-size: 20px;
                      font-weight: bold;
                      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    ">
                      ${logoLetter}
                    </span>
                  </div>
                </div>
                <div style="color: #8898aa; font-size: 14px; margin-top: 15px;">
                  ${customer.memberId ? `Member ID: ${customer.memberId}` : ''}
                </div>
              </div>
              ` : ''}
            </div>
            
            <!-- Footer -->
            <div style="padding: 30px 40px; background-color: #f6f9fc; border-radius: 0 0 8px 8px;">
              <!-- Organization Details -->
              ${org?.name || org?.addressLine || org?.suburb || org?.state || org?.postcode || org?.phone || org?.email ? `
              <div style="text-align: center; margin-bottom: 30px;">
                ${org?.name ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 13px;">${org.name}</p>` : ''}
                ${org?.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 13px;">Phone: ${org.phone}</p>` : ''}
                ${org?.addressLine ? `<p style="margin: 0 0 2px 0; color: #6b7280; font-size: 13px;">${org.addressLine}</p>` : ''}
                ${org?.suburb || org?.state || org?.postcode ? `
                  <p style="margin: 0; color: #6b7280; font-size: 13px;">
                    ${org?.suburb || ''}${org?.suburb && (org?.state || org?.postcode) ? ', ' : ''}${org?.state || ''}${org?.state && org?.postcode ? ' ' : ''}${org?.postcode || ''}
                  </p>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- Email disclaimer -->
              <div style="text-align: center; margin-bottom: 40px;">
                <p style="margin: 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
                  You're receiving this email because you made a purchase at ${org?.name || 'our store'}. 
                  Something wrong with the email? 
                  <a href="#" style="color: #3b82f6; text-decoration: none;">View it in your browser</a>.
                </p>
              </div>
              
              <!-- Powered by Cultcha -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e3e8ee;">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 13px;">
                  Powered By
                </p>
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}" 
                   target="_blank" 
                   style="text-decoration: none; display: inline-block;">
                  <img src="${process.env.NEXT_PUBLIC_DOMAIN}/cultcha-logo-dark.png" 
                       alt="Cultcha" 
                       style="height: 32px; display: inline-block;"
                  />
                </a>
              </div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    // Build plain text version
    const emailText = `
Transaction Receipt
===================

Thank you for your purchase!

Transaction ID: ${transaction._id}
Date: ${dayjs(transaction.createdAt).format('DD/MM/YYYY h:mm A')}
Payment Method: ${transaction.paymentMethod === 'stripe' ? 'Card' : 'Cash'}
${customer ? `Customer: ${customer.name || 'Guest'}` : ''}

Order Details:
--------------
${transaction.cart?.products?.map(p => 
  `- ${p.name}: ${formatCurrency(p.amount?.subtotal)}`
).join('\n')}

Subtotal: ${formatCurrency(transaction.subtotal)}
${transaction.discountAmount > 0 ? `Discount: -${formatCurrency(transaction.discountAmount)}` : ''}
Tax: ${formatCurrency(transaction.tax)}
Total: ${formatCurrency(transaction.total)}

${customer && needsQRCode ? `
Check-in Information:
--------------------
${customer.memberId ? `Member ID: ${customer.memberId}` : ''}
Scan the QR code in the HTML version at the entrance of your gym.
` : ''}

${org?.name || 'Thank you for your business'}
${org?.addressLine ? org.addressLine : ''}
${org?.suburb && org?.state && org?.postcode ? `${org.suburb}, ${org.state} ${org.postcode}` : org?.suburb || ''}
${org?.email ? `Email: ${org.email}` : ''}
${org?.phone ? `Phone: ${org.phone}` : ''}
    `.trim();

    // Send email
    const mailOptions = {
      from: getFromAddress(org?.name || 'POS System'),
      to: recipientEmail,
      subject: `Receipt - ${org?.name || 'Transaction'} #${transaction._id.toString().slice(-8).toUpperCase()}`,
      text: emailText,
      html: emailHTML
    };

    return await sendEmail(mailOptions);
    
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}