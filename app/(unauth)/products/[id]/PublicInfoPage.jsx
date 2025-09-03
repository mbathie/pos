import { Card, CardContent } from '@/components/ui/card'

export default function PublicInfoPage({
  org,
  product,
  title,
  html,
  emptyTitle = 'No content available',
  emptyBody = 'Please contact the organization for more information.',
}) {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Top row: org logo left, product name + thumbnail right */}
        <div className="mb-6 flex items-center justify-between gap-4">
          {org?.logo && (
            <img
              src={org.logo}
              alt={org.name || 'Organization'}
              className="h-9 md:h-12 rounded-lg object-contain"
            />
          )}
          {product && (
            <div className="ml-auto flex items-center gap-3">
              <div className="text-right">
                <div className="text-base md:text-lg font-semibold truncate max-w-[50vw]">{product?.name}</div>
              </div>
              {product?.thumbnail && (
                <img
                  src={product.thumbnail}
                  alt={product.name}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-md object-cover ring-1 ring-border shadow-sm"
                />
              )}
            </div>
          )}
        </div>

        {/* Page title */}
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{title}</h1>
        </div>

        {/* Rich content */}
        <Card>
          <CardContent>
            {html ? (
              <div
                className="rich-content max-w-prose"
                dangerouslySetInnerHTML={{ __html: html }}
              />
            ) : (
              <div className="text-center text-muted-foreground py-12">
                <p>{emptyTitle}</p>
                <p className="mt-2">{emptyBody}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {org?.name && (
            <>
              <p className="font-medium">{org.name}</p>
              {org?.addressLine && <p>{org.addressLine}</p>}
              {(org?.suburb || org?.state || org?.postcode) && (
                <p>
                  {org?.suburb && org.suburb}
                  {org?.suburb && org?.state && ', '}
                  {org?.state && org.state}
                  {org?.state && org?.postcode && ' '}
                  {org?.postcode && org.postcode}
                </p>
              )}
              {org?.phone && <p>Phone: {org.phone}</p>}
              <p className="mt-2">© {new Date().getFullYear()} {org.name}. All rights reserved.</p>
            </>
          )}
        </div>

        {/* Powered by Cultcha */}
        <a
          href={process.env.NEXT_PUBLIC_DOMAIN}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-12 pb-8 flex flex-col items-center gap-3 no-underline"
        >
          <div className="text-xs text-muted-foreground">Powered by</div>
          <img src="/cultcha-logo-dark.png" alt="Cultcha" className="h-8 object-contain" />
        </a>
      </div>
    </div>
  )
}

