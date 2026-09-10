// Safari match patterns are host-scoped and cannot include a port.
// Assignment and navigation checks separately retain the exact URL origin.
function permissionPattern(origin) {
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP(S) websites are supported.');
  return `${url.protocol}//${url.hostname}/*`;
}
