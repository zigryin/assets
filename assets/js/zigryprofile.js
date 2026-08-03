let currentEditingPostId = null;
let selectedMediaFiles = [];

function togglePostBox(force = null) {
  const box = document.getElementById("richPostBox");
  const togglepost = document.getElementById("togglepost");
  const togglebtn = document.getElementById("togglebtn");
  const richPostEditor = document.getElementById("richPostEditor");
  const privacySelect = document.getElementById("privacySelect");

  box.style.display =
    force === false
      ? "none"
      : force === true
        ? "block"
        : box.style.display === "none"
          ? "block"
          : "none";
  togglebtn.style.display =
    force === false
      ? "none"
      : force === true
        ? "block"
        : box.style.display === "none"
          ? "block"
          : "none";
  privacySelect.style.display =
    force === false
      ? "none"
      : force === true
        ? "block"
        : box.style.display === "none"
          ? "block"
          : "none";
  togglepost.style.display =
    force === true
      ? "none"
      : force === false
        ? "block"
        : box.style.display === "none"
          ? "block"
          : "none";
  if (box.style.display == "block") {
    richPostEditor.focus();
  }
}

function cancelPost() {
  document.getElementById("richPostEditor").innerHTML = "";
  document.getElementById("mediaPreview").innerHTML = "";
  selectedMediaFiles = [];
  document.getElementById("linkPreview").innerHTML = "";
  document.getElementById("linkPreview").classList.add("d-none");
  document.getElementById("mediaInput").value = "";
  document.getElementById("locationTag").innerHTML = "";
  document.getElementById("locationTag").classList.add("d-none");
  const privacySelect = document.getElementById("privacySelect");
  if (privacySelect) privacySelect.value = "public";
  currentEditingPostId = null;
  const postBtn = document.getElementById("postSubmitBtn");
  if (postBtn) postBtn.textContent = "Post";
  togglePostBox(false);
  renderAddMoreTile();
}

function exec(command) {
  document.execCommand(command, false, null);
}

function setEditorColor(color) {
  document.getElementById("richPostEditor").style.backgroundColor = color;
}

document.querySelectorAll(".color-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const color = btn.style.background;
    setEditorColor(color);
  });
});

async function handleInput() {
  const editor = document.getElementById("richPostEditor");
  const text = editor.innerText.trim();
  const linkPreview = document.getElementById("linkPreview");

  // Auto OG Meta Link Preview
  const urlMatch = text.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    fetch(`/api/og-meta?url=${encodeURIComponent(urlMatch[0])}`)
      .then((res) => res.json())
      .then((meta) => {
        linkPreview.innerHTML = `
          <div class="d-flex">
            <img src="${meta.image}" alt="OG Image" class="me-2" width="100">
            <div>
              <div class="fw-bold">${meta.title}</div>
              <div class="text-muted small">${meta.description}</div>
              <div class="text-primary small">${meta.site_name}</div>
            </div>
          </div>
        `;
        linkPreview.classList.remove("d-none");
      });
  } else {
    linkPreview.classList.add("d-none");
  }

  // Large text if short
  editor.classList.toggle("fs-3", text.length <= 160);
}

function tagLocation() {
  const locTag = document.getElementById("locationTag");
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      locTag.classList.remove("d-none");
      locTag.textContent = `📍 Location: (${latitude.toFixed(
        4,
      )}, ${longitude.toFixed(4)})`;
      locTag.dataset.coords = `${latitude},${longitude}`;
    },
    () => {
      locTag.classList.remove("d-none");
      locTag.textContent = "📍 Location tagging failed.";
    },
  );
}

