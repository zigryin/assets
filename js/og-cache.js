/**
 * OG Cache JavaScript Helper
 * Usage: 
 * - OgCache.fetch('https://example.com').then(data => console.log(data));
 * - OgCache.batchFetch(['url1', 'url2']).then(data => console.log(data));
 */

const OgCache = {
    /**
     * Fetch OG data for a single URL
     * @param {string} url - The URL to fetch OG data for
     * @returns {Promise<Object>}
     */
    async fetch(url) {
        try {
            const response = await fetch('/api/og/fetch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch OG data');
            }

            return result.data;
        } catch (error) {
            console.error('OG fetch error:', error);
            throw error;
        }
    },

    /**
     * Get cached OG data (no refetch)
     * @param {string} url - The URL to get cached data for
     * @returns {Promise<Object>}
     */
    async get(url) {
        try {
            const response = await fetch(`/api/og/get?url=${encodeURIComponent(url)}`);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'OG data not found in cache');
            }

            return result.data;
        } catch (error) {
            console.error('OG get error:', error);
            throw error;
        }
    },

    /**
     * Batch fetch OG data for multiple URLs
     * @param {Array<string>} urls - Array of URLs
     * @returns {Promise<Object>}
     */
    async batchFetch(urls) {
        try {
            const response = await fetch('/api/og/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ urls })
            });

            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.error || 'Failed to batch fetch OG data');
            }

            return result.data;
        } catch (error) {
            console.error('OG batch fetch error:', error);
            throw error;
        }
    },

    /**
     * Render OG preview in a container
     * @param {Object} ogData - OG data object
     * @param {string} url - Original URL
     * @returns {string} HTML string
     */
    renderPreview(ogData, url = null) {
        if (!ogData) return '';

        let html = '<div class="og-preview" style="border: 1px solid var(--bs-border-color); border-radius: 8px; overflow: hidden; margin: 10px 0;">';

        // Image
        if (ogData.image) {
            html += `<img src="${this.escapeHtml(ogData.image)}" 
                         alt="${this.escapeHtml(ogData.title || 'Preview')}" 
                         style="width: 100%; height: 200px; object-fit: cover;">`;
        }

        // Content
        html += '<div style="padding: 12px;">';

        if (ogData.site_name) {
            html += `<div style="font-size: 12px; color: var(--bs-secondary-color); margin-bottom: 5px;">
                        ${this.escapeHtml(ogData.site_name)}
                     </div>`;
        }

        if (ogData.title) {
            html += `<div style="font-weight: 600; font-size: 15px; margin-bottom: 5px; color: var(--bs-body-color);">
                        ${this.escapeHtml(ogData.title)}
                     </div>`;
        }

        if (ogData.description) {
            const desc = ogData.description.length > 120 
                ? ogData.description.substring(0, 120) + '...' 
                : ogData.description;
            html += `<div style="font-size: 13px; color: var(--bs-secondary-color); line-height: 1.4;">
                        ${this.escapeHtml(desc)}
                     </div>`;
        }

        const linkUrl = url || ogData.url;
        if (linkUrl) {
            try {
                const hostname = new URL(linkUrl).hostname;
                html += `<div style="font-size: 12px; color: var(--bs-secondary-color); margin-top: 8px;">
                            <a href="${this.escapeHtml(linkUrl)}" 
                               target="_blank" 
                               rel="noopener noreferrer"
                               style="color: var(--bs-link-color); text-decoration: none;">
                                ${this.escapeHtml(hostname)} ↗
                            </a>
                         </div>`;
            } catch (e) {
                // Invalid URL, skip link
            }
        }

        html += '</div></div>';
        return html;
    },

    /**
     * Extract URLs from text
     * @param {string} text - Text to extract URLs from
     * @returns {Array<string>}
     */
    extractUrls(text) {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.match(urlRegex) || [];
    },

    /**
     * Auto-detect and render OG previews for URLs in text
     * @param {string} text - Text containing URLs
     * @param {HTMLElement} container - Container to render previews
     */
    async autoRender(text, container) {
        const urls = this.extractUrls(text);
        
        if (urls.length === 0) return;

        // Fetch OG data for all URLs
        const ogDataMap = await this.batchFetch(urls);

        // Render each preview
        for (const url of urls) {
            const ogData = ogDataMap[url];
            if (ogData) {
                const previewHtml = this.renderPreview(ogData, url);
                container.innerHTML += previewHtml;
            }
        }
    },

    /**
     * Escape HTML to prevent XSS
     * @param {string} text
     * @returns {string}
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OgCache;
}
