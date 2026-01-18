function uploadStory(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];

  // Validate file size (max 50MB)
  if (file.size > 50 * 1024 * 1024) {
    alert("File size must be less than 50MB");
    return;
  }

  // Validate file type
  const validTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "video/mp4",
    "video/webm",
    "video/ogv",
  ];
  if (!validTypes.includes(file.type)) {
    alert(
      "Invalid file type. Please upload an image (JPEG, PNG, GIF) or video (MP4, WebM, OGV)"
    );
    return;
  }

  const formData = new FormData();
  formData.append("file", file);

  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

  // Show loading indicator
  const loadingEl = document.createElement("div");
  loadingEl.className = "story-item text-center";
  loadingEl.style.width = "60px";
  loadingEl.innerHTML = `
    <div class="spinner-border text-primary" role="status" style="width: 60px; height: 60px;">
      <span class="visually-hidden">Uploading...</span>
    </div>
    <small class="d-block mt-1 text-muted" style="font-size: 10px;">Uploading...</small>
  `;
  const container = document.getElementById("stories-list");
  if (container) {
    container.insertBefore(loadingEl, container.firstChild);
  }

  fetch("/api/stories", {
    method: "POST",
    headers: {
      "X-CSRF-TOKEN": csrfToken,
      "X-Requested-With": "XMLHttpRequest",
    },
    body: formData,
  })
    .then((response) => response.json())
    .then((data) => {
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.remove();
      }

      if (data.success) {
        // Show success toast/notification
        if (typeof zigry.toast === "function") {
          zigry.toast("Story added successfully!", "success");
        } else {
          alert("Story added!");
        }
        loadStories(); // Reload stories
      } else {
        alert("Failed to add story: " + (data.message || "Unknown error"));
      }
    })
    .catch((error) => {
      if (loadingEl && loadingEl.parentNode) {
        loadingEl.remove();
      }
      console.error("Error:", error);
      alert("Failed to upload story. Please try again.");
    });

  // Reset input
  input.value = "";
}

function loadStories() {
  fetch("/api/stories")
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("stories-list");
      if (!container) return;

      container.innerHTML = "";

      if (Array.isArray(data) && data.length > 0) {
        data.forEach((userStories, index) => {
          const storyEl = document.createElement("div");
          storyEl.className = "story-item text-center pointer";
          storyEl.style.width = "60px";
          storyEl.style.position = "relative";

          // Get first story for thumbnail
          const firstStory = userStories.stories[0];

          // Determine if video or image
          let mediaHtml = "";
          let ringStyle = "";

          const storyCount = userStories.stories.length;

          if (storyCount <= 1) {
            // Solid gradient for 1 story
            ringStyle = "background: linear-gradient(45deg, #667eea, #764ba2);";
          } else {
            // Segmented gradient for multiple stories
            const gapDegrees = 5;
            const segmentDegrees = (360 - storyCount * gapDegrees) / storyCount;
            let gradientParts = [];
            let currentDeg = 0;

            for (let i = 0; i < storyCount; i++) {
              gradientParts.push(
                `#667eea ${currentDeg}deg ${currentDeg + segmentDegrees}deg`
              );
              gradientParts.push(
                `transparent ${currentDeg + segmentDegrees}deg ${
                  currentDeg + segmentDegrees + gapDegrees
                }deg`
              );
              currentDeg += segmentDegrees + gapDegrees;
            }

            ringStyle = `background: conic-gradient(${gradientParts.join(
              ", "
            )});`;
          }

          // Container with ring background and padding for thickness
          const containerStyle = `width: 60px; height: 60px; border-radius: 50%; display: flex; align-items: center; justify-content: center; padding: 3px; ${ringStyle}`;

          // Inner content styles (white background to support transparent images if needed, or just clip)
          // removing 'border' class from inner elements and ensuring they fill the space
          const innerStyle =
            "width: 100%; height: 100%; border-radius: 50%; object-fit: cover; background: white;";

          if (firstStory.isVideo) {
            // Use video thumbnail or placeholder
            mediaHtml = `<div style="${containerStyle}">
                <div style="${innerStyle} display: flex; align-items: center; justify-content: center; background: #000; overflow: hidden;">
                  <i class="fas fa-play text-white"></i>
                </div>
            </div>`;
          } else {
            // Use encrypted image with data-url - wrap in circle container
            mediaHtml = `<div style="${containerStyle}">
               <div style="${innerStyle} overflow: hidden; display: flex; align-items: center; justify-content: center;">
                 <img class="encrypted" data-url="${firstStory.file}" style="width: 100%; height: 100%; object-fit: cover;">
               </div>
            </div>`;
          }

          // Show story count if multiple
          const countBadge =
            userStories.stories.length > 1
              ? `<span style="position: absolute; top: -5px; right: -5px; background: #007bff; color: white; border-radius: 50%; width: 20px; height: 20px; font-size: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold;">${userStories.stories.length}</span>`
              : "";

          // Simplified structure: container is the ring
          storyEl.innerHTML = `
            ${mediaHtml}
            ${countBadge}
            <small class="d-block mt-1 text-muted text-truncate" style="font-size: 10px; max-width: 60px;">${
              userStories.user ? userStories.user.name : "User"
            }</small>
          `;

          // Add click handler to view stories
          storyEl.onclick = () => viewUserStories(userStories, data, index);

          container.appendChild(storyEl);

          // Decrypt image if it's an image
          if (!firstStory.isVideo) {
            const img = storyEl.querySelector(".encrypted");
            if (img && typeof decryptAndSetProtectedMedia === "function") {
              decryptAndSetProtectedMedia(img);
            }
          }
        });
      }
    })
    .catch((error) => console.error("Error loading stories:", error));
}

