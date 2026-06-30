// dashboard-cliente/src/utils/menuUrl.js
// Helper utility to construct public menu URLs dynamically, supporting localhost,
// custom domains, and platform fallback subdomains.

export function getPublicMenuUrl({ restaurant, restaurantId, path = '', params = {} }) {
  const menuIdentifier = restaurant?.slug || restaurantId;
  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const isRootLevelRoute = cleanPath === '/order-status';

  let baseUrl = '';
  let fullPath = '';

  if (isLocal) {
    baseUrl = 'http://localhost:5174';
    fullPath = isRootLevelRoute ? '' : `/r/${menuIdentifier}`;
  } else if (restaurant?.customDomain && restaurant?.customDomainStatus === 'active') {
    baseUrl = `https://${restaurant.customDomain}`;
    fullPath = '';
  } else {
    baseUrl = 'https://miprodu.com';
    fullPath = isRootLevelRoute ? '' : `/r/${menuIdentifier}`;
  }

  // Append requested sub-path (e.g. '/menu' or 'menu')
  if (path) {
    fullPath += cleanPath;
  }

  // Build query parameters
  const queryParts = [];
  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '') {
      queryParts.push(`${encodeURIComponent(key)}=${encodeURIComponent(val)}`);
    }
  });

  const queryString = queryParts.length > 0 ? `?${queryParts.join('&')}` : '';

  return `${baseUrl}${fullPath}${queryString}`;
}