async function submitPost() {
  const editor = document.getElementById("richPostEditor");
  const mediaInput = document.getElementById("mediaInput");
  const linkPreview = document.getElementById("linkPreview");
  const locationTag = document.getElementById("locationTag");
  const privacySelect = document.getElementById("privacySelect");

  // Gather content
  const content = editor.innerText.trim();
  const linkHTML = !linkPreview.classList.contains("d-none")
    ? linkPreview.innerHTML
    : "";
  const location = locationTag.dataset.coords || "";
  const privacy = privacySelect ? privacySelect.value : "public";

  // Build form data

  const formData = new FormData();
  formData.append("content", content);
  formData.append("link", linkHTML);
  formData.append("location", location);
  formData.append("privacy", privacy);

  // Attach files (prefer accumulated selections)
  // Filter only new files (where .file is not null)
  const filesToUpload =
    selectedMediaFiles.length > 0
      ? selectedMediaFiles.filter((item) => item.file).map((item) => item.file)
      : Array.from(mediaInput.files);

  for (const file of filesToUpload) {
    formData.append("media[]", file);

    // Generate and append thumbnail for video files
    if (file.type.startsWith("video/")) {
      const thumbnail = await zigry.generateVideoThumbnail(file);
      if (thumbnail) {
        formData.append("video_thumbnail", thumbnail);
      }
    }
  }

  zigry.loader(true); // Show loader

  try {
    let url = "/api/posts/create";
    let method = "POST";
    if (currentEditingPostId) {
      url = `/api/posts/${currentEditingPostId}/edit`;
      // Simulate PUT via POST + _method for compatibility
      formData.append("_method", "PUT");
    }
    const csrf =
      document.querySelector('meta[name="csrf-token"]')?.content || "";

    const res = await fetch(url, {
      method: method,
      headers: {
        "X-CSRF-TOKEN": csrf,
      },
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      // Use toast instead of alert to avoid blocking screen
      zigry.toast(
        data.alert ||
          (currentEditingPostId
            ? "Post updated successfully!"
            : "Post created successfully!"),
        "success",
      );

      // Update DOM immediately if editing
      if (currentEditingPostId) {
        const postCard = document.querySelector(
          `.card[data-post-id="${currentEditingPostId}"]`,
        );
        if (postCard) {
          const contentEl = postCard.querySelector(".content");
          if (contentEl) {
            // Simple nl2br for display
            let finalHtml = content.replace(/\n/g, "<br>");
            if (locationTag && locationTag.dataset.coords) {
              finalHtml += `<div class="small text-muted mt-1">${locationTag.textContent}</div>`;
            }
            if (!linkPreview.classList.contains("d-none")) {
              finalHtml += `<div class="mt-2">${linkPreview.innerHTML}</div>`;
            }
            contentEl.innerHTML = finalHtml;
          }
          // Also update media data on the card so subsequent edits have it?
          // The server response `data.item` might have the new media structure but for now
          // user only asked for "posted contents from input box".
          // If we really want to be correct we should update dataset.media too if we had the new media JSON.
          // But for now, fixing the visual text update key.
        }
      }

      cancelPost();

      if (!currentEditingPostId == null) {
        // Fallback for other cases
        renderPosts(data.items, "prepend");
        initApp();
      }
    } else {
      zigry.alert({
        title: "Error",
        message:
          data.message ||
          (currentEditingPostId
            ? "Failed to update post."
            : "Failed to create post."),
        type: "error",
      });
    }
  } catch (err) {
    // console.error(err);
    // zigry.alert({
    //   title: 'Error', message: 'Something went wrong.', type: 'error'
    // });
  } finally {
    zigry.loader(false); // Hide loader
  }
}

// Open editor in edit mode from feed card
window.openEditComposer = function (
  postId,
  html,
  privacy = "public",
  mediaJson = null,
) {
  const editor = document.getElementById("richPostEditor");
  const privacySelect = document.getElementById("privacySelect");
  currentEditingPostId = postId;
  if (editor) editor.innerHTML = html || "";
  if (privacySelect) privacySelect.value = privacy || "public";
  const postBtn = document.getElementById("postSubmitBtn");
  if (postBtn) postBtn.textContent = "Update";

  // Handle existing media
  if (mediaJson) {
    try {
      const media =
        typeof mediaJson === "string" ? JSON.parse(mediaJson) : mediaJson;
      selectedMediaFiles = []; // Reset
      const preview = document.getElementById("mediaPreview");
      if (preview) preview.innerHTML = "";

      const addItem = (url, type, isVideo = false) => {
        const uid =
          "exist_" + Date.now() + Math.random().toString(36).substr(2, 9);
        // Add to state with null file so it's not re-uploaded but counted
        selectedMediaFiles.push({
          file: null,
          uid,
          url,
          type: isVideo ? "video/mp4" : "image/jpeg",
        });

        const src = isVideo
          ? `/api/video/stream?path=${encodeURIComponent(url)}`
          : url;
        const el = isVideo
          ? `<video controls class="object-fit-cover" height="100px"><source src="${src}"></video>`
          : `<img src="${url}" class="object-fit-cover" height="100px">`;

        const previewItem = document.createElement("div");
        previewItem.classList.add("preview-item");
        previewItem.dataset.uid = uid;
        previewItem.innerHTML = `${el}<div class="remove-btn" onclick="removePreview(this)">✖</div>`;
        preview.appendChild(previewItem);
      };

      if (media.images)
        media.images.forEach((img) => addItem(img.thumb, "image"));
      if (media.videos)
        media.videos.forEach((vid) => addItem(vid.url, "video", true));

      if (selectedMediaFiles.length > 0) {
        renderAddMoreTile();
        setTimeout(() => applyCollage(), 50);
      }
    } catch (e) {
      console.error("Error parsing media for edit:", e);
    }
  } else {
    // Clear if no media
    selectedMediaFiles = [];
    const preview = document.getElementById("mediaPreview");
    if (preview) preview.innerHTML = "";
    renderAddMoreTile();
  }

  togglePostBox(true);
  editor?.focus();
};

// Bind preview for first render
document
  .getElementById("mediaInput")
  ?.addEventListener("change", handleMediaPreviewChange);

// Also bind via delegation so dynamically mounted editors work
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "mediaInput") {
    handleMediaPreviewChange.call(e.target);
  }
});

