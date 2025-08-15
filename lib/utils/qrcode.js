import QRCode from 'qrcode';

/**
 * Generate QR code as data URL
 * @param {string} text - Text to encode in QR code
 * @param {Object} options - QR code options
 * @returns {Promise<string>} - Data URL of QR code image
 */
export async function generateQRCode(text, options = {}) {
  try {
    const defaultOptions = {
      width: 200,
      margin: 2,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    };
    
    const qrCodeDataUrl = await QRCode.toDataURL(text, {
      ...defaultOptions,
      ...options
    });
    
    return qrCodeDataUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
}

/**
 * Generate customer QR code
 * @param {string} customerId - Customer ID to encode
 * @returns {Promise<string>} - Data URL of QR code image
 */
export async function generateCustomerQRCode(customerId) {
  // Encode customer ID in QR code
  // This can be scanned at the gym for check-in
  return generateQRCode(customerId, {
    width: 250,
    margin: 3
  });
}