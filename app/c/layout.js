import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Customer Portal',
  description: 'Customer services and account management',
};

export default function CustomerLayout({ children }) {
  return (
    <div className={`${inter.className} min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100`}>
      {children}
    </div>
  );
}