import Image from 'next/image'

export default function AuthLayout({ children }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="flex flex-col gap-12 lg:gap-20 pt-12 lg:pt-16 px-6 sm:px-8 lg:px-12">
        <div className="flex justify-center items-center mx-auto">
          <Image
            src="/cultcha-logo-dark.png"
            alt="Cultcha Point of Sale"
            width={320}
            height={120}
            priority
            className="h-auto w-[180px] sm:w-[220px] md:w-[200px]"
          />
        </div>
        <div className="flex flex-1 justify-center">
          {children}
        </div>
      </div>
      <div className="relative hidden lg:block">
        <Image
          src="https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=2070"
          alt="Woman bouldering in climbing gym"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-black/25" />
      </div>
    </div>
  )
}
