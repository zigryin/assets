class BlogEditor {
  constructor(id) {
    this.container = document.getElementById(id);
    this.contentArea = this.container.querySelector(".blog-editor-content");
    this.hiddenTextarea = this.container.querySelector(
      'textarea[name="content"]',
    );
    this.toolbar = null;
    this.selectedImage = null; // Track selected image
    this.imageOverlay = null; // Track overlay
    this.isSourceMode = false;
    window.BlogEditorInstance = this;
    this.init();
  }

  init() {
    this.attachToolbarEvents();
    this.contentArea.addEventListener("input", () => this.sync());
    this.contentArea.addEventListener("paste", (e) => this.handlePaste(e));
    this.contentArea.addEventListener("keyup", (e) => this.handleKeyUp(e));

    // Image selection listener
    this.contentArea.addEventListener("click", (e) => {
      if (e.target.tagName === "IMG") {
        this.selectImage(e.target);
      } else {
        // Also check if clicking inside the overlay, if so don't deselect
        if (!e.target.closest(".blog-image-overlay")) {
          this.deselectImage();
        }
      }
    });

    // Keyboard listener for deleting images
    this.contentArea.addEventListener("keydown", (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && this.selectedImage) {
        e.preventDefault();
        this.selectedImage.remove();
        this.deselectImage();
        this.sync();
      }
    });

    this.decryptExistingImages();
  }

  decryptExistingImages() {
    // Increased delay to ensure global zigry functions are ready and race conditions are cleared
    setTimeout(() => {
      if (!this.contentArea) return;

      this.contentArea.querySelectorAll("img").forEach((img) => {
        // Use the absolute URL as the source for decryption consistency
        const src = img.src;
        const attrSrc = img.getAttribute("src");

        if (
          src &&
          !src.startsWith("blob:") &&
          !src.startsWith("data:") &&
          (src.includes("/uploads/") ||
            (attrSrc && attrSrc.includes("/uploads/")))
        ) {
          // Ensure classes match the requirements for the editor (skip-wrapper prevents layout breaking)
          img.classList.add("encrypted", "skip-wrapper");

          // Set data-url to absolute URL, matching the upload logic
          img.dataset.url = src;

          if (typeof decryptAndSetProtectedMedia === "function") {
            // If it's stuck in "processing", it might be a race condition with zigry.js init
            // Clear it to ensure this manual call triggers a fresh decryption
            if (img.dataset.decryptionState === "processing") {
              delete img.dataset.decryptionState;
            }

            if (!img.dataset.decryptedSrc) {
              decryptAndSetProtectedMedia(img);
            }
          }
        }
      });
    }, 500);
  }

  selectImage(img) {
    if (this.selectedImage) {
      this.deselectImage();
    }
    this.selectedImage = img;
    this.selectedImage.style.outline = "2px solid #0d6efd"; // Bootstrap primary color

    // Create overlay
    const overlay = document.createElement("div");
    overlay.className = "blog-image-overlay";
    overlay.style.cssText = `
          position: absolute;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 5px;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
          z-index: 1000;
          display: flex;
          gap: 5px;
      `;

    // Position overlay
    const updatePosition = () => {
      const rect = img.getBoundingClientRect();
      const containerRect = this.container.getBoundingClientRect();
      // Calculate relative position
      let top = rect.top - containerRect.top + 10;
      let left = rect.left - containerRect.left + 10;

      // Ensure it doesn't go offscreen
      if (top < 0) top = 0;
      if (left < 0) left = 0;

      overlay.style.top = top + "px";
      overlay.style.left = left + "px";
    };

    // Initial position
    updatePosition();

    // Add buttons
    const sizes = [
      { label: "S", val: "25%", title: "Small" },
      { label: "M", val: "50%", title: "Medium" },
      { label: "L", val: "100%", title: "Large" },
      { label: "Auto", val: "auto", title: "Auto" },
    ];

    sizes.forEach((s) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "btn btn-outline-primary btn-sm";
      btn.innerText = s.label;
      btn.title = s.title;
      btn.style.fontSize = "12px";
      btn.style.padding = "2px 5px";
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation(); // Prevent deselecting
        this.resizeImage(s.val);
      };
      overlay.appendChild(btn);
    });

    this.container.style.position = "relative"; // Ensure container is relative
    this.container.appendChild(overlay);
    this.imageOverlay = overlay;
  }

  deselectImage() {
    if (this.selectedImage) {
      this.selectedImage.style.outline = "none";
      this.selectedImage = null;
    }
    if (this.imageOverlay) {
      this.imageOverlay.remove();
      this.imageOverlay = null;
    }
  }

  attachToolbarEvents() {
    const buttons = document.querySelectorAll(
      ".blog-editor-toolbar button[data-command]",
    );
    buttons.forEach((btn) => {
      // Prevent focus loss from editor
      btn.addEventListener("mousedown", (e) => {
        e.preventDefault();
      });

      btn.addEventListener("click", () => {
        const cmd = btn.getAttribute("data-command");
        const val = btn.getAttribute("data-value") || null;

        this.contentArea.focus();

        if (cmd === "createLink") {
          this.insertLink();
        } else if (cmd === "insertImage") {
          this.insertImage();
        } else if (cmd === "fontSize") {
          if (val === "increase") this.changeFontSize(2);
          else if (val === "decrease") this.changeFontSize(-2);
        } else if (cmd.startsWith("alignImage")) {
          this.alignImage(val);
        } else {
          try {
            document.execCommand(cmd, false, val);
          } catch (e) {
            console.error("Editor Command Error:", e);
          }
        }
        this.sync();
      });
    });

    const fontSizeInput = document.getElementById("blog-font-size-input");
    if (fontSizeInput) {
      fontSizeInput.addEventListener("change", () => {
        this.setFontSize(fontSizeInput.value);
      });
    }

    const mediaBrowserBtn = document.getElementById("blog-media-browser-open");
    if (mediaBrowserBtn) {
      mediaBrowserBtn.addEventListener("click", () => this.openMediaBrowser());
    }

    const uploadBtn = document.getElementById("blog-media-upload");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => this.insertImage());
    }

    const textColorPicker = document.getElementById("blog-text-color-picker");
    if (textColorPicker) {
      textColorPicker.addEventListener("input", (e) => {
        this.contentArea.focus();
        document.execCommand("foreColor", false, e.target.value);
        this.sync();
      });
    }

    const bgColorPicker = document.getElementById("blog-bg-color-picker");
    if (bgColorPicker) {
      bgColorPicker.addEventListener("input", (e) => {
        this.contentArea.focus();
        document.execCommand("hiliteColor", false, e.target.value);
        this.sync();
      });
    }

    const toggleSourceBtn = document.getElementById("blog-toggle-source");
    if (toggleSourceBtn) {
      toggleSourceBtn.addEventListener("click", () => this.toggleSource());
    }
  }

  toggleSource() {
    this.isSourceMode = !this.isSourceMode;
    const btn = document.getElementById("blog-toggle-source");

    if (this.isSourceMode) {
      // Switch to HTML View
      this.deselectImage();
      const html = this.contentArea.innerHTML;
      this.contentArea.innerText = html;
      this.contentArea.classList.add("blog-editor-html-view");
      this.contentArea.setAttribute("contenteditable", "true"); // Still editable but as text
      if (btn) btn.classList.add("active", "btn-primary");

      // Disable other buttons
      document
        .querySelectorAll(
          ".blog-editor-toolbar button:not(#blog-toggle-source)",
        )
        .forEach((b) => (b.disabled = true));
    } else {
      // Switch back to WYSIWYG
      const html = this.contentArea.innerText;
      this.contentArea.innerHTML = html;
      this.contentArea.classList.remove("blog-editor-html-view");
      if (btn) btn.classList.remove("active", "btn-primary");

      // Re-enable other buttons
      document
        .querySelectorAll(".blog-editor-toolbar button")
        .forEach((b) => (b.disabled = false));

      this.decryptExistingImages();
    }
    this.sync();
  }

  alignImage(alignment) {
    if (!this.selectedImage) return;

    this.selectedImage.style.float = "none";
    this.selectedImage.style.display = "inline-block";
    this.selectedImage.style.margin = "0";
    this.selectedImage.style.verticalAlign = "baseline";

    if (alignment === "left") {
      this.selectedImage.style.float = "left";
      this.selectedImage.style.margin = "0 15px 10px 0";
    } else if (alignment === "right") {
      this.selectedImage.style.float = "right";
      this.selectedImage.style.margin = "0 0 10px 15px";
    } else if (alignment === "center") {
      this.selectedImage.style.display = "block";
      this.selectedImage.style.margin = "10px auto";
    }

    // Update overlay position if needed
    if (this.imageOverlay && this.selectedImage) {
      setTimeout(() => {
        // Re-calculate position
        const rect = this.selectedImage.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        let top = rect.top - containerRect.top + 10;
        let left = rect.left - containerRect.left + 10;
        if (top < 0) top = 0;
        if (left < 0) left = 0;
        this.imageOverlay.style.top = top + "px";
        this.imageOverlay.style.left = left + "px";
      }, 0);
    }

    this.sync();
  }

  resizeImage(size) {
    if (!this.selectedImage) return;

    if (size === "auto") {
      this.selectedImage.style.width = "auto";
      this.selectedImage.style.height = "auto";
    } else {
      this.selectedImage.style.width = size;
      this.selectedImage.style.height = "auto";
    }

    // Update overlay position after resize
    if (this.imageOverlay && this.selectedImage) {
      setTimeout(() => {
        const rect = this.selectedImage.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();
        let top = rect.top - containerRect.top + 10;
        let left = rect.left - containerRect.left + 10;
        this.imageOverlay.style.top = top + "px";
        this.imageOverlay.style.left = left + "px";
      }, 0);
    }

    this.sync();
  }

  insertLink() {
    const selection = window.getSelection();
    let range = null;
    if (selection.rangeCount > 0) {
      range = selection.getRangeAt(0);
    }
    const url = prompt("Enter URL:");
    if (url && range) {
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand("createLink", false, url);
    } else if (url) {
      document.execCommand("createLink", false, url);
    }
  }

  insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        this.uploadMedia(file);
      }
    };
    input.click();
  }

  uploadMedia(file) {
    const formData = new FormData();
    formData.append("file", file);
    // formData.append("type", "blog_image"); // Not needed for new route

    // Show loading state
    this.contentArea.focus();
    const placeholder = document.createElement("div");
    placeholder.className = "upload-placeholder text-muted small italic";
    placeholder.innerText = "Uploading image...";
    this.insertAtCursor(placeholder);

    const csrfToken = document
      .querySelector('meta[name="csrf-token"]')
      ?.getAttribute("content");

    // Updated route
    fetch("/admin/blog/media/upload", {
      method: "POST",
      body: formData,
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        "X-CSRF-TOKEN": csrfToken || "",
      },
    })
      .then((res) => res.json())
      .then((data) => {
        placeholder.remove();
        if (data.success && data.url) {
          this.insertMediaIntoEditor({ url: data.url });
        } else {
          alert("Upload failed: " + (data.message || "Unknown error"));
        }
      })
      .catch((err) => {
        placeholder.remove();
        alert("Upload error: " + err.message);
      });
  }

  insertAtCursor(el) {
    const selection = window.getSelection();
    if (selection.getRangeAt && selection.rangeCount) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(el);

      // Move cursor after the element
      range.setStartAfter(el);
      range.setEndAfter(el);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  }

  handlePaste(e) {
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
  }

  handleKeyUp(e) {
    // Simple mention/hashtag detection could go here
  }

  changeFontSize(delta) {
    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const input = document.getElementById("blog-font-size-input");

    if (selection.isCollapsed) {
      // Fallback for collapsed selection (caret only)
      let current = parseInt(input.value) || 16;
      input.value = current;
      let newVal = current + delta;
      if (newVal < 8) newVal = 8;
      if (newVal > 72) newVal = 72;
      input.value = newVal;
      this.contentArea.focus();
      
      // This sets the font size for new text at cursor
      document.execCommand("fontSize", false, "7");
      const fontTags = this.contentArea.querySelectorAll('font[size="7"]');
      fontTags.forEach((tag) => {
        tag.removeAttribute("size");
        tag.style.fontSize = newVal + "px";
      });
      return;
    }

    // Handle range selection with mixed sizes
    const range = selection.getRangeAt(0);

    // Split text nodes at start and end of range to ensure we only affect selected text
    if (
      range.startContainer.nodeType === Node.TEXT_NODE &&
      range.startOffset > 0 &&
      range.startOffset < range.startContainer.length
    ) {
      range.startContainer.splitText(range.startOffset);
      // After split, the selected part is the second sibling.
      // We need to adjust range start to point to the new node start.
      range.setStart(range.startContainer.nextSibling, 0);
    }

    if (
      range.endContainer.nodeType === Node.TEXT_NODE &&
      range.endOffset > 0 &&
      range.endOffset < range.endContainer.length
    ) {
      range.endContainer.splitText(range.endOffset);
      // Range end is still valid (points to end of first part), allowing us to iterate safely.
    }

    // Now iterate and apply style
    const iterator = document.createNodeIterator(
      range.commonAncestorContainer,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function (node) {
          return selection.containsNode(node, true)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_REJECT;
        },
      },
    );

    let currentNode;
    const nodesToUpdate = [];
    while ((currentNode = iterator.nextNode())) {
      nodesToUpdate.push(currentNode);
    }

    if (nodesToUpdate.length === 0) return;

    const modifiedNodes = [];

    // Apply changes
    nodesToUpdate.forEach((node) => {
      // Skip empty whitespace nodes unless we want to preserve them
      if (node.textContent.trim().length === 0) return;

      let parentStyle = window.getComputedStyle(node.parentNode);
      let currentSize = parseInt(parentStyle.fontSize);
      input.value = currentSize;
      let newSize = currentSize + delta;
      if (newSize < 8) newSize = 8;
      if (newSize > 72) newSize = 72;
      input.value = newSize;
      // Wrap node in span with new size
      if (
        node.parentNode.tagName === "SPAN" &&
        node.parentNode.childNodes.length === 1 &&
        node.parentNode.style.fontSize
      ) {
        // Update existing SPAN if it only contains this text node and has font-size
        node.parentNode.style.fontSize = newSize + "px";
        modifiedNodes.push(node);
      } else {
        const span = document.createElement("span");
        span.style.fontSize = newSize + "px";
        node.replaceWith(span);
        span.appendChild(node);
        modifiedNodes.push(node);
      }
    });

    // Restore selection capability
    if (modifiedNodes.length > 0) {
      const newRange = document.createRange();
      // Since we might have replaced nodes, we need to be careful.
      // Actually we replaced node with span containing node.
      // modifiedNodes contains the text nodes which are now inside spans.
      // So they are still valid references? Yes, appendChild moves them.

      const firstNode = modifiedNodes[0];
      const lastNode = modifiedNodes[modifiedNodes.length - 1];

      try {
        newRange.setStart(firstNode, 0);
        newRange.setEnd(lastNode, lastNode.length);

        selection.removeAllRanges();
        selection.addRange(newRange);
      } catch (e) {
        console.error("Selection restore failed", e);
      }
    }

    this.sync();
  }

  setFontSize(px) {
    this.contentArea.focus();
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.toString().length === 0) return;

    // Use a temporary font size marker
    document.execCommand("fontSize", false, "7");
    const fontTags = this.contentArea.querySelectorAll('font[size="7"]');
    fontTags.forEach((tag) => {
      tag.removeAttribute("size");
      tag.style.fontSize = px + "px";
      // Convert to span for cleaner HTML
      const span = document.createElement("span");
      span.style.fontSize = px + "px";
      while (tag.firstChild) span.appendChild(tag.firstChild);
      tag.parentNode.replaceChild(span, tag);
    });
    this.sync();
  }

  openMediaBrowser(callback = null) {
    this.mediaCallback = callback;
    const modal = new bootstrap.Modal(
      document.getElementById("mediaBrowserModal"),
    );
    modal.show();

    this.mediaPage = 1;
    this.mediaSearch = "";
    this.selectedMedia = null;

    const searchInput = document.getElementById("media-search");
    searchInput.value = "";
    searchInput.oninput = (e) => {
      this.mediaSearch = e.target.value;
      this.mediaPage = 1;
      this.loadMedia();
    };

    const loadMoreBtn = document.getElementById("btn-load-more-media");
    loadMoreBtn.onclick = () => {
      this.mediaPage++;
      this.loadMedia(true);
    };

    const insertBtn = document.getElementById("btn-insert-selected-media");
    insertBtn.onclick = () => {
      if (this.selectedMedia) {
        if (this.mediaCallback) {
          this.mediaCallback(this.selectedMedia);
        } else {
          this.insertMediaIntoEditor(this.selectedMedia);
        }
        modal.hide();
      }
    };

    this.loadMedia();
  }

  loadMedia(append = false) {
    const grid = document.getElementById("media-grid");
    const loading = document.getElementById("media-loading");
    const empty = document.getElementById("media-empty");
    const loadMoreBtn = document.getElementById("btn-load-more-media");

    if (!append) {
      grid.innerHTML = "";
      empty.classList.add("d-none");
    }

    loading.classList.remove("d-none");
    loadMoreBtn.classList.add("d-none");

    fetch(
      `/admin/blog/media?page=${this.mediaPage}&search=${encodeURIComponent(
        this.mediaSearch,
      )}`,
    )
      .then((res) => res.json())
      .then((data) => {
        loading.classList.add("d-none");
        if (data.media && data.media.length > 0) {
          this.renderMedia(data.media, append);
          if (data.hasMore) loadMoreBtn.classList.remove("d-none");
        } else if (!append) {
          empty.classList.remove("d-none");
        }
      })
      .catch((err) => {
        loading.classList.add("d-none");
        console.error("Media Load Error:", err);
      });
  }

  renderMedia(media, append) {
    const grid = document.getElementById("media-grid");
    const insertBtn = document.getElementById("btn-insert-selected-media");

    media.forEach((item) => {
      const col = document.createElement("div");
      col.className = "col-md-3 col-6";
      col.innerHTML = `
        <div class="media-item shadow-sm border position-relative" data-url="${item.url}" data-thumb="${item.thumb}">
          <img src="${item.thumb}" alt="${item.name}" loading="lazy" style="height: 150px; object-fit: cover; width: 100%;">
          <div class="media-info bg-light p-2 d-flex justify-content-between align-items-center">
            <span class="text-truncate d-block small" style="max-width: 70%;">${item.name}</span>
            <button class="btn btn-danger btn-sm p-0 px-1 delete-media-btn" title="Delete" style="font-size: 10px;">
                <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;

      const mediaItem = col.querySelector(".media-item");
      const deleteBtn = col.querySelector(".delete-media-btn");

      // Select logic
      mediaItem.onclick = function (e) {
        if (e.target.closest(".delete-media-btn")) return; // Ignore if delete clicked

        document
          .querySelectorAll(".media-item")
          .forEach((i) => i.classList.remove("selected", "border-primary"));
        this.classList.add("selected", "border-primary");
        window.BlogEditorInstance.selectedMedia = {
          url: this.dataset.url,
          thumb: this.dataset.thumb,
        };
        insertBtn.classList.remove("d-none");
      };

      // Double click to insert
      mediaItem.ondblclick = function (e) {
        if (e.target.closest(".delete-media-btn")) return;

        window.BlogEditorInstance.selectedMedia = {
          url: this.dataset.url,
          thumb: this.dataset.thumb,
        };

        // Trigger generic callback or direct insert
        if (window.BlogEditorInstance.mediaCallback) {
          window.BlogEditorInstance.mediaCallback(
            window.BlogEditorInstance.selectedMedia,
          );
        } else {
          window.BlogEditorInstance.insertMediaIntoEditor(
            window.BlogEditorInstance.selectedMedia,
          );
        }

        // Close modal
        const modalEl = document.getElementById("mediaBrowserModal");
        const modal = bootstrap.Modal.getInstance(modalEl);
        if (modal) modal.hide();
      };

      // Delete logic
      deleteBtn.onclick = (e) => {
        e.stopPropagation();
        if (!confirm("Are you sure you want to delete this file?")) return;

        const csrfToken = document
          .querySelector('meta[name="csrf-token"]')
          ?.getAttribute("content");

        fetch("/admin/blog/media/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Requested-With": "XMLHttpRequest",
            "X-CSRF-TOKEN": csrfToken || "",
          },
          body: JSON.stringify({ filename: item.name }), // item.name is just filename from controller
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.success) {
              col.remove();
            } else {
              alert("Delete failed: " + (data.message || "Unknown error"));
            }
          })
          .catch((err) => alert("Delete error"));
      };

      grid.appendChild(col);
    });
    window.BlogEditorInstance = this;
  }

  insertMediaIntoEditor(media) {
    this.contentArea.focus();
    const img = document.createElement("img");
    img.src = media.url;
    img.dataset.url = media.url;
    img.className = "img-fluid rounded my-3 encrypted skip-wrapper"; // Added skip-wrapper
    this.insertAtCursor(img);
    if (typeof decryptAndSetProtectedMedia === "function") {
      decryptAndSetProtectedMedia(img);
    }
    this.sync();
  }

  sync() {
    if (this.isSourceMode) {
      this.hiddenTextarea.value = this.contentArea.innerText;
      return;
    }

    const clone = this.contentArea.cloneNode(true);
    clone.querySelectorAll("img").forEach((img) => {
      // Revert to original URL if it was decrypted
      if (img.dataset.url) {
        img.src = img.dataset.url;
      }

      // Remove all decryption-related transient data
      img.removeAttribute("data-decrypted-src");
      img.removeAttribute("data-full");

      // Clean up styling that might have been added by the editor selection
      img.style.outline = "";

      // Reset decryption state so it's fresh for the next view
      if (img.hasAttribute("data-decryption-state")) {
        img.setAttribute("data-decryption-state", "processing");
      }
    });

    this.hiddenTextarea.value = clone.innerHTML;
  }
}
window.BlogEditor = BlogEditor;
