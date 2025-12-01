'use client'

import { useEffect, useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, Loader2, ExternalLink } from "lucide-react"
import Image from "next/image"

export default function PaymentSuccessPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  const sessionId = searchParams.get('session_id')

  const [loading, setLoading] = useState(true)
  const [transaction, setTransaction] = useState(null)

  useEffect(() => {
    const fetchTransactionInfo = async () => {
      if (!params?.id || !token) {
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/unauth/payment/${params.id}?token=${token}`)

        if (res.ok) {
          const data = await res.json()
          setTransaction(data.transaction)
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
      } finally {
        setLoading(false)
      }
    }

    // Small delay to allow webhook to process
    const timer = setTimeout(fetchTransactionInfo, 2000)
    return () => clearTimeout(timer)
  }, [params.id, token])

  if (loading) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <div className="text-lg text-center">Processing your payment...</div>
        <p className="text-sm text-muted-foreground">
          Please wait while we confirm your payment
        </p>
      </div>
    )
  }

  const isPaid = transaction?.invoiceStatus === 'paid'
  const remainingBalance = transaction?.invoiceAmountDue || 0

  return (
    <div className="flex flex-col items-center gap-6 mt-10 max-w-2xl mx-auto p-4">
      {transaction?.org?.logo && (
        <div className="relative w-48 h-16 border rounded-lg overflow-hidden">
          <Image
            src={transaction.org.logo}
            alt={transaction.org.name}
            fill
            className="object-contain"
          />
        </div>
      )}

      <CheckCircle2 className="h-16 w-16 text-primary" />

      <div className="text-center">
        <h1 className="text-2xl font-semibold mb-2">Payment Successful!</h1>
        <p className="text-muted-foreground">
          Thank you for your payment
        </p>
      </div>

      {transaction && (
        <Card className="w-full">
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Total Invoice Amount:</span>
                <span>${transaction.total?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Total Paid:</span>
                <span className="text-primary">
                  ${(transaction.invoiceAmountPaid || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t">
                <span>Remaining Balance:</span>
                <span>
                  ${remainingBalance.toFixed(2)}
                </span>
              </div>
            </div>

            {isPaid ? (
              <div className="bg-primary/10 text-primary p-4 rounded-md text-center">
                <p>Invoice Paid in Full!</p>
                <p className="text-sm mt-1">Thank you for completing your payment.</p>
              </div>
            ) : (
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground text-center">
                  You can make additional payments using this same link until the invoice is paid in full.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2 w-full max-w-md">
        {!isPaid && token && (
          <Button
            className="w-full cursor-pointer"
            onClick={() => window.location.href = `/pay/${params.id}?token=${token}`}
          >
            Make Another Payment
          </Button>
        )}

        {transaction?.invoiceUrl && (
          <Button
            variant="outline"
            className="w-full cursor-pointer"
            onClick={() => window.open(transaction.invoiceUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View Invoice in Stripe
          </Button>
        )}
      </div>

      <p className="text-xs text-center text-muted-foreground max-w-md">
        A confirmation email has been sent to your registered email address.
        If you have any questions, please contact {transaction?.org?.name || 'support'}.
      </p>
    </div>
  )
}
