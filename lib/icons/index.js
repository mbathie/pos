// Iconify API integration
// Documentation: https://iconify.design/docs/api/

const ICONIFY_API_BASE = 'https://api.iconify.design';

/**
 * Search for icons using Iconify API
 * @param {string} query - Search query
 * @param {number} limit - Number of results to return
 */
export async function getIcons({ query, limit = 20 }) {
  try {
    // Search for icons across all icon sets
    const searchResponse = await fetch(`${ICONIFY_API_BASE}/search?query=${encodeURIComponent(query)}&limit=${limit}`);
    
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    // Transform the results to include SVG data
    const iconsWithSvg = await Promise.all(
      searchData.icons.slice(0, limit).map(async (iconName) => {
        try {
          // Parse the icon name (format: "prefix:name")
          const [prefix, name] = iconName.split(':');
          
          // Get the SVG for this icon
          const svgResponse = await fetch(`${ICONIFY_API_BASE}/${prefix}/${name}.svg`);
          
          if (!svgResponse.ok) {
            console.warn(`Failed to fetch SVG for ${iconName}`);
            return null;
          }
          
          let svgText = await svgResponse.text();
          
          // Process SVG to make it styleable:
          // 1. Remove any existing fill/stroke styles and attributes
          // 2. Add currentColor to paths and shapes
          svgText = svgText
            // Remove inline styles that set fill/stroke
            .replace(/style="[^"]*"/g, '')
            // Remove width and height attributes from SVG to make it responsive
            .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, '<svg$1')
            // Add viewBox if missing (assuming 24x24 as default)
            .replace(/<svg(?![^>]*viewBox)([^>]*)>/g, '<svg viewBox="0 0 24 24"$1>')
            // Replace fill attributes (except 'none' and 'currentColor')
            .replace(/fill="(?!(none|currentColor))[^"]*"/g, 'fill="currentColor"')
            // Replace stroke attributes (except 'none' and 'currentColor')
            .replace(/stroke="(?!(none|currentColor))[^"]*"/g, 'stroke="currentColor"')
            // Add fill="currentColor" to SVG element if no fill is set
            .replace(/<svg(?![^>]*fill)([^>]*)>/g, '<svg fill="currentColor"$1>')
            // Add fill="currentColor" to paths/shapes that don't have a fill attribute
            .replace(/<(path|rect|circle|ellipse|polygon|polyline|g)(?![^>]*fill)([^>]*)>/g, '<$1 fill="currentColor"$2>');
          
          // For storage, we'll use a data URL with the processed SVG
          // This allows the SVG to inherit text color from parent elements
          const svgDataUrl = `data:image/svg+xml,${encodeURIComponent(svgText)}`;
          
          return {
            name: iconName,
            prefix,
            iconName: name,
            svg: svgText,
            thumbnail_url: svgDataUrl, // For compatibility with existing code
            width: 24,
            height: 24
          };
        } catch (error) {
          console.error(`Error fetching icon ${iconName}:`, error);
          return null;
        }
      })
    );
    
    // Filter out any failed icons
    const validIcons = iconsWithSvg.filter(icon => icon !== null);
    
    return JSON.stringify({
      icons: validIcons,
      total: searchData.total,
      limit: searchData.limit
    });
    
  } catch (error) {
    console.error('Error searching icons:', error);
    // Return empty result on error
    return JSON.stringify({
      icons: [],
      total: 0,
      limit: 0,
      error: error.message
    });
  }
}

/**
 * Get a specific icon's SVG
 * @param {string} iconName - Icon name in format "prefix:name"
 */
export async function getIconSvg(iconName) {
  try {
    const [prefix, name] = iconName.split(':');
    
    const response = await fetch(`${ICONIFY_API_BASE}/${prefix}/${name}.svg`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch icon: ${response.status}`);
    }
    
    let svgText = await response.text();
    
    // Process SVG to make it styleable
    svgText = svgText
      .replace(/style="[^"]*"/g, '')
      .replace(/<svg([^>]*?)\s(width|height)="[^"]*"/g, '<svg$1')
      .replace(/<svg(?![^>]*viewBox)([^>]*)>/g, '<svg viewBox="0 0 24 24"$1>')
      .replace(/fill="(?!(none|currentColor))[^"]*"/g, 'fill="currentColor"')
      .replace(/stroke="(?!(none|currentColor))[^"]*"/g, 'stroke="currentColor"')
      .replace(/<svg(?![^>]*fill)([^>]*)>/g, '<svg fill="currentColor"$1>')
      .replace(/<(path|rect|circle|ellipse|polygon|polyline|g)(?![^>]*fill)([^>]*)>/g, '<$1 fill="currentColor"$2>');
    
    // Return as data URL with processed SVG
    return `data:image/svg+xml,${encodeURIComponent(svgText)}`;
    
  } catch (error) {
    console.error('Error fetching icon SVG:', error);
    return null;
  }
}

/**
 * Get available icon collections/sets
 */
export async function getIconCollections() {
  try {
    const response = await fetch(`${ICONIFY_API_BASE}/collections`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch collections: ${response.status}`);
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Error fetching icon collections:', error);
    return {};
  }
}