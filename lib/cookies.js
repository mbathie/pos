import { SignJWT } from "jose"
import { cookies } from "next/headers"
import crypto from 'crypto'

const SECRET_KEY = new TextEncoder().encode(process.env.JWT_SECRET)

/**
 * Generate a unique browser ID
 */
export function generateBrowserId() {
  return `browser_${crypto.randomBytes(12).toString('hex')}`
}

/**
 * Create a JWT token with the provided payload
 */
export async function createJWT({ employeeId, orgId, selectedLocationId, email }) {
  return await new SignJWT({
    employeeId: employeeId.toString(),
    orgId: orgId.toString(),
    selectedLocationId: selectedLocationId.toString(),
    email,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("1y")
    .sign(SECRET_KEY)
}

/**
 * Set the authentication token cookie
 */
export async function setAuthCookie(token) {
  const cookieStore = await cookies()
  cookieStore.set("token", token, { 
    httpOnly: true, 
    secure: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000 // 1 year
  })
}

/**
 * Set the browser ID cookie
 */
export async function setBrowserIdCookie(browserId) {
  const cookieStore = await cookies()
  cookieStore.set("browser_id", browserId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000 * 10 // 10 years (effectively permanent)
  })
}

/**
 * Set the POS location ID cookie
 */
export async function setPosLocationCookie(locationId) {
  const cookieStore = await cookies()
  cookieStore.set("pos_location_id", locationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 31536000 * 10 // 10 years (effectively permanent)
  })
}

/**
 * Get or generate browser ID from cookies
 */
export async function getOrCreateBrowserId() {
  const cookieStore = await cookies()
  let browserId = cookieStore.get('browser_id')?.value
  
  if (!browserId) {
    browserId = generateBrowserId()
    await setBrowserIdCookie(browserId)
  }
  
  return browserId
}

/**
 * Delete the POS location cookie
 */
export async function deletePosLocationCookie() {
  const cookieStore = await cookies()
  cookieStore.delete("pos_location_id")
}

/**
 * Get browser ID from cookies
 */
export async function getBrowserId() {
  const cookieStore = await cookies()
  return cookieStore.get('browser_id')?.value
}

/**
 * Get POS location ID from cookies
 */
export async function getPosLocationId() {
  const cookieStore = await cookies()
  return cookieStore.get('pos_location_id')?.value
}

/**
 * Update JWT token with new location and set all related cookies
 */
export async function updateAuth({ employee, locationId, browserId }) {
  // Create new JWT with updated location
  const token = await createJWT({
    employeeId: employee._id,
    orgId: employee.org._id,
    selectedLocationId: locationId,
    email: employee.email
  })
  
  // Set all cookies
  await setAuthCookie(token)
  if (browserId) {
    await setBrowserIdCookie(browserId)
  }
  await setPosLocationCookie(locationId)
  
  return token
}