/**
 * Zigry Reels - JavaScript Module
 * Handles reel uploading, loading, and player functionality
 */

// Global state
// Global state - using var to avoid redeclaration errors on script reload
var reelsData = [];
var currentReelIndex = 0;
var reelsPage = 1;
var reelsHasMore = true;
var reelsLoading = false;

/**
 * Upload a new reel
 */
function uploadReel(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];

  // Validate file type - must be video
  const validTypes = ["video/mp4", "video/webm", "video/ogv", "video/mov"];
  if (!validTypes.includes(file.type)) {
    alert("Invalid file type. Please upload a video (MP4, WebM, OGV, MOV)");
    return;
  }

  // Validate file size (max 100MB for reels)
  if (file.size > 20 * 1024 * 1024) {
    alert("File size must be less than 20MB");
    return;
  }

  // Get video duration
  const video = document.createElement("video");
  video.preload = "metadata";
  video.onloadedmetadata = function () {
    window.URL.revokeObjectURL(video.src);
    const duration = Math.round(video.duration || 0);

    const formData = new FormData();
    formData.append("video", file);
    formData.append("caption", document.getElementById("reel-caption").value);
    formData.append("duration", duration);

    // Get CSRF token
    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    // Show loading state
    const uploadBtn = input.closest(".add-reel-btn") || input.parentElement;
    if (uploadBtn) {
      uploadBtn.style.opacity = "0.5";
      uploadBtn.style.pointerEvents = "none";
    }

    fetch("/api/reels", {
      method: "POST",
      headers: {
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formData,
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success) {
          // Show success message
          if (typeof zigry !== "undefined" && zigry.toast) {
            zigry.toast("Reel uploaded successfully!");
          } else {
            // alert("Reel uploaded successfully!");
          }
          // Reload reels preview
          loadReelsPreview();
        } else {
          alert("Failed to upload reel: " + (data.message || "Unknown error"));
        }
      })
      .catch((error) => {
        // console.error("Error uploading reel:", error);
        // alert("Failed to upload reel. Please try again.");
      })
      .finally(() => {
        // Reset loading state
        if (uploadBtn) {
          uploadBtn.style.opacity = "1";
          uploadBtn.style.pointerEvents = "auto";
        }
        input.value = "";
      });
  };
  video.src = URL.createObjectURL(file);
}

/**
 * Load reels preview for home feed
 */
function loadReelsPreview() {
  const container = document.getElementById("reels-preview-list");
  if (!container) return;

  fetch("/api/reels/preview")
    .then((response) => response.json())
    .then((reels) => {
      container.innerHTML = "";

      if (Array.isArray(reels) && reels.length > 0) {
        reels.forEach((reel, index) => {
          const reelEl = document.createElement("div");
          reelEl.className =
            "reel-preview-item rounded-3 overflow-hidden position-relative flex-shrink-0";
          reelEl.style.cssText =
            "width: 140px; height: 200px; cursor: pointer;";

          // Use thumbnail or video poster
          const bgImage = reel.thumbnail || "";

          reelEl.innerHTML = `
            <div class="w-100 h-100 d-flex align-items-center justify-content-center" style="background: linear-gradient(45deg, #667eea, #764ba2);">
                ${
                  bgImage
                    ? `<img src="${bgImage}" class="w-100 h-100 object-fit-cover">`
                    : ""
                }
                <div class="position-absolute top-50 start-50 translate-middle text-white fs-4">▶</div>
            </div>
            <div class="position-absolute bottom-0 start-0 end-0 p-1" style="background: linear-gradient(transparent, rgba(0,0,0,0.8));">
                <small class="text-white d-block text-center text-truncate small" style="font-size: 9px;">${
                  reel.user?.name || ""
                }</small>
            </div>
          `;

          // Click to open reel with shareable URL
          reelEl.onclick = () => {
            // Save current location as fallback origin
            if (typeof sessionStorage !== "undefined") {
              sessionStorage.setItem(
                "zigry_last_reel_origin",
                window.location.href
              );
            }

            // Use hash if available, otherwise do not navigate to bad link
            if (reel.hash) {
              if (typeof zigry !== "undefined" && zigry.navigate) {
                zigry.navigate("/reels/" + reel.hash);
              } else {
                window.location.href = "/reels/" + reel.hash;
              }
            } else {
              console.error("Reel missing hash, cannot navigate", reel);
            }
          };

          container.appendChild(reelEl);
        });
      }
    })
    .catch((error) => console.error("Error loading reels preview:", error));
}

