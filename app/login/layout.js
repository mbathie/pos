import Footer from '@/components/footer'

export default function Layout({ children }) {
  
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-lime-200 via-emerald-200 to-emerald-100">

      <div className='max-w-6xl mx-auto w-full'>
        <header className="text-black px-8 sticky items-center flex top-0 bg-accent- h-16 font-rochester font-semibold text-4xl tracking-wider">
          <div>Cultcha</div>
        </header>

        <div className="mt-20">
          {children}
        </div>

        <div className='flex-1' />
      </div>

      <Footer />
    </div>
  );
}
