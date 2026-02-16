import QRCode from 'qrcode';
import dayjs from 'dayjs';
import { sendEmail, getFromAddress } from '../mailer.js';
import { generateEmailLayout } from './common-layout.js';

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
      ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
      : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="color: #424770; font-size: 15px; vertical-align: top;">
            ${product.name}
            ${product.item?.variation ? ` - ${product.item.variation}` : ''}
            ${modifiers ? `<div style="color: #8898aa; font-size: 13px; margin-top: 2px;">+ ${modifiers}</div>` : ''}
            ${product.qty > 1 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 2px;">Quantity: ${product.qty}</div>` : ''}
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
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

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
            <div style="color: #424770; font-size: 15px;">
              Class: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
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
                  font-size: 13px;
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
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
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
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

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
            <div style="color: #424770; font-size: 15px;">
              Course: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
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
                font-weight: normal;
                letter-spacing: 0.3px;
              ">
                🚀 Starts: ${startDate}
              </span>
            </div>
          ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
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
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

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
            <div style="color: #424770; font-size: 15px;">
              Membership: ${product.name}
          </div>
          ${product._id ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
                View Terms & Conditions →
              </a>
            </div>
          ` : ''}
          ${product._id && product.instructionsContent ? `
            <div style="margin-top: 4px;">
              <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions"
                 style="color: #10b981; font-size: 13px; text-decoration: none;">
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
                font-weight: normal;
                letter-spacing: 0.3px;
              ">
                💳 ${billingPeriod} Subscription
              </span>
            </div>
          ` : ''}
            ${subscribers.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Subscribers: ${subscribers.join(', ')}</div>` : ''}
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
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

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
            <div style="color: #424770; font-size: 15px;">
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
                  font-weight: normal;
                  letter-spacing: 0.3px;
                ">
                  🎟️ ${durations} Pass
                </span>
              </div>
            ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
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
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

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
            <div style="color: #424770; font-size: 15px;">
              ${product.name}
            </div>
            ${product._id ? `
              <div style="margin-top: 4px;">
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/terms"
                   style="color: #10b981; font-size: 13px; text-decoration: none;">
                  View Terms & Conditions →
                </a>
              </div>
            ` : ''}
            ${product._id && product.instructionsContent ? `
              <div style="margin-top: 4px;">
                <a href="${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}/instructions"
                   style="color: #10b981; font-size: 13px; text-decoration: none;">
                  View Instructions →
                </a>
              </div>
            ` : ''}
            ${attendees.length > 0 ? `<div style="color: #8898aa; font-size: 13px; margin-top: 6px;">Attendees: ${attendees.join(', ')}</div>` : ''}
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
 * Generate HTML for prepaid pass entries
 * @param {Array} products - Prepaid products
 * @param {boolean} isGrouped - Whether products are part of a group
 * @returns {string} - HTML string
 */
function generatePrepaidEntriesHTML(products, isGrouped = false) {
  if (!products || products.length === 0) return '';

  let html = '';

  const priceStyle = isGrouped
    ? 'text-align: right; color: #9ca3af; font-size: 15px; vertical-align: top; text-decoration: line-through;'
    : 'text-align: right; color: #424770; font-size: 15px; vertical-align: top;';

  products.forEach((product, index) => {
    const passCount = product.passes || product.totalPasses || '';
    const redeemableProducts = product.products || [];

    html += `
      <table width="100%" cellpadding="0" cellspacing="0" style="padding: ${isGrouped ? '6px 0' : '12px 0'}; ${index > 0 ? 'border-top: 1px solid #e3e8ee;' : ''}">
        <tr>
          <td style="vertical-align: top;">
            <div style="color: #424770; font-size: 15px;">
              Prepaid Pass: ${product.name}
            </div>
            ${passCount ? `
              <div style="margin-top: 8px;">
                <span style="
                  display: inline-block;
                  background: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
                  color: white;
                  padding: 4px 10px;
                  border-radius: 6px;
                  font-size: 13px;
                  font-weight: normal;
                  letter-spacing: 0.3px;
                ">
                  ${passCount} passes
                </span>
              </div>
            ` : ''}
            ${redeemableProducts.length > 0 ? `
              <div style="color: #8898aa; font-size: 13px; margin-top: 6px;">
                Redeemable for: ${redeemableProducts.map(p => p.name).join(', ')}
              </div>
            ` : ''}
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
        <td style="color: #424770; font-size: 15px; vertical-align: top; font-weight: 500;">
          ${group.groupName}
        </td>
        <td style="text-align: right; color: #424770; font-size: 15px; vertical-align: top; font-weight: 500;">
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
 * @param {number} params.paymentAmount - Optional partial payment amount (for invoice payments)
 * @returns {Promise} - Email send result
 */
export async function sendTransactionReceipt({ transaction, recipientEmail, org, paymentAmount }) {
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
    const needsQRCode = productsByType.class || productsByType.course || productsByType.membership || productsByType.general || productsByType.prepaid;
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

      if (groupProductsByType.prepaid) {
        productsHTML += generatePrepaidEntriesHTML(groupProductsByType.prepaid, true);
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

    if (productsByType.prepaid) {
      productsHTML += generatePrepaidEntriesHTML(productsByType.prepaid, false);
    }

    // Look up prepaid passes created for this transaction
    const { PrepaidPass } = await import('@/models');
    const prepaidPasses = await PrepaidPass.find({ transaction: transaction._id }).lean();

    // Build email content section
    const content = `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
        <tr>
          <td style="width: 33.33%; vertical-align: top;">
            <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
              ${paymentAmount ? 'PAYMENT AMOUNT' : 'PAID'}
            </div>
            <div style="font-size: 15px; font-weight: normal; color: #424770;">
              ${formatCurrency(paymentAmount || transaction.total)}
            </div>
          </td>
          <td style="width: 33.33%; text-align: center; vertical-align: top;">
            <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
              DATE
            </div>
            <div style="font-size: 15px; font-weight: normal; color: #424770;">
              ${dayjs(transaction.createdAt).format('DD/MM/YY')}
            </div>
          </td>
          <td style="width: 33.33%; text-align: right; vertical-align: top;">
            <div style="color: #8898aa; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; min-height: 32px;">
              METHOD
            </div>
            <div style="font-size: 15px; font-weight: normal; color: #424770;">
              ${transaction.paymentMethod === 'card' || transaction.paymentMethod === 'stripe' ?
                'Card – ••••' + (transaction.stripe?.paymentIntent?.charges?.data?.[0]?.payment_method_details?.card?.last4 || '') :
                transaction.paymentMethod === 'cash' ? 'Cash' :
                transaction.paymentMethod === 'company' || transaction.paymentMethod === 'invoice' ? 'Card' :
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
                <td style="color: #424770; font-size: 15px;">Subtotal</td>
                <td style="text-align: right; color: #424770; font-size: 15px;">${formatCurrency(transaction.subtotal)}</td>
              </tr>
            </table>
            ${transaction.adjustments?.discounts?.items?.length > 0 ?
              transaction.adjustments.discounts.items.map(discount => `
                <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                  <tr>
                    <td style="color: #32c832; font-size: 15px;">Discount (${discount.name})</td>
                    <td style="text-align: right; color: #32c832; font-size: 15px;">-${formatCurrency(discount.amount)}</td>
                  </tr>
                </table>
              `).join('') : ''
            }
            ${transaction.adjustments?.credits?.amount > 0 ? `
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
                <tr>
                  <td style="color: #32c832; font-size: 15px;">Credit Applied</td>
                  <td style="text-align: right; color: #32c832; font-size: 15px;">-${formatCurrency(transaction.adjustments.credits.amount)}</td>
                </tr>
              </table>
            ` : ''}
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 12px;">
              <tr>
                <td style="color: #424770; font-size: 15px;">Tax</td>
                <td style="text-align: right; color: #424770; font-size: 15px;">${formatCurrency(transaction.tax)}</td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 16px; padding-top: 16px; border-top: 2px solid #e3e8ee;">
              <tr>
                <td style="color: #424770; font-size: 15px; font-weight: 500;">Total</td>
                <td style="text-align: right; color: #424770; font-size: 15px; font-weight: 500;">${formatCurrency(transaction.total)}</td>
              </tr>
            </table>
            ${transaction.paymentMethod === 'cash' && transaction.cash ? `
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 12px;">
              <tr>
                <td style="color: #424770; font-size: 15px;">Cash Tendered</td>
                <td style="text-align: right; color: #424770; font-size: 15px;">${formatCurrency(transaction.cash.received)}</td>
              </tr>
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top: 8px;">
              <tr>
                <td style="color: #424770; font-size: 15px;">Change</td>
                <td style="text-align: right; color: #424770; font-size: 15px;">${formatCurrency(transaction.cash.change)}</td>
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
        <div style="color: #8898aa; font-size: 15px; margin-top: 15px;">
          ${customer.memberId ? `Member ID: ${customer.memberId}` : ''}
        </div>
      </div>
      ` : ''}

      ${prepaidPasses.length > 0 ? prepaidPasses.map(pass => {
        const passQrUrl = `${process.env.EMAIL_ASSETS_DOMAIN || process.env.NEXT_PUBLIC_API_BASE_URL}/api/prepaid-passes/${pass.code}/qrcode`;
        return `
      <!-- Prepaid Pass QR Code -->
      <div style="margin-top: 40px; text-align: center; padding: 30px; background-color: #f6f9fc; border-radius: 6px;">
        <div style="color: #8898aa; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 20px;">
          PREPAID PASS
        </div>
        <div style="display: inline-block;">
          <img src="${passQrUrl}" alt="Prepaid Pass QR Code" style="max-width: 180px; height: auto; display: block;" />
        </div>
        <div style="color: #424770; font-size: 15px; font-weight: 500; margin-top: 15px;">
          Code: ${pass.code}
        </div>
        <div style="color: #8898aa; font-size: 15px; margin-top: 5px;">
          Remaining: ${pass.remainingPasses} passes
        </div>
      </div>`;
      }).join('') : ''}
    `;

    // Build email HTML using common layout
    const emailHTML = generateEmailLayout({
      content,
      org,
      title: `Receipt from ${org?.name || 'POS System'}`,
      headerText: `Receipt from ${org?.name || 'POS System'}`,
      subHeaderText: `Receipt #${transaction._id.toString().slice(-8).toUpperCase()}`
    });

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