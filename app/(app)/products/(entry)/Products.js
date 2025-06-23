'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tag, ChevronsUpDown, Ellipsis } from 'lucide-react';
import Variations from './Variations'
import Delete from '../Delete'
import AddProduct from './AddProduct';

import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useProduct } from './useProduct';

export default function Page({products, setProducts, units, title, categoryName}) {
  
  const [productsUI, setProductsUI] = useState({});
  const { updateProduct, addProduct, createProduct } = useProduct(setProducts, setProductsUI);
  const contentRefs = useRef({});

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ type: null, productIdx: null, variationIdx: null });
  const [addOpen, setAddOpen] = useState(false);

  const originalProducts = useRef({});
  const [isDirty, setIsDirty] = useState({});
  useEffect(() => {
    const updatedIsDirty = { ...isDirty };
    
    // Populate the originalProducts hash with _id as the key
    products.forEach((p) => {
      originalProducts.current[p._id] = originalProducts.current[p._id] || JSON.parse(JSON.stringify(p));
    });

    products.forEach((p) => {
      const isProductChanged = JSON.stringify(p) !== JSON.stringify(originalProducts.current[p._id]);
      updatedIsDirty[p._id] = isProductChanged || !p._id
    });
    setIsDirty(updatedIsDirty);
  }, [products]);
  
  useEffect(() => {
    // Update the height and UI state when variations change
    const updatedUI = { ...productsUI };
    products.forEach((p) => {
      const el = contentRefs.current[p._id];
      if (el) {
        updatedUI[p._id] = updatedUI[p._id] || { expanded: false, height: 0 };
        updatedUI[p._id].height = el.scrollHeight;
      }
    });
    // Ensure the first product card is expanded
    if (products[0]) {
      updatedUI[products[0]._id] = {
        ...updatedUI[products[0]._id],
        expanded: true,
      };
    }
    setProductsUI(updatedUI);
  }, [products]); 

  const toggleExpanded = (productId) => {
    setProductsUI((prev) => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        expanded: !prev[productId]?.expanded,
      },
    }));
  };

  const toggleAll = () => {
    const allExpanded = products.every(p => productsUI[p._id]?.expanded);
    const newUI = {};
    products.forEach((p) => {
      newUI[p._id] = {
        ...productsUI[p._id],
        expanded: !allExpanded,
      };
    });
    setProductsUI(newUI);
  };

  return (
    <div className='flex flex-col space-y-4'>
      <div className="flex">
        <div className='font-semibold mb-2'>{title}</div>
        <div className='flex-1'/>
        <Button size="sm" className="mr-2" variant="outline" onClick={() => setAddOpen(true)}>
          New Product
        </Button>
        <Button variant="outline" size="sm" onClick={toggleAll}>
          <ChevronsUpDown />
        </Button>
      </div>
      {products.map((p, pIdx) => {
        console.log('re-rending');
        return (
        <Card
          ref={(el) => (contentRefs.current[p._id] = el)}
          key={pIdx}
          className='overflow-hidden transition-all duration-300 ease-in-out'
          style={{
            maxHeight: productsUI[p._id]?.expanded ? `${productsUI[p._id]?.height}px` : '105px',
          }}
        >
          <CardHeader>
            <CardTitle className='flex w-full items-center space-x-4'>
              <div onClick={() => setDialogOpen(p._id, true)}>
                {!p.data?.thumbnail ? (
                  <Button className='bg-white rounded-lg w-14 h-14'>
                    <Tag className='!w-8 !h-8' />
                  </Button>
                ) : (
                  <Button className='bg-white rounded-lg p-1 w-14 h-14'>
                    <img src={p.data.thumbnail} alt='Thumbnail' />
                  </Button>
                )}
              </div>
              <div>{p.name}</div>
              
              {isDirty[p._id] && (
                <Button
                  size="sm"
                  className="bg-lime-400"
                  onClick={async () => {
                    if (!p._id) {
                      console.log('creating')

                      const createdProduct = await createProduct(categoryName, p);
                      console.log(createdProduct)
                      // originalProducts.current[pIdx] = JSON.parse(JSON.stringify(createdProduct));
                      setProducts(draft => {
                        draft[pIdx] = createdProduct;
                      });
                      setIsDirty((prev) => ({ ...prev, [pIdx]: false }));
                    }
                    else {
                      console.log('updating')
                      const updated = await updateProduct(p);
                      setIsDirty((prev) => ({ ...prev, [p._id]: false }));
                      originalProducts.current[pIdx] = JSON.parse(JSON.stringify(updated));
                    }
                  }}
                >
                  Save
                </Button>
              )}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant='ghost'>
                    <Ellipsis className='size-4' />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align='end'>
                  <DropdownMenuItem
                    onClick={() => {
                      setDeleteTarget({ type: 'product', productIdx: pIdx, product: p });
                      setDeleteOpen(true);
                    }}
                  >
                    Delete Product
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <div className='flex-1' />
              <Button
                variant='ghost'
                onClick={() => toggleExpanded(p._id)}
              >
                <ChevronsUpDown className='size-4' />
              </Button>
            </CardTitle>
          </CardHeader>

          <div className='px-6'>
          <Input
            value={p.name} 
            onChange={(e) => {
              setProducts(draft => {
                draft[pIdx].name = e.target.value;
              })
            }}
          />
          </div>

          <CardContent>
            <Variations
              units={units}
              product={p}
              productIdx={pIdx}
              setProducts={setProducts}
              products={products}
            />
          </CardContent>
        </Card>
        );
      })}
      <Delete
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        name={`${deleteTarget.name} ${deleteTarget.unit}`}
        onConfirm={() => {
          const { type, productIdx, variationIdx } = deleteTarget;
          if (type === 'product') {
            setProducts((_p) => {
              _p.splice(productIdx, 1);
            });
          } else if (type === 'variation') {
            productHooks[productIdx].deleteVariation(variationIdx);
          }
          setDeleteOpen(false);
        }}
      />
      <AddProduct
        open={addOpen}
        onOpenChange={setAddOpen}
        setProducts={setProducts}
        addProduct={addProduct}
      />
    </div>
  );
}