async function compressImage(file, options = {}) {
  const { maxSize = 200 * 1024, maxDimension = 1920 } = options;

  if (!file.type.startsWith("image/")) {
    return file; // Don't compress non-image files
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onerror = reject;
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onerror = reject;
      img.onload = () => {
        let { width, height } = img;

        // Resize if dimensions are too large
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob.size <= maxSize) {
              resolve(
                new File([blob], file.name, {
                  type: "image/jpeg",
                  lastModified: Date.now(),
                }),
              );
            } else {
              // If still too large, create a blob with lower quality. 0.7 is a good compromise.
              canvas.toBlob(
                (finalBlob) =>
                  resolve(
                    new File([finalBlob], file.name, {
                      type: "image/jpeg",
                      lastModified: Date.now(),
                    }),
                  ),
                "image/jpeg",
                0.7,
              );
            }
          },
          "image/jpeg",
          0.9, // Start with a high quality
        );
      };
    };
  });
}

async function handleMediaPreviewChange() {
  const files = this.files || [];
  const preview = document.getElementById("mediaPreview");
  if (!preview) return;
  const newFiles = Array.from(files).slice(0, 20 - selectedMediaFiles.length);

  for (const originalFile of newFiles) {
    const file = await compressImage(originalFile); // Compress the file

    const reader = new FileReader();
    reader.onload = function (e) {
      const el = file.type.startsWith("video")
        ? `<video controls><source src="${e.target.result}"></video>`
        : `<img src="${e.target.result}" class="object-fit-cover" height="100px">`;

      const uid = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
      selectedMediaFiles.push({ file, uid });

      const previewItem = document.createElement("div");
      previewItem.classList.add("preview-item");
      previewItem.dataset.uid = uid;
      previewItem.innerHTML = `${el}<div class="remove-btn" onclick="removePreview(this)">✖</div>`;

      const addMoreTile = document.getElementById("addMoreTile");
      if (addMoreTile) {
        preview.insertBefore(previewItem, addMoreTile);
      } else {
        preview.appendChild(previewItem);
      }
    };
    reader.readAsDataURL(file);
  }

  // Update UI after all files are processed
  if (newFiles.length > 0) {
    renderAddMoreTile();
    setTimeout(() => applyCollage(), 50);
  }

  if (newFiles.length === 0) renderAddMoreTile();
}

function removePreview(element) {
  const item = element.parentElement;
  const uid = item?.dataset?.uid;
  if (uid) {
    selectedMediaFiles = selectedMediaFiles.filter((it) => it.uid !== uid);
  }
  item.remove();
  renderAddMoreTile();
  setTimeout(() => applyCollage(), 50);
}

function renderAddMoreTile() {
  const preview = document.getElementById("mediaPreview");
  if (!preview) return;
  const existing = document.getElementById("addMoreTile");
  const currentCount = Math.max(
    selectedMediaFiles.length,
    preview.querySelectorAll(".preview-item:not(#addMoreTile)").length,
  );
  // hide when none or when reached max
  if (currentCount <= 0) {
    if (existing) existing.remove();
    return;
  }
  if (currentCount >= 20) {
    if (existing) existing.remove();
    return;
  }
  const tile = existing || document.createElement("div");
  tile.id = "addMoreTile";
  tile.className =
    "preview-item d-flex align-items-center justify-content-center border border-solid";
  tile.style.cursor = "pointer";
  tile.textContent = "+ More";
  tile.onclick = () => {
    const countNow = Math.max(
      selectedMediaFiles.length,
      preview.querySelectorAll(".preview-item:not(#addMoreTile)").length,
    );
    if (countNow >= 20) return;
    document.getElementById("mediaInput")?.click();
  };
  if (!existing) preview.appendChild(tile);
}

function applyCollage() {
  const run = () => {
    const preview = document.getElementById("mediaPreview");
    if (!preview) return;
    const items = Array.from(
      preview.querySelectorAll(".preview-item:not(#addMoreTile)"),
    );
    // reset all
    items.forEach((it) => {
      const ov = it.querySelector(".more-overlay");
      if (ov) ov.remove();
      it.style.display = "";
    });
    // if 4 or fewer, show all
    if (items.length <= 4) return;
    const hiddenCount = items.length - 4;
    // hide all after index 3
    items.slice(4).forEach((it) => {
      it.style.display = "none";
    });
    // add +N on the 4th tile (index 3)
    const last = items[3];
    if (!last) return;
    // ensure position relative for overlay positioning
    if (!last.classList.contains("position-relative")) {
      last.classList.add("position-relative");
    }
    const overlay = document.createElement("div");
    overlay.className = "more-overlay";
    overlay.textContent = `+${hiddenCount}`;
    last.appendChild(overlay);
  };
  // defer to ensure latest DOM updates are applied
  if (window.requestAnimationFrame) requestAnimationFrame(run);
  else setTimeout(run, 0);
}

