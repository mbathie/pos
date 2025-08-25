'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useGlobals } from '@/lib/globals'
import { useHandler } from '../useHandler'
import { useClass } from './useClass'
import Products from '../../products'
import ProductDetailClass from './productDetailClass';
import ProductDetailCourse from './ProductDetailCourse';
import { useImmer } from 'use-immer'
import Cart from '@/components/cart'

// Helper function to migrate old schedule format to new format
function migrateScheduleFormat(schedule) {
  if (!schedule) return schedule;
  
  // Check if already in new format
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek) && 
      schedule.daysOfWeek.length > 0 && typeof schedule.daysOfWeek[0] === 'object') {
    return schedule;
  }
  
  // Convert old format to new format
  const newDaysOfWeek = [];
  
  // Convert times array to All template
  if (schedule.times && Array.isArray(schedule.times)) {
    const allTimes = schedule.times.map(t => {
      if (typeof t === 'string') {
        return { time: t, label: '', selected: true };
      }
      return { ...t, selected: true };
    });
    newDaysOfWeek.push({ dayIndex: -1, times: allTimes });
  }
  
  // Convert boolean daysOfWeek array to new structure
  if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek)) {
    const oldDaysOfWeek = schedule.daysOfWeek;
    const allDay = newDaysOfWeek.find(d => d.dayIndex === -1);
    const templateTimes = allDay?.times || [];
    
    oldDaysOfWeek.forEach((isActive, dayIdx) => {
      if (isActive && templateTimes.length > 0) {
        newDaysOfWeek.push({
          dayIndex: dayIdx,
          times: templateTimes.map(t => ({ ...t, selected: true }))
        });
      }
    });
  }
  
  return {
    ...schedule,
    daysOfWeek: newDaysOfWeek
  };
}

export default function Page() {
  // const { pushBreadcrumb } = useGlobals()
  const [ product, setProduct ] = useImmer(null)
  const [ products, setProducts ] = useImmer(null)
  const [ category, setCategory ] = useState({});
  const [ sheetOpen, setSheetOpen ] = useState(false);

  const { getCategory, getProducts} = useHandler({})
  const { setTimesCourse, setTimesClass } = useClass({product, setProduct})

  useEffect(() => {
    async function fetch() {
      const cat = await getCategory({name: 'class'})
      if (!cat?.category)
        return
      const _products = await getProducts({category: cat.category})
      setProducts(_products.products)
      setCategory(cat.category)

      // pushBreadcrumb({ name: "Class / Course", href: "/shop/classes", url: '/' });
      
    }

    fetch();
  }, []);

  return (
    <div className='flex h-full'>
      <div className='flex-1 p-4'>
        <Products
          products={products}
          category={category}
          onClick={(p) => {
            console.log(p.type)
            // Initialize product for cart with proper separation of stock vs cart quantities
            const cartProduct = {
              ...p,
              stockQty: p.qty, // Preserve original stock quantity
              qty: 0, // Initialize cart quantity to 0
              // Migrate schedule format for courses
              schedule: p.type === 'course' ? migrateScheduleFormat(p.schedule) : p.schedule
            }
            setProduct(cartProduct)
            if (p.type == 'class') setTimesClass(cartProduct)
            else if (p.type == 'course') setTimesCourse(cartProduct)

            setSheetOpen(true);
          }}
        />
      </div>

      <Cart />
      
      {product?.type == 'class' &&
        <ProductDetailClass
          open={sheetOpen}
          setOpen={setSheetOpen}
          product={product}
          setProduct={setProduct}
        />
      }
      {product?.type == 'course' &&
        <ProductDetailCourse
          open={sheetOpen}
          setOpen={setSheetOpen}
          product={product}
          setProduct={setProduct}
        />
      }
    </div>
  )
}