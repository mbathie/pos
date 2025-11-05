'use client'
import React, { useEffect, useState } from 'react'
// import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ChevronRight, Minus, Plus, Folder, Image as ImageIcon } from "lucide-react"
import { useHandler } from './useHandler'
import { useImmer } from 'use-immer'
import { useGlobals } from '@/lib/globals'
// import { calcCartValueShop } from '@/lib/product'
import colors from '@/lib/tailwind-colors';
import ProductDetail from './productDetail'
import { useRouter } from 'next/navigation';
import { SvgIcon } from '@/components/ui/svg-icon';

export default function Page({handleSetCat, selected, posCategories}) {
  const [categories, setCategories] = useState([])

  useEffect(() => {
    // If POS categories are provided, use them instead of fetching
    if (posCategories && posCategories.length > 0) {
      setCategories(posCategories)
      return
    }

    // Otherwise, fetch from old API
    async function start() {
      const res = await fetch(process.env.NEXT_PUBLIC_API_BASE_URL + '/api/categories?menu=shop');
      const c = await res.json();
      setCategories(c.categories);
      handleSetCat(c.categories[0])
    }
    start()
  },[posCategories])

  return (
    <div className="flex flex-col w-40 bg-accent rounded-tr-lg overflow-y-auto h-full">
      {categories.map((c, cIdx) => (
        <div key={cIdx} className={`${selected && c._id === selected._id ? 'bg-sidebar-accent-foreground text-black' : ''}`}>
          <Button
            variant="outline"
            onClick={async () => {
              await handleSetCat(c)
            }}
            className="hover:text-black w-full cursor-pointer h-12 rounded-none border-t-0 border-x-0 last:border-b-0 justify-start gap-2"
          >
            {c.thumbnail ? (
              <SvgIcon
                src={c.thumbnail}
                alt={c.name}
                className="size-6 flex-shrink-0 rounded-xs"
              />
            ) : (
              <ImageIcon className="size-6 flex-shrink-0" />
            )}
            <span>{c.name}</span>
          </Button>
        </div>
      ))}
    </div>
  )
}