function setEditorColor(color) {
  const editor = document.getElementById("richPostEditor");
  editor.style.background = color;
  editor.style.color = getContrastColor(color);
}

function getContrastColor(hex) {
  const rgb = hex
    .replace("#", "")
    .match(/.{1,2}/g)
    .map((x) => parseInt(x, 16));
  const brightness = (rgb[0] * 299 + rgb[1] * 587 + rgb[2] * 114) / 1000;
  return brightness > 150 ? "#000" : "#fff";
}

function debounce(func, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => func(...args), delay);
  };
}

// Cover upload (robust for AJAX-mounted DOM via delegated listeners)
let editing = false;
let dragging = false;
let startY = 0;
let startPercent = 0;
let hasChanged = false;

document.addEventListener("click", (e) => {
  const target = e.target.closest("[id]") || e.target;
  // Enable edit mode
  if (target && target.id === "editCoverBtn") {
    editing = true;
    const coverPreview = document.getElementById("coverPreview");
    const coverWrapper = document.getElementById("coverWrapper");
    const editBtn = document.getElementById("editCoverBtn");
    const saveBtn = document.getElementById("saveCoverBtn");
    const uploadBtn = document.getElementById("uploadImageBtn");
    editBtn && editBtn.classList.add("d-none");
    saveBtn && saveBtn.classList.remove("d-none");
    uploadBtn && uploadBtn.classList.remove("d-none");

    // Remove zigry-images class to prevent lightbox conflicts during editing
    if (coverWrapper) {
      coverWrapper.classList.remove("zigry-images");
    }

    if (coverPreview) {
      coverPreview.style.cursor = "grab";
      coverPreview.style.position = "relative";
    }
  }

  // Exit edit mode + submit if changed
  if (target && target.id === "saveCoverBtn") {
    const coverWrapper = document.getElementById("coverWrapper");
    const coverPreview = document.getElementById("coverPreview");
    const editBtn = document.getElementById("editCoverBtn");
    const saveBtn = document.getElementById("saveCoverBtn");
    const uploadBtn = document.getElementById("uploadImageBtn");
    editing = false;
    dragging = false;
    const form = coverWrapper?.closest("form");
    // if (form && hasChanged) {
    //   if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
    //   hasChanged = false;
    // }
    saveBtn && saveBtn.classList.add("d-none");
    uploadBtn && uploadBtn.classList.add("d-none");
    editBtn && editBtn.classList.remove("d-none");

    // Restore zigry-images class if cover has an image
    if (coverWrapper && coverPreview && coverPreview.dataset.url) {
      coverWrapper.classList.add("zigry-images");
    }
  }

  // Trigger file input
  if (target && target.id === "uploadImageBtn") {
    const coverUpload = document.getElementById("coverUpload");
    coverUpload && coverUpload.click();
  }
});

// Handle upload change (delegated)
document.addEventListener("change", (e) => {
  const target = e.target;
  if (!target || target.id !== "coverUpload") return;
  const file = target.files && target.files[0];
  if (!file) return;
  const coverPreview = document.getElementById("coverPreview");
  const offsetYInput = document.getElementById("offsetYInput");
  const reader = new FileReader();
  reader.onload = (ev) => {
    if (coverPreview) {
      coverPreview.src = ev.target.result;
      coverPreview.style.transform = "translateY(0%)";
    }
    if (offsetYInput) offsetYInput.value = 0;
    hasChanged = true;
  };
  reader.readAsDataURL(file);
});

// Cover drag handlers (delegated to document for robustness)
document.addEventListener("mousedown", (e) => {
  const coverPreview = document.getElementById("coverPreview");
  if (!coverPreview || e.target !== coverPreview) return;
  if (!editing) return;
  dragging = true;
  startY = e.clientY;
  const match = coverPreview.style.transform.match(
    /translateY\((-?\d+(?:\.\d+)?)%\)/,
  );
  startPercent = match ? parseFloat(match[1]) : 0;
  coverPreview.style.cursor = "grabbing";
  e.preventDefault();
});