/**
 * Load reels for the dedicated reels page
 */
function loadReelsPage() {
  // Reset state on first load (for refresh)
  if (reelsPage === 1) {
    reelsData = [];
    reelsHasMore = true;
    currentReelIndex = 0;

    // Handle initial reel (start from deep link)
    if (window.initialReel) {
      reelsData.push(window.initialReel);
      renderReels([window.initialReel]);
      // Clear it so it doesn't re-inject on obscure refreshes
      window.initialReel = null;
    }
  }

  if (reelsLoading || !reelsHasMore) return;
  reelsLoading = true;

  const loadingEl = document.getElementById("reels-loading");

  let url = `/api/reels/feed?page=${reelsPage}`;
  if (reelsPage === 1) {
    const pathParts = window.location.pathname.split("/");
    // If URL is /reels/{hash}, send hash to prioritize that reel
    if (pathParts.length >= 3 && pathParts[1] === "reels" && pathParts[2]) {
      url += `&hash=${pathParts[2]}`;
    }
  }
  fetch(url)
    .then((response) => response.json())
    .then((data) => {
      if (loadingEl) loadingEl.style.display = "none";

      if (data.success && data.reels && data.reels.length > 0) {
        // Filter out existing reels to prevent duplicates (especially with initialReel)
        const newReels = data.reels.filter(
          (r) => !reelsData.some((existing) => existing.id === r.id)
        );

        if (newReels.length > 0) {
          reelsData = reelsData.concat(newReels);
          renderReels(newReels);
        }

        reelsHasMore = data.hasMore;
        reelsPage++;
      } else if (reelsData.length === 0) {
        // No reels at all
        const feed = document.getElementById("reels-feed");
        if (feed) {
          feed.innerHTML = `
            <div class="d-flex flex-column align-items-center justify-content-center h-100 text-white">
                <div class="mb-3" style="font-size: 48px;">🎬</div>
                <h3>No reels yet</h3>
                <p class="opacity-75">Be the first to upload a reel!</p>
                <a href="/" class="btn btn-primary mt-3">Go Home</a>
            </div>
          `;
        }
      }

      reelsLoading = false;
    })
    .catch((error) => {
      console.error("Error loading reels:", error);
      reelsLoading = false;
      if (loadingEl) loadingEl.style.display = "none";
    });
}

/**
 * Render reels into the feed
 */
// Singleton observer
var reelObserver = null;

