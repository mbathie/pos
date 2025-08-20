import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

/**
 * SVG Icon Component
 * Renders SVG icons with Tailwind color support
 * 
 * @param {string} src - SVG data URL or raw SVG string
 * @param {string} className - Tailwind classes (text color will apply to the icon)
 * @param {string} alt - Alt text for accessibility
 */
export function SvgIcon({ src, className, alt = "icon", ...props }) {
  const [svgContent, setSvgContent] = useState(null);
  
  useEffect(() => {
    if (!src) return;
    
    // If it's a data URL, extract and decode the SVG
    if (src.startsWith('data:image/svg+xml,')) {
      try {
        // Extract the SVG content from the data URL
        const svgEncoded = src.replace('data:image/svg+xml,', '');
        const svgDecoded = decodeURIComponent(svgEncoded);
        setSvgContent(svgDecoded);
      } catch (error) {
        console.error('Error decoding SVG:', error);
        setSvgContent(null);
      }
    } else if (src.startsWith('data:image/svg+xml;base64,')) {
      try {
        // Handle base64 encoded SVGs
        const base64 = src.replace('data:image/svg+xml;base64,', '');
        const svgDecoded = atob(base64);
        setSvgContent(svgDecoded);
      } catch (error) {
        console.error('Error decoding base64 SVG:', error);
        setSvgContent(null);
      }
    } else if (src.startsWith('<svg')) {
      // It's already raw SVG
      setSvgContent(src);
    } else {
      // Not an SVG data URL
      setSvgContent(null);
    }
  }, [src]);

  if (!src) return null;

  // Render inline SVG for color support
  if (svgContent) {
    return (
      <span
        className={cn(
          "inline-flex items-center justify-center",
          "[&>svg]:w-full [&>svg]:h-full",
          "[&>svg]:fill-current [&>svg]:stroke-current",
          "[&_path]:fill-current [&_rect]:fill-current [&_circle]:fill-current",
          "[&_ellipse]:fill-current [&_polygon]:fill-current [&_polyline]:fill-current",
          "[&_g]:fill-current",
          className
        )}
        dangerouslySetInnerHTML={{ __html: svgContent }}
        {...props}
      />
    );
  }

  // Fallback for other image types (PNG, JPEG from uploads)
  // These can't have their colors changed with CSS
  return (
    <img
      src={src}
      alt={alt}
      className={cn("inline-block", className)}
      {...props}
    />
  );
}