document.addEventListener("mousemove", (e) => {
  if (!dragging || !editing) return;
  const coverPreview = document.getElementById("coverPreview");
  const coverWrapper = document.getElementById("coverWrapper");
  const offsetYInput = document.getElementById("offsetYInput");
  if (!coverPreview || !coverWrapper) return;
  const deltaY = e.clientY - startY;
  const imageHeight = coverPreview.clientHeight;
  coverPreview.style.height = imageHeight + "px";
  let newPercent = startPercent + (deltaY / imageHeight) * 100;
  const scale = coverPreview.clientWidth / coverPreview.naturalWidth;
  const fullImageHeight = coverPreview.naturalHeight * scale;
  const wrapperHeight = coverWrapper.clientHeight;
  const overflow = fullImageHeight - wrapperHeight;
  const minOffset = Math.min(0, -(overflow / fullImageHeight) * 100);
  const maxOffset = Math.max(0, (overflow / fullImageHeight) * 100);
  newPercent = Math.max(minOffset, Math.min(maxOffset, newPercent));
  coverPreview.style.transform = `translateY(${newPercent}%)`;
  if (offsetYInput) offsetYInput.value = newPercent;
  hasChanged = true;
});

document.addEventListener("mouseup", () => {
  const coverPreview = document.getElementById("coverPreview");
  dragging = false;
  if (editing && coverPreview) coverPreview.style.cursor = "grab";
});

// Apply saved offset on load or resize
function applyOffsetFromInput() {
  const offsetYInput = document.getElementById("offsetYInput");
  const savedPercent = parseFloat(offsetYInput?.value);
  if (!isNaN(savedPercent)) {
    const coverPreview = document.getElementById("coverPreview");
    if (coverPreview) {
      coverPreview.style.transform = `translateY(${savedPercent}%)`;
    }
  }
}

// window.addEventListener("load", applyOffsetFromInput);
window.addEventListener("resize", applyOffsetFromInput);

// Handle edit mode
const editBtn = document.getElementById("editCoverBtn");
editBtn?.addEventListener("click", () => {
  editing = true;
  coverPreview.style.cursor = "grab";
  editBtn.classList.add("d-none");
  saveBtn.classList.remove("d-none");
  uploadBtn.classList.remove("d-none");
});

// Handle upload
const coverUpload = document.getElementById("coverUpload");
const uploadBtn = document.getElementById("uploadImageBtn");

coverUpload?.addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    coverPreview.src = e.target.result;
    coverPreview.style.top = "0px";
    offsetYInput.value = 0;
    hasChanged = true;
  };
  reader.readAsDataURL(file);
});

// Prevent form submit if no change
const coverWrapper = document.getElementById("coverWrapper");
const form = coverWrapper?.closest("form");
form?.addEventListener("submit", (e) => {
  if (!hasChanged) {
    e.preventDefault();
    zigry.alert({
      title: "Info",
      message: "No changes to save.",
      type: "info",
    });
  }
});

// dp crop
let img = new Image();
let ctx = null; // Will be initialized when canvas is available
let zoom = 1;
let offsetX = 0;
let offsetY = 0;
let cropDragging = false;
let cropStartX = 0;
let cropStartY = 0;

let originalProfileSrc; // store the original image before crop

// Initialize canvas context when available
function initCropCanvas() {
  const canvas = document.getElementById("cropCanvas");
  if (canvas && !ctx) {
    ctx = canvas.getContext("2d");
  }
  return canvas;
}

function openCropModal() {
  const el = document.getElementById("cropModal");
  if (!el) return;

  // Initialize canvas context when opening modal
  initCropCanvas();
  attachCanvasEvents();
  attachZoomEvents();

  try {
    if (window.bootstrap && typeof window.bootstrap.Modal === "function") {
      const m = new window.bootstrap.Modal(el);
      m.show();
      return;
    }
  } catch (_) {}
  // Fallback for custom bsmodel or when bootstrap bundle isn't present
  el.classList.add("show");
  el.style.display = "block";
  el.removeAttribute("aria-hidden");
  el.setAttribute("aria-modal", "true");
  el.focus && el.focus();
}

