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