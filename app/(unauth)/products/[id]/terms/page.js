import PublicInfoPage from '../PublicInfoPage'
import './terms.css'

export default async function ProductTermsPage({ params }) {
  const { id } = await params

  // Fetch the data server-side
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/public/products/${id}/terms`, {
    cache: 'no-store'
  })

  if (!res.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-2">Terms Not Found</h1>
          <p className="text-muted-foreground">The terms and conditions for this product could not be found.</p>
        </div>
      </div>
    )
  }

  const data = await res.json()
  const { product, org, terms } = data

  return (
    <PublicInfoPage
      org={org}
      product={product}
      title="Terms & Conditions"
      html={terms}
      emptyTitle="No terms and conditions have been configured."
      emptyBody="Please contact the organization for more information."
    />
  )
}
