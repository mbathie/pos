import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

export default async function Home() {
  // Check if user has a token cookie
  const cookieStore = await cookies()
  const token = cookieStore.get('token')
  
  // If no token, redirect to login
  if (!token) {
    redirect('/login')
  }
  
  // If authenticated, redirect to shop (or render homepage content)
  redirect('/shop')
}
