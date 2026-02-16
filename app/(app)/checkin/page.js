import { Suspense } from 'react'
import CheckInClient from './CheckInClient'

export default function CheckInPage() {
  return (
    <Suspense>
      <CheckInClient />
    </Suspense>
  )
}