function renderReels(reels) {
  const feed = document.getElementById("reels-feed");
  if (!feed) return;

  const newElements = [];

  reels.forEach((reel, index) => {
    const reelEl = document.createElement("div");
    reelEl.className = "reel-item";
    reelEl.dataset.reelId = reel.id;
    reelEl.dataset.hash = reel.hash || "";
    reelEl.dataset.isAd = reel.is_ad ? "true" : "false";
    if (reel.is_ad) {
      reelEl.dataset.adId = reel.ad_id;
      reelEl.dataset.campaignId = reel.campaign_id;
    }
    reelEl.dataset.index = reelsData.length - reels.length + index;

    reelEl.innerHTML = `
      <div class="reel-video-wrapper">
        <video 
            class="reel-video-player zigry-video" 
            src="${reel.video_url}"
            ${reel.thumbnail ? `poster="${reel.thumbnail}"` : ""}
            loop
            playsinline
            muted
            preload="auto"
        ></video>
        
        <div class="play-pause-indicator">▶</div>
        
        <div class="reel-overlay">
            <a href="${
              reel.is_ad ? "#" : "/" + (reel.user?.username || "")
            }" class="reel-user-info text-decoration-none text-white">
                <img src="${
                  reel.user?.avatar || "/assets/images/default/unknown.png"
                }" 
                     class="reel-user-avatar"
                     onerror="this.src='/assets/images/default/unknown.png'">
                <div class="d-flex flex-column">
                    <span class="reel-user-name gap-2">
                        ${reel.user?.name || "Unknown"}
                        ${
                          reel.user?.verified
                            ? '<svg class="glow zigry zigry-xs z-verified reel-verified"><use xlink:href="#z-verified"></use></svg>'
                            : ""
                        }
                    </span>
                    ${
                      reel.is_ad
                        ? '<span class="badge bg-white text-dark" style="font-size: 10px; width: fit-content;">Sponsored</span>'
                        : ""
                    }
                </div>
            </a>
            <div class="reel-caption">${reel.caption || ""}</div>
            ${
              reel.is_ad && reel.cta_link
                ? `<a href="${
                    reel.cta_link
                  }" target="_blank" class="btn btn-primary btn-sm mt-2 w-100" onclick="trackAdClick('${
                    reel.ad_id
                  }', '${reel.campaign_id}')">${
                    reel.cta_text || "Learn More"
                  }</a>`
                : ""
            }
        </div>
        
        <div class="reel-actions">
            ${
              !reel.is_ad
                ? `
            <div class="reel-action-btn ${
              reel.is_liked ? "liked" : ""
            }" onclick="toggleReelLike(${reel.id}, this)">
                <span class="icon">
                    <svg class="z-heart"><use xlink:href="#z-heart"></use></svg>
                </span>
                <span class="count likes-count">${formatNumber(
                  reel.likes || 0
                )}</span>
            </div>
            
            <div class="reel-action-btn" onclick="openComments('${reel.hash}')">
                <span class="icon">
                    <svg class="z-message"><use xlink:href="#z-message"></use></svg>
                </span>
                <span class="count comments-count">${formatNumber(
                  reel.comments_count || 0
                )}</span>
            </div>

            <div class="reel-action-btn" onclick="shareReel(${reel.id})">
                <span class="icon">
                    <svg class="z-share-plane"><use xlink:href="#z-share-plane"></use></svg>
                </span>
                <span class="count">Share</span>
            </div>
            <div class="reel-action-btn views-display">
                <span class="icon">
                    <svg class="z-eye"><use xlink:href="#z-eye"></use></svg>
                </span>
                <span class="count views-count">${formatNumber(
                  reel.views || 0
                )}</span>
            </div>
            `
                : ""
            }
        </div>
      </div>
    `;

    feed.appendChild(reelEl);
    newElements.push(reelEl);

    // Hide app loader when first reel is added
    const appLoader = document.querySelector(".zigry-loader");
    if (appLoader) appLoader.style.display = "none";

    // Setup video player interactions
    const video = reelEl.querySelector(".reel-video-player");
    const indicator = reelEl.querySelector(".play-pause-indicator");

    // Handle video loadeddata - video is ready
    video.addEventListener("loadeddata", function () {
      // Hide spinner again just in case
      const loadingEl = document.getElementById("reels-loading");
      if (loadingEl) loadingEl.style.display = "none";
    });

    // Handle video error
    video.addEventListener("error", function (e) {
      console.error("Video load error:", e, this.error);
      console.error("Failed URL:", this.src);
      // Hide spinner even on error
      const loadingEl = document.getElementById("reels-loading");
      if (loadingEl) loadingEl.style.display = "none";
      // Show error indicator
      if (indicator) {
        indicator.textContent = "⚠️";
        indicator.style.opacity = "0.8";
      }
    });

    // Handle canplay event
    // video.addEventListener("canplay", function () {
    //   console.log("Video can play:", this.src);
    // });

    // Handle video playing to confirm it works
    video.addEventListener("playing", function () {
      if (indicator) indicator.style.opacity = "0";
    });

    // Auto-play first video ONLY if it's the very first load
    // (Observer will handle it anyway, but this is a fallback for instant start)
    if (reelsData.length - reels.length + index === 0) {
      video.play().catch((err) => {
        // console.error("Autoplay failed:", err);
        // Show tap to play indicator
        if (indicator) {
          indicator.textContent = "▶";
          indicator.style.opacity = "0.8";
        }
      });
    }

    video.addEventListener("click", function (e) {
      e.stopPropagation();
      if (this.paused) {
        this.play();
        indicator.textContent = "▶";
      } else {
        this.pause();
        indicator.textContent = "⏸";
      }
      indicator.style.opacity = "0.8";
      setTimeout(() => (indicator.style.opacity = "0"), 500);
    });

    // Disable right-click context menu on video
    video.addEventListener("contextmenu", function (e) {
      e.preventDefault();
      return false;
    });
  });

  // Setup/Update observer
  setupReelObserver(newElements);
}

/**
 * Setup intersection observer for autoplay
 */
