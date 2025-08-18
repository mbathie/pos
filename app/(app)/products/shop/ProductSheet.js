import React, { useContext } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Tag, Plus, Ellipsis, Info, Loader2, CheckCircle, Save } from 'lucide-react';
import { FolderSelect } from './folder-select';
import AccountingSelect from './accounting-select';
import colors from 'tailwindcss/colors';
import { actions } from './actions';

export default function ProductSheet({ 
  open, 
  onOpenChange, 
  products,
  selectedProductId,
  category,
  setProducts,
  isDirty,
  saving,
  markAsSaved,
  setIconDialogOpen,
  setIconDialogProductIdx,
  setIconDialogQuery,
  setAddItem,
  setAddItemOpen,
  setDeleteOpen,
  setToDelete
}) {
  const product = products?.find(p => p._id === selectedProductId);
  const pIdx = products?.findIndex(p => p._id === selectedProductId);
  
  if (!product || pIdx === -1) return null;
  
  // Destructure the actions we need
  const {
    updateProduct,
    updateVariation,
    addVariation,
    updateModCat,
    updateMod,
    saveMod,
    addMod,
    setFolder,
    saveProduct
  } = actions({category, setProducts});
  
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-4">
            <div onClick={() => {
              setIconDialogOpen(true);
              setIconDialogProductIdx(pIdx);
              setIconDialogQuery(product.name);
            }}>
              {!product?.thumbnail ? (
                <Button className="bg-white rounded-lg w-16 h-16">
                  <Tag className="!w-8 !h-8" />
                </Button>
              ) : (
                <Button className="rounded-lg -p-1 w-16 h-16">
                  <img className='rounded-lg w-16 h-16' src={product.thumbnail} alt="Thumbnail" />
                </Button>
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold">{product.name}</h2>
            </div>
            
            {/* Auto-save indicator */}
            {product._id && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center">
                      {saving[product._id] ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : isDirty[product._id] ? (
                        <Save className="h-5 w-5 text-orange-500 animate-pulse" />
                      ) : (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {saving[product._id] ? 'Saving...' : 
                       isDirty[product._id] ? 'Unsaved changes (auto-saves in 3s)' : 
                       'All changes saved'}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            
            {/* Manual save for new products */}
            {!product._id && (
              <Button
                size="sm"
                onClick={async () => {
                  const updated = await saveProduct({product, pIdx})
                  if (updated) {
                    markAsSaved(updated._id, updated);
                  }
                }}
              >
                Save
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col space-y-6 mt-6">
          <div className="flex flex-col gap-2">
            <Label>Product Name</Label>
            <Input
              type="text"
              placeholder="Flat White"
              onChange={(e) => updateProduct({pIdx, key: "name", value: e.target.value})}
              value={product.name || ''}
            />
          </div>

          <div className="flex items-center gap-2">
            <Label>Send to Bump</Label>
            <Switch
              id={`bump-${product._id}`}
              checked={product.bump !== undefined ? product.bump : true}
              onCheckedChange={(checked) => {
                updateProduct({pIdx, key: "bump", value: checked});
              }}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size="15"/>
                </TooltipTrigger>
                <TooltipContent>
                  <p>After a purchase of this product</p>
                  <p>should it be sent to the bump screen</p>
                  <p>for processing?</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Description</Label>
            <Textarea
              type="text"
              rows={6}
              placeholder=""
              onChange={(e) => updateProduct({pIdx, key: "desc", value: e.target.value})}
              value={product.desc || ''}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Folder</Label>
            <div className='flex'>
              <FolderSelect pIdx={pIdx} product={product} setFolder={setFolder}/>
              {product.folder?.color && (
                <div
                  style={{ backgroundColor: colors?.[product.folder.color.split('-')[0]]?.[product.folder.color.split('-')[1]] }}
                  className="size-9 rounded-md border ml-2"
                />
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Accounting Code</Label>
            <AccountingSelect 
              value={product.accounting} 
              onChange={(value) => {
                updateProduct({pIdx, key: "accounting", value});
              }}
            />
          </div>

          <div className="flex gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Label>Qty</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size="15"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      Quantity in stock of this item
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                min="0"
                value={product.qty || ''}
                onChange={(e) => {
                  updateProduct({pIdx, key: "qty", value: parseInt(e.target.value) || 0});
                }}
                placeholder="0"
                className="w-24"
              />
            </div>
            
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1">
                <Label>Par</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size="15"/>
                    </TooltipTrigger>
                    <TooltipContent>
                      Remaining stock level to issue a warning
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Input
                type="number"
                min="0"
                value={product.par || ''}
                onChange={(e) => {
                  updateProduct({pIdx, key: "par", value: parseInt(e.target.value) || 0});
                }}
                placeholder="0"
                className="w-24"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-base">Variations</Label>
              <Button
                size="icon" 
                variant="outline"
                onClick={() => addVariation({pIdx})}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            
            {product?.variations?.length > 0 && (
              <div className="space-y-2">
                {product.variations.map((v, i) => (
                  <div key={`${product._id}-${i}`} className="flex gap-2 items-center">
                    <Input
                      type="text" 
                      placeholder="SM" 
                      value={v.name || ''} 
                      className="w-24"
                      onChange={(e) => updateVariation({pIdx, vIdx: i, key: "name", value: e.target.value})}
                    />
                    <Input
                      type="text" 
                      placeholder="5.50" 
                      value={v.amount || ''}
                      className="w-24"
                      onChange={(e) => updateVariation({pIdx, vIdx: i, key: "amount", value: e.target.value})}
                    />
                    {v.id > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Ellipsis className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setDeleteOpen(true);
                              setToDelete({ product, productIdx: pIdx, variationIdx: i });
                            }}
                          >
                            Delete Variation
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className='flex items-center gap-2'>
              <Label className='text-base'>Mod Groups</Label>
              <Button
                className="text-xs"
                variant="outline"
                size="icon" 
                onClick={() => {
                  setAddItem({pIdx, p: product})
                  setAddItemOpen(true)
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {product.modCats?.map((mp, mcIdx) => (
              <div key={mcIdx} className="space-y-2">
                <div className="flex items-center gap-4">
                  <Label className="font-medium">{mp.name}</Label>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Allow Multiple</Label>
                    <Switch
                      checked={mp.multi}
                      onCheckedChange={(value) => updateModCat({ pIdx, mcIdx, key: "multi", value })}
                    />
                  </div>
                </div>
                
                <div className='flex flex-wrap gap-2'>
                  {mp?.mods?.map((m, mIdx) => (
                    <React.Fragment key={mIdx}>
                      {!m.new && (
                        <Button
                          onClick={() => updateMod({ pIdx, mcIdx, mIdx, key: "enabled", value: !m.enabled })}
                          variant={m.enabled ? "default" : "outline"}
                        >
                          {m.name} {!isNaN(m?.amount) && `$${Number(m.amount).toFixed(2)}`}
                        </Button>
                      )}
                      {m.new && (
                        <div className='flex'>
                          <Input
                            value={m.name || ""} 
                            placeholder="Soy" 
                            className="w-24 rounded-r-none"
                            onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "name", value: e.target.value })}
                          />
                          <Input
                            onChange={(e) => updateMod({ pIdx, mcIdx, mIdx, key: "amount", value: e.target.value })}
                            value={m.amount || ""} 
                            placeholder="$0.75" 
                            className="w-24 rounded-none"
                          />
                          <Button
                            className="rounded-l-none"
                            onClick={() => saveMod({ pIdx, mcIdx, mIdx })}
                          >
                            Save
                          </Button>
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                  {!mp.new && (
                    <Button
                      variant="outline"
                      onClick={() => addMod({ pIdx, mcIdx })}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}