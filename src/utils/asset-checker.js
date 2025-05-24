export const checkAssetExists = async (url) => {
  try {
    // Ensure URL is properly encoded
    const encodedUrl = url.split('/').map(part => encodeURIComponent(part)).join('/');
    const response = await fetch(encodedUrl);
    if (!response.ok) {
      console.error(`Asset not found: ${url}`, response.status);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`Error checking asset: ${url}`, err);
    return false;
  }
};
