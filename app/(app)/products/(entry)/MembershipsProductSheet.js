import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Loader2, CheckCircle, Save, Trash2, Plus, Trash, Info, Tag, MoreHorizontal, Check, ChevronsUpDown } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { ProductIcon } from '@/components/product-icon';
import ProductInstructions from '@/app/(app)/products/(entry)/ProductInstructions';
import ProductTerms from '@/app/(app)/products/(entry)/ProductTerms';
import { NumberInput } from '@/components/ui/number-input';
import DiscountsSheet from '@/components/discounts/discounts-sheet';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export default function MembershipsProductSheet({ 
  open, 
  onOpenChange, 
  products,
  selectedProductId,
  setProducts,
  isDirty,
  saving,
  markAsSaved,
  setIconDialogOpen,
  setIconDialogProductIdx,
  setIconDialogQuery,
  createProduct,
  categoryName = "memberships"
}) {
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [discountsPanelOpen, setDiscountsPanelOpen] = React.useState(false);
  const [currentPriceIndex, setCurrentPriceIndex] = React.useState(null);
  const [activeDiscounts, setActiveDiscounts] = React.useState([]);
  const [discountComboboxOpen, setDiscountComboboxOpen] = React.useState({});
  
  // Find product and index
  const productIdx = products?.findIndex(p => 
    p._id ? p._id === selectedProductId : p === selectedProductId
  );
  const product = products?.[productIdx];
  
  // Fetch active discounts - must be called before early return
  React.useEffect(() => {
    const fetchActiveDiscounts = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/discounts`);
        if (response.ok) {
          const data = await response.json();
          // Filter for active discounts (not archived and within date range if specified)
          const now = new Date();
          const active = data.filter(discount => 
            !discount.archivedAt && 
            (!discount.start || new Date(discount.start) <= now) &&
            (!discount.expiry || new Date(discount.expiry) >= now)
          );
          setActiveDiscounts(active);
        }
      } catch (error) {
        console.error('Error fetching discounts:', error);
      }
    };

    if (open && product) {
      fetchActiveDiscounts();
    }
  }, [open, product]);

  if (!product || productIdx === -1) return null;
  
  const handleDelete = async () => {
    setProducts(draft => {
      draft.splice(productIdx, 1);
    });
    onOpenChange(false);
    setDeleteDialogOpen(false);
    
    // If product has _id, delete from database
    if (product._id) {
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/products/${product._id}`, {
          method: 'DELETE'
        });
      } catch (error) {
        console.error('Error deleting product:', error);
      }
    }
  };
  
  const updateProduct = (updates) => {
    setProducts(draft => {
      Object.assign(draft[productIdx], updates);
    });
  };

  // Helper function to add discount to price
  const addDiscountToPrice = (priceIdx, discount) => {
    setProducts((draft) => {
      if (!draft[productIdx].prices[priceIdx].discounts) {
        draft[productIdx].prices[priceIdx].discounts = [];
      }
      // Check if discount already exists
      const exists = draft[productIdx].prices[priceIdx].discounts.some(d => d._id === discount._id);
      if (!exists) {
        draft[productIdx].prices[priceIdx].discounts.push(discount);
      }
    });
  };

  // Helper function to remove discount from price
  const removeDiscountFromPrice = (priceIdx, discountId) => {
    setProducts((draft) => {
      if (draft[productIdx].prices[priceIdx].discounts) {
        draft[productIdx].prices[priceIdx].discounts = draft[productIdx].prices[priceIdx].discounts.filter(
          d => d._id !== discountId
        );
      }
    });
  };
  
  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[75vw] sm:max-w-[75vw] overflow-y-auto p-4">
          <SheetHeader className='m-0 p-0 mt-4'>
            <SheetTitle className="flex items-center gap-4">
              <div 
                className="cursor-pointer"
                onClick={() => {
                  setIconDialogOpen(true);
                  setIconDialogProductIdx(productIdx);
                  setIconDialogQuery(product.name);
                }}
              >
                <ProductIcon
                  src={product.thumbnail}
                  alt={product.name}
                  size="lg"
                />
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
                          <CheckCircle className="h-5 w-5 text-primary" />
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
              
            </SheetTitle>
          </SheetHeader>
          
          {/* Product details form */}
          <div className="mt-6 space-y-6">
            {/* Product Name */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Product Name</Label>
                <div className="flex items-center gap-2">
                  <Label htmlFor={`publish-${product._id}`} className="text-sm font-normal">Publish</Label>
                  <Switch
                    id={`publish-${product._id}`}
                    checked={product.publish !== undefined ? product.publish : true}
                    onCheckedChange={(checked) => updateProduct({ publish: checked })}
                  />
                </div>
              </div>
              <Input
                value={product.name}
                onChange={(e) => updateProduct({ name: e.target.value })}
                placeholder="Enter membership name"
              />
            </div>
            
            {/* Description */}
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                rows={4}
                value={product.desc || ''}
                onChange={(e) => updateProduct({ desc: e.target.value })}
                placeholder="Enter membership description"
              />
            </div>
            
            {/* Pricing Section */}
            <div className='space-y-2'>
              {product.prices?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-row gap-2 items-center">
                    <Label className="w-32">Price Name</Label>
                    <Label className="w-24">Amount ($)</Label>
                    <Label className="w-32">Billing Frequency</Label>
                    <Label className="w-[200px]">Discount</Label>
                    <Label className="flex items-center gap-2 w-[60px] justify-center">
                      Minor
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="size-4 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <p>Price is for a minor, generally under 18 years old. Will require consent from a guardian or parent</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                    <div className="w-8"></div>
                  </div>
                  
                  {product.prices.map((price, priceIdx) => (
                    <div key={priceIdx} className="flex items-center gap-2 w-full">
                      <Input
                        type="text"
                        placeholder="Adult"
                        value={price.name || ''}
                        className="w-32 text-sm"
                        onChange={(e) => {
                          setProducts((draft) => {
                            draft[productIdx].prices[priceIdx].name = e.target.value;
                          });
                        }}
                      />
                      <NumberInput
                        placeholder="0.00"
                        value={price.value || null}
                        min={0}
                        step={0.01}
                        className="w-24 text-sm"
                        onChange={(value) => {
                          setProducts((draft) => {
                            draft[productIdx].prices[priceIdx].value = value;
                          });
                        }}
                      />
                      <Select
                        value={price.billingFrequency || 'monthly'}
                        onValueChange={(value) => {
                          setProducts((draft) => {
                            draft[productIdx].prices[priceIdx].billingFrequency = value;
                          });
                        }}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="fortnightly">Fortnightly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="yearly">Yearly</SelectItem>
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                      {/* Discount Combobox */}
                      <div className="flex items-center gap-1">
                        <Popover 
                          open={discountComboboxOpen[priceIdx] || false} 
                          onOpenChange={(open) => setDiscountComboboxOpen(prev => ({ ...prev, [priceIdx]: open }))}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={discountComboboxOpen[priceIdx] || false}
                              className="w-[200px] justify-between text-sm"
                            >
                              {price.discounts && price.discounts.length > 0 
                                ? price.discounts.length === 1 
                                  ? price.discounts[0].name
                                  : `${price.discounts.length} discounts selected`
                                : "Add discount..."
                              }
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[200px] p-0">
                            <Command>
                              <CommandInput placeholder="Search discounts..." className="h-9" />
                              <CommandList>
                                <CommandEmpty>No discounts found.</CommandEmpty>
                                <CommandGroup>
                                  {activeDiscounts.map((discount) => {
                                    const isSelected = price.discounts?.some(d => d._id === discount._id);
                                    return (
                                      <CommandItem
                                        key={discount._id}
                                        value={discount.name}
                                        onSelect={() => {
                                          if (isSelected) {
                                            removeDiscountFromPrice(priceIdx, discount._id);
                                          } else {
                                            addDiscountToPrice(priceIdx, discount);
                                          }
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            isSelected ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span className="text-sm">{discount.name}</span>
                                          <span className="text-xs text-muted-foreground">
                                            {discount.code} - {discount.type === 'percentage' ? `${discount.value}%` : `$${discount.value}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex items-center justify-center w-[60px]">
                        <Checkbox
                          checked={price.minor || false}
                          onCheckedChange={(checked) => {
                            setProducts((draft) => {
                              draft[productIdx].prices[priceIdx].minor = checked;
                            });
                          }}
                        />
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-8 h-8 p-0 cursor-pointer ml-auto"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setCurrentPriceIndex(priceIdx);
                              setDiscountsPanelOpen(true);
                            }}
                          >
                            <Tag className="mr-2 h-4 w-4" />
                            Manage Adjustments
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setProducts((draft) => {
                                draft[productIdx].prices.splice(priceIdx, 1);
                              });
                            }}
                          >
                            <Trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-2">
                <Button 
                  size="sm" 
                  className="w-32 cursor-pointer"
                  onClick={() => {
                    setProducts((draft) => {
                      if (!draft[productIdx].prices) {
                        draft[productIdx].prices = [];
                      }
                      draft[productIdx].prices.push({
                        name: '',
                        value: '',
                        minor: false,
                        billingFrequency: 'monthly'
                      });
                    });
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" /> Add Price
                </Button>
              </div>
            </div>
            
            {/* Instructions */}
            <ProductInstructions
              value={product.instructionsContent}
              onChange={(content) => updateProduct({ instructionsContent: content })}
            />
            
            {/* Terms & Conditions */}
            <ProductTerms
              value={product.tandcContent}
              onChange={(content) => updateProduct({ tandcContent: content })}
              productId={product._id}
            />
            
            {/* Waiver Required */}
            <div className="flex items-center gap-2">
              <Checkbox
                id={`waiver-${productIdx}`}
                checked={product.waiverRequired || false}
                onCheckedChange={(checked) => updateProduct({ waiverRequired: checked })}
              />
              <Label htmlFor={`waiver-${productIdx}`} className="cursor-pointer">
                Waiver Required
              </Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Check if customers will be required to complete a waiver or not</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            
            {/* Delete Product Button */}
            <div className="w-54">
              <Button
                variant="destructive"
                className="cursor-pointer"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Product
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Delete Product Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Product</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{product.name}"? This action cannot be undone.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      {/* Discounts Sheet */}
      {currentPriceIndex !== null && (
        <DiscountsSheet
          isOpen={discountsPanelOpen}
          onClose={() => {
            setDiscountsPanelOpen(false);
            setCurrentPriceIndex(null);
          }}
          onSelect={(selectedDiscounts) => {
            // Update the discounts for the selected price
            setProducts((draft) => {
              if (!draft[productIdx].prices[currentPriceIndex].discounts) {
                draft[productIdx].prices[currentPriceIndex].discounts = [];
              }
              draft[productIdx].prices[currentPriceIndex].discounts = selectedDiscounts;
            });
            setDiscountsPanelOpen(false);
            setCurrentPriceIndex(null);
          }}
          selectedDiscounts={product.prices[currentPriceIndex]?.discounts || []}
          multiSelect={true}
          title="Manage Adjustments"
          subtitle="Discounts and Surcharges"
        />
      )}
    </>
  );
}
