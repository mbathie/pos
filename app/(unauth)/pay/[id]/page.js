'use client'

import { useState, useEffect } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { Loader2, CreditCard, CheckCircle2 } from "lucide-react"
import Image from "next/image"

export default function PaymentPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [transaction, setTransaction] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchTransactionInfo = async () => {
      if (!params?.id || !token) {
        setError('Invalid payment link')
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`/api/unauth/payment/${params.id}?token=${token}`)

        if (res.ok) {
          const data = await res.json()
          setTransaction(data.transaction)
          // Pre-fill with minimum payment amount or full amount if less
          const minPayment = data.transaction.minPaymentAmount || 0.01
          const amountDue = data.transaction.invoiceAmountDue || 0
          setAmount(Math.min(minPayment, amountDue).toFixed(2))
        } else {
          const error = await res.json()
          setError(error.message || "Failed to load payment information")
        }
      } catch (error) {
        console.error('Error fetching transaction:', error)
        setError("Failed to load payment information")
      } finally {
        setLoading(false)
      }
    }

    fetchTransactionInfo()
  }, [params.id, token])

  const handleSubmit = async (e) => {
    e.preventDefault()

    const paymentAmount = parseFloat(amount)
    const minPayment = transaction.minPaymentAmount || 0.01

    // Validation
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    if (paymentAmount < minPayment) {
      toast.error(`Minimum payment amount is $${minPayment.toFixed(2)} (${transaction.minPaymentPercent}% of invoice total)`)
      return
    }

    if (paymentAmount > transaction.invoiceAmountDue) {
      toast.error(`Amount cannot exceed remaining balance of $${transaction.invoiceAmountDue.toFixed(2)}`)
      return
    }

    setSubmitting(true)

    try {
      const res = await fetch(`/api/unauth/payment/${params.id}/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: paymentAmount,
          token
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.message || "Failed to create checkout session")
      }

      const { url } = await res.json()

      // Redirect to Stripe Checkout
      window.location.href = url

    } catch (error) {
      console.error('Error creating checkout:', error)
      toast.error(error.message || "Failed to process payment")
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div className="text-lg text-center">Loading payment information...</div>
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <div className="text-lg text-center text-destructive">
          {error || 'Invalid payment link'}
        </div>
        <p className="text-sm text-muted-foreground">
          This link may have expired or is invalid.
        </p>
      </div>
    )
  }

  // Show success if fully paid
  if (transaction.invoiceStatus === 'paid') {
    return (
      <div className="flex flex-col gap-4 mt-10 items-center">
        <CheckCircle2 className="h-16 w-16 text-primary" />
        <div className="text-lg text-center">Invoice Paid in Full!</div>
        <p className="text-sm text-muted-foreground">
          Thank you for your payment.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 flex flex-col items-center gap-4 max-w-2xl mx-auto">
      <div className="text-center mb-4 w-full flex flex-col items-center gap-3">
        {transaction.org?.logo && (
          <div className="relative w-48 h-16 border rounded-lg overflow-hidden">
            <Image
              src={transaction.org.logo}
              alt={transaction.org.name}
              fill
              className="object-contain"
            />
          </div>
        )}
        <div>
          <h1 className="text-xl font-semibold mb-2">
            Payment for <span className="underline">{transaction.org?.name || 'Invoice'}</span>
          </h1>
          <p className="text-sm text-muted-foreground">
            {transaction.company?.name || 'Company Payment'}
          </p>
        </div>
      </div>

      {/* Invoice Summary */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Invoice Summary</CardTitle>
          <CardDescription>
            Invoice #{transaction._id?.slice(-8).toUpperCase()}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between">
            <span>Total Amount:</span>
            <span>${transaction.total?.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span>Amount Paid:</span>
            <span className="text-primary">
              ${(transaction.invoiceAmountPaid || 0).toFixed(2)}
            </span>
          </div>
          <div className="flex justify-between pt-2 border-t">
            <span>Remaining Balance:</span>
            <span>
              ${transaction.invoiceAmountDue?.toFixed(2)}
            </span>
          </div>

          {transaction.invoiceAmountPaid > 0 && (
            <div className="mt-4 p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">
                Status: <span className="capitalize">{transaction.invoiceStatus}</span>
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Form */}
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Make a Payment</CardTitle>
          <CardDescription>
            {transaction.minPaymentAmount > 0.01 && transaction.minPaymentAmount < transaction.invoiceAmountDue ? (
              <>Minimum payment: ${transaction.minPaymentAmount?.toFixed(2)} ({transaction.minPaymentPercent}% of invoice)</>
            ) : (
              <>Enter the amount you would like to pay (up to ${transaction.invoiceAmountDue?.toFixed(2)})</>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Payment Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={transaction.minPaymentAmount || 0.01}
                  max={transaction.invoiceAmountDue}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="pl-7"
                  required
                  disabled={submitting}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {transaction.minPaymentAmount > 0.01 && transaction.minPaymentAmount < transaction.invoiceAmountDue
                  ? `Minimum ${transaction.minPaymentPercent}% deposit required. Additional payments can be made after.`
                  : 'You can make multiple payments until the invoice is paid in full'}
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount((transaction.minPaymentAmount || transaction.invoiceAmountDue / 2).toFixed(2))}
                disabled={submitting}
                className="cursor-pointer flex-1"
              >
                Pay Minimum
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAmount(transaction.invoiceAmountDue.toFixed(2))}
                disabled={submitting}
                className="cursor-pointer flex-1"
              >
                Pay Full Amount
              </Button>
            </div>

            <Button
              type="submit"
              className="w-full cursor-pointer"
              size="lg"
              disabled={submitting || !amount || parseFloat(amount) <= 0 || parseFloat(amount) < (transaction.minPaymentAmount || 0.01)}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Continue to Payment
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-muted-foreground max-w-md">
        You will be redirected to Stripe's secure payment page to complete your transaction.
        Your payment will be automatically applied to this invoice.
      </p>
    </div>
  )
}
