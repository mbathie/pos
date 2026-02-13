'use client'
import React, { useEffect, useState } from 'react'
import { useImmer } from 'use-immer'
import ProductDetail from './retail/productDetail'
import ProductDetailClass from './(other)/classes/productDetailClass'
import ProductDetailCourse from './(other)/classes/ProductDetailCourse'
import ProductDetailMembership from './(other)/memberships/productDetailMembership'
import GroupSheet from './GroupSheet'
import Categories from './retail/cats'
import Product from './product'
import colors from '@/lib/tailwind-colors';
import { Plus, Minus, ShoppingBag, CreditCard, LayoutGrid, Check, Circle, MonitorSmartphone } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import Link from 'next/link'
import Cart from '@/components/cart'
import { useHandler } from './retail/useHandler'
import { useClass } from './(other)/classes/useClass'
import { useMembership } from './(other)/memberships/useMembership'
import { useGlobals } from '@/lib/globals'
import { toast } from 'sonner'

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
    daysOfWeek: newDaysOfWeek.length > 0 ? newDaysOfWeek : schedule.daysOfWeek
  };
}

export default function Page() {
  const {
    selectVariation,
    selectMod, getProductTotal, setQty } = useHandler()

  const { addToCart, removeFromCart, getCurrentCart, location, device, posSetupComplete, setPosSetupComplete, employee, setPosInterfaceName } = useGlobals()

  const [posInterface, setPosInterfaceLocal] = useState(null)

  // Helper to update both local and global state
  const setPosInterface = (value) => {
    setPosInterfaceLocal(value)
    // Update global state with just the name for header display
    setPosInterfaceName(value?.name || null)
  }
  const [loading, setLoading] = useState(true)
  const [setupStatus, setSetupStatus] = useState({ stripeConnected: null, hasTerminal: null })
  const [category, setCategory] = useState(undefined)
  const [items, setItems] = useState([])
  const [product, setProduct] = useImmer(null)
  const [open , setOpen] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState(new Set())
  const [total, setTotal] = useState(0)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [groupSheetOpen, setGroupSheetOpen] = useState(false)
  const [skipSetup, setSkipSetup] = useState(false)
  const [availableInterfaces, setAvailableInterfaces] = useState([])
  const [showInterfaceSelector, setShowInterfaceSelector] = useState(false)
  const [assigningInterface, setAssigningInterface] = useState(false)

  // Initialize class/course hooks
  const { setTimesClass, setTimesCourse } = useClass({ product, setProduct })
  const { } = useMembership({ product, setProduct })

  useEffect(() => {
    initializeShop()
  }, [])

  // For STAFF users: check for available interfaces when no posInterface is loaded
  useEffect(() => {
    const checkForInterfaces = async () => {
      if (!loading && !posInterface && employee?.role === 'STAFF' && !showInterfaceSelector) {
        const interfaces = await fetchAvailableInterfaces()
        if (interfaces.length > 0) {
          setAvailableInterfaces(interfaces)
          setShowInterfaceSelector(true)
        }
      }
    }
    checkForInterfaces()
  }, [loading, posInterface, employee?.role])

  // Check if device has terminal when device changes
  useEffect(() => {
    setSetupStatus(prev => ({
      ...prev,
      hasTerminal: device?.terminal ? true : false
    }))
  }, [device])

  const initializeShop = async () => {
    // If setup is already complete (cached in globals), just load POS interface
    if (posSetupComplete) {
      const posData = await loadPOSInterface()
      setSetupStatus({
        stripeConnected: true,
        hasTerminal: true
      })
      setPosInterface(posData)

      if (posData?.categories?.length > 0) {
        handleSetCatFromPOS(posData.categories[0])
      }

      setLoading(false)
      return
    }

    // Otherwise fetch setup status and POS interface in parallel
    const [setupData, posData] = await Promise.all([
      fetchSetupStatus(),
      loadPOSInterface()
    ])

    // If setup was already marked complete in DB, update globals and skip checks
    if (setupData.setupComplete) {
      setPosSetupComplete(true)
      setSetupStatus({
        stripeConnected: true,
        hasTerminal: true
      })
      setPosInterface(posData)

      if (posData?.categories?.length > 0) {
        handleSetCatFromPOS(posData.categories[0])
      }

      setLoading(false)
      return
    }

    // Check terminal from device state
    const hasTerminal = device?.terminal ? true : false

    setSetupStatus({
      stripeConnected: setupData.stripeConnected,
      hasTerminal
    })
    setPosInterface(posData)

    // Auto-select first category if POS interface loaded
    if (posData?.categories?.length > 0) {
      handleSetCatFromPOS(posData.categories[0])
    }

    // If all setup steps pass, mark setup as complete in DB and globals
    if (setupData.stripeConnected && hasTerminal && posData) {
      setPosSetupComplete(true)
      fetch('/api/org/setup-complete', { method: 'POST' }).catch(() => {})
    }

    // If no POS interface and user is STAFF, fetch available interfaces for selection
    if (!posData && employee?.role === 'STAFF') {
      const interfaces = await fetchAvailableInterfaces()
      if (interfaces.length > 0) {
        setAvailableInterfaces(interfaces)
        setShowInterfaceSelector(true)
      }
    }

    setLoading(false)
  }

  const fetchAvailableInterfaces = async () => {
    try {
      const res = await fetch('/api/posinterfaces/available')
      if (res.ok) {
        const data = await res.json()
        return data.interfaces || []
      }
      return []
    } catch (error) {
      console.error('Error fetching available interfaces:', error)
      return []
    }
  }

  const handleSelectInterface = async (interfaceId) => {
    setAssigningInterface(true)
    try {
      const res = await fetch('/api/posinterfaces/assign-to-browser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ posInterfaceId: interfaceId })
      })

      if (res.ok) {
        toast.success('POS interface configured')
        setShowInterfaceSelector(false)
        // Reload the page to fetch the newly assigned interface
        window.location.reload()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Failed to assign interface')
        console.error('Failed to assign interface:', data)
      }
    } catch (error) {
      toast.error('Error assigning interface')
      console.error('Error assigning interface:', error)
    } finally {
      setAssigningInterface(false)
    }
  }

  const fetchSetupStatus = async () => {
    try {
      const res = await fetch('/api/shop/setup-status')
      if (res.ok) {
        return await res.json()
      }
      return { setupComplete: false, stripeConnected: false }
    } catch (error) {
      return { setupComplete: false, stripeConnected: false }
    }
  }

  // Update global POS interface name when local state changes
  useEffect(() => {
    if (posInterface?.name) {
      setPosInterfaceName(posInterface.name)
    }
  }, [posInterface?.name, setPosInterfaceName])

  useEffect(() => {
    if (product) {
      const t = getProductTotal({ product });
      setTotal(t);
    }
  }, [product])

  // Reset selectedGroup when group sheet closes
  useEffect(() => {
    if (!groupSheetOpen) {
      setSelectedGroup(null);
    }
  }, [groupSheetOpen])

  const loadPOSInterface = async () => {
    try {
      const response = await fetch('/api/posinterfaces/for-device')
      if (response.ok) {
        const data = await response.json()
        if (data.posInterface && data.posInterface._id) {
          // Fetch full POS interface data
          const interfaceRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${data.posInterface._id}`)
          if (interfaceRes.ok) {
            const interfaceData = await interfaceRes.json()
            return interfaceData.interface
          }
        }
      }
      return null
    } catch (error) {
      console.error('Error loading POS interface:', error)
      return null
    }
  }

  const handleSetCatFromPOS = async (categoryData) => {
    setCategory({ _id: categoryData._id, name: categoryData.name });
    setExpandedFolders(new Set());

    // Process items from POS interface (already populated with data)
    const allItems = [];
    const seenIds = new Set(); // Track seen IDs to prevent duplicates

    if (categoryData.items && categoryData.items.length > 0) {
      // Sort by order
      const sortedItems = [...categoryData.items].sort((a, b) => (a.order || 0) - (b.order || 0));

      for (const item of sortedItems) {
        // Skip duplicates
        const itemKey = `${item.itemType}-${item.itemId}`;
        if (seenIds.has(itemKey)) continue;
        seenIds.add(itemKey);

        if (item.itemType === 'folder' && item.data) {
          // Use unified items array for proper ordering of products and groups
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'folder',
            order: item.order,
            items: item.data.items || [], // Unified array with correct order
            products: item.data.products || [], // Legacy support
            groups: item.data.groups || [] // Legacy support
          });
        } else if (item.itemType === 'divider' && item.data) {
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'divider',
            order: item.order
          });
        } else if (item.itemType === 'product' && item.data) {
          allItems.push({
            ...item.data,
            _id: item.itemId,
            // Don't override the type - keep the original product type (shop, class, course, membership, etc.)
            order: item.order
          });
        } else if (item.itemType === 'group' && item.data) {
          allItems.push({
            ...item.data,
            _id: item.itemId,
            type: 'group',
            order: item.order
          });
        }
      }
    }

    setItems(allItems);
  }

  // Show loading spinner while checking setup status
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner className="size-8" />
      </div>
    );
  }

  // Check if setup is incomplete (but allow skipping)
  // For STAFF users, don't show setup checklist - show interface selector instead
  const isStaff = employee?.role === 'STAFF'
  const needsSetup = !skipSetup && !isStaff && (
    !setupStatus.stripeConnected ||
    !setupStatus.hasTerminal ||
    !posInterface
  )

  // Interface selector dialog for STAFF users
  if (showInterfaceSelector && isStaff) {
    return (
      <AlertDialog open={true}>
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <MonitorSmartphone className="h-5 w-5" />
              Select POS Interface
            </AlertDialogTitle>
            <AlertDialogDescription>
              Choose which POS interface to use on this device.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2 mt-4">
            {availableInterfaces.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No POS interfaces have been configured yet. Please contact your administrator.
              </p>
            ) : (
              availableInterfaces.map((iface) => (
                <Button
                  key={iface._id}
                  variant="outline"
                  className="justify-start h-auto py-3 cursor-pointer"
                  onClick={() => handleSelectInterface(iface._id)}
                  disabled={assigningInterface}
                >
                  <div className="flex items-center gap-3 w-full">
                    <LayoutGrid className="h-5 w-5 text-muted-foreground" />
                    <div className="flex-1 text-left">
                      <div className="font-medium">{iface.name}</div>
                      {iface.isDefault && (
                        <div className="text-xs text-muted-foreground">Default</div>
                      )}
                    </div>
                    {assigningInterface && <Spinner className="h-4 w-4" />}
                  </div>
                </Button>
              ))
            )}
          </div>
        </AlertDialogContent>
      </AlertDialog>
    )
  }

  // For STAFF users without posInterface and no available interfaces, show a message
  if (isStaff && !posInterface && !showInterfaceSelector) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-muted rounded-full">
              <LayoutGrid className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">No POS Interface Configured</h2>
          <p className="text-muted-foreground">
            This device hasn&apos;t been assigned to a POS interface. Please contact your administrator to set this up.
          </p>
        </div>
      </div>
    )
  }

  // Setup checklist UI (for ADMIN/MANAGER only)
  if (needsSetup) {
    const steps = [
      {
        label: 'Connect Stripe Account',
        done: setupStatus.stripeConnected === true,
        href: '/settings/payments',
        icon: CreditCard
      },
      {
        label: 'Link Card Terminal',
        done: setupStatus.hasTerminal === true,
        href: '/settings/payments',
        icon: CreditCard
      },
      {
        label: 'Configure POS Interface',
        done: !!posInterface,
        href: '/products/pos',
        icon: LayoutGrid
      }
    ]

    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-lg">
          <div className="flex justify-center mb-6">
            <div className="p-4 bg-muted rounded-full">
              <ShoppingBag className="h-12 w-12 text-muted-foreground" />
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">Get Started</h2>
          <p className="text-muted-foreground mb-6">
            Complete the following steps to start selling.
          </p>
          <div className="flex flex-col gap-2 max-w-sm mx-auto">
            {steps.map((step, idx) => (
              <Link
                key={idx}
                href={step.href}
                className={`flex items-center gap-3 p-3 rounded-lg border transition-colors cursor-pointer ${
                  step.done
                    ? 'bg-muted/50 border-muted'
                    : 'bg-primary text-primary-foreground border-primary hover:bg-primary/90'
                }`}
              >
                <div className={`flex items-center justify-center w-6 h-6 rounded-full ${
                  step.done ? 'bg-primary text-primary-foreground' : 'bg-primary-foreground/20'
                }`}>
                  {step.done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{idx + 1}</span>
                  )}
                </div>
                <span className={`flex-1 text-left font-medium ${step.done ? 'text-muted-foreground line-through' : ''}`}>
                  {step.label}
                </span>
                <step.icon className={`h-4 w-4 ${step.done ? 'text-muted-foreground' : ''}`} />
              </Link>
            ))}
          </div>
          <Button
            variant="ghost"
            className="mt-4 cursor-pointer"
            onClick={() => setSkipSetup(true)}
          >
            Continue anyway
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Render appropriate product detail component based on type */}
      {product?.type === 'class' && (
        <ProductDetailClass product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {product?.type === 'course' && (
        <ProductDetailCourse product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {product?.type === 'membership' && (
        <ProductDetailMembership product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}
      {(!product?.type || (product?.type !== 'class' && product?.type !== 'course' && product?.type !== 'membership')) && (
        <ProductDetail product={product} setProduct={setProduct} open={open} setOpen={setOpen} />
      )}

      {/* Group sheet for product groups */}
      <GroupSheet
        open={groupSheetOpen}
        onOpenChange={setGroupSheetOpen}
        group={selectedGroup}
        onAddToCart={addToCart}
        onRemoveGroup={(group) => {
          // Remove all products with this gId from cart
          const cart = getCurrentCart();
          const indicesToRemove = cart.products
            .map((p, idx) => ({ p, idx }))
            .filter(({ p }) => p.gId === group.gId)
            .map(({ idx }) => idx)
            .sort((a, b) => b - a); // Remove from end to beginning to maintain indices

          indicesToRemove.forEach(idx => removeFromCart(idx));
        }}
        useClass={{ setTimesClass, setTimesCourse }}
        useMembership={{}}
        getProductTotal={getProductTotal}
        migrateScheduleFormat={migrateScheduleFormat}
        location={location}
      />

      <div className="flex space-x-4 h-full">

        {/* Left Panel */}
        <Categories
          handleSetCat={async (c) => {
            if (posInterface) {
              // Find the matching category from POS interface
              const posCategory = posInterface.categories.find(cat => cat._id === c._id);
              if (posCategory) {
                await handleSetCatFromPOS(posCategory);
              }
            }
          }}
          selected={category}
          posCategories={posInterface?.categories}
        />

        {/* Right Panel */}

        <div className='flex flex-1 flex-wrap gap-4 text-sm content-start'>
          {items.map((item) => {
            // Render dividers
            if (item.type === 'divider') {
              return (
                <div key={`divider-${item._id}`} className='w-full'>
                  <div className='flex items-center gap-4 my-2'>
                    <div className='flex-1 h-px bg-border' />
                    <div className='text-sm font-medium text-muted-foreground uppercase tracking-wide'>
                      {item.name}
                    </div>
                    <div className='flex-1 h-px bg-border' />
                  </div>
                </div>
              );
            }

            // Render folders
            if (item.type === 'folder') {
              // Hide empty folders in retail view
              const itemCount = item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0));
              if (itemCount === 0) {
                return null;
              }
              const isExpanded = expandedFolders.has(item._id);
              return (
                <React.Fragment key={`folder-${item._id}`}>
                  <div className='relative w-24 flex flex-col text-center text-xs'>
                    <div
                      onClick={() => {
                        const newExpanded = new Set(expandedFolders);
                        if (isExpanded) {
                          newExpanded.delete(item._id);
                        } else {
                          newExpanded.add(item._id);
                        }
                        setExpandedFolders(newExpanded);
                      }}
                      className='cursor-pointer size-24 rounded-lg flex items-center justify-center'
                      style={{
                        backgroundColor: colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]
                      }}
                    >
                      {isExpanded ? (
                        <Minus strokeWidth={1} className='size-10 opacity-60' />
                      ) : (
                        <Plus strokeWidth={1} className='size-10 opacity-60' />
                      )}
                    </div>
                    <div className='mt-1'>{item.name}</div>
                    <div className='text-muted-foreground text-xs'>
                      {item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0))} {(item.items?.length || ((item.products?.length || 0) + (item.groups?.length || 0))) === 1 ? 'item' : 'items'}
                    </div>
                  </div>
                  {/* When expanded, render items in correct order */}
                  {isExpanded && (
                    <>
                      {item.items && item.items.length > 0 ? (
                        // Use unified items array - respects folders.contains[] order
                        item.items.map((folderItem) => (
                          <Product
                            key={`inline-${folderItem._id}`}
                            product={folderItem}
                            borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                            tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                            onClick={() => {
                              // Handle group click
                              if (folderItem.amount || folderItem.itemType === 'group') {
                                setSelectedGroup(folderItem);
                                setGroupSheetOpen(true);
                                return;
                              }
                              // Handle product click
                              const cartProduct = {
                                ...folderItem,
                                stockQty: folderItem.qty,
                                qty: folderItem.type === 'class' || folderItem.type === 'course' || folderItem.type === 'membership' ? 0 : 1,
                                schedule: folderItem.type === 'course' ? migrateScheduleFormat(folderItem.schedule) : folderItem.schedule,
                                // Initialize prices with qty for memberships
                                ...(folderItem.type === 'membership' && folderItem.prices && {
                                  prices: folderItem.prices.map(p => ({ ...p, qty: p.qty || 0 }))
                                })
                              };

                              setProduct(cartProduct);
                              if (folderItem.type === 'class') setTimesClass(cartProduct);
                              else if (folderItem.type === 'course') setTimesCourse(cartProduct);
                              setOpen(true);
                            }}
                          />
                        ))
                      ) : (
                        // Fallback: render products then groups
                        <>
                          {item.products && item.products.length > 0 && item.products.map((p) => (
                            <Product
                              key={`inline-${p._id}`}
                              product={p}
                              borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              onClick={() => {
                                const cartProduct = {
                                  ...p,
                                  stockQty: p.qty,
                                  qty: p.type === 'class' || p.type === 'course' || p.type === 'membership' ? 0 : 1,
                                  schedule: p.type === 'course' ? migrateScheduleFormat(p.schedule) : p.schedule,
                                  // Initialize prices with qty for memberships
                                  ...(p.type === 'membership' && p.prices && {
                                    prices: p.prices.map(price => ({ ...price, qty: price.qty || 0 }))
                                  })
                                }

                                setProduct(cartProduct)
                                if (p.type === 'class') setTimesClass(cartProduct)
                                else if (p.type === 'course') setTimesCourse(cartProduct)
                                setOpen(true)
                              }}
                            />
                          ))}
                          {item.groups && item.groups.length > 0 && item.groups.map((g) => (
                            <Product
                              key={`inline-group-${g._id}`}
                              product={g}
                              borderColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              tintColor={colors?.[item.color?.split('-')[0]]?.[item.color?.split('-')[1]]}
                              onClick={() => {
                                setSelectedGroup(g);
                                setGroupSheetOpen(true);
                              }}
                            />
                          ))}
                        </>
                      )}
                    </>
                  )}
                </React.Fragment>
              );
            }

            // Render groups
            if (item.type === 'group') {
              return (
                <Product
                  key={`group-${item._id}`}
                  product={item}
                  onClick={() => {
                    setSelectedGroup(item);
                    setGroupSheetOpen(true);
                  }}
                />
              );
            }

            // Render products
            return (
              <Product
                key={`product-${item._id}`}
                product={item}
                onClick={() => {
                  const cartProduct = {
                    ...item,
                    stockQty: item.qty,
                    qty: item.type === 'class' || item.type === 'course' || item.type === 'membership' ? 0 : 1,
                    schedule: item.type === 'course' ? migrateScheduleFormat(item.schedule) : item.schedule,
                    // Initialize prices with qty for memberships
                    ...(item.type === 'membership' && item.prices && {
                      prices: item.prices.map(price => ({ ...price, qty: price.qty || 0 }))
                    })
                  }

                  setProduct(cartProduct)
                  if (item.type === 'class') setTimesClass(cartProduct)
                  else if (item.type === 'course') setTimesCourse(cartProduct)
                  setOpen(true)
                }}
              />
            );
          })}
        </div>

        {/* cart */}
        <Cart
          onEditGroup={(group) => {
            setSelectedGroup(group);
            setGroupSheetOpen(true);
          }}
        />

      </div>
    </>
  )
}
