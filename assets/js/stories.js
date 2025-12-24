function uploadStory(input) {
  if (!input.files || !input.files[0]) return;

  const file = input.files[0];
  const formData = new FormData();
  formData.append("file", file);

  const csrfToken = document
    .querySelector('meta[name="csrf-token"]')
    ?.getAttribute("content");

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
      if (data.success) {
        alert("Story added!");
        loadStories(); // Reload stories
      } else {
        alert("Failed to add story: " + (data.message || "Unknown error"));
      }
    })
    .catch((error) => console.error("Error:", error));
}

function loadStories() {
  fetch("/api/stories?timestamp=" + new Date().getTime())
    .then((response) => response.json())
    .then((data) => {
      const container = document.getElementById("stories-list");
      if (!container) return;

      container.innerHTML = "";

      if (Array.isArray(data)) {
        data.forEach((story) => {
          const storyEl = document.createElement("div");
          storyEl.className = "story-item text-center pointer";
          storyEl.style.width = "60px";

          // Determine if video or image
          let mediaHtml = "";
          if (story.file.match(/\.(mp4|webm|ogv)$/i)) {
            mediaHtml = `<video src="${story.file}" class="rounded-circle border border-primary p-1" style="width: 60px; height: 60px; object-fit: cover;"></video>`;
          } else {
            mediaHtml = `<img src="${story.file}" class="rounded-circle border border-primary p-1" style="width: 60px; height: 60px; object-fit: cover;">`;
          }

          storyEl.innerHTML = `
                    ${mediaHtml}
                    <small class="d-block mt-1 text-muted text-truncate" style="font-size: 10px; max-width: 60px;">${
                      story.user ? story.user.name : "User"
                    }</small>
                `;

          // Add click handler to view story
          storyEl.onclick = () => viewStory(story);

          container.appendChild(storyEl);
        });
      }
    })
    .catch((error) => console.error("Error loading stories:", error));
}

function viewStory(story) {
  // Simple modal or overlay to view story
  const viewer = document.createElement("div");
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

  let content = "";
  if (story.file.match(/\.(mp4|webm|ogv)$/i)) {
    content = `<video src="${story.file}" controls autoplay style="max-width: 90%; max-height: 90vh;"></video>`;
  } else {
    content = `<img src="${story.file}" style="max-width: 90%; max-height: 90vh;">`;
  }

  viewer.innerHTML = `
        <button onclick="this.parentElement.remove()" style="position: absolute; top: 20px; right: 20px; background: transparent; border: none; color: white; font-size: 30px; cursor: pointer;">&times;</button>
        ${content}
    `;

  document.body.appendChild(viewer);
}

document.addEventListener("DOMContentLoaded", loadStories);