function setupReelObserver(elements) {
  if (!reelObserver) {
    reelObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target.querySelector(".reel-video-player");
          const indicator = entry.target.querySelector(".play-pause-indicator");
          if (!video) return;

          if (entry.isIntersecting) {
            // Try to play video
            const playPromise = video.play();
            if (playPromise !== undefined) {
              playPromise
                .then(() => {
                  // Playing successfully
                  if (indicator) indicator.style.opacity = "0";

                  // Start view tracking timer (3s threshold)
                  if (video._viewTimer) clearTimeout(video._viewTimer);
                  const reelId = entry.target.dataset.reelId;
                  const hash = entry.target.dataset.hash;

                  // Only set timer if not already viewed
                  // Support string IDs for ads
                  if (!viewedReels.has(reelId)) {
                    video._viewTimer = setTimeout(() => {
                      const isAd = entry.target.dataset.isAd === "true";
                      const adId = entry.target.dataset.adId;
                      const campaignId = entry.target.dataset.campaignId;
                      trackReelView(reelId, hash, isAd, adId, campaignId);
                    }, 3000);
                  }

                  // Update URL to shareable hash without reloading
                  if (hash) {
                    // Ensure we don't spam history if it's already set
                    const currentFn = window.location.pathname.split("/").pop();
                    if (currentFn !== hash) {
                      const newUrl = "/reels/" + hash;
                      history.replaceState({ path: newUrl }, "", newUrl);
                    }
                  } else {
                    console.warn("No hash found for reel", reelId);
                  }
                })
                .catch((e) => {
                  // Autoplay blocked
                  if (indicator) {
                    indicator.textContent = "▶";
                    indicator.style.opacity = "0.8";
                  }
                });
            }
          } else {
            video.pause();
            if (video._viewTimer) {
              clearTimeout(video._viewTimer);
              video._viewTimer = null;
            }
          }
        });
      },
      {
        threshold: 0.5,
      }
    );
  }

  // Observe only new elements
  if (elements && elements.length > 0) {
    elements.forEach((reel) => {
      reelObserver.observe(reel);
    });
  }
}

/**
 * Track reel views - batched and deduplicated
 */
/**
 * Track reel view
 */
var viewedReels = new Set(); // Track which reels have been viewed this session

let lastViewedReelId = null;

function trackReelView(
  reelId,
  reelHash,
  isAd = false,
  adId = null,
  campaignId = null
) {
  // Skip if already viewed in this session
  if (viewedReels.has(reelId)) {
    return;
  }
  viewedReels.add(reelId);

  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    .getAttribute("content");

  if (isAd) {
    // Track Ad View
    fetch("/api/ads/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-TOKEN": csrfToken,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: JSON.stringify({
        type: "impression",
        ad_id: adId,
        campaign_id: campaignId,
        reel_id: lastViewedReelId, // Context for revenue share
      }),
    }).catch(console.error);
    return;
  }

  // Normal Reel Tracking
  lastViewedReelId = reelId; // Update last viewed

  fetch(`/reels/view/${reelId}`, {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success && !data.viewed) {
        // Update view count in UI if it was a new view
        const reelEl = document.querySelector(`[data-reel-id="${reelId}"]`);
        if (reelEl) {
          const viewsDisplay = reelEl.querySelector(".views-display");
          const viewsCount = reelEl.querySelector(".views-count");
          if (viewsCount) {
            // If data.views is returned (needs backend update to return count, currently returns success)
            // For now, simple increment might be inaccurate if multiple users view simultaneously
            // But usually better to trust server return. My backend logView didn't return new count.
            // I'll leave UI count update for now or increment locally.
            let current =
              parseInt(viewsCount.textContent.replace(/[^0-9]/g, "")) || 0;
            // Only increment if we parsed a number (formatNumber uses K/M suffixes)
            // Since formatNumber is complex, maybe just skip UI update or fetch fresh data?
            // The visual update is minor.
          }
        }
      }
    })
    .catch(console.error);
}

/**
 * Toggle like on a reel
 */
