import { clsx } from "clsx";
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function generateRandomPassword(length = 10) {
  const charset = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+[]{}|;:,.<>?";
  let password = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charset.length);
    password += charset[randomIndex];
  }

  return password;
}

export function generateObjectId() {
  const timestamp = Math.floor(Date.now() / 1000).toString(16); // 4-byte timestamp
  const random = 'xxxxxxxxxxxxxxxx'.replace(/[x]/g, () =>
    Math.floor(Math.random() * 16).toString(16)
  ); // 8 bytes random (machine + pid + counter)

  return timestamp + random;
}

/**
 * Validates PIN security rules
 * @param {string} pin - The PIN to validate
 * @returns {Object} - { isValid: boolean, errors: string[] }
 */
export const validatePinSecurity = (pin) => {
  const errors = []
  
  if (!pin || pin.length !== 4) {
    errors.push('PIN must be 4 digits')
    return { isValid: false, errors }
  }

  if (!/^\d{4}$/.test(pin)) {
    errors.push('PIN must contain only numbers')
    return { isValid: false, errors }
  }

  // Check for repeated digits (1111, 2222, etc.)
  if (/^(\d)\1{3}$/.test(pin)) {
    errors.push('PIN cannot be all the same digit')
  }

  // Check for sequential ascending patterns (1234, 5678, 0123, etc.)
  const digits = pin.split('').map(Number)
  let isSequentialAsc = true
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i-1] + 1) {
      isSequentialAsc = false
      break
    }
  }
  if (isSequentialAsc) {
    errors.push('PIN cannot be sequential numbers')
  }

  // Check for sequential descending patterns (4321, 8765, etc.)
  let isSequentialDesc = true
  for (let i = 1; i < digits.length; i++) {
    if (digits[i] !== digits[i-1] - 1) {
      isSequentialDesc = false
      break
    }
  }
  if (isSequentialDesc) {
    errors.push('PIN cannot be sequential numbers')
  }

  // Check for common weak patterns
  const weakPatterns = [
    '0000', '1111', '2222', '3333', '4444', '5555', '6666', '7777', '8888', '9999', // repeated
    '1234', '2345', '3456', '4567', '5678', '6789', '0123', // ascending
    '9876', '8765', '7654', '6543', '5432', '4321', '3210', '9210', // descending
    '1010', '2020', '1212', '2121', '3030', '4040', '5050', // alternating
    '0101', '1313', '2424', '3535', '4646', '5757', '6868', '7979', '8080', '9191' // alternating
  ]

  if (weakPatterns.includes(pin)) {
    errors.push('PIN is too predictable, please choose a more secure combination')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}