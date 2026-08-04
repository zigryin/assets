import htmlTemplate from './template.html';

const DOMAIN = "zigry.in";

function renderMaintenancePage(params = {}) {
  const defaults = {
    PAGE_TITLE: "Zigry • We'll Be Back Soon",
    BADGE_TEXT: "Scheduled Maintenance",
    HEADING: "will be back soon",
    SUBTITLE: "We're making Zigry even better for you.",
    MESSAGE: "Our engineers are currently upgrading the platform with new features, performance improvements, and security enhancements.<br><br>Thank you for your patience. We'll be back online shortly.",
    STATUS_TEXT: "Maintenance in progress..."
  };

  const data = { ...defaults, ...params };
  let renderedHtml = htmlTemplate;

  Object.keys(data).forEach((key) => {
    renderedHtml = renderedHtml.replaceAll(`{{${key}}}`, data[key]);
  });

  return renderedHtml;
}

// Helper to construct the Response directly
function buildErrorResponse(isOriginError) {
  const pageHtml = renderMaintenancePage({
    PAGE_TITLE: isOriginError ? "Zigry • Access Restricted" : "Zigry • Maintenance",
    BADGE_TEXT: isOriginError ? "Host Not Allowed" : "Scheduled Maintenance",
    HEADING: isOriginError ? "unauthorized origin" : "will be back soon",
    SUBTITLE: isOriginError 
      ? "This domain or subdomain is not permitted."
      : "We're making Zigry even better for you.",
    MESSAGE: isOriginError
      ? "Please check that you are accessing official <strong>zigry.in</strong> domains."
      : "Our engineers are upgrading the platform with new features and security enhancements.<br><br>Thank you for your patience.",
    STATUS_TEXT: isOriginError ? "Access Denied" : "Maintenance in progress..."
  });

  return new Response(pageHtml, {
    status: isOriginError ? 403 : 503,
    headers: {
      "Content-Type": "text/html; charset=UTF-8",
      "Cache-Control": "no-store"
    }
  });
}

var index_default = {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Hostname Check: Allow 'zigry.in' and ANY subdomain (*.zigry.in)
    const isZigryDomain = url.hostname === DOMAIN || url.hostname.endsWith("." + DOMAIN);

    if (!isZigryDomain) {
      return buildErrorResponse(true); // Return 403 response directly
    }

    try {
      // 2. Fetch from origin server
      const response = await fetch(request, {
        cf: {
          cacheEverything: false
        }
      });

      // 3. Catch server/origin 5xx status codes
      if (response.status >= 500) {
        return buildErrorResponse(false); // Return 503 maintenance page
      }

      // Live site returns normally
      return response;

    } catch (err) {
      // 4. Catch fetch failures / connection drops
      return buildErrorResponse(false);
    }
  }
};

export default index_default;