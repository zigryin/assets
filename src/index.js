import htmlTemplate from './template.html';
const DOMAIN = "zigry.in";

function renderMaintenancePage(params = {}) {
  const defaults = {
    PAGE_TITLE: "Zigry \u2022 We'll Be Back Soon",
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
__name(renderMaintenancePage, "renderMaintenancePage");
var index_default = {
  async fetch(request) {
    const url = new URL(request.url);
    const isZigryDomain = url.hostname === DOMAIN || url.hostname.endsWith("." + DOMAIN);
    if (!isZigryDomain) {
            const isOriginError = !isZigryDomain;
      const pageHtml = renderMaintenancePage({
        PAGE_TITLE: isOriginError ? "Zigry \u2022 Access Restricted" : "Zigry \u2022 Maintenance",
        BADGE_TEXT: isOriginError ? "Host Not Allowed" : "Scheduled Maintenance",
        HEADING: isOriginError ? "Unauthorized Origin" : "will be back soon",
        SUBTITLE: isOriginError ? "This domain or subdomain is not permitted." : "We're making Zigry even better for you.",
        MESSAGE: isOriginError ? "Please check that you are accessing official <strong>zigry.in</strong> domains." : "Our engineers are upgrading the platform with new features and security enhancements.<br><br>Thank you for your patience.",
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
    try {
      const response = await fetch(request, {
        cf: {
          cacheEverything: false
        }
      });
      if (response.status >= 500) {
              const isOriginError = false;
      const pageHtml = renderMaintenancePage({
        PAGE_TITLE: isOriginError ? "Zigry \u2022 Access Restricted" : "Zigry \u2022 Maintenance",
        BADGE_TEXT: isOriginError ? "Host Not Allowed" : "Scheduled Maintenance",
        HEADING: isOriginError ? "unauthorized origin" : "will be back soon",
        SUBTITLE: isOriginError ? "This domain or subdomain is not permitted." : "We're making Zigry even better for you.",
        MESSAGE: isOriginError ? "Please check that you are accessing official <strong>zigry.in</strong> domains." : "Our engineers are upgrading the platform with new features and security enhancements.<br><br>Thank you for your patience.",
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
      return response;
    } catch (err) {
      const isOriginError = err.message.includes("Origin unavailable");
      const pageHtml = renderMaintenancePage({
        PAGE_TITLE: isOriginError ? "Zigry \u2022 Access Restricted" : "Zigry \u2022 Maintenance",
        BADGE_TEXT: isOriginError ? "Host Not Allowed" : "Scheduled Maintenance",
        HEADING: isOriginError ? "unauthorized origin" : "will be back soon",
        SUBTITLE: isOriginError ? "This domain or subdomain is not permitted." : "We're making Zigry even better for you.",
        MESSAGE: isOriginError ? "Please check that you are accessing official <strong>zigry.in</strong> domains." : "Our engineers are upgrading the platform with new features and security enhancements.<br><br>Thank you for your patience.",
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