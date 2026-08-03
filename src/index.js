import htmlTemplate from './template.html';

const ALLOWED_HOSTNAMES = ["www.zigry.in", "zigry.in"];

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

var index_default = {
  async fetch(request) {
    const url = new URL(request.url);

    // 1. Strict Hostname Check: Allow ONLY 'www.zigry.in' and 'zigry.in'
    if (!ALLOWED_HOSTNAMES.includes(url.hostname)) {
      throw new Error("Origin unavailable");
    }

    try {
      const response = await fetch(new Request(url, request), {
        cf: {
          cacheEverything: false
        }
      });

      if (response.status >= 500) {
        throw new Error(`Server returned status ${response.status}`);
      }

      return response;
    } catch (err) {
      const isOriginError = err.message.includes("Origin unavailable");

      const pageHtml = renderMaintenancePage({
        PAGE_TITLE: isOriginError ? "Zigry • Access Restricted" : "Zigry • Maintenance",
        BADGE_TEXT: isOriginError ? "Host Not Allowed" : "Scheduled Maintenance",
        HEADING: isOriginError ? "unauthorized origin" : "will be back soon",
        SUBTITLE: isOriginError 
          ? "This domain or subdomain is not allowed to access this resource."
          : "We're making Zigry even better for you.",
        MESSAGE: isOriginError
          ? "Please check that you are accessing the main site directly at <strong>zigry.in</strong> or <strong>www.zigry.in</strong>."
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
  }
};

export default index_default;