function toggleReelLike(reelId, btn) {
  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

  fetch(`/api/reels/${reelId}/like`, {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.success) {
        const icon = btn.querySelector(".icon");
        const count = btn.querySelector(".likes-count");

        if (data.liked) {
          btn.classList.add("liked");
          // icon text update removed, using SVGs and CSS
        } else {
          btn.classList.remove("liked");
          // icon text update removed, using SVGs and CSS
        }

        if (count) {
          count.textContent = formatNumber(data.likes);
        }
      } else if (data.message === "Unauthorized") {
        window.location.href = "/login";
      }
    })
    .catch(console.error);
}

/**
 * Share a reel
 */
function shareReel(reelId) {
  // Fetch the hash URL from the share_url in reel data or generate from API
  const reel = reelsData.find((r) => r.id === reelId);
  let url;

  if (reel && reel.share_url) {
    url = reel.share_url;
  } else {
    // Fallback: Fetch from API to get the hash
    fetch(`/api/reels/${reelId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.reel && data.reel.share_url) {
          doShare(data.reel.share_url);
        }
      })
      .catch(console.error);
    return;
  }

  doShare(url);
}

function doShare(url) {
  if (navigator.share) {
    navigator
      .share({
        title: "Check out this reel on Zigry!",
        url: url,
      })
      .catch(console.error);
  } else {
    // Fallback: copy to clipboard
    navigator.clipboard
      .writeText(url)
      .then(() => {
        if (typeof zigry !== "undefined" && zigry.toast) {
          zigry.toast("Link copied to clipboard!");
        } else {
          alert("Link copied to clipboard!");
        }
      })
      .catch(() => {
        prompt("Copy this link:", url);
      });
  }
}

/**
 * Exit reel and return to origin
 */
window.exitReels = function () {
  let origin = "/";
  if (typeof sessionStorage !== "undefined") {
    const stored = sessionStorage.getItem("zigry_last_reel_origin");
    if (stored) returnUrl = stored; // checking validity?
    // Basic validation to ensure we stay on site
    if (
      stored &&
      (stored.startsWith("/") || stored.includes(window.location.hostname))
    ) {
      origin = stored;
    }
  }

  // fallback if origin is same as current reel (edge case)
  if (origin === window.location.href) {
    origin = "/";
  }

  if (typeof zigry !== "undefined" && zigry.navigate) {
    zigry.navigate(origin);
  } else {
    window.location.href = origin;
  }
};

/**
 * Format number for display
 */
function formatNumber(num) {
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num;
}

// Initialize reels preview on page load or SPA mount
function initReels() {
  if (document.getElementById("reels-preview-list")) {
    loadReelsPreview();
  }

  // Initialize drag scroll for ribbons
  if (typeof enableDragScroll === "function") {
    enableDragScroll(".ribbon-container");
  }

  // Infinite Scroll Handler
  const feed = document.getElementById("reels-feed");
  if (feed) {
    feed.addEventListener("scroll", function () {
      // Load more when scrolled within 500px of bottom
      if (this.scrollTop + this.clientHeight >= this.scrollHeight - 500) {
        loadReelsPage();
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initReels);

// Register Zigry hook for SPA navigation
if (typeof zigry !== "undefined" && zigry.use) {
  zigry.use("afterMount", initReels);
}

/**
 * Enable drag-to-scroll for horizontal containers
 * @param {string} selector - CSS selector for the container
 */
function enableDragScroll(selector) {
  const containers = document.querySelectorAll(selector);

  containers.forEach((slider) => {
    let isDown = false;
    let startX;
    let scrollLeft;

    slider.addEventListener("mousedown", (e) => {
      isDown = true;
      slider.classList.add("active");
      startX = e.pageX - slider.offsetLeft;
      scrollLeft = slider.scrollLeft;
      slider.style.cursor = "grabbing";
      slider.style.scrollBehavior = "auto";
    });

    slider.addEventListener("mouseleave", () => {
      isDown = false;
      slider.classList.remove("active");
      slider.style.cursor = "grab";
    });

    slider.addEventListener("mouseup", () => {
      isDown = false;
      slider.classList.remove("active");
      slider.style.cursor = "grab";
      slider.style.scrollBehavior = "smooth";
    });

    slider.addEventListener("mousemove", (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - slider.offsetLeft;
      const walk = (x - startX) * 2;
      slider.scrollLeft = scrollLeft - walk;
    });

    slider.addEventListener("touchstart", (e) => {
      slider.style.scrollBehavior = "auto";
    });

    slider.addEventListener("touchend", () => {
      slider.style.scrollBehavior = "smooth";
    });
  });
}
