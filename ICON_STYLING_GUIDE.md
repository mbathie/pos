# Icon Styling Guide

## How SVG Icons Work with Tailwind

The Iconify icons are now processed to use `currentColor` for their fill and stroke properties. This means they inherit the text color from their parent elements, making them fully styleable with Tailwind CSS.

## Usage Examples

### Basic Color Styling

```jsx
import { SvgIcon } from '@/components/ui/svg-icon';

// Black icon
<SvgIcon src={iconUrl} className="w-6 h-6 text-black" />

// Primary color icon
<SvgIcon src={iconUrl} className="w-6 h-6 text-primary" />

// White icon on dark background
<SvgIcon src={iconUrl} className="w-6 h-6 text-white" />

// Muted/gray icon
<SvgIcon src={iconUrl} className="w-6 h-6 text-muted-foreground" />
```

### Hover and State Effects

```jsx
// Hover effect
<SvgIcon src={iconUrl} className="w-6 h-6 text-gray-600 hover:text-primary transition-colors" />

// Active/selected state
<SvgIcon src={iconUrl} className={cn(
  "w-6 h-6",
  isSelected ? "text-primary" : "text-muted-foreground"
)} />
```

### Dark Mode Support

```jsx
// Automatic dark mode adaptation
<SvgIcon src={iconUrl} className="w-6 h-6 text-foreground" />

// Different colors for light/dark
<SvgIcon src={iconUrl} className="w-6 h-6 text-gray-900 dark:text-gray-100" />
```

### Size Variations

```jsx
// Extra small
<SvgIcon src={iconUrl} className="w-4 h-4 text-primary" />

// Small
<SvgIcon src={iconUrl} className="w-5 h-5 text-primary" />

// Medium (default)
<SvgIcon src={iconUrl} className="w-6 h-6 text-primary" />

// Large
<SvgIcon src={iconUrl} className="w-8 h-8 text-primary" />

// Extra large
<SvgIcon src={iconUrl} className="w-10 h-10 text-primary" />
```

## How It Works

1. **Icon Fetching**: When an icon is selected from Iconify, the SVG is downloaded
2. **Processing**: The SVG is processed to replace all `fill` and `stroke` attributes with `currentColor`
3. **Storage**: The processed SVG is stored as a data URL in the database
4. **Rendering**: When displayed, the SVG inherits the text color from Tailwind classes

## Benefits

- **Full Color Control**: Any Tailwind text color class works
- **Dark Mode**: Automatically adapts to dark mode when using semantic colors
- **Hover States**: Easy to add hover and focus effects
- **Consistency**: Icons match your app's color scheme perfectly
- **Performance**: SVGs are small and scale perfectly at any size

## Fallback for Uploaded Images

For uploaded images (PNG, JPEG), the component falls back to a regular `<img>` tag. You can still apply some styling with CSS filters:

```jsx
// Invert colors for dark mode
<img src={uploadedImage} className="w-6 h-6 dark:invert" />

// Grayscale effect
<img src={uploadedImage} className="w-6 h-6 grayscale hover:grayscale-0" />
```