import nodemailer from 'nodemailer';
import QRCode from 'qrcode';
import dayjs from 'dayjs';

// Create transporter using Ethereal email (for testing)
// TODO: Replace with actual SMTP configuration in production
const transporter = nodemailer.createTransporter({
    host: 'smtp.ethereal.email',
    port: 587,
    auth: {
        user: 'selena.towne84@ethereal.email',
        pass: 'EfJ93qsfKmK8csavf9'
    }
});

/**
 * Generate QR code as data URL
 * @param {string} text - Text to encode in QR code
 * @returns {Promise<string>} - Data URL of QR code image
 */
async function generateQRCode(text) {
  try {
    const dataUrl = await QRCode.toDataURL(text, {
      width: 200,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });
    return dataUrl;
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
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Shop Items</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Item</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Variation</th>
            <th style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">Qty</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">Amount</th>
          </tr>
        </thead>
        <tbody>`;
  
  products.forEach(product => {
    const modifiers = product.item?.mods?.map(mod => 
      `${mod.name}${mod.amount && parseFloat(mod.amount) > 0 ? ` (+${formatCurrency(mod.amount)})` : ''}`
    ).join(', ') || '';
    
    html += `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">
          <strong>${product.name}</strong>
          ${modifiers ? `<br><small style="color: #6c757d;">+ ${modifiers}</small>` : ''}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6;">${product.item?.variation || '-'}</td>
        <td style="padding: 10px; text-align: center; border-bottom: 1px solid #dee2e6;">${product.qty}</td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">${formatCurrency(product.amount?.subtotal)}</td>
      </tr>`;
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
  return html;
}

/**
 * Generate HTML for class bookings
 * @param {Array} products - Class products
 * @returns {string} - HTML string
 */
function generateClassBookingsHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Class Bookings</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Class</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Date & Time</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Attendees</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">Amount</th>
          </tr>
        </thead>
        <tbody>`;
  
  products.forEach(product => {
    const dates = [];
    const attendees = [];
    
    product.variations?.forEach(variation => {
      // Get selected times
      variation.timesCalc?.filter(time => time.selected).forEach(time => {
        dates.push(dayjs(time.value).format('DD/MM/YYYY h:mm A'));
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
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          <strong>${product.name}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${dates.join('<br>') || '-'}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${attendees.join('<br>') || '-'}
        </td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${formatCurrency(product.amount?.subtotal)}
        </td>
      </tr>`;
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
  return html;
}

/**
 * Generate HTML for courses
 * @param {Array} products - Course products
 * @returns {string} - HTML string
 */
function generateCoursesHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Courses</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Course</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Start Date</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Attendees</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">Amount</th>
          </tr>
        </thead>
        <tbody>`;
  
  products.forEach(product => {
    const startDate = product.variations?.[0]?.times?.[0]?.start 
      ? dayjs(product.variations[0].times[0].start).format('DD/MM/YYYY h:mm A')
      : '-';
    
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
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          <strong>${product.name}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${startDate}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${attendees.join('<br>') || '-'}
        </td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${formatCurrency(product.amount?.subtotal)}
        </td>
      </tr>`;
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
  return html;
}

/**
 * Generate HTML for memberships
 * @param {Array} products - Membership products
 * @returns {string} - HTML string
 */
function generateMembershipsHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Membership Subscriptions</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Membership</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Billing Period</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Subscribers</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">Amount</th>
          </tr>
        </thead>
        <tbody>`;
  
  products.forEach(product => {
    let billingPeriod = '-';
    
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
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          <strong>${product.name}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${billingPeriod}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${subscribers.join('<br>') || '-'}
        </td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${formatCurrency(product.amount?.subtotal)}
        </td>
      </tr>`;
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
  return html;
}

/**
 * Generate HTML for casual entries
 * @param {Array} products - Casual products
 * @returns {string} - HTML string
 */
function generateCasualEntriesHTML(products) {
  if (!products || products.length === 0) return '';
  
  let html = `
    <div style="margin-bottom: 30px;">
      <h3 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">Casual Entries</h3>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <thead>
          <tr style="background-color: #f8f9fa;">
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Entry Pass</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Duration</th>
            <th style="padding: 10px; text-align: left; border-bottom: 1px solid #dee2e6;">Attendees</th>
            <th style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6;">Amount</th>
          </tr>
        </thead>
        <tbody>`;
  
  products.forEach(product => {
    const durations = product.variations?.map(v => `${v.name} ${v.unit}`).join(', ') || '-';
    
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
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          <strong>${product.name}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${durations}
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${attendees.join('<br>') || '-'}
        </td>
        <td style="padding: 10px; text-align: right; border-bottom: 1px solid #dee2e6; vertical-align: top;">
          ${formatCurrency(product.amount?.subtotal)}
        </td>
      </tr>`;
  });
  
  html += `
        </tbody>
      </table>
    </div>`;
  
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

    // Determine if we need to generate QR code (for classes, courses, or memberships)
    const needsQRCode = productsByType.class || productsByType.course || productsByType.membership;
    let qrCodeDataUrl = null;
    
    // Get customer for QR code
    const customer = transaction.customer;
    if (needsQRCode && customer?._id) {
      qrCodeDataUrl = await generateQRCode(customer._id.toString());
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

    // Build email HTML
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Transaction Receipt</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
          <h1 style="margin: 0;">${org?.name || 'Receipt'}</h1>
          <p style="margin: 5px 0;">Transaction Confirmation</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">
          <h2 style="color: #333; margin-top: 0;">Thank you for your purchase!</h2>
          <p>Your transaction has been successfully processed.</p>
          
          <div style="background-color: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Transaction ID:</strong></td>
                <td style="text-align: right;">${transaction._id}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Date:</strong></td>
                <td style="text-align: right;">${dayjs(transaction.createdAt).format('DD/MM/YYYY h:mm A')}</td>
              </tr>
              <tr>
                <td style="padding: 5px 0;"><strong>Payment Method:</strong></td>
                <td style="text-align: right;">${transaction.paymentMethod === 'stripe' ? 'Card' : 'Cash'}</td>
              </tr>
              ${customer ? `
              <tr>
                <td style="padding: 5px 0;"><strong>Customer:</strong></td>
                <td style="text-align: right;">${customer.name || 'Guest'}</td>
              </tr>
              ` : ''}
            </table>
          </div>
        </div>
        
        <div style="padding: 20px; background-color: white; border-left: 1px solid #dee2e6; border-right: 1px solid #dee2e6;">
          ${productsHTML}
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #dee2e6;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 5px 0;"><strong>Subtotal:</strong></td>
                <td style="text-align: right;">${formatCurrency(transaction.subtotal)}</td>
              </tr>
              ${transaction.discountAmount > 0 ? `
              <tr>
                <td style="padding: 5px 0;"><strong>Discount:</strong></td>
                <td style="text-align: right; color: #28a745;">-${formatCurrency(transaction.discountAmount)}</td>
              </tr>
              ` : ''}
              <tr>
                <td style="padding: 5px 0;"><strong>Tax:</strong></td>
                <td style="text-align: right;">${formatCurrency(transaction.tax)}</td>
              </tr>
              <tr style="font-size: 1.2em; font-weight: bold; border-top: 2px solid #dee2e6;">
                <td style="padding: 10px 0 5px 0;">Total:</td>
                <td style="text-align: right; padding: 10px 0 5px 0; color: #007bff;">
                  ${formatCurrency(transaction.total)}
                </td>
              </tr>
            </table>
          </div>
          
          ${qrCodeDataUrl && customer ? `
          <div style="margin-top: 30px; padding: 20px; background-color: #f8f9fa; border-radius: 5px; text-align: center;">
            <h3 style="color: #333; margin-bottom: 15px;">Your Check-in QR Code</h3>
            <p style="margin-bottom: 15px;">Present this QR code at check-in for quick access:</p>
            <img src="${qrCodeDataUrl}" alt="Check-in QR Code" style="max-width: 200px; height: auto;" />
            <p style="margin-top: 15px; font-size: 0.9em; color: #6c757d;">
              Customer ID: ${customer._id}<br>
              ${customer.memberId ? `Member ID: ${customer.memberId}` : ''}
            </p>
          </div>
          ` : ''}
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border: 1px solid #dee2e6; border-radius: 0 0 5px 5px;">
          <p style="margin: 0; color: #6c757d; font-size: 0.9em;">
            ${org?.name || 'Thank you for your business'}<br>
            ${org?.email ? `Email: ${org.email}` : ''}<br>
            ${org?.phone ? `Phone: ${org.phone}` : ''}
          </p>
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
Customer ID: ${customer._id}
${customer.memberId ? `Member ID: ${customer.memberId}` : ''}
Use the QR code in the HTML version for quick check-in.
` : ''}

${org?.name || 'Thank you for your business'}
${org?.email ? `Email: ${org.email}` : ''}
${org?.phone ? `Phone: ${org.phone}` : ''}
    `.trim();

    // Send email
    const mailOptions = {
      from: `"${org?.name || 'POS System'}" <selena.towne84@ethereal.email>`,
      to: recipientEmail,
      subject: `Receipt - ${org?.name || 'Transaction'} #${transaction._id.toString().slice(-8).toUpperCase()}`,
      text: emailText,
      html: emailHTML
    };

    const info = await transporter.sendMail(mailOptions);
    
    console.log('Receipt email sent:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    
    return {
      success: true,
      messageId: info.messageId,
      previewUrl: nodemailer.getTestMessageUrl(info)
    };
    
  } catch (error) {
    console.error('Error sending receipt email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}