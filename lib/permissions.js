import permissionsConfig from './permissions.json' with { type: 'json' };

/**
 * Check if a user has permission to access a specific path or group
 * @param {string} userRole - The user's role (e.g., 'ADMIN', 'STAFF')
 * @param {string} path - The path to check (e.g., '/shop', '/manage/products', 'group:setup')
 * @returns {boolean} - True if user has permission, false otherwise
 */
export function hasPermission(userRole, path) {
  // console.log('[Permissions] Checking permission for role:', userRole, 'path:', path);
  
  if (!userRole || !path) {
    // console.log('[Permissions] Missing role or path, returning false');
    return false;
  }
  
  const roleConfig = permissionsConfig.roles[userRole];
  if (!roleConfig) {
    // console.log('[Permissions] Role config not found for:', userRole);
    return false;
  }
  
  const permissions = roleConfig.permissions;
  // console.log('[Permissions] Role permissions:', permissions);
  
  // Admin has full access
  if (permissions.includes('*')) {
    // console.log('[Permissions] User has wildcard permission');
    return true;
  }
  
  // Check for exact path match (including group permissions like 'group:setup')
  if (permissions.includes(path)) {
    // console.log('[Permissions] Exact path match found');
    return true;
  }
  
  // For regular paths (not group permissions), check for parent path permissions
  if (!path.startsWith('group:')) {
    const hasParentPermission = permissions.some(permission => {
      // Check if the path starts with the permission or is exactly the permission
      const matches = path.startsWith(permission) && (
        path === permission || 
        path.charAt(permission.length) === '/' ||
        path.charAt(permission.length) === '?'
      );
      if (matches) {
        // console.log('[Permissions] Parent path match found:', permission);
      }
      return matches;
    });
    if (hasParentPermission) return true;
  }
  
  console.log('[Permissions] No permission found for path');
  return false;
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
    
    // Handle group labels - check permission if specified
    if (item.groupLabel) {
      if (item.permission) {
        return hasPermission(userRole, item.permission);
      }
      return true; // Show group labels without permission requirements
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