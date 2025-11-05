'use client';

import React from 'react';
import {
  MultiSelect,
  MultiSelectTrigger,
  MultiSelectValue,
  MultiSelectContent,
  MultiSelectGroup,
  MultiSelectItem
} from '@/components/ui/multi-select';

export default function ProductCategorySelector({
  categoriesWithProducts = [],
  selectedProducts = new Set(),
  selectedCategories = new Set(),
  onSelectionChange,
  placeholder = "Select categories and/or products",
  className = "",
  excludeTypes = [],
  showCategories = true
}) {
  const handleValuesChange = (values) => {
    const newProducts = new Set();
    const newCategories = new Set();
    
    values.forEach((value) => {
      if (value.startsWith('category-')) {
        const categoryId = value.replace('category-', '');
        newCategories.add(categoryId);
      } else {
        newProducts.add(value);
      }
    });
    
    if (onSelectionChange) {
      onSelectionChange({
        products: newProducts,
        categories: newCategories
      });
    }
  };

  const currentValues = [
    ...Array.from(selectedProducts),
    ...Array.from(selectedCategories).map(c => `category-${c}`)
  ];

  return (
    <MultiSelect
      values={currentValues}
      onValuesChange={handleValuesChange}
      className={className}
    >
      <MultiSelectTrigger className="w-full">
        <MultiSelectValue placeholder={placeholder} />
      </MultiSelectTrigger>
      <MultiSelectContent
        search={{ placeholder: "Search products..." }}
        className="[&_[cmdk-list]]:max-h-[60vh] [&_[cmdk-list]]:overflow-y-auto [&_[cmdk-list]]:overscroll-contain"
      >
        <MultiSelectGroup>
          {(() => {
            const seen = new Set();
            const sortedCategories = [...categoriesWithProducts].sort((a, b) =>
              (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
            );

            const items = [];
            for (const category of sortedCategories) {
              const catLabel = category.name || '';

              // Add category (only if showCategories is true)
              if (showCategories) {
                items.push(
                  <MultiSelectItem
                    key={`cat-${category._id}`}
                    value={`category-${category._id}`}
                    keywords={[catLabel]}
                    badgeLabel={catLabel?.toUpperCase?.() || catLabel}
                    className="font-semibold uppercase"
                  >
                    {catLabel}
                  </MultiSelectItem>
                );
              }

              // Add products in this category
              const sortedProducts = [...(category.products || [])]
                // Optional filter to exclude types (e.g., 'divider')
                .filter(p => !excludeTypes.includes(p.type))
                .sort((a, b) =>
                (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' })
              );

              for (const product of sortedProducts) {
                if (seen.has(product._id)) continue; // avoid duplicates
                seen.add(product._id);

                items.push(
                  <MultiSelectItem
                    key={product._id}
                    value={product._id}
                    keywords={[product.name]}
                  >
                    {product.name}
                  </MultiSelectItem>
                );
              }
            }

            return items;
          })()}
        </MultiSelectGroup>
      </MultiSelectContent>
    </MultiSelect>
  );
}
