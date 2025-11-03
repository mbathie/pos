'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import Colors from '@/components/colors';
import colors from '@/lib/tailwind-colors';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ProductCategorySelector from '@/components/discounts/product-category-selector';
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem
} from '@/components/ui/multi-select';

export default function POSFolderSheet({ open, onOpenChange, posInterfaceId, categoryId, folderId, onSuccess }) {
  const [folderName, setFolderName] = useState('');
  const [folderColor, setFolderColor] = useState('emerald-400');
  const [selectedProducts, setSelectedProducts] = useState(new Set());
  const [selectedCategories, setSelectedCategories] = useState(new Set());
  const [selectedGroups, setSelectedGroups] = useState(new Set());
  const [categoriesWithProducts, setCategoriesWithProducts] = useState([]);
  const [productGroups, setProductGroups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const loadData = async () => {
        if (folderId) {
          // For editing: fetch folder data first, then merge with available items
          const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${folderId}`);
          if (res.ok) {
            const data = await res.json();

            // Fetch available items
            const [itemsRes, groupsRes] = await Promise.all([
              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}/available-items`),
              fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`)
            ]);
            const itemsData = await itemsRes.json();
            const groupsData = await groupsRes.json();

            // Extract folder's existing items
            const productIds = [];
            const groupIds = [];
            const folderProducts = [];
            const folderGroups = [];

            if (data.folder?.items) {
              for (const item of data.folder.items) {
                if (item.itemType === 'product' && item.data) {
                  productIds.push(item.data._id);
                  folderProducts.push(item.data);
                } else if (item.itemType === 'group' && item.data) {
                  groupIds.push(item.data._id);
                  folderGroups.push(item.data);
                }
              }
            }

            // Merge folder products into available categories
            const mergedCategories = [...(itemsData.categoriesWithProducts || [])];
            for (const product of folderProducts) {
              let found = false;
              for (const category of mergedCategories) {
                if (category.products?.some(p => String(p._id) === String(product._id))) {
                  found = true;
                  break;
                }
              }

              if (!found) {
                const categoryId = product.category || 'other';
                let targetCategory = mergedCategories.find(c => String(c._id) === String(categoryId));

                if (!targetCategory) {
                  targetCategory = { _id: categoryId, name: 'Other', products: [] };
                  mergedCategories.push(targetCategory);
                } else if (!targetCategory.products) {
                  targetCategory.products = [];
                }

                targetCategory.products.push(product);
              }
            }

            // Merge folder groups into available groups
            const existingGroupIds = new Set((groupsData.groups || []).map(g => String(g._id)));
            const mergedGroups = [...(groupsData.groups || [])];
            for (const group of folderGroups) {
              if (!existingGroupIds.has(String(group._id))) {
                mergedGroups.push(group);
              }
            }

            // Set all state together
            setFolderName(data.folder.name || '');
            setFolderColor(data.folder.color || 'emerald-400');
            setCategoriesWithProducts(mergedCategories);
            setProductGroups(mergedGroups);
            setSelectedProducts(new Set(productIds));
            setSelectedCategories(new Set());
            setSelectedGroups(new Set(groupIds));

            console.log('Loaded folder with products:', productIds, 'and groups:', groupIds);
          }
        } else {
          // For new folder: just fetch available items
          await fetchAvailableItems();
          setFolderName('');
          setFolderColor('emerald-400');
          setSelectedProducts(new Set());
          setSelectedCategories(new Set());
          setSelectedGroups(new Set());
        }
      };
      loadData();
    }
  }, [open, folderId]);

  const fetchAvailableItems = async () => {
    try {
      const [itemsRes, groupsRes] = await Promise.all([
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}/available-items`),
        fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/product-groups`)
      ]);
      const itemsData = await itemsRes.json();
      const groupsData = await groupsRes.json();
      setCategoriesWithProducts(itemsData.categoriesWithProducts || []);
      setProductGroups(groupsData.groups || []);
    } catch (error) {
      console.error('Error fetching available items:', error);
    }
  };


  const handleSave = async () => {
    if (!folderName.trim()) {
      toast.error('Please enter a folder name');
      return;
    }

    setLoading(true);
    try {
      let targetFolderId = folderId;

      // Build contains array with products and groups
      const contains = [];
      let order = 0;

      // Add products
      Array.from(selectedProducts).forEach(productId => {
        contains.push({
          itemType: 'product',
          itemId: productId,
          order: order++
        });
      });

      // Add groups
      Array.from(selectedGroups).forEach(groupId => {
        contains.push({
          itemType: 'group',
          itemId: groupId,
          order: order++
        });
      });

      // Create or update the folder
      if (folderId) {
        // Update existing folder
        const folderRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${folderId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            color: folderColor,
            contains: contains,
          }),
        });

        if (!folderRes.ok) {
          throw new Error('Failed to update folder');
        }
      } else {
        // Create new folder
        const folderRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: folderName,
            color: folderColor,
            contains: contains,
          }),
        });

        if (!folderRes.ok) {
          throw new Error('Failed to create folder');
        }

        const folderData = await folderRes.json();
        targetFolderId = folderData.folder._id;
      }

      // Only add folder to POS interface category if creating a new folder
      if (!folderId) {
        const posInterfaceRes = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`
        );
        const posInterfaceData = await posInterfaceRes.json();
        const posInterface = posInterfaceData.interface;

        // Find the category and add the folder
        const categoryIndex = posInterface.categories.findIndex(c => c._id === categoryId);
        if (categoryIndex !== -1) {
          const currentItems = posInterface.categories[categoryIndex].items || [];
          posInterface.categories[categoryIndex].items = [
            ...currentItems,
            {
              itemType: 'folder',
              itemId: targetFolderId,
              order: currentItems.length
            }
          ];

          // Save the updated POS interface
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ categories: posInterface.categories })
          });
        }
      }

      toast.success(folderId ? 'Folder updated successfully' : 'Folder created successfully');
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving folder:', error);
      toast.error(folderId ? 'Failed to update folder' : 'Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!folderId) return;

    setLoading(true);
    try {
      // Delete the folder
      const deleteRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/folders/${folderId}`, {
        method: 'DELETE',
      });

      if (!deleteRes.ok) {
        throw new Error('Failed to delete folder');
      }

      // Remove folder from POS interface category
      const posInterfaceRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`
      );
      const posInterfaceData = await posInterfaceRes.json();
      const posInterface = posInterfaceData.interface;

      // Find the category and remove the folder
      const categoryIndex = posInterface.categories.findIndex(c => c._id === categoryId);
      if (categoryIndex !== -1) {
        posInterface.categories[categoryIndex].items = (posInterface.categories[categoryIndex].items || [])
          .filter(item => !(item.itemType === 'folder' && item.itemId === folderId));

        // Save the updated POS interface
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/posinterfaces/${posInterfaceId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ categories: posInterface.categories })
        });
      }

      setDeleteDialogOpen(false);
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error deleting folder:', error);
      toast.error('Failed to delete folder');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto">
        <SheetHeader className="p-4">
          <SheetTitle>{folderId ? 'Edit Folder' : 'Create Folder'}</SheetTitle>
          <SheetDescription>
            Create a folder and select products to include
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 p-4 pt-0">
          <div className="flex flex-col gap-2">
            <Label>Folder Name</Label>
            <Input
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Enter folder name"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Colour</Label>
            <div className="max-h-48 max-w-72 overflow-y-auto">
              <Colors
                initColor={folderColor}
                onChange={(color) => setFolderColor(color)}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div
                style={{
                  backgroundColor: colors?.[folderColor?.split('-')[0]]?.[folderColor?.split('-')[1]]
                }}
                className="w-8 h-8 rounded-md border"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Products</Label>
            <ProductCategorySelector
              categoriesWithProducts={categoriesWithProducts}
              selectedProducts={selectedProducts}
              selectedCategories={selectedCategories}
              onSelectionChange={({ products, categories }) => {
                console.log('Product selection changed:', {
                  newProducts: Array.from(products),
                  previousProducts: Array.from(selectedProducts)
                });
                setSelectedProducts(products);
                setSelectedCategories(categories);
              }}
              placeholder="Select products to include in folder"
              excludeTypes={['divider']}
              showCategories={false}
            />
            <p className="text-xs text-muted-foreground">
              {selectedProducts.size} product{selectedProducts.size !== 1 ? 's' : ''} selected
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Product Groups</Label>
            <MultiSelect
              values={Array.from(selectedGroups)}
              onValuesChange={(values) => setSelectedGroups(new Set(values))}
            >
              <MultiSelectTrigger className="w-full">
                <MultiSelectValue placeholder="Select product groups to include in folder" />
              </MultiSelectTrigger>
              <MultiSelectContent className="[&_[cmdk-list]]:max-h-[60vh] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-list]]:overscroll-contain">
                <MultiSelectGroup>
                  {productGroups.map((group) => (
                    <MultiSelectItem
                      key={group._id}
                      value={group._id}
                      keywords={[group.name]}
                    >
                      {group.name}
                    </MultiSelectItem>
                  ))}
                </MultiSelectGroup>
              </MultiSelectContent>
            </MultiSelect>
            <p className="text-xs text-muted-foreground">
              {selectedGroups.size} group{selectedGroups.size !== 1 ? 's' : ''} selected
            </p>
          </div>
        </div>

        <SheetFooter className="p-4 pt-0">
          <div className="flex gap-2 flex-1">
            {folderId && (
              <Button
                className="cursor-pointer"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={loading}
              >
                Delete
              </Button>
            )}
            <div className="flex-1" />
            <Button
              className="cursor-pointer"
              onClick={handleSave}
              disabled={loading || !folderName.trim()}
            >
              {loading ? 'Saving...' : 'Save'}
            </Button>
            <Button
              className="cursor-pointer"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{folderName}"? This action cannot be undone.
              Products in this folder will not be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Sheet>
  );
}