// View multiple stories for a user with swipe/navigation
function viewUserStories(userStories, allUserStoriesData, currentUserIndex) {
  let currentIndex = 0;
  const stories = userStories.stories;

  // Store all users data for navigation
  window.allUserStoriesData = allUserStoriesData || window.allUserStoriesData;
  window.currentUserIndex =
    currentUserIndex !== undefined
      ? currentUserIndex
      : window.currentUserIndex || 0;

  function showStory(index) {
    if (index < 0) return;

    // If reached the end of current user's stories, jump to next user
    if (index >= stories.length) {
      jumpToNextUser();
      return;
    }

    // Cleanup previous timers/listeners
    if (window.storyTimer) clearTimeout(window.storyTimer);
    if (window.currentVideo) {
      window.currentVideo.onended = null;
      window.currentVideo.ontimeupdate = null;
      window.currentVideo = null;
    }

    currentIndex = index;
    const story = stories[index];

    // Track view
    fetch(`/api/stories/${story.id}/view`, {
      method: "GET",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
      },
    }).catch(console.error);

    const viewer = document.getElementById("story-viewer") || createViewer();

    let content = "";
    if (story.isVideo) {
      // Video without controls - fills viewport while staying fully visible
      content = `<video class="zigry-video story-video" src="${story.fileUrl}" data-src="${story.fileUrl}" autoplay playsinline style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;"></video>`;
    } else {
      content = `<img class="encrypted" data-url="${story.file}" style="height: 100%; width: auto; max-width: 100%; object-fit: contain; background: transparent; cursor: pointer;">`;
    }

    // Progress indicators
    const progressBars = stories
      .map(
        (_, i) => `
      <div style="flex: 1; height: 3px; background: rgba(255,255,255,0.3); margin: 0 2px; border-radius: 2px; overflow: hidden;">
        <div class="story-progress-bar" style="width: ${
          i < currentIndex ? "100%" : "0%"
        }; height: 100%; background: white; transition: width 0.1s linear;"></div>
      </div>
    `
      )
      .join("");

    // User info header
    const userInfo = `
      <div style="position: absolute; top: 20px; left: 20px; right: 20px; z-index: 10001;">
        <div style="display: flex; gap: 4px; margin-bottom: 10px;">
          ${progressBars}
        </div>
        <div style="color: white; display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.5); padding: 10px 15px; border-radius: 25px; width: fit-content;">
          <img src="${userStories.user.avatar}" style="width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
          <span style="font-weight: 600;">${userStories.user.name}</span>
        </div>
      </div>
    `;

    // Navigation buttons
    const prevButton =
      currentIndex > 0
        ? `
      <button onclick="window.prevStory()" style="position: absolute; left: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10001;">
        ‹
      </button>
    `
        : "";

    const nextButton = `
      <button onclick="window.nextStory()" style="position: absolute; right: 20px; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.2); border: none; color: white; font-size: 24px; cursor: pointer; width: 50px; height: 50px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10001;">
        ›
      </button>
    `;

    viewer.innerHTML = `
      ${userInfo}
      <button onclick="window.closeStoryViewer()" style="position: absolute; top: 20px; right: 20px; background: rgba(255,255,255,0.2); border: none; color: white; font-size: 30px; cursor: pointer; width: 45px; height: 45px; border-radius: 50%; display: flex; align-items: center; justify-content: center; z-index: 10002;">&times;</button>
      ${prevButton}
      ${nextButton}
      ${content}
      <div style="position: absolute; bottom: 30px; color: white; background: rgba(0,0,0,0.5); padding: 8px 15px; border-radius: 20px; font-size: 14px; z-index: 10001;">
        <i class="fa fa-eye"></i> ${story.views || 0} views
      </div>
      ${
        story.isVideo
          ? '<div id="play-pause-overlay" style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 60px; color: white; opacity: 0; transition: opacity 0.3s; pointer-events: none; z-index: 10000;"><i class="fa fa-play"></i></div>'
          : ""
      }
    `;

    // Handle Active Progress
    const currentProgressBar = viewer.querySelectorAll(".story-progress-bar")[
      currentIndex
    ];

    // Decrypt image if needed or setup video player
    if (!story.isVideo) {
      const img = viewer.querySelector(".encrypted");
      if (img && typeof decryptAndSetProtectedMedia === "function") {
        decryptAndSetProtectedMedia(img);
        // Force image to display as img element (not background) and fit height
        img.onload = function () {
          // Apply styles
          Object.assign(this.style, {
            height: "100%",
            width: "auto",
            maxWidth: "100%",
            objectFit: "contain",
            display: "block",
            margin: "0 auto",
            background: "none",
            backgroundImage: "none",
          });
        };
      }

      // Image Progress Animation (5 seconds)
      if (currentProgressBar) {
        setTimeout(() => {
          currentProgressBar.style.transition = "width 5s linear";
          currentProgressBar.style.width = "100%";
        }, 50);
      }

      // Auto-advance after 5s
      window.storyTimer = setTimeout(() => {
        window.nextStory();
      }, 5000);
    } else {
      // Setup video with play/pause toggle
      const video = viewer.querySelector(".story-video");
      const playPauseOverlay = viewer.querySelector("#play-pause-overlay");

      if (video) {
        window.currentVideo = video;

        // Progress update
        video.ontimeupdate = () => {
          if (currentProgressBar && video.duration) {
            const pct = (video.currentTime / video.duration) * 100;
            currentProgressBar.style.width = `${pct}%`;
          }
        };

        // Auto-advance
        video.onended = () => {
          window.nextStory();
        };

        // Auto-play video
        video.play().catch((e) => {});

        // Click to play/pause
        video.addEventListener("click", function (e) {
          e.stopPropagation();
          if (this.paused) {
            this.play();
            if (playPauseOverlay) {
              playPauseOverlay.innerHTML = '<i class="fa fa-play"></i>';
              playPauseOverlay.style.opacity = "0.8";
              setTimeout(() => (playPauseOverlay.style.opacity = "0"), 500);
            }
          } else {
            this.pause();
            if (playPauseOverlay) {
              playPauseOverlay.innerHTML = '<i class="fa fa-pause"></i>';
              playPauseOverlay.style.opacity = "0.8";
              setTimeout(() => (playPauseOverlay.style.opacity = "0"), 500);
            }
          }
        });
      }
    }
  }

  function createViewer() {
    const viewer = document.createElement("div");
    viewer.id = "story-viewer";
    viewer.className = "story-viewer";
    viewer.style.position = "fixed";
    viewer.style.top = "0";
    viewer.style.left = "0";
    viewer.style.width = "100%";
    viewer.style.height = "100%";
    viewer.style.backgroundColor = "rgba(0,0,0,0.9)";
    viewer.style.zIndex = "9999";
    viewer.style.display = "flex";
    viewer.style.alignItems = "center";
    viewer.style.justifyContent = "center";
    viewer.style.flexDirection = "column";

    // Close on background click
    viewer.onclick = function (e) {
      if (e.target === viewer) {
        window.closeStoryViewer();
      }
    };

    document.body.appendChild(viewer);
    return viewer;
  }

  // Function to jump to next user's stories
  function jumpToNextUser() {
    const nextUserIndex = window.currentUserIndex + 1;
    if (nextUserIndex < window.allUserStoriesData.length) {
      // There's another user with stories
      window.currentUserIndex = nextUserIndex;
      viewUserStories(
        window.allUserStoriesData[nextUserIndex],
        window.allUserStoriesData,
        nextUserIndex
      );
    } else {
      // No more stories, close viewer
      window.closeStoryViewer();
    }
  }

  // Keyboard navigation
  function handleKeyboard(e) {
    if (e.key === "Escape") {
      window.closeStoryViewer();
    } else if (e.key === "ArrowLeft") {
      window.prevStory();
    } else if (e.key === "ArrowRight") {
      window.nextStory();
    }
  }

  document.addEventListener("keydown", handleKeyboard);

  // Global functions for navigation
  window.prevStory = () => showStory(currentIndex - 1);
  window.nextStory = () => showStory(currentIndex + 1);
  window.closeStoryViewer = () => {
    // Cleanup active timers/listeners
    if (window.storyTimer) clearTimeout(window.storyTimer);
    if (window.currentVideo) {
      window.currentVideo.onended = null;
      window.currentVideo.ontimeupdate = null;
      window.currentVideo = null;
    }

    const viewer = document.getElementById("story-viewer");
    if (viewer) viewer.remove();
    document.removeEventListener("keydown", handleKeyboard);
    delete window.prevStory;
    delete window.nextStory;
    delete window.closeStoryViewer;
    delete window.allUserStoriesData;
    delete window.currentUserIndex;
    delete window.storyTimer;
  };

  showStory(0);
}

document.addEventListener("DOMContentLoaded", loadStories);
