'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  Building2,
  CreditCard,
  Package,
  MapPin,
  Users,
  FileText,
  Receipt,
  Calculator
} from 'lucide-react'

const settingsSections = [
  { id: 'organization', label: 'Organization', icon: Building2, href: '/settings' },
  { id: 'payments', label: 'Payments', icon: CreditCard, href: '/settings/payments' },
  { id: 'products', label: 'Products', icon: Package, href: '/settings/products' },
  { id: 'locations', label: 'Locations', icon: MapPin, href: '/settings/locations' },
  { id: 'customer', label: 'Customer', icon: Users, href: '/settings/customer' },
  { id: 'receipts', label: 'Receipts', icon: Receipt, href: '/settings/receipts' },
  { id: 'financial', label: 'Financial', icon: Calculator, href: '/settings/financial' },
  { id: 'legal', label: 'Legal', icon: FileText, href: '/settings/legal' },
]

export default function SettingsLayout({ children }) {
  const pathname = usePathname()

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* Sidebar */}
      <div className="w-64 sticky top-0">
        <div className="pl-8 pt-4">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>
          <nav className="space-y-1">
            {settingsSections.map((section) => {
              const Icon = section.icon
              const isActive = pathname === section.href

              return (
                <Link
                  key={section.id}
                  href={section.href}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors cursor-pointer",
                    "hover:bg-muted/50",
                    isActive ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{section.label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 py-4 max-w-4xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  )
}