// Load file on input change - use event delegation for dynamically loaded pages
function handleProfilePicChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  const cropCanvas = initCropCanvas();
  if (!cropCanvas || !ctx) return;
  const profilePreview = document.getElementById("profile-preview");

  if (profilePreview && !originalProfileSrc) {
    originalProfileSrc =
      profilePreview.src ||
      profilePreview.style.backgroundImage?.replace(/url\(["']?|["']?\)/g, "");
  }

  const reader = new FileReader();
  reader.onload = () => {
    img.onload = () => {
      zoom = 1;
      offsetX = 0;
      offsetY = 0;
      cropCanvas.width = 250;
      cropCanvas.height = 250;

      const scaleX = cropCanvas.width / img.width;
      const scaleY = cropCanvas.height / img.height;
      zoom = Math.max(scaleX, scaleY);

      const scaledWidth = img.width * zoom;
      const scaledHeight = img.height * zoom;
      offsetX = (cropCanvas.width - scaledWidth) / 2;
      offsetY = (cropCanvas.height - scaledHeight) / 2;

      drawImage();
      updateCrop(); // Initial crop
      openCropModal();
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
  e.target.value = null; // Allow re-upload
}

// Attach to existing element if present
const profile_pic = document.getElementById("profile_pic");
if (profile_pic) {
  profile_pic.addEventListener("change", handleProfilePicChange);
}

// Also use event delegation for dynamically loaded content
document.addEventListener("change", function (e) {
  if (e.target && e.target.id === "profile_pic") {
    handleProfilePicChange(e);
  }
});

// Draw image with current zoom & offset
function drawImage() {
  const cropCanvas = document.getElementById("cropCanvas");
  if (!cropCanvas || !ctx) return;
  const cropSize = cropCanvas.width; // square
  ctx.clearRect(0, 0, cropSize, cropSize);
  const scaledWidth = img.width * zoom;
  const scaledHeight = img.height * zoom;
  ctx.drawImage(img, offsetX, offsetY, scaledWidth, scaledHeight);
  // updateCrop(); // Removed to prevent excessive URL generation
}

// Drag logic - attach when canvas is available
function attachCanvasEvents() {
  const cropCanvas = initCropCanvas();
  if (!cropCanvas) return;

  // Remove old listeners if re-attaching
  if (cropCanvas._hasEvents) return;
  cropCanvas._hasEvents = true;

  cropCanvas.addEventListener("mousedown", (e) => {
    cropDragging = true;
    cropStartX = e.offsetX - offsetX;
    cropStartY = e.offsetY - offsetY;
  });
  cropCanvas.addEventListener("mousemove", (e) => {
    if (!cropDragging) return;
    offsetX = e.offsetX - cropStartX;
    offsetY = e.offsetY - cropStartY;
    drawImage();
  });
  cropCanvas.addEventListener("mouseup", () => {
    cropDragging = false;
    updateCrop(); // Update only on drag end
  });
  cropCanvas.addEventListener("mouseleave", () => (cropDragging = false));
}

let cropDebounceTimer;
// Zoom on scroll - attach when canvas is available
function attachZoomEvents() {
  const cropCanvas = initCropCanvas();
  if (!cropCanvas || cropCanvas._hasZoom) return;
  cropCanvas._hasZoom = true;

  cropCanvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();

      const rect = cropCanvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;

      const prevZoom = zoom;
      const zoomFactor = 0.1;

      // scroll up = zoom in, scroll down = zoom out
      if (e.deltaY < 0) {
        zoom *= 1 + zoomFactor;
      } else {
        zoom *= 1 - zoomFactor;
      }

      // Clamp zoom (0.2 - 5 gives better range)
      zoom = Math.max(0.2, Math.min(5, zoom));

      const scaleChange = zoom / prevZoom;

      // Adjust offset so zoom centers on mouse position
      const imgX = canvasX - offsetX;
      const imgY = canvasY - offsetY;

      offsetX -= imgX * (scaleChange - 1);
      offsetY -= imgY * (scaleChange - 1);

      drawImage();

      clearTimeout(cropDebounceTimer);
      cropDebounceTimer = setTimeout(updateCrop, 200);
    },
    { passive: false },
  );
}

// Try to attach immediately, and also when modal opens
if (document.getElementById("cropModal")) {
  attachCanvasEvents();
  attachZoomEvents();
}

// Update hidden input with cropped data
// function updateCrop() {
//   const cropCanvas = document.getElementById('cropCanvas');
//   if (!cropCanvas || !ctx) return;
//   const cropped = cropCanvas.toDataURL('image/jpeg');
//   const croppedInput = document.getElementById('cropped_image_data');
//   if (croppedInput) croppedInput.value = cropped;
//   const profilePicInput = document.getElementById('profile_pic');
//   if (profilePicInput) profilePicInput.value = null;
//   const wrapper = document.getElementById("profile-preview");
//   if (wrapper) {
//     if (wrapper.src) {
//       wrapper.src = cropped;
//     } else {
//       wrapper.src = cropped;
//       wrapper.style.background = 'url('+cropped+')';
//     }
//   }

//   const dpupdateEl = document.getElementById('dpupdate');
//   if (dpupdateEl) {
//     const uid = dpupdateEl.getAttribute('uid');
//     if (uid) {
//       document.querySelectorAll('.'+uid).forEach(dpupdate);
//     }
//   }
// }

function updateCrop() {
  const cropCanvas = document.getElementById("cropCanvas");
  if (!cropCanvas || !ctx) return;

  const cropped = cropCanvas.toDataURL("image/jpeg");
  const croppedInput = document.getElementById("cropped_image_data");
  if (croppedInput) croppedInput.value = cropped;

  const wrapper = document.getElementById("profile-preview");
  const otherWrapper = document.getElementsByClassName("profile-preview");
  if (wrapper) {
    if (wrapper.tagName === "IMG") {
      wrapper.src = cropped;
    } else {
      wrapper.style.backgroundImage = `url(${cropped})`;
      wrapper.style.backgroundSize = "cover";
      wrapper.style.backgroundPosition = "center";
    }
  }

  if (otherWrapper) {
    if (otherWrapper.tagName === "IMG") {
      otherWrapper.src = cropped;
    }
  }

  const dpupdateEl = document.getElementById("dpupdate");
  if (dpupdateEl) {
    const uid = dpupdateEl.getAttribute("uid");
    if (uid) {
      document.querySelectorAll("." + uid).forEach(dpupdate);
    }
  }
}

function dpupdate(el) {
  // console.log(el)
  // const wrapper = document.getElementById("profile-preview");
  // let src = null;
  // if(wrapper.src){
  //   src = wrapper.src;
  // }
  //  el.src = src;
}

// Utility to convert base64 to Blob
function dataURItoBlob(dataURI) {
  const byteString = atob(dataURI.split(",")[1]);
  const mimeString = dataURI.split(",")[0].split(":")[1].split(";")[0];
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);

  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }

  return new Blob([ab], { type: mimeString });
}

