import { Suspense } from 'react'
import CheckInClient from './CheckInClient'
import { Loader2 } from 'lucide-react'

export default function CheckInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckInClient />
    </Suspense>
  )
}