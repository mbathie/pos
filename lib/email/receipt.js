import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { sendEmail, getFromAddress } from '../mailer.js';

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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateShopItemsHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  products.forEach((product, index) => {
    const modifiers = product.item?.mods?.map(mod =>
      `${mod.name}${mod.amount && parseFloat(mod.amount) > 0 ? ` (+${formatCurrency(mod.amount)})` : ''}`
    ).join(', ') || '';

    const priceStyle = isGrouped
      ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
      : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="color: #424770; font-size: 14px; vertical-align: top;">
            ${product.name}
            ${product.item?.variation ? ` - ${product.item.variation}` : ''}
            ${modifiers ? `<div style="color: #8898aa; font-size: 12px; margin-top: 2px;">+ ${modifiers}</div>` : ''}
            ${product.qty > 1 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 2px;">Quantity: ${product.qty}</div>` : ''}
          </td>
          <td style="${priceStyle}">
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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateClassBookingsHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

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
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 14px;">
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
                  font-weight: normal;
                  margin-right: 6px;
                  margin-bottom: 6px;
                  letter-spacing: 0.3px;
                ">
                  📅 ${date}
                </span>
              `).join('')}
            </div>
          ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="${priceStyle}">
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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateCoursesHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

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
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 14px;">
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
                font-size: 12px;
                font-weight: normal;
                letter-spacing: 0.3px;
              ">
                🚀 Starts: ${startDate}
              </span>
            </div>
          ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="${priceStyle}">
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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateMembershipsHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

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
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 14px;">
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
                font-size: 12px;
                font-weight: normal;
                letter-spacing: 0.3px;
              ">
                💳 ${billingPeriod} Subscription
              </span>
            </div>
          ` : ''}
            ${subscribers.length > 0 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 6px;">Subscribers: ${subscribers.join(', ')}</div>` : ''}
          </td>
          <td style="${priceStyle}">
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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateCasualEntriesHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

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
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 14px;">
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
                  font-size: 12px;
                  font-weight: normal;
                  letter-spacing: 0.3px;
                ">
                  🎟️ ${durations} Pass
                </span>
              </div>
            ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="${priceStyle}">
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
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generateGeneralEntriesHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 14px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 14px; vertical-align: top;';

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
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 14px;">
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
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 12px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
          </td>
          <td style="${priceStyle}">
            ${formatCurrency(product.amount?.subtotal)}
          </td>
        </tr>
      </table>`;
  });

  return html;
}

/**
 * Group products by gId to identify product groups
 * @param {Array} products - Products array
 * @returns {Object} - Grouped products and standalone products
 */
function groupProductsByGId(products) {
  const groups = {};
  const standalone = [];
  const processedGIds = new Set();

  products?.forEach(product => {
    if (product.gId) {
      // Only process each group once
      if (!processedGIds.has(product.gId)) {
        processedGIds.add(product.gId);

        // Collect all products with the same gId
        const groupProducts = products.filter(p => p.gId === product.gId);

        groups[product.gId] = {
          gId: product.gId,
          groupName: product.groupName,
          groupAmount: product.groupAmount,
          products: groupProducts,
          adjustments: product.adjustments
        };
      }
    } else {
      standalone.push(product);
    }
  });

  return { groups, standalone };
}

/**
 * Generate group header HTML
 * @param {Object} group - Group object
 * @returns {string} - HTML string
 */
function generateGroupHeaderHTML(group) {
  const groupSubtotal = group.groupAmount || 0;
  const groupSurcharges = group.adjustments?.surcharges?.total || 0;
  const groupDiscounts = group.adjustments?.discounts?.total || 0;
  const groupTotal = groupSubtotal + groupSurcharges - groupDiscounts;

  return `
    <table width="100%" cellpadding="0" cellspacing="0" style="padding: 6px 0 6px 0;">
      <tr>
        <td style="color: #424770; font-size: 14px; vertical-align: top; font-weight: 500;">
          ${group.groupName}
        </td>
        <td style="text-align: right; color: #424770; font-size: 14px; vertical-align: top; font-weight: 500;">
          ${formatCurrency(groupTotal)}
        </td>
      </tr>
    </table>
  `;
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

    // First, separate grouped and standalone products
    const { groups, standalone } = groupProductsByGId(transaction.cart?.products);

    // Group standalone products by type
    const productsByType = {};
    standalone.forEach(product => {
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
    
    // Use API endpoint URL for QR code instead of embedded image
    const qrCodeUrl = needsQRCode && customer?._id 
      ? `${process.env.EMAIL_ASSETS_DOMAIN || process.env.NEXT_PUBLIC_API_BASE_URL}/api/c/customers/${customer._id}/qrcode`
      : null;
    
    // Log QR code URL for debugging
    if (qrCodeUrl) {
      console.log('📧 QR Code URL generated:', qrCodeUrl);
      console.log('📧 Customer ID:', customer._id);
      console.log('📧 EMAIL_ASSETS_DOMAIN:', process.env.EMAIL_ASSETS_DOMAIN);
      console.log('📧 NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    }

    // Generate HTML sections - first groups, then standalone products
    let productsHTML = '';

    // Handle grouped products
    Object.values(groups).forEach(group => {
      // Add left border wrapper for grouped products
      productsHTML += '<div style="border-left: 4px solid #10b981; padding-left: 12px; margin-bottom: 20px;">';

      // Add group header
      productsHTML += generateGroupHeaderHTML(group);

      // Separate products within group by type
      const groupProductsByType = {};
      group.products.forEach(product => {
        const type = product.type || 'shop';
        if (!groupProductsByType[type]) {
          groupProductsByType[type] = [];
        }
        groupProductsByType[type].push(product);
      });

      if (groupProductsByType.shop) {
        productsHTML += generateShopItemsHTML(groupProductsByType.shop, true);
      }

      if (groupProductsByType.class) {
        productsHTML += generateClassBookingsHTML(groupProductsByType.class, true);
      }

      if (groupProductsByType.course) {
        productsHTML += generateCoursesHTML(groupProductsByType.course, true);
      }

      if (groupProductsByType.membership) {
        productsHTML += generateMembershipsHTML(groupProductsByType.membership, true);
      }

      if (groupProductsByType.casual) {
        productsHTML += generateCasualEntriesHTML(groupProductsByType.casual, true);
      }

      if (groupProductsByType.general) {
        productsHTML += generateGeneralEntriesHTML(groupProductsByType.general, true);
      }

      productsHTML += '</div>';
    });

    // Handle standalone (non-grouped) products
    if (productsByType.shop) {
      productsHTML += generateShopItemsHTML(productsByType.shop, false);
    }

    if (productsByType.class) {
      productsHTML += generateClassBookingsHTML(productsByType.class, false);
    }

    if (productsByType.course) {
      productsHTML += generateCoursesHTML(productsByType.course, false);
    }

    if (productsByType.membership) {
      productsHTML += generateMembershipsHTML(productsByType.membership, false);
    }

    if (productsByType.casual) {
      productsHTML += generateCasualEntriesHTML(productsByType.casual, false);
    }

    if (productsByType.general) {
      productsHTML += generateGeneralEntriesHTML(productsByType.general, false);
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
            ${(() => {
              if (org?.logo) {
                // Always use the API endpoint for logos to ensure compatibility with email clients
                const logoUrl = `${process.env.EMAIL_ASSETS_DOMAIN || process.env.NEXT_PUBLIC_DOMAIN}/api/c/orgs/${org._id}/logo`;
                console.log('📧 Using logo URL:', logoUrl);
                
                return `
                  <div style="margin-bottom: 20px;">
                    <img src="${logoUrl}" 
                         alt="${org.name}" 
                         style="max-height: 60px; max-width: 180px; border-radius: 8px;" />
                  </div>
                `;
              } else {
                console.log('📧 No org logo found');
                return `
                  <div style="display: inline-block; width: 60px; height: 60px; background-color: white; border-radius: 50%; padding: 15px; margin-bottom: 20px;">
                    <div style="color: #6b7280; font-size: 20px; font-weight: bold; line-height: 60px;">
                      ${org?.name?.charAt(0)?.toUpperCase() || 'R'}
                    </div>
                  </div>
                `;
              }
            })()}
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
                  <td style="width: 33.33%; vertical-align: top;">
                    <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
                      PAID
                    </div>
                    <div style="font-size: 14px; font-weight: normal; color: #424770;">
                      ${formatCurrency(transaction.total)}
                    </div>
                  </td>
                  <td style="width: 33.33%; text-align: center; vertical-align: top;">
                    <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
                      DATE
                    </div>
                    <div style="font-size: 14px; font-weight: normal; color: #424770;">
                      ${dayjs(transaction.createdAt).format('DD/MM/YY')}
                    </div>
                  </td>
                  <td style="width: 33.33%; text-align: right; vertical-align: top;">
                    <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
                      METHOD
                    </div>
                    <div style="font-size: 14px; font-weight: normal; color: #424770;">
                      ${transaction.paymentMethod === 'stripe' ? 
                        'Card – ••••' + (transaction.stripe?.paymentIntent?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '') : 
                        'Cash'}
                    </div>
                  </td>
                </tr>
              </table>
              
              <!-- Items section -->
              <div style="margin-top: 40px;">
                <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
                  SUMMARY
                </div>
                
                <div style="background-color: #f6f9fc; border-radius: 6px; padding: 20px;">
                  ${productsHTML}
                  
                  <!-- Totals -->
                  <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e3e8ee;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #424770; font-size: 14px;">Subtotal</td>
                        <td style="text-align: right; color: #424770; font-size: 14px;">${formatCurrency(transaction.subtotal)}</td>
                      </tr>
                    </table>
                    ${transaction.adjustments?.discounts?.items?.length > 0 ? 
                      transaction.adjustments.discounts.items.map(discount => `
                        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                          <tr>
                            <td style="color: #32c832; font-size: 14px;">Discount (${discount.name})</td>
                            <td style="text-align: right; color: #32c832; font-size: 14px;">-${formatCurrency(discount.amount)}</td>
                          </tr>
                        </table>
                      `).join('') : ''
                    }
                    ${transaction.adjustments?.credits?.amount > 0 ? `
                      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                        <tr>
                          <td style="color: #32c832; font-size: 14px;">Credit Applied</td>
                          <td style="text-align: right; color: #32c832; font-size: 14px;">-${formatCurrency(transaction.adjustments.credits.amount)}</td>
                        </tr>
                      </table>
                    ` : ''}
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                      <tr>
                        <td style="color: #424770; font-size: 14px;">Tax</td>
                        <td style="text-align: right; color: #424770; font-size: 14px;">${formatCurrency(transaction.tax)}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e3e8ee;">
                      <tr>
                        <td style="color: #424770; font-size: 14px; font-weight: 500;">Total</td>
                        <td style="text-align: right; color: #424770; font-size: 14px; font-weight: 500;">${formatCurrency(transaction.total)}</td>
                      </tr>
                    </table>
                    ${transaction.paymentMethod === 'cash' && transaction.cash ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
                      <tr>
                        <td style="color: #424770; font-size: 14px;">Cash Tendered</td>
                        <td style="text-align: right; color: #424770; font-size: 14px;">${formatCurrency(transaction.cash.received)}</td>
                      </tr>
                    </table>
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
                      <tr>
                        <td style="color: #424770; font-size: 14px;">Change</td>
                        <td style="text-align: right; color: #424770; font-size: 14px;">${formatCurrency(transaction.cash.change)}</td>
                      </tr>
                    </table>
                    ` : ''}
                  </div>
                </div>
              </div>
              
              ${qrCodeUrl && customer ? `
              <!-- QR Code section -->
              <div style="margin-top: 40px; text-align: center; padding: 30px; background-color: #f6f9fc; border-radius: 6px;">
                <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
                  SCAN THIS CODE AT THE ENTRANCE OF YOUR GYM
                </div>
                <div style="display: inline-block;">
                  <img src="${qrCodeUrl}" alt="Check-in QR Code" style="max-width: 180px; height: auto; display: block;" />
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
                ${org?.name ? `<p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">${org.name}</p>` : ''}
                ${org?.phone ? `<p style="margin: 0 0 4px 0; color: #6b7280; font-size: 12px;">Phone: ${org.phone}</p>` : ''}
                ${org?.addressLine ? `<p style="margin: 0 0 2px 0; color: #6b7280; font-size: 12px;">${org.addressLine}</p>` : ''}
                ${org?.suburb || org?.state || org?.postcode ? `
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    ${org?.suburb || ''}${org?.suburb && (org?.state || org?.postcode) ? ', ' : ''}${org?.state || ''}${org?.state && org?.postcode ? ' ' : ''}${org?.postcode || ''}
                  </p>
                ` : ''}
              </div>
              ` : ''}
              
              <!-- Email disclaimer -->
              <div style="text-align: center; margin-bottom: 40px;">
                <p style="margin: 0; color: #6b7280; font-size: 12px; line-height: 1.6;">
                  You're receiving this email because you made a purchase at ${org?.name || 'our store'}. 
                  Something wrong with the email? 
                  <a href="#" style="color: #3b82f6; text-decoration: none;">View it in your browser</a>.
                </p>
              </div>
              
              <!-- Powered by Cultcha -->
              <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e3e8ee;">
                <p style="margin: 0 0 12px 0; color: #6b7280; font-size: 12px;">
                  Powered By
                </p>
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}" 
                   target="_blank" 
                   style="text-decoration: none; display: inline-block;">
                  <img src="${process.env.EMAIL_ASSETS_DOMAIN || process.env.NEXT_PUBLIC_DOMAIN}/cultcha-logo-dark.png" 
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
${transaction.adjustments?.discounts?.items?.length > 0 ? 
  transaction.adjustments.discounts.items.map(discount => 
    `Discount (${discount.name}): -${formatCurrency(discount.amount)}`
  ).join('\n') : ''}
${transaction.adjustments?.credits?.amount > 0 ? 
  `Credit Applied: -${formatCurrency(transaction.adjustments.credits.amount)}` : ''}
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
      replyTo: 'noreply@cultcha.app',
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