// Save/crop button (can be in modal footer)
// document.getElementById('modalSaveBtn').addEventListener('click', () => {
//   // Hide modal and let zigry-form submit normally
//   document.getElementById('cropModal').classList.remove('show');
//   document.getElementById('cropModal').setAttribute('aria-hidden', 'true');
//   setTimeout(() => {
//     // document.getElementById('cropModal').removeAttribute('inert');
//     document.getElementById('cropModal').setAttribute('aria-hidden', 'true');
// }, 300);
//   document.getElementById('cropModal').style.display = 'none';

//   // Let Zigry bind handle form submit automatically
//   //   document.getElementById('cropped_image_submit').click();
//   zigry.toast('enable submit', 'info')
// });

// DP Save button handler - use event delegation for robustness
document.addEventListener("click", (e) => {
  if (e.target && e.target.id === "CropCancelBtn") {
    // revert preview to original
    const profilePreview = document.getElementById("profile-preview");
    if (profilePreview && originalProfileSrc) {
      if (profilePreview.tagName === "IMG") {
        profilePreview.src = originalProfileSrc;
      } else {
        profilePreview.style.backgroundImage = `url(${originalProfileSrc})`;
      }
    }

    // reset everything
    zoom = 1;
    offsetX = 0;
    offsetY = 0;
    originalProfileSrc = null;
  }

  if (e.target && e.target.id === "modalSaveBtn") {
    document.activeElement && document.activeElement.blur();
    const cropModalEl = document.getElementById("cropModal");
    let closed = false;
    try {
      if (window.bootstrap && typeof window.bootstrap.Modal === "function") {
        let bsModal = window.bootstrap.Modal.getInstance(cropModalEl);
        if (!bsModal) bsModal = new window.bootstrap.Modal(cropModalEl);
        bsModal.hide();
        closed = true;
      }
    } catch (_) {}
    if (!closed && cropModalEl) {
      cropModalEl.classList.remove("show");
      cropModalEl.style.display = "none";
      cropModalEl.setAttribute("aria-hidden", "true");
    }
    // Submit the DP upload form - trigger zigry-form handler
    const uploadForm = document.getElementById("uploadForm");
    const croppedData = document.getElementById("cropped_image_data");
    if (uploadForm && croppedData && croppedData.value) {
      // Form has zigry-form attribute, trigger the submit event to use zigry's handler
      setTimeout(() => {
        const submitEvent = new Event("submit", {
          bubbles: true,
          cancelable: true,
        });
        uploadForm.dispatchEvent(submitEvent);
      }, 100);
    } else if (croppedData && !croppedData.value) {
      zigry.alert({
        title: "Warning",
        message: "Please crop an image first",
        type: "warning",
      });
    }
  }
});

// Drag-to-slide functionality for media preview (works for dynamically created editor too)
let _activePreview = null;
let _dragging = false;
let _startX = 0;
let _startScrollLeft = 0;
let _lastX = 0;
let _lastT = 0;
let _velocity = 0; // px/ms
let _momentumRaf = null;

document.addEventListener("mousedown", (e) => {
  const preview = e.target.closest("#mediaPreview");
  if (!preview) return;
  _activePreview = preview;
  _dragging = true;
  _startX = e.pageX - _activePreview.offsetLeft;
  _startScrollLeft = _activePreview.scrollLeft;
  _activePreview.style.cursor = "grabbing";
  _lastX = e.pageX;
  _lastT = performance.now();
  _velocity = 0;
  document.body.style.userSelect = "none";
  e.preventDefault();
});

document.addEventListener("mouseleave", () => {
  if (!_activePreview) return;
  endDragWithMomentum();
});

document.addEventListener("mouseup", () => {
  if (!_activePreview) return;
  endDragWithMomentum();
});

