document.addEventListener('DOMContentLoaded', () => {
    const COOKIE_CONSENT_KEY = 'zigry_cookie_consent';
    const banner = document.getElementById('cookie-consent-banner');

    if (!banner) return;

    const acceptBtn = document.getElementById('cookie-consent-accept');
    const declineBtn = document.getElementById('cookie-consent-decline');

    function updateConsent(granted) {
        window.dataLayer = window.dataLayer || [];
        dataLayer.push({
            event: 'consent_update',
            analytics_storage: granted ? 'granted' : 'denied',
            ad_storage: granted ? 'granted' : 'denied',
            ad_user_data: granted ? 'granted' : 'denied',
            ad_personalization: granted ? 'granted' : 'denied'
        });
    }

    function setConsentCookie(value) {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + 1);
        document.cookie = `${COOKIE_CONSENT_KEY}=${value}; expires=${expiry.toUTCString()}; path=/; SameSite=Lax`;
        banner.classList.add('d-none');
    }

    // Check existing cookie
    const existing = document.cookie
        .split('; ')
        .find(c => c.startsWith(COOKIE_CONSENT_KEY + '='));

    if (existing) {
        const val = existing.split('=')[1];
        updateConsent(val === 'granted');
    } else {
        banner.classList.remove('d-none');
    }

    // Button handlers
    acceptBtn?.addEventListener('click', () => {
        updateConsent(true);
        setConsentCookie('granted');
    });

    declineBtn?.addEventListener('click', () => {
        updateConsent(false);
        setConsentCookie('denied');
    });
});


// gtag
document.addEventListener('DOMContentLoaded', () => {
    const COOKIE_CONSENT_KEY = 'zigry_cookie_consent';
    const banner = document.getElementById('cookie-consent-banner');
    const acceptBtn = document.getElementById('cookie-consent-accept');

    // It's good practice to check if the banner element exists before proceeding.
    if (!banner) {
        return;
    }
    const declineBtn = document.getElementById('cookie-consent-decline');

    // Function to update Google's consent state
    function updateConsent(granted) {
        const consentState = {
            'analytics_storage': granted ? 'granted' : 'denied',
            'ad_storage': granted ? 'granted' : 'denied',
            'ad_user_data': granted ? 'granted' : 'denied',
            'ad_personalization': granted ? 'granted' : 'denied',
        };
        gtag('consent', 'update', consentState);
    }

    // Function to set the consent cookie
    function setConsentCookie(value) {
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year expiry
        document.cookie = `${COOKIE_CONSENT_KEY}=${value}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax; Secure`;
        banner.classList.add('d-none');
    }

    // Check if consent has already been given
    const consentCookie = document.cookie.split('; ').find(row => row.startsWith(COOKIE_CONSENT_KEY + '='));

    if (consentCookie) {
        const consentValue = consentCookie.split('=')[1];
        if (consentValue === 'granted') {
            updateConsent(true);
        }
    } else {
        banner.classList.remove('d-none');
    }

    // Event listeners for buttons
    if (acceptBtn) {
        acceptBtn.addEventListener('click', () => {
            updateConsent(true);
            setConsentCookie('granted');
        });
    }

    if (declineBtn) {
        declineBtn.addEventListener('click', () => {
            updateConsent(false);
            setConsentCookie('denied');
        });
    }
});
// gtag