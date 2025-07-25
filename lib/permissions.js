import permissionsConfig from './permissions.json';

/**
 * Check if a user has permission to access a specific path
 * @param {string} userRole - The user's role (e.g., 'ADMIN', 'STAFF')
 * @param {string} path - The path to check (e.g., '/shop', '/manage/products')
 * @returns {boolean} - True if user has permission, false otherwise
 */
export function hasPermission(userRole, path) {
  if (!userRole || !path) return false;
  
  const roleConfig = permissionsConfig.roles[userRole];
  if (!roleConfig) return false;
  
  const permissions = roleConfig.permissions;
  
  // Admin has full access
  if (permissions.includes('*')) return true;
  
  // Check for exact path match
  if (permissions.includes(path)) return true;
  
  // Check for parent path permissions (e.g., /shop allows /shop/retail)
  return permissions.some(permission => {
    return path.startsWith(permission + '/') || path === permission;
  });
}

/**
 * Get all allowed paths for a user role
 * @param {string} userRole - The user's role
 * @returns {string[]} - Array of allowed paths
 */
export function getAllowedPaths(userRole) {
  if (!userRole) return [];
  
  const roleConfig = permissionsConfig.roles[userRole];
  if (!roleConfig) return [];
  
  const permissions = roleConfig.permissions;
  
  // Admin has access to everything - return all paths from all roles
  if (permissions.includes('*')) {
    const allPaths = new Set();
    Object.values(permissionsConfig.roles).forEach(role => {
      if (Array.isArray(role.permissions)) {
        role.permissions.forEach(path => {
          if (path !== '*') allPaths.add(path);
        });
      }
    });
    return Array.from(allPaths);
  }
  
  return permissions;
}

/**
 * Filter menu items based on user permissions
 * @param {Array} menuItems - Array of menu items
 * @param {string} userRole - The user's role
 * @returns {Array} - Filtered menu items
 */
export function filterMenuByPermissions(menuItems, userRole) {
  if (!userRole) return [];
  
  return menuItems.filter(item => {
    // Handle menu items with sub-items
    if (item.items) {
      const filteredSubItems = item.items.filter(subItem => 
        hasPermission(userRole, subItem.url)
      );
      
      // Include parent item if it has any allowed sub-items
      if (filteredSubItems.length > 0) {
        item.items = filteredSubItems;
        return true;
      }
      return false;
    }
    
    // Handle group labels (always show)
    if (item.groupLabel) {
      return true;
    }
    
    // Handle external URLs (like waiver) - always allow
    if (item.url && (item.url.startsWith('http://') || item.url.startsWith('https://'))) {
      return true;
    }
    
    // Handle regular menu items
    return hasPermission(userRole, item.url);
  });
}

/**
 * Check if a path requires authentication/authorization
 * @param {string} path - The path to check
 * @returns {boolean} - True if path requires auth
 */
export function requiresAuth(path) {
  // Public paths that don't require authentication
  const publicPaths = ['/login', '/signup', '/logout'];
  
  // External URLs (like waiver) don't require our permission system
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return false;
  }
  
  return !publicPaths.some(publicPath => 
    path === publicPath || path.startsWith(publicPath + '/')
  );
}

/**
 * Get the default redirect path for a user role
 * @param {string} userRole - The user's role
 * @returns {string} - Default path for the role
 */
export function getDefaultPath(userRole) {
  const defaultPaths = {
    'ADMIN': '/shop',
    'MANAGER': '/shop', 
    'STAFF': '/shop',
    'TERMINAL': '/shop'
  };
  
  return defaultPaths[userRole] || '/shop';
}

export { permissionsConfig }; 