document.addEventListener("mousemove", (e) => {
  if (!_dragging || !_activePreview) return;
  e.preventDefault();
  const now = performance.now();
  const xAbs = e.pageX;
  const x = xAbs - _activePreview.offsetLeft;
  const walk = x - _startX; // 1:1 pixel drag for precision
  _activePreview.scrollLeft = _startScrollLeft - walk;

  // velocity (px/ms)
  const dt = Math.max(1, now - _lastT);
  _velocity = (xAbs - _lastX) / dt;
  _lastX = xAbs;
  _lastT = now;
});

// Touch support for smoother drag on mobile
document.addEventListener(
  "touchstart",
  (e) => {
    const preview = e.target.closest("#mediaPreview");
    if (!preview) return;
    _activePreview = preview;
    _dragging = true;
    const touch = e.touches[0];
    _startX = touch.pageX - _activePreview.offsetLeft;
    _startScrollLeft = _activePreview.scrollLeft;
    _lastX = touch.pageX;
    _lastT = performance.now();
    _velocity = 0;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!_dragging || !_activePreview) return;
    const touch = e.touches[0];
    const now = performance.now();
    const xAbs = touch.pageX;
    const x = xAbs - _activePreview.offsetLeft;
    const walk = x - _startX;
    _activePreview.scrollLeft = _startScrollLeft - walk;

    const dt = Math.max(1, now - _lastT);
    _velocity = (xAbs - _lastX) / dt;
    _lastX = xAbs;
    _lastT = now;
  },
  { passive: true },
);

document.addEventListener(
  "touchend",
  () => {
    endDragWithMomentum();
  },
  { passive: true },
);

function endDragWithMomentum() {
  if (!_activePreview) return;
  _dragging = false;
  _activePreview.style.cursor = "grab";
  document.body.style.userSelect = "";

  // momentum easing
  const target = _activePreview;
  let v = _velocity * 16; // px per frame approx (assuming 60fps)
  const friction = 0.92;
  cancelAnimationFrame(_momentumRaf);
  const step = () => {
    if (Math.abs(v) < 0.1) {
      _activePreview = null;
      return;
    }
    target.scrollLeft -= v;
    v *= friction;
    _momentumRaf = requestAnimationFrame(step);
  };
  _momentumRaf = requestAnimationFrame(step);
}

window.dataLayer = window.dataLayer || [];
/* CLICK: buttons + links + data-action */
document.addEventListener("click", (e) => {
  const el = e.target.closest("a, button, [data-action]");
  if (!el) return;

  dataLayer.push({
    event: el.dataset.action ? "zig_action" : "zig_click",
    action: el.dataset.action || null,
    text: (el.innerText || "").trim(),
    url: el.href || null,
    id: el.id || null,
    classes: el.className || null,
    post_id: el.closest("[data-post-id]")?.dataset.postId || null,
  });
});

/* IMAGE CLICK */
document.addEventListener("click", (e) => {
  const img = e.target.closest("img");
  if (!img) return;

  dataLayer.push({
    event: "zig_image_click",
    src: img.dataset.src || img.dataset.decryptedSrc,
    post_id: img.closest("[data-post-id]")?.dataset.postId || null,
  });
});

/* FORM SUBMIT */
function trackForms() {
  document.querySelectorAll("form:not([data-tracked])").forEach((f) => {
    f.dataset.tracked = 1;
    f.addEventListener("submit", () => {
      dataLayer.push({
        event: "zig_form_submit",
        id: f.id || null,
        action: f.action,
      });
    });
  });
}

/* SCROLL DEPTH */
(() => {
  let fired = {};
  window.addEventListener("scroll", () => {
    let p = Math.round(
      (scrollY / (document.body.scrollHeight - innerHeight)) * 100,
    );
    [25, 50, 75, 100].forEach((x) => {
      if (!fired[x] && p >= x) {
        fired[x] = 1;
        dataLayer.push({ event: "zig_scroll_depth", percent: x });
      }
    });
  });
})();

/* POST VIEW */
function trackPosts() {
  document.querySelectorAll("[data-post-id]:not([data-seen])").forEach((p) => {
    p.dataset.seen = 1;
    dataLayer.push({ event: "zig_post_view", post_id: p.dataset.postId });
  });
}

/* AD TRACKING (SAFE WRAP) */
if (typeof window.trackAd === "function") {
  const __ad = window.trackAd;
  window.trackAd = function (cid, type) {
    dataLayer.push({ event: "zig_ad_event", campaign_id: cid, type });
    return __ad.apply(this, arguments);
  };
}

/* INIT */
function init() {
  trackForms();
  trackPosts();
}

/* SAFE SPA HOOK */
if (window.zigry && typeof zigry.mount === "function") {
  const __mount = zigry.mount;
  zigry.mount = function (html, props) {
    const r = __mount.call(this, html, props);
    init();
    return r;
  };
}

document.addEventListener("DOMContentLoaded", init);
