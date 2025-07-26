import Footer from '@/components/footer'

export default function Layout({ children }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
