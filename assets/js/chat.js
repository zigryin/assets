// Zigry Chat - Reload-safe, Accurate Group/Contact Selection, All UI/Meta Elements Intact, Fixed data-timestamp and Chat Rendering

// --- CACHE VERSIONING (Force Clear Stale Data) ---
const CACHE_VERSION = "1.2"; // Bump this to force clear
if (localStorage.getItem("zigry_cache_version") !== CACHE_VERSION) {
  // Clear all message caches
  Object.keys(localStorage).forEach((key) => {
    if (
      key.startsWith("messages_") ||
      key.startsWith("group_messages_") ||
      key.startsWith("contacts")
    ) {
      localStorage.removeItem(key);
    }
  });
  localStorage.setItem("zigry_cache_version", CACHE_VERSION);
  // Optional: Reload to ensure clean state? No, let scripts init.
}

window.me = window.me || { id: "", name: "", avatar: "", groups: [] };
window.me.groups = Array.isArray(window.me.groups) ? window.me.groups : [];
window.contacts = window.contacts || [];
window.groups = window.groups || [];
window.selectedContact = window.selectedContact || null;
window.messages = window.messages || [];
window.messageCache = { contacts: {}, groups: {} }; // In-memory cache
window.jwtToken =
  localStorage.getItem(`jwtToken${window.me.id}`) || window.jwtToken || "";
const host = "wss://chat.zigry.in";
// const host = "ws://localhost:3000";
const groupSeenBy = {};
if (window.me && Array.isArray(window.me.groups)) {
  window.me.groups = window.me.groups.map((id) => Number(id));
}
if (window.jwtToken) {
  // Only create one socket instance — guard against duplicate instantiation
  if (
    !window.zigrySocket ||
    !(
      window.zigrySocket.socket &&
      (window.zigrySocket.socket.readyState === WebSocket.OPEN ||
        window.zigrySocket.socket.readyState === WebSocket.CONNECTING)
    )
  ) {
    window.zigrySocket = new ZigrySocket(host, window.jwtToken);
  } else {
    console.debug(
      "[chat] existing zigrySocket detected, skipping new instance"
    );
  }
}

async function initChatDecryption() {
  const encryptedPreviews = document.querySelectorAll("[data-encrypted-msg]");
  for (const el of encryptedPreviews) {
    const encryptedMsg = el.getAttribute("data-encrypted-msg");
    const key = el.getAttribute("data-decrypt-key");
    if (encryptedMsg && key) {
      try {
        const decrypted = await ZigrySocket.decrypt(encryptedMsg, key);
        // Keep the "You: " prefix if it exists
        const hasPrefix = el.textContent.trim().startsWith("You:");
        el.textContent = hasPrefix ? `You: ${decrypted}` : decrypted;
      } catch (e) {
        console.warn("Failed to decrypt lastMsg preview", e);
      }
    }
  }
}

document.addEventListener("DOMContentLoaded", initChatDecryption);

// Outgoing queue: hold messages while socket is disconnected.
window._outgoingQueue = window._outgoingQueue || [];
window._outgoingPendingIds = window._outgoingPendingIds || new Set();

function extractOutgoingId(args) {
  for (const a of args) {
    if (a && typeof a === "object") {
      if (a.id) return String(a.id);
      if (a.messageId) return String(a.messageId);
    }
  }
  return null;
}

function queueSend(...args) {
  const id = extractOutgoingId(args);
  if (id) {
    if (window._outgoingPendingIds.has(id)) {
      return; // already sent or pending
    }
    // check queue for same id
    if (window._outgoingQueue.some((it) => it.id === id)) {
      return;
    }
  }
  const item = { args, id };
  window._outgoingQueue.push(item);
  flushOutgoingQueue();
}

function flushOutgoingQueue() {
  if (!window.zigrySocket || !window.zigrySocket.socket) {
    return;
  }
  if (window.zigrySocket.socket.readyState !== WebSocket.OPEN) {
    return;
  }
  while (window._outgoingQueue.length) {
    const item = window._outgoingQueue[0];
    try {
      window.zigrySocket.send.apply(window.zigrySocket, item.args);
      if (item.id) window._outgoingPendingIds.add(item.id);
      window._outgoingQueue.shift();
    } catch (e) {
      // stop on send error and keep remaining queued
      console.warn("flushOutgoingQueue: send failed, will retry", e);
      break;
    }
  }
}

// Remove pending id when server acks via `sent` or similar events
zigrySocket?.on?.("sent", (data) => {
  try {
    const mid = data.messageId || data.id;
    if (mid) window._outgoingPendingIds.delete(String(mid));
  } catch (e) {}
});

zigrySocket.on("private", (data) => {
  let contactId = data.from == window.me.id ? data.to : data.from;
  const contact = window.contacts.find((c) => c.id == contactId);
  if (!contact) return;
  const msgs = loadMessages(contactId);
  const now = new Date();

  // ✅ Deduplication: Prevent duplicate messages from multiple tabs/sync
  if (msgs.some((m) => m.id == data.id)) return;

  // Try to stick to the status model: incoming messages are always "delivered" (since you received them)
  const msgObj = {
    id: data.id,
    from: data.from,
    name: data.from == window.me.id ? window.me.name : contact.name,
    text: data.message,
    time: now.toISOString(),
    timestamp: data.timestamp || now.getTime(),
    // ✅ Use server-provided status if available (fixes inverted status on passive tabs)
    status: data.status || (data.from === window.me.id ? "2" : "1"),
  };
  msgs.push(msgObj);
  // Always persist incoming messages so they're available after reloads
  try {
    saveMessages(contactId, msgs);
  } catch (e) {
    console.warn("Failed to save incoming messages for", contactId, e);
  }

  if (window.selectedContact && window.selectedContact.id == contactId) {
    renderMessages(contactId);
    localStorage.setItem("unread_" + contactId, "0");
    // updateContactPreview(contactId, msgObj.text, msgObj.timestamp, 0);
    // Mark as seen if chat is open
    markMessagesAsSeen(contactId);
  } else {
    let unread = Number(localStorage.getItem("unread_" + contactId)) || 0;
    unread += 1;
    localStorage.setItem("unread_" + contactId, unread.toString());
    updateContactPreview(
      contactId,
      msgObj.text,
      msgObj.timestamp,
      unread,
      msgObj.from
    );
  }

  if (contact) {
    contact.lastMsg = msgObj.text;
    contact.lastMsgFromId = msgObj.from;
    contact.timestamp = msgObj.timestamp;
  }

  // ✅ Send 'delivered' acknowledgement so sender gets double ticks
  if (data.from !== window.me.id) {
    zigrySocket.send({
      type: "delivered",
      messageId: data.id,
      to: String(data.from),
    });
  }
});

zigrySocket.on("group", (data) => {
  const groupId = data.room;
  const group = window.groups.find((g) => g.id == groupId);
  if (!group) return;

  const msgs = loadGroupMessages(groupId);
  const now = new Date();
  const msgObj = {
    id: data.id,
    from: data.from,
    name: data.name,
    text: data.message,
    time: now.toISOString(),
    timestamp: now.getTime(),
  };
  msgs.push(msgObj);
  saveGroupMessages(groupId, msgs);

  if (window.selectedContact && window.selectedContact.id == groupId) {
    renderGroupMessages(groupId);
  }
});

zigrySocket.on("notification", (data) => {
  // Example: { title: "New Message", body: "You have a new message", url: "https://..." }

  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: "push",
      title: data.title,
      body: data.body,
      url: data.url,
    });
  } else {
    console.warn("No active service worker to send notification");
  }
});

zigrySocket.on("group_joined", (data) => {
  if (!Array.isArray(window.me.groups)) {
    window.me.groups = [];
  }

  const groupId = Number(data.group); // Ensure numeric consistency

  if (!window.me.groups.includes(groupId)) {
    window.me.groups.push(groupId);

    // ✅ Re-render the group list
    renderContacts(window.groups, window.selectedContact, "group-list");
  }
});
zigrySocket.on("group_left", (data) => {
  if (!Array.isArray(window.me.groups)) {
    window.me.groups = [];
  }

  const groupId = Number(data.group); // Ensure numeric consistency

  if (window.me.groups.includes(groupId)) {
    window.me.groups = window.me.groups.filter((id) => id !== groupId);

    // ✅ Re-render the group list
    renderContacts(window.groups, window.selectedContact, "group-list");
  }
});

zigrySocket.on("refresh_user", (data) => {
  if (data.token && data.token !== window.jwtToken) {
    // 🔄 Overwrite old token
    window.jwtToken = data.token;
    localStorage.setItem(`jwtToken${window.me.id}`, data.token);

    // 🔁 Debounce reconnection to avoid multiple rapid reconnects
    try {
      if (window._zigrySocketReconnectTimer)
        clearTimeout(window._zigrySocketReconnectTimer);
    } catch (e) {}

    // Close existing socket if present (will stop auto-reconnect attempts)
    if (window.zigrySocket) {
      try {
        window.zigrySocket.close();
      } catch (e) {
        console.warn("Error closing zigrySocket", e);
      }
      window.zigrySocket = null;
    }

    window._zigrySocketReconnectTimer = setTimeout(() => {
      if (!window.zigrySocket) {
        window.zigrySocket = new ZigrySocket(host, window.jwtToken);
      }
    }, 500);
  }
});

zigrySocket.on("sent", (data) => {
  updateMessageStatus(data.messageId, "2", data.to); // ✓ Sent
});
zigrySocket.on("delivered", (data) => {
  updateMessageStatus(data.messageId, "1", data.to); // ✓✓ Delivered
});
zigrySocket.on("seen", (data) => {
  const contactId = data.contact;
  const msgs = loadMessages(contactId);
  let updated = false;

  msgs.forEach((msg) => {
    if (msg.from === window.me.id && msg.status !== "0") {
      msg.status = "0";
      // updateMessageStatus(msg.id, "0", contactId); // Avoid double-save loop
      updated = true;
    }
  });

  if (updated && contactId == window.selectedContact.id) {
    saveMessages(contactId, msgs);
  }
  // Force DOM update if viewing this contact
  if (
    updated &&
    window.selectedContact &&
    window.selectedContact.id == contactId
  ) {
    renderMessages(contactId, false); // Re-render without scrolling
  }
});

zigrySocket.on("group_seen", (data) => {
  if (!groupSeenBy[data.messageId]) {
    groupSeenBy[data.messageId] = new Set();
  }
  groupSeenBy[data.messageId].add(data.seenBy);
  updateGroupMessageStatus(data.messageId);
});

// --- Online Status Handlers (for PHP-rendered contact list) ---
zigrySocket.on("user_online", (data) => {
  const userId = data.userId;
  // Find contact by ID or mobile (supports both identifiers)
  const contactEl = document.querySelector(
    `.contact-item[data-id="${userId}"], .contact-item[data-numeric-id="${userId}"]`
  );

  if (contactEl) {
    // Update data attribute
    contactEl.dataset.online = "true";

    // Show online dot
    const dot = contactEl.querySelector(".online-dot");
    if (dot) dot.style.display = "block";

    // Update online badge if exists
    let badge = contactEl.querySelector(".badge.bg-success");
    if (!badge) {
      const nameContainer = contactEl.querySelector(
        ".d-flex.align-items-center"
      );
      if (nameContainer) {
        badge = document.createElement("span");
        badge.className = "ms-2 badge bg-success";
        badge.style.fontSize = "0.6em";
        badge.textContent = "Online";
        nameContainer.appendChild(badge);
      }
    }
  }

  // Update in-memory contact
  const contact = window.contacts?.find(
    (c) => c.id == userId || c.numericId == userId
  );
  if (contact) contact.online = true;

  // Update online count
  if (typeof updateOnlineCount === "function") updateOnlineCount();

  // If currently viewing this contact, update header
  if (
    window.selectedContact &&
    (window.selectedContact.id == userId ||
      window.selectedContact.numericId == userId)
  ) {
    const indicator = document.getElementById("chatOnlineIndicator");
    const status = document.getElementById("chatStatus");
    if (indicator) indicator.style.display = "block";
    if (status) status.innerText = "Online";
  }
});

zigrySocket.on("user_offline", (data) => {
  const userId = data.userId;
  const lastSeen = data.lastSeen;

  // Find contact by ID or mobile
  const contactEl = document.querySelector(
    `.contact-item[data-id="${userId}"], .contact-item[data-numeric-id="${userId}"]`
  );

  if (contactEl) {
    // Update data attribute
    contactEl.dataset.online = "false";

    // Hide online dot
    const dot = contactEl.querySelector(".online-dot");
    if (dot) dot.style.display = "none";

    // Remove online badge
    const badge = contactEl.querySelector(".badge.bg-success");
    if (badge) badge.remove();
  }

  // Update in-memory contact
  const contact = window.contacts?.find(
    (c) => c.id == userId || c.numericId == userId
  );
  if (contact) {
    contact.online = false;
    if (lastSeen) contact.lastSeen = lastSeen;
  }

  // Update online count
  if (typeof updateOnlineCount === "function") updateOnlineCount();

  // If currently viewing this contact, update header
  if (
    window.selectedContact &&
    (window.selectedContact.id == userId ||
      window.selectedContact.numericId == userId)
  ) {
    const indicator = document.getElementById("chatOnlineIndicator");
    const status = document.getElementById("chatStatus");
    if (indicator) indicator.style.display = "none";
    if (status)
      status.innerText = lastSeen
        ? `Last seen ${humanReadableTime(lastSeen)}`
        : "";
  }
});

// Handle last_seen response
zigrySocket.on("last_seen", (data) => {
  const userId = data.userId;
  const contact = window.contacts?.find(
    (c) => c.id == userId || c.numericId == userId
  );

  if (contact) {
    contact.online = data.online;
    contact.lastSeen = data.lastSeen;
  }

  // Update UI if viewing this contact
  if (
    window.selectedContact &&
    (window.selectedContact.id == userId ||
      window.selectedContact.numericId == userId)
  ) {
    const indicator = document.getElementById("chatOnlineIndicator");
    const status = document.getElementById("chatStatus");

    if (data.online) {
      if (indicator) indicator.style.display = "block";
      if (status) status.innerText = "Online";
    } else {
      if (indicator) indicator.style.display = "none";
      if (status)
        status.innerText = data.lastSeen
          ? `Last seen ${humanReadableTime(data.lastSeen)}`
          : "";
    }
  }
});

// --- Storage helpers (Memory only) ---
// --- Storage helpers ---
function getStorageKey(id, isGroup = false) {
  const type = isGroup ? "g" : "c";
  const myId = window.me && window.me.id ? window.me.id : "anon";
  return `zigry_msg_${myId}_${type}_${id}`;
}

function saveMessages(contactId, messages) {
  // Filter out invalid messages
  const validMessages = messages.filter(
    (m) => (m.text && String(m.text).trim().length > 0) || m.file
  );

  if (!window.messageCache.contacts[contactId])
    window.messageCache.contacts[contactId] = [];
  window.messageCache.contacts[contactId] = validMessages;

  try {
    localStorage.setItem(
      getStorageKey(contactId, false),
      JSON.stringify(validMessages)
    );
  } catch (e) {
    console.error("Failed to save to localStorage", e);
  }
}

function loadMessages(contactId) {
  if (window.messageCache.contacts[contactId]) {
    return window.messageCache.contacts[contactId];
  }

  // Fallback to localStorage
  try {
    const json = localStorage.getItem(getStorageKey(contactId, false));
    if (json) {
      let msgs = JSON.parse(json);
      // Safety filter on load
      msgs = msgs.filter(
        (m) => (m.text && String(m.text).trim().length > 0) || m.file
      );
      window.messageCache.contacts[contactId] = msgs;
      return msgs;
    }
  } catch (e) {
    console.error("Failed to load from localStorage", e);
  }

  return [];
}

function saveGroupMessages(groupId, messages) {
  // Filter out invalid messages
  const validMessages = messages.filter(
    (m) => (m.text && String(m.text).trim().length > 0) || m.file
  );

  if (!window.messageCache.groups[groupId])
    window.messageCache.groups[groupId] = [];
  window.messageCache.groups[groupId] = validMessages;

  try {
    localStorage.setItem(
      getStorageKey(groupId, true),
      JSON.stringify(validMessages)
    );
  } catch (e) {
    console.error("Failed to save group messages", e);
  }
}

function loadGroupMessages(groupId) {
  if (window.messageCache.groups[groupId]) {
    return window.messageCache.groups[groupId];
  }

  // Fallback to localStorage
  try {
    const json = localStorage.getItem(getStorageKey(groupId, true));
    if (json) {
      const msgs = JSON.parse(json);
      window.messageCache.groups[groupId] = msgs;
      return msgs;
    }
  } catch (e) {
    console.error("Failed to load group messages", e);
  }

  return [];
}

// --- Query helpers ---
function getContactIdFromQuery() {
  return new URLSearchParams(window.location.search).get("contact");
}
function getGroupIdFromQuery() {
  return new URLSearchParams(window.location.search).get("group");
}
function setContactQuery(contactId) {
  const url = new URL(window.location);
  url.searchParams.set("contact", contactId);
  url.searchParams.delete("group");
  window.history.replaceState({}, "", url);
}
function setGroupQuery(groupId) {
  const url = new URL(window.location);
  url.searchParams.set("group", groupId);
  url.searchParams.delete("contact");
  window.history.replaceState({}, "", url);
}

async function fetchAndLoadMessages(contactId, isGroup = false, offset = 0) {
  // const action = isGroup ? "get_group_messages" : "get_messages"; // Legacy POST action
  // const paramKey = isGroup ? "group" : "contact";

  try {
    const type = isGroup ? "group" : "contact";
    const url = `/getmessage?type=${type}&id=${contactId}&limit=50&offset=${offset}`;

    const res = await fetch(url, {
      method: "GET",
      // headers: { Authorization: ... } // Cookies handle auth usually, but if Bearer needed:
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${window.jwtToken}`,
      },
    });

    const data = await res.json();
    const msgs = Array.isArray(data.messages) ? data.messages : [];

    if (msgs) {
      if (isGroup) {
        if (offset === 0) {
          saveGroupMessages(contactId, msgs);
        } else {
          // Prepend older messages
          const current = loadGroupMessages(contactId);
          // Ensure uniqueness
          const existingIds = new Set(current.map((m) => m.id));
          const newUnique = msgs.filter((m) => !existingIds.has(m.id));
          const newCombined = [...newUnique, ...current];
          saveGroupMessages(contactId, newCombined);
        }
      } else {
        if (offset === 0) {
          mergeAndSaveMessages(contactId, msgs, true); // Replace loop logic
        } else {
          // mergeAndSaveMessages handles uniqueness.
          mergeAndSaveMessages(contactId, msgs, false);
        }
      }
    }
    return msgs.length; // Return count to check hasMore
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    return 0;
  }
}

// Merge server messages with in-memory cache for a contact.
function mergeAndSaveMessages(contactId, serverMsgs, replace = false) {
  try {
    if (!Array.isArray(serverMsgs)) serverMsgs = [];

    if (replace && serverMsgs.length === 0) {
      // saveMessages(contactId, []);
      // Don't wipe if replace is true but empty? assume no history.
      return;
    }

    const local = loadMessages(contactId) || [];
    const byId = new Map();

    // If not replacing (i.e. paginating or merging), keep local
    // If replacing (initial load), we might still want to keep "unsent" ones?
    // For now, simplify: Server is authority.

    if (!replace) {
      local.forEach((m) =>
        byId.set(String(m.id || m.message_id || `${m.from}_${m.timestamp}`), m)
      );
    }

    serverMsgs.forEach((m) => {
      const id = m.id || m.message_id || `${m.from}_${m.timestamp}`;
      byId.set(String(id), m);
    });

    // Sort chronological
    const merged = Array.from(byId.values()).sort((a, b) => {
      const ta = new Date(a.created_at || a.time || 0).getTime();
      const tb = new Date(b.created_at || b.time || 0).getTime();
      return ta - tb;
    });

    saveMessages(contactId, merged);
  } catch (e) {
    console.warn("mergeAndSaveMessages failed for", contactId, e);
  }
}

// --- Utility ---
function isGroup(obj) {
  return obj && (obj.groupkey !== undefined || "joined" in obj);
}
// function isGroup(obj) { return !!window.groups && window.groups.some(g => g.id === obj.id); }
function timeAgo(timestamp) {
  return humanReadableTime(timestamp);
}
function setChatStatus(contact) {
  let status = "";
  if (contact && contact.online) {
    status = "🟢";
  } else if (contact && contact.lastSeen) {
    status = `(${timeAgo(contact.lastSeen)} )`;
  } else {
    status = "🔴";
  }
  document.getElementById("chatStatus").innerText = status;
}

// --- Pagination State ---
const pState = {
  contacts: { page: 1, loading: false, hasMore: true, search: "" },
  groups: { page: 1, loading: false, hasMore: true, search: "" },
};

// --- Search Listener ---
// --- Search Listener (Server-Side with Debounce) ---
// --- Search Listener (Server-Side with Debounce) ---
let searchTimeout;
function performSearch(val) {
  pState.contacts.search = val;
  pState.groups.search = val;

  // Reset state and fetch
  pState.contacts.hasMore = true;
  pState.groups.hasMore = true;
  pState.contacts.page = 1; // Explicit reset
  pState.groups.page = 1;

  loadContacts(true); // reset=true
  loadGroups(true);
}

function initChatSearch() {
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      const val = e.target.value.trim();
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        performSearch(val);
      }, 300);
    });

    searchInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        clearTimeout(searchTimeout);
        performSearch(e.target.value.trim());
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initChatSearch);

// --- Scroll Listeners ---
function setupScrollListener(listId, loadFn) {
  const el = document.getElementById(listId);
  if (!el) return;
  el.addEventListener("scroll", () => {
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 100) {
      loadFn();
    }
  });
}

// Chat scroll for pagination
const chatMsgBox = document.getElementById("chat-messages");
if (chatMsgBox) {
  chatMsgBox.addEventListener("scroll", async function () {
    if (
      this.scrollTop < 50 &&
      window.selectedContact &&
      !window._fetchingMessages
    ) {
      // Fetch older
      const isGroup = window.selectedContact.groupkey !== undefined;
      const contactId = window.selectedContact.id;
      const currentMsgs = isGroup
        ? loadGroupMessages(contactId)
        : loadMessages(contactId);

      // Avoid refetch if we know we are at end? (Server doesn't tell us total count easily)
      // Just try to fetch.
      window._fetchingMessages = true;

      const oldHeight = this.scrollHeight;
      const count = await fetchAndLoadMessages(
        contactId,
        isGroup,
        currentMsgs.length
      );

      if (count > 0) {
        // Determine render function
        if (isGroup) {
          renderGroupMessages(contactId, true); // true = preserve scroll (logic needed)
        } else {
          renderMessages(contactId, true);
        }

        // Adjustment
        // render* logic typically scrolls to bottom. We need to prevent that if prepending.
        // Actually `renderMessages` typically clears and refills.
        // I need to update `renderMessages` to support maintainScroll.

        // Manually adjust scroll:
        const newHeight = this.scrollHeight;
        this.scrollTop = newHeight - oldHeight;
      }

      window._fetchingMessages = false;
    }
  });
}

// Initialize
setTimeout(() => {
  // We increment page because page 1 is already rendered by PHP
  pState.contacts.page = 2;
  pState.groups.page = 2;

  setupScrollListener("contact-list", () => loadContacts());
  setupScrollListener("group-list", () => loadGroups());
}, 1000);

async function loadContacts(reset = false) {
  if (pState.contacts.loading || (!pState.contacts.hasMore && !reset)) return;
  pState.contacts.loading = true;

  try {
    const page = reset ? 1 : pState.contacts.page;
    const res = await fetch(
      `/chat/contacts?page=${page}&search=${encodeURIComponent(
        pState.contacts.search
      )}`
    );
    const data = await res.json();

    if (reset) {
      document.getElementById("contact-list").innerHTML = "";
      // If searching, we might get people not in window.contacts.
      // We should add them.
    }

    const newContacts = data.contacts || [];
    window.contacts = newContacts;
    // Merge into window.contacts
    newContacts.forEach((c) => {
      const idx = window.contacts.findIndex((x) => x.id == c.id);
      if (idx === -1) window.contacts.push(c);
      else window.contacts[idx] = { ...window.contacts[idx], ...c };
    });

    if (reset) {
      window.filtered = newContacts;
    } else {
      // append to filtered if it's currently showing valid data (simpler to just concat/dedupe)
      // For simplicity in search scrolling:
      window.filtered = [...window.filtered, ...newContacts];
      // Dedupe
      const seen = new Set();
      window.filtered = window.filtered.filter((c) => {
        const duplicate = seen.has(c.id);
        seen.add(c.id);
        return !duplicate;
      });
    }

    renderContacts(newContacts, window.selectedContact, "contact-list", !reset);

    pState.contacts.hasMore = data.hasMore;
    if (!reset && newContacts.length > 0) pState.contacts.page++;
    if (reset) pState.contacts.page = 2;
  } catch (e) {
    console.error("Load contacts error:", e);
  } finally {
    pState.contacts.loading = false;
  }
}

async function loadGroups(reset = false) {
  if (pState.groups.loading || (!pState.groups.hasMore && !reset)) return;
  pState.groups.loading = true;

  try {
    const page = reset ? 1 : pState.groups.page;
    const res = await fetch(
      `/chat/groups?page=${page}&search=${encodeURIComponent(
        pState.groups.search
      )}`
    );
    const data = await res.json();

    if (reset) {
      document.getElementById("group-list").innerHTML = "";
    }

    const newGroups = data.groups || [];
    window.groups = newGroups;

    newGroups.forEach((g) => {
      const idx = window.groups.findIndex((x) => x.id == g.id);
      if (idx === -1) window.groups.push(g);
      else window.groups[idx] = { ...window.groups[idx], ...g };
    });

    if (reset) {
      window.filteredGroup = newGroups;
    } else {
      window.filteredGroup = [...window.filteredGroup, ...newGroups];
      const seen = new Set();
      window.filteredGroup = window.filteredGroup.filter((g) => {
        const duplicate = seen.has(g.id);
        seen.add(g.id);
        return !duplicate;
      });
    }

    renderContacts(newGroups, window.selectedContact, "group-list", !reset);

    pState.groups.hasMore = data.hasMore;
    if (!reset && newGroups.length > 0) pState.groups.page++;
    if (reset) pState.groups.page = 2;
  } catch (e) {
    console.error("Load groups error:", e);
  } finally {
    pState.groups.loading = false;
  }
}

// --- Render Contacts/Groups (Updated to match Blade) ---
function renderContacts(
  contacts,
  selectedContact,
  listId = "contact-list",
  append = false
) {
  const el = document.getElementById(listId);
  if (!el) return;

  if (!append) el.innerHTML = "";

  contacts.forEach((c) => {
    // Avoid duplicates in DOM if appending
    if (append && el.querySelector(`li[data-id="${c.id}"]`)) return;

    const isGroupContact = listId == "group-list";
    const isMember = isGroupContact
      ? (window.me.groups || []).includes(Number(c.id))
      : true;

    // Use selectContact global wrapper if available
    const onClickHandler = `selectContact(window.contacts.find(x => x.id == '${
      c.id
    }') || ${JSON.stringify(c).replace(/"/g, "&quot;")})`;

    const li = document.createElement("li");
    li.className = `contact-item d-flex py-2 align-items-center border-top border-opacity-25 ${
      selectedContact &&
      (selectedContact.id == c.id || selectedContact.numericId == c.id)
        ? "active"
        : ""
    }`;
    li.setAttribute("data-id", c.id);
    if (c.mobile) li.setAttribute("data-mobile", c.mobile);
    if (c.numericId) li.setAttribute("data-numeric-id", c.numericId);

    if (isGroupContact) {
      li.setAttribute("data-type", "group");
      li.setAttribute("data-joined", isMember ? "true" : "false");
    } else {
      li.setAttribute("data-online", c.online ? "true" : "false");
    }

    li.onclick = () => {
      // Use the global selectContact/selectGroup if possible
      if (isGroupContact && typeof window.selectGroup === "function") {
        window.selectGroup(c);
      } else if (typeof window.selectContact === "function") {
        window.selectContact(c);
      } else {
        selectContactOrGroup(c, isGroupContact, true);
      }
    };

    // Avatar
    const avatarHtml = `
        <div class="me-3 flex-shrink-0 position-relative avatar-wrapper">
            <img src="${
              c.avatar ||
              (isGroupContact
                ? "/images/default-group.png"
                : "/images/default-user.png")
            }" 
                 alt="${c.name}" 
                 class="avatar rounded-circle" 
                 style="width:44px; height:44px; object-fit:cover;">
        </div>
    `;

    // Content
    const prefix = c.lastMsgFromId == window.me.id ? "You: " : "";
    const contentHtml = `
        <div class="flex-grow-1 min-width-0">
            <div class="d-flex align-items-center">
                <span class="fw-bold text-truncate text-white">${c.name}</span>
                <span class="online-dot ms-2" style="
                width:16px;
                height:16px;
                    border-radius: 50%;
                    display: ${isGroupContact ? "none" : "block"};
                    background: ${c.online ? "#10b981" : "#dc2626"};
                "></span>
            </div>
            <div class="text-truncate small text-muted contact-last-msg" style="max-width: 200px;">
                ${prefix}
                <span 
                    ${
                      !isGroupContact &&
                      c.lastMsg &&
                      (c.msgkeydec || c.msgkeyenc)
                        ? `data-encrypted-msg="${
                            c.lastMsg
                          }" data-decrypt-key="${
                            c.lastMsgFromId == window.me.id
                              ? c.msgkeyenc
                              : c.msgkeydec
                          }"`
                        : ""
                    }
                >${c.lastMsg || "Say hi!"}</span>
            </div>
        </div>
    `;

    // Right Side (Badge/Buttons)
    const rightHtml = `
        <div class="flex-shrink-0 ms-2 d-flex align-items-center">
            ${
              !isGroupContact && c.unread > 0
                ? `<span class="badge rounded-pill bg-primary unread-badge">${c.unread}</span>`
                : ""
            }
            ${
              isGroupContact && !isMember
                ? `
                <button class="btn btn-sm btn-outline-primary join-group-btn" onclick="event.stopPropagation(); joinGroup(${c.id})">Join</button>
            `
                : ""
            }
            ${
              isGroupContact && isMember
                ? `
                <button class="btn btn-sm btn-outline-danger leave-group-btn" style="display:none;" onclick="event.stopPropagation(); leaveGroup(${c.id})">Leave</button>
            `
                : ""
            }
        </div>
    `;

    li.innerHTML = avatarHtml + contentHtml + rightHtml;
    el.appendChild(li);
  });

  // Trigger decryption for newly added elements
  if (!listId || listId === "contact-list") {
    decryptContactPreviews();
  }
}

async function decryptContactPreviews() {
  const elements = document.querySelectorAll(
    "[data-encrypted-msg]:not([data-decrypted])"
  );
  for (const el of elements) {
    const encrypted = el.getAttribute("data-encrypted-msg");
    const key = el.getAttribute("data-decrypt-key");
    if (encrypted && key && typeof ZigrySocket !== "undefined") {
      try {
        const decrypted = await ZigrySocket.decrypt(encrypted, key);
        el.innerText = decrypted;
      } catch (e) {
        console.error("Decryption failed for preview", e);
      }
    }
    el.setAttribute("data-decrypted", "true");
  }
}

// --- Select/contact or group ---
async function selectContactOrGroup(obj, isGroupContact, updateQuery = false) {
  window.selectedContact = obj;

  // CRITICAL: Hide empty state, show messages container
  const emptyState = document.getElementById("emptyState");
  const chatMessages = document.getElementById("chat-messages");
  const chatInput = document.getElementById("chat-input-container");

  if (emptyState) emptyState.classList.add("d-none");
  if (chatMessages) chatMessages.classList.remove("d-none");
  if (chatInput) chatInput.style.display = "block";

  document
    .querySelectorAll(".contact-item")
    .forEach((li) => li.classList.remove("active"));
  const li = document.querySelector(`.contact-item[data-id="${obj.id}"]`);
  if (li) li.classList.add("active");

  // Update chat header with avatar and info
  const chatAvatar = document.getElementById("chatAvatar");
  const chatAvatarWrapper = document.getElementById("chatAvatarWrapper");
  // const chatOnlineIndicator = document.getElementById("chatOnlineIndicator"); // unused in this scope locally

  if (chatAvatar && obj.avatar) {
    chatAvatar.src = obj.avatar;
    if (chatAvatarWrapper) chatAvatarWrapper.style.display = "block";
  }

  // Chat title and status
  document.getElementById("chatTitle").innerText = obj.name;

  // Show chat on mobile
  if (typeof showChatOnMobile === "function") showChatOnMobile();

  // 1. Initial Render (Clears view or shows cached)
  if (isGroupContact) {
    renderGroupMessages(obj.id);
    showGroupLeaveButton(obj.id);
  } else {
    setChatStatus(obj);
    renderMessages(obj.id);
    hideGroupLeaveButton();
  }

  // 2. Check Cache & Fetch if needed
  const contactId = obj.id;
  const cachedMessages = isGroupContact
    ? loadGroupMessages(contactId)
    : loadMessages(contactId);

  if (!cachedMessages || cachedMessages.length === 0) {
    await fetchAndLoadMessages(contactId, isGroupContact, 0);
  } else {
    // Check Cache Expiry (1 Hour)
    const CACHE_DURATION = 60 * 60 * 1000; // 1 Hour
    const lastSyncKey = `last_sync_${isGroupContact ? "g" : "c"}_${contactId}`;
    const lastSync = localStorage.getItem(lastSyncKey);
    const now = Date.now();

    if (!lastSync || now - Number(lastSync) > CACHE_DURATION) {
      // Background sync (don't await to keep UI responsive with cached data)
      fetchAndLoadMessages(contactId, isGroupContact, 0).then(() => {
        localStorage.setItem(lastSyncKey, now);
        // Re-render after sync
        if (window.selectedContact && window.selectedContact.id == contactId) {
          if (isGroupContact) renderGroupMessages(contactId);
          else renderMessages(contactId);
        }
      });
    }
  }

  // Initial Render (even if fetching in background)
  if (window.selectedContact && window.selectedContact.id == contactId) {
    if (isGroupContact) {
      renderGroupMessages(contactId);
    } else {
      renderMessages(contactId);
    }
  }

  // 3. Update Query Params & Finalize
  if (window.selectedContact && window.selectedContact.id == contactId) {
    if (isGroupContact) {
      if (updateQuery) setGroupQuery(contactId);
    } else {
      if (updateQuery) setContactQuery(contactId);
      if (!obj.online && !obj.lastSeen) {
        zigrySocket.send({ type: "get_last_seen", userId: contactId });
      }
    }

    markMessagesAsSeen(contactId);
    localStorage.setItem("unread_" + contactId, "0");
    if (li) {
      const badge = li.querySelector(".unread");
      if (badge) badge.remove();
    }
    const input = document.getElementById("chat-input");
    if (input) input.focus();
    updateChatInputVisibility();
  }
}

// --- Group join/leave button logic ---
function showGroupLeaveButton(groupId) {
  let leaveBtn = document.getElementById("group-leave-btn");
  if (!leaveBtn) {
    leaveBtn = document.createElement("button");
    leaveBtn.id = "group-leave-btn";
    leaveBtn.className = "btn btn-outline-danger btn-sm ms-3 float-end";
    leaveBtn.innerText = "Leave";
    leaveBtn.setAttribute("data-id", groupId);
    leaveBtn.onclick = function () {
      zigry.confirm("Leave this group?").then((result) => {
        if (result === true) {
          leaveGroup(groupId);
        }
      });
    };
    document.getElementById("chatTitle").parentNode.appendChild(leaveBtn);
  } else {
    leaveBtn.onclick = function () {
      zigry.confirm("Leave this group?").then((result) => {
        if (result === true) {
          leaveGroup(groupId);
        }
      });
    };
    leaveBtn.style.display = "";
  }
}
function hideGroupLeaveButton() {
  let leaveBtn = document.getElementById("group-leave-btn");
  if (leaveBtn) leaveBtn.style.display = "none";
}

// --- Mark all as seen for direct chat ---
// function markMessagesAsSeen(contactId) {
//     const msgs = loadMessages(contactId);
//     let unseen = msgs.filter(m => m.from !== window.me.id && m.status !== "seen");
//     if (unseen.length > 0 && window.zigrySocket) {
//         // zigrySocket.send({
//         //     type: 'seen',
//         //     contact: contactId,
//         //     messageIds: unseen.map(m => m.id)
//         // });
//         zigrySocket.send({ type: "seen", contact: contactId });
//         unseen.forEach(m => m.status = "0");
//         saveMessages(contactId, msgs);
//         if (window.selectedContact && window.selectedContact.id === contactId) {
//             renderMessages(contactId);
//         }
//     }
// }

// --- Message renderers ---
async function renderMessages(
  contactId,
  scrollToBottom = true,
  scrollToPosition = null
) {
  const el = document.getElementById("chat-messages");
  const contact = window.contacts.find(
    (c) => String(c.id) === String(contactId)
  );
  const msgs = loadMessages(contactId);
  el.innerHTML = "";

  msgs.forEach((msg) => {
    const isSelf = (msg.from || msg.from_id) == window.me.id;
    let statusIcon = isSelf ? getMessageStatusIcon(msg) : "";
    const row = document.createElement("div");
    row.className = "d-flex mb-3 " + (isSelf ? "flex-row-reverse" : "");
    row.setAttribute("data-id", msg.id);
    const readableDate = msg.timestamp ? timeAgo(msg.timestamp) : "";

    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${isSelf ? "self" : ""}`;
    bubble.innerText = "Decrypting...";

    const msgWrapper = document.createElement("div");
    msgWrapper.appendChild(bubble);

    const meta = document.createElement("div");
    meta.className = "d-flex justify-content-between align-items-center mt-1";
    meta.style = "font-size: 0.75rem; color: #666;";
    meta.innerHTML = `
            <div class="msg-status-container text-end" style="flex:1;">${
              isSelf ? statusIcon : ""
            }</div>
            <span class="date ms-2" style="white-space: nowrap;">${readableDate}</span>
        `;

    msgWrapper.appendChild(meta);

    row.innerHTML = `${
      isSelf ? "" : `<a href="/${window.selectedContact?.username}" zigry-link>`
    }
            <img class="message-avatar me-2 ms-2" src="${
              isSelf
                ? window.me.avatar
                : window.selectedContact?.avatar || "/default.png"
            }" alts="avatar">
        </a>`;
    row.appendChild(msgWrapper);

    el.appendChild(row);

    // If message carries a file
    if (msg.file) {
      const f = msg.file;
      const mime = (f.mime || f.mimetype || "").toLowerCase();
      if (
        mime.startsWith("image/") ||
        (f.url && f.url.match(/\.(png|jpe?g|gif|webp)$/i))
      ) {
        bubble.innerHTML = `<img src="${f.url}" style="max-width:320px; max-height:320px; border-radius:6px;">`;
      } else if (
        mime.startsWith("video/") ||
        (f.url && f.url.match(/\.(mp4|webm|ogg)$/i))
      ) {
        bubble.innerHTML = `<video controls style="max-width:360px; max-height:360px;"><source src="${f.url}" type="${mime}">Your browser does not support video</video>`;
      } else {
        bubble.innerHTML = `<a href="${
          f.url
        }" target="_blank" rel="noopener noreferrer">${
          f.name || "Download file"
        }</a>`;
      }
      updateContactPreview(
        contactId,
        msg.text || f.name || "File",
        msg.timestamp,
        0
      );
    } else {
      // Use window.selectedContact for keys (like chat.old.js)
      const key = isSelf
        ? window.selectedContact?.msgkeyenc
        : window.selectedContact?.msgkeydec;

      if (key && msg.text) {
        ZigrySocket.decrypt(msg.text, key)
          .then((decryptedText) => {
            bubble.innerText = decryptedText;
            updateContactPreview(contactId, decryptedText, msg.timestamp, 0);
          })
          .catch(() => {
            bubble.innerText = msg.text; // Show original on failure
          });
      } else {
        bubble.innerText = msg.text || "";
      }
    }
  });

  // Fix: Defer scroll to next paint
  if (scrollToPosition !== null) {
    requestAnimationFrame(() => {
      el.scrollTop = scrollToPosition;
    });
  } else if (scrollToBottom) {
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight;
    });
  }
}

async function renderGroupMessages(
  groupId,
  scrollToBottom = true,
  scrollToPosition = null
) {
  const el = document.getElementById("chat-messages");
  const group = window.groups.find((g) => g.id == groupId);

  if (!group) {
    console.warn("renderGroupMessages: Group not found locally", groupId);
    // Ideally fetch group here, but for now prevent crash
    return;
  }
  const groupkey = group.groupkey;
  const msgs = loadGroupMessages(groupId);
  el.innerHTML = "";

  // 1. Decrypt all messages text in parallel before rendering
  const decryptedMsgs = await Promise.all(
    msgs.map(async (msg) => {
      let text = msg.text;
      // Assuming group messages also have 'text' and 'file' structure
      if (!msg.file && text) {
        try {
          text = await ZigrySocket.decrypt(msg.text, groupkey);
        } catch (e) {
          // Keep original text if decryption fails
        }
      }
      return { ...msg, decryptedText: text };
    })
  );

  decryptedMsgs.forEach((msg) => {
    const isSelf = String(msg.from) === String(window.me.id);
    let seenList = groupSeenBy[msg.id] ? Array.from(groupSeenBy[msg.id]) : [];
    let statusText = seenList.length ? `🗨️ Seen by ${seenList.length}` : "✓";
    let statusIcon = isSelf
      ? `<span class="msg-status text-muted" data-status="${statusText}">${statusText}</span>`
      : "";
    const readableDate = msg.timestamp ? timeAgo(msg.timestamp) : "";
    const row = document.createElement("div");
    row.className = "d-flex mb-3 " + (isSelf ? "flex-row-reverse" : "");

    row.innerHTML = `
            <img class="message-avatar me-2 ms-2" src="${
              isSelf ? window.me.avatar : group.avatar || "/default-group.png"
            }" alts="avatar">
            <div>
                <div class="chat-bubble ${isSelf ? "self" : ""}">
                    <div class="message-meta small ${
                      isSelf ? "text-end" : ""
                    } mb-1">
                        ${
                          !isSelf
                            ? `<span class="fw-bold me-2">${msg.name}</span>`
                            : ""
                        }
                    </div>
                    <span class="message-text"></span>
                </div>
                <div class="d-flex justify-content-between align-items-center mt-1" style="font-size: 0.75rem; color: #666;">
                    <span class="date ms-2" style="white-space: nowrap;">${readableDate}</span>
                    <div class="msg-status-container ${
                      isSelf ? "text-end ml-2" : ""
                    }" style="flex:1;">${statusIcon}</div>
                </div>
            </div>
        `;

    el.appendChild(row);

    const bubble = row.querySelector(".chat-bubble");
    const textSpan = row.querySelector(".message-text");

    // Check for file
    if (msg.file) {
      textSpan.innerText = msg.decryptedText || "File";
    } else {
      textSpan.innerText = msg.decryptedText;
    }
  });

  requestAnimationFrame(() => {
    if (scrollToPosition !== null) el.scrollTop = scrollToPosition;
    else if (scrollToBottom) el.scrollTop = el.scrollHeight;
  });
}

function getMessageStatusIcon(msg) {
  if (msg.from !== window.me.id) return "";
  const status = String(msg.status || "2"); // Default to '2' if undefined
  if (status === "0")
    return `<span class="msg-status text-primary" title="Seen" data-status="0">✓✓</span>`; // Blue for Seen
  if (status === "1")
    return `<span class="msg-status text-secondary" title="Delivered" data-status="1">✓✓</span>`; // Gray for Delivered
  if (status === "2")
    return `<span class="msg-status text-secondary" title="Sent" data-status="2">✓</span>`;
  if (status === "3") {
    return `<span class="msg-status text-danger" title="Failed to send" data-status="3" style="cursor:pointer;" onclick="retryMessage('${msg.id}')">☒</span>`;
  }
  return `<span class="msg-status text-danger" title="Unknown" data-status="99">?</span>`;
}

function retryMessage(messageId) {
  const contactId = window.selectedContact?.id;
  const msgs = loadMessages(contactId);
  const msg = msgs.find((m) => m.id === messageId);
  if (!msg) return;

  // Retry sending
  queueSend({
    type: "private",
    to: contactId,
    message: msg.text,
    id: messageId, // Reuse same ID for consistency
  });

  msg.status = "2"; // Set back to "sent"
  saveMessages(contactId, msgs);
  renderMessages(contactId); // Re-render chat
}

// Zigry Chat - Reload-safe, Accurate Group/Contact Selection, All UI/Meta Elements Intact, Fixed data-timestamp and Chat Rendering

// (all your existing setup ...)

function updateMessageStatus(messageId, newStatus, contactId = null) {
  // ✅ Fix: Allow updates for contacts not currently selected
  contactId = contactId || window.selectedContact?.id;
  if (!contactId) return;

  // 1. Update localStorage
  const msgs = loadMessages(contactId);
  const msg = msgs.find((m) => m.id === messageId);
  if (msg) {
    const priority = { 0: 3, 1: 2, 2: 1, 3: 0 };
    const current = msg.status || "2";
    if (priority[newStatus] > priority[current]) {
      msg.status = newStatus;
      saveMessages(contactId, msgs);
    }
  }

  // 2. Retry DOM update if element not found
  // Only attempt DOM update if we are actually viewing this chat
  if (!window.selectedContact || window.selectedContact.id != contactId) return;

  let retries = 5;
  const tryUpdate = () => {
    const msgEl = document.querySelector(`[data-id="${messageId}"]`);
    if (!msgEl) {
      if (retries-- > 0) return setTimeout(tryUpdate, 100);
      console.warn("Message DOM not found:", messageId);
      return;
    }

    const container = msgEl.querySelector(".msg-status-container");
    if (!container) return;
    const newIcon = getMessageStatusIcon({
      from: window.me.id,
      status: newStatus,
    });
    container.innerHTML = newIcon;
  };

  tryUpdate();
}

// --- Mark all as seen for direct chat ---
function markMessagesAsSeen(contactId) {
  const msgs = loadMessages(contactId);
  const unseen = msgs.filter(
    (m) => m.from !== window.me.id && m.status !== "0"
  );
  if (unseen.length > 0 && window.zigrySocket) {
    queueSend({
      type: "seen",
      contact: contactId, // ✅ no messageIds — instructs server to mark all from this contact as seen
    });
    unseen.forEach((m) => (m.status = "0"));
    if (window.selectedContact && window.selectedContact.id === contactId) {
      saveMessages(contactId, msgs);
      renderMessages(contactId);
    }
  }
}

// function updateMessageStatus(messageId, newStatus) {
//     const el = document.querySelector(`[data-id="${messageId}"]`);
//     if (!el) return;

//     const currentIcon = el.querySelector('.msg-status');
//     if (!currentIcon) return;

//     // Only update if newStatus is "higher"
//     const priority = { "0": 3, "1": 2, "2": 1, "3": 0 };
//     const currentStatus = currentIcon.dataset.status || "2";

//     if (priority[newStatus] <= priority[currentStatus]) return;

//     // Animate old out
//     currentIcon.classList.add('msg-status-updated');

//     setTimeout(() => {
//       currentIcon.outerHTML = getMessageStatusIcon({ from: window.me.id, status: newStatus });
//     }, 200);
//   }

// --- Chat form send ---
function initChatFeatures() {
  // --- On reload: select by query param (group/contact) and set all UI meta correctly ---
  (async function initialSelectFromQuery() {
    // Initialize filtered lists after window data is definitely loaded (Blade scripts run before this)
    window.filtered = window.contacts || [];
    window.filteredGroup = window.groups || [];

    const contactQueryId = getContactIdFromQuery();
    const groupQueryId = getGroupIdFromQuery();
    let obj = null;
    let isGroupContact = false;

    if (groupQueryId) {
      obj = (window.groups || []).find((g) => g.id === groupQueryId) || null;
      document.getElementById("tab-group")?.click();
      isGroupContact = true;
    } else if (contactQueryId) {
      obj =
        (window.contacts || []).find(
          (c) => c.id == contactQueryId || c.mobile == contactQueryId
        ) || null;
    }

    if (obj) {
      if (window.messages && window.messages.length > 0) {
        // Use server-provided messages
        if (isGroupContact) {
          saveGroupMessages(obj.id, window.messages);
        } else {
          saveMessages(obj.id, window.messages);
        }
        selectContactOrGroup(obj, isGroupContact, false);
      } else {
        await fetchAndLoadMessages(obj.id, isGroupContact); // Fallback
        selectContactOrGroup(obj, isGroupContact, false);
      }
    } else {
      window.selectedContact = null;
      updateChatInputVisibility();
    }

    // Update online count after initial load
    updateOnlineCount();
  })();

  // --- Tab switching ---
  document.getElementById("tab-direct")?.addEventListener("click", () => {
    document.getElementById("tab-direct").classList.add("active");
    document.getElementById("tab-group").classList.remove("active");

    const contactList = document.getElementById("contact-list");
    const groupList = document.getElementById("group-list");
    if (contactList) contactList.classList.remove("d-none");
    if (groupList) groupList.classList.add("d-none");
  });

  document.getElementById("tab-group")?.addEventListener("click", () => {
    document.getElementById("tab-group").classList.add("active");
    document.getElementById("tab-direct").classList.remove("active");

    const contactList = document.getElementById("contact-list");
    const groupList = document.getElementById("group-list");
    if (contactList) contactList.classList.add("d-none");
    if (groupList) groupList.classList.remove("d-none");
  });

  const form = document.getElementById("chat-form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const input = document.getElementById("chat-input");
    const text = (input?.value || "").trim();
    const previewContainer = document.getElementById("chat-file-preview");
    const previews = previewContainer
      ? Array.from(previewContainer.querySelectorAll(".file-preview"))
      : [];
    if (!text && previews.length === 0) return;
    if (!window.selectedContact) return;

    const isGroupChat = isGroup(window.selectedContact);
    const enckey = isGroupChat
      ? window.selectedContact.groupkey
      : window.selectedContact.msgkeyenc;
    // Send text message if present
    if (text) {
      try {
        const encryptedText = await ZigrySocket.encrypt(text, enckey);
        const now = Date.now();
        const msgObj = {
          id: `${window.me.id}-${now}-${Math.floor(Math.random() * 100000)}`,
          from: window.me.id,
          name: window.me.name,
          text: encryptedText,
          timestamp: now,
          status: "",
        };

        if (isGroupChat) {
          const groupId = String(window.selectedContact.id);
          if (!window.me.groups.includes(Number(groupId))) {
            alert("You must join this group to chat.");
          } else {
            queueSend({ type: "group", to: groupId, message: encryptedText });
            const msgs = loadGroupMessages(groupId);
            msgs.push(msgObj);
            saveGroupMessages(groupId, msgs);
            renderGroupMessages(groupId);
          }
        } else {
          queueSend({
            type: "private",
            to: String(window.selectedContact.id),
            message: encryptedText,
            id: msgObj.id,
          });
          const contactId = window.selectedContact.id;
          const msgs = loadMessages(contactId);
          msgs.push(msgObj);
          saveMessages(contactId, msgs);
          renderMessages(contactId, input);

          updateContactPreview(contactId, text, now, null, window.me.id);
          const contact = window.contacts.find((c) => c.id == contactId);
          if (contact) {
            contact.lastMsg = text;
            contact.lastMsgFromId = window.me.id;
            contact.timestamp = now;
          }
        }
        input.value = "";
        input.focus();
      } catch (err) {
        console.error("Failed to send text message", err);
      }
    }

    // Send any selected file previews
    if (previews.length > 0) {
      for (const item of previews) {
        const file = item._file;
        if (!file) {
          try {
            item.remove();
          } catch (e) {}
          continue;
        }
        const sendBtn = item.querySelector("button.btn-primary");
        const removeBtn = item.querySelector("button.btn-secondary");
        if (sendBtn) sendBtn.disabled = true;
        if (removeBtn) removeBtn.disabled = true;
        try {
          await uploadFileAndSend(file);
        } catch (err) {
          console.error("Failed to upload preview file", err);
          if (sendBtn) sendBtn.disabled = false;
          if (removeBtn) removeBtn.disabled = false;
          continue;
        }
        try {
          item.remove();
        } catch (e) {}
      }
    }
  });
}

/**
 * Unifies all chat dynamic element intializations.
 * Safe to call multiple times (on load and on SPA mount).
 */
function initChatApp() {
  initChatDecryption();
  initChatSearch();
  initChatFeatures();
}

document.addEventListener("DOMContentLoaded", initChatApp);

// Register Zigry hook for SPA navigation
if (typeof zigry !== "undefined" && zigry.use) {
  zigry.use("afterMount", initChatApp);
}

// --- Online/Offline & Last Seen Handlers (Direct DOM Updates) ---
zigrySocket.on("online_friends", (data) => {
  if (Array.isArray(data.friends)) {
    // 1. Update memory
    window.contacts.forEach((c) => {
      c.online =
        data.friends.includes(String(c.id)) || data.friends.includes(c.id);
    });

    // 2. Direct DOM update for all visible contacts
    window.contacts.forEach((c) => {
      updateOnlineStatusDOM(c.id, c.online);
    });

    updateOnlineCount();
  }
});

zigrySocket.on("user_online", (data) => {
  const contact = window.contacts.find(
    (c) => String(c.id) === String(data.userId)
  );
  if (contact) {
    contact.online = true;

    // Use direct DOM update instead of renderContacts
    updateOnlineStatusDOM(contact.id, true);

    // If searching or filtering logic requires re-sorting (online first),
    // you might still validly want to re-render, but for minimal flicker:
    // We avoid re-render. If user wants strictly sorted list, they can refresh or type in search.
    // However, if the user is NOT in the list (new contact coming online?), handle that:

    // Note: If you want online users to jump to top, you DO need to re-render or move DOM nodes.
    // The user requested removing JS rendering for status updates. So we won't move them.

    updateOnlineCount();

    // Update header if selected
    if (window.selectedContact && window.selectedContact.id == contact.id) {
      setChatStatus(contact);
      const indicator = document.getElementById("chatOnlineIndicator");
      if (indicator) indicator.classList.toggle("bg-success", true);
      if (indicator) indicator.classList.toggle("bg-danger", false);
    }
  }
});

zigrySocket.on("user_offline", (data) => {
  const contact = window.contacts.find(
    (c) => String(c.id) === String(data.userId)
  );
  if (contact) {
    contact.online = false;
    contact.lastSeen = data.lastSeen || Date.now();

    updateOnlineStatusDOM(contact.id, false);
    updateOnlineCount();

    if (window.selectedContact && window.selectedContact.id == contact.id) {
      setChatStatus(contact);
      const indicator = document.getElementById("chatOnlineIndicator");
      if (indicator) indicator.classList.toggle("bg-success", false);
      if (indicator) indicator.classList.toggle("bg-danger", true);
    }
  }
});

zigrySocket.on("last_seen", (data) => {
  const contact = window.contacts.find(
    (c) => String(c.id) === String(data.userId)
  );
  if (contact) {
    contact.online = false;
    contact.lastSeen = data.lastSeen;

    updateOnlineStatusDOM(contact.id, false);

    if (window.selectedContact && window.selectedContact.id == contact.id) {
      setChatStatus(contact);
    }
  }
});

// --- Incoming Message Handlers (Live Chat) ---
// Helper to fetch missing contact info on-demand
async function fetchContact(userId) {
  try {
    const formData = new URLSearchParams();
    formData.append("action", "get_contact");
    formData.append("userId", userId);

    const res = await fetch("/socket-chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${window.jwtToken}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest",
      },
      body: formData,
    });
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    return data.contact || null;
  } catch (e) {
    console.error("fetchContact failure:", e);
    return null;
  }
}

// NOTE: The main "private" handler is defined earlier in this file (around line 105)
// with deduplication, unread count tracking, and markMessagesAsSeen logic.
// The fetchContact function above is available for use by that handler if needed.

zigrySocket.on("group", (data) => {
  const groupId = data.room; // Server sends group ID as 'room'

  const msgs = loadGroupMessages(groupId);
  if (!msgs.find((m) => m.id === data.id)) {
    msgs.push({
      id: data.id,
      from: data.from,
      name: data.name,
      text: data.message,
      timestamp: data.timestamp,
      status: "2",
    });
    saveGroupMessages(groupId, msgs);
  }

  if (window.selectedContact && window.selectedContact.id == groupId) {
    renderGroupMessages(groupId);
  }
  // Update preview
  updateContactPreview(
    groupId,
    "Encrypted message",
    data.timestamp,
    null,
    data.from
  );
});

// Helper for direct DOM updates of online status
function updateOnlineStatusDOM(userId, isOnline) {
  const li = document.querySelector(`.contact-item[data-id="${userId}"]`);
  if (!li) return;

  // 1. Update data attribute
  li.setAttribute("data-online", isOnline ? "true" : "false");

  // 2. Update the dot
  const dot = li.querySelector(".online-dot");
  if (dot) {
    // Blade template uses style="display: block/none" for visibility
    // AND background color.
    // JS render (lines 841-849) sets background color.
    // Let's ensure we match the visual style of both.

    // dot.style.display = 'block'; // Always block, color changes?
    // Check blade: display: {{ $contact['online'] ? 'block' : 'none' }} (Older)
    // Check blade (recent edit in step 16): display: block; background: #10b981 or #dc2626

    dot.style.background = isOnline ? "#10b981" : "#dc2626";
  }
}

// --- Group logic ---
function joinGroup(groupId) {
  queueSend({ type: "join_group", group: String(groupId) });
}
function leaveGroup(groupId) {
  queueSend({ type: "leave_group", group: String(groupId) });
}

// --- Other logic (auto-join, socket events, previews, etc) ---
// You can keep your original socket event bindings and functions as in your previous code.

function updateChatInputVisibility() {
  const chatInputContainer = document.getElementById("chat-input-container");
  const chatMessages = document.getElementById("chat-messages");
  const emptyState = document.getElementById("emptyState");
  if (!chatInputContainer) return;
  if (!window.selectedContact) {
    chatInputContainer.style.display = "none";
    if (chatMessages) chatMessages.classList.add("d-none");
    if (emptyState) emptyState.classList.remove("d-none");
  } else {
    chatInputContainer.style.display = "block";
    if (chatMessages) chatMessages.classList.remove("d-none");
    if (emptyState) emptyState.classList.add("d-none");
  }
}

// --- Auto-join JWT groups after socket connect ---
// zigrySocket.onopen = function () {
//   zigrySocket.send({ type: "get_online_users" }); // ✅ request presence
//   zigrySocket.send({ type: "get_friends" }); // ✅ request friends
//   (window.me.groups || []).forEach((groupId) => {
//     joinGroup(groupId);
//   });
// };
zigrySocket.on("open", () => {
  // Send initial presence/fetch commands and flush any queued outgoing messages
  try {
    zigrySocket.send({ type: "presence" }); // ✅ Direct send to avoid method missing
    zigrySocket.send({ type: "online_friends" });
  } catch (e) {
    queueSend({ type: "online_friends" });
  }
  try {
    zigrySocket.send({ type: "get_friends" });
  } catch (e) {
    queueSend({ type: "get_friends" });
  }

  (window.me.groups || []).forEach((groupId) => {
    // joinGroup uses queueSend so it's safe
    joinGroup(groupId);
  });

  // Flush queued messages now that socket is open
  setTimeout(() => flushOutgoingQueue(), 50);

  toggleChatInput(true);
});

zigrySocket.on("close", () => {
  console.warn("[chat] Socket closed");
  toggleChatInput(false);
});

zigrySocket.on("error", () => {
  console.error("[chat] Socket error");
  toggleChatInput(false);
});

function toggleChatInput(enabled) {
  const input = document.getElementById("chat-input");
  const btn = document.querySelector("#chat-form button[type='submit']");
  if (input) {
    input.disabled = !enabled;
    input.placeholder = enabled ? "Type a message..." : "Connecting...";
  }
  if (btn) {
    btn.disabled = !enabled;
  }
}

function updateContactPreview(
  contactId,
  lastMsg,
  time,
  unread = null,
  fromId = null
) {
  const li = document.querySelector(`.contact-item[data-id="${contactId}"]`);
  if (!li) return;
  // Find the last message div and date span
  const lastMsgDiv = li.querySelector(".contact-last-msg");
  const lastTimeDiv = li.querySelector(".date"); // Note: .date class might not exist in new format? It's not in renderContacts.

  if (lastMsgDiv) {
    const prefix =
      fromId && String(fromId) === String(window.me.id) ? "You: " : "";
    lastMsgDiv.textContent = prefix + lastMsg;
  }

  if (lastTimeDiv) {
    lastTimeDiv.textContent = timeAgo(time);
    // lastTimeDiv.setAttribute('data-timestamp', time);
  }
  let badge = li.querySelector(".unread");
  if (unread === null)
    unread = Number(localStorage.getItem("unread_" + contactId)) || 0;
  if (unread > 0) {
    if (!badge) {
      badge = document.createElement("span");
      badge.className = "unread badge rounded-pill bg-primary mt-1";
      // This part assumes specific DOM structure which might differ from renderContacts
      // But unread-badge is used in renderContacts
      // Let's attach safely
      const rightSide = li.querySelector(".flex-shrink-0.ms-2");
      if (rightSide) rightSide.prepend(badge);
    }
    badge.textContent = unread;
  } else if (badge) {
    badge.remove();
  }
}
function openChat(chatId, type) {
  const isMobile = window.innerWidth < 768;
  const url = new URL(window.location);
  // alert(type)
  // if (type == 'group') {
  //     url.searchParams.delete('contact', chatId);
  //     url.searchParams.set('group', chatId);
  // } else {
  //     url.searchParams.delete('group', chatId);
  //     url.searchParams.set('contact', chatId);
  // }
  history.replaceState({}, "", url);
  if (isMobile) {
    document.getElementById("chatList").classList.remove("d-block");
    document.getElementById("chatList").classList.add("d-none");

    document.getElementById("messageBox").classList.remove("d-none");
    document.getElementById("messageBox").classList.add("d-block");
  }

  // Load chat content by ID
  // loadChatContent(chatId);
}

// ------- File upload + send helpers -------
async function uploadFileAndSend(file, isGroup = false) {
  const contactId = window.selectedContact?.id;
  if (!contactId) {
    alert("Select a contact or group before sending files");
    return;
  }

  const isGroupChat = Boolean(isGroup || isGroup(window.selectedContact));
  const enckey = isGroupChat
    ? window.selectedContact.groupkey
    : window.selectedContact.msgkeyenc;

  const msgId = `${window.me.id}-${Date.now()}-${Math.floor(
    Math.random() * 100000
  )}`;

  // Local echo with temporary object URL
  const localFile = {
    name: file.name,
    size: file.size,
    mime: file.type,
    url: URL.createObjectURL(file),
    local: true,
  };

  const msgObj = {
    id: msgId,
    from: window.me.id,
    name: window.me.name,
    text: "",
    file: localFile,
    timestamp: Date.now(),
    status: "sending",
  };

  // Save local echo
  try {
    const msgs = loadMessages(contactId);
    msgs.push(msgObj);
    saveMessages(contactId, msgs);
    if (window.selectedContact && window.selectedContact.id == contactId)
      renderMessages(contactId);
  } catch (e) {
    console.warn("uploadFileAndSend: failed local echo", e);
  }

  // Upload to server
  try {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("to", contactId);
    fd.append("type", isGroupChat ? "group" : "private");

    const res = await fetch("/api/upload", {
      method: "POST",
      body: fd,
      headers: {
        Authorization: `Bearer ${window.jwtToken}`,
      },
    });
    const data = await res.json();
    if (!res.ok || !data || !data.file) {
      throw new Error("Upload failed");
    }

    const serverFile = data.file;

    // Replace local file reference with server file info
    try {
      const msgs2 = loadMessages(contactId);
      const idx = msgs2.findIndex((m) => String(m.id) === String(msgId));
      if (idx !== -1) {
        msgs2[idx].file = serverFile;
        msgs2[idx].status = "";
        saveMessages(contactId, msgs2);
      }
    } catch (e) {}

    // Send socket message referencing uploaded file
    queueSend({
      type: isGroupChat ? "group" : "private",
      to: contactId,
      file: serverFile,
      id: msgId,
    });
  } catch (err) {
    console.error("File upload failed:", err);
    try {
      const msgs3 = loadMessages(contactId);
      const idx3 = msgs3.findIndex((m) => String(m.id) === String(msgId));
      if (idx3 !== -1) {
        msgs3[idx3].status = "failed";
        saveMessages(contactId, msgs3);
        if (window.selectedContact && window.selectedContact.id == contactId)
          renderMessages(contactId);
      }
    } catch (e) {}
  }
}

// Optional DOM hook: attach file input handler when DOM is ready
(function setupChatFileInput() {
  function handler(ev) {
    const files = ev.target.files;
    if (!files || !files.length) return;
    const previewContainer = document.getElementById("chat-file-preview");
    if (!previewContainer) {
      // fallback: upload immediately if no preview container
      Array.from(files).forEach((f) => uploadFileAndSend(f));
      ev.target.value = "";
      return;
    }

    Array.from(files).forEach((file) => {
      const id =
        "fp_" + Date.now() + "_" + Math.random().toString(36).slice(2, 8);
      const item = document.createElement("div");
      item.className = "file-preview d-flex align-items-center p-2 rounded";
      item.style =
        "background:#20222a;color:#fff;min-width:120px;max-width:220px;flex:0 0 auto;position:relative;";

      const thumb = document.createElement("div");
      thumb.style =
        "width:64px;height:64px;flex:0 0 64px;display:block;overflow:hidden;border-radius:6px;background:#111;display:flex;align-items:center;justify-content:center;margin-right:8px;";
      const info = document.createElement("div");
      info.style = "flex:1;overflow:hidden;";
      const name = document.createElement("div");
      name.style =
        "font-size:0.85em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;";
      name.textContent = file.name;
      const size = document.createElement("div");
      size.style = "font-size:0.75em;color:#9aa0b4;";
      size.textContent = ((file.size / 1024) | 0) + " KB";
      info.appendChild(name);
      info.appendChild(size);

      const actions = document.createElement("div");
      actions.style =
        "display:flex;flex-direction:column;gap:6px;margin-left:8px;";
      const sendBtn = document.createElement("button");
      sendBtn.className = "btn btn-sm btn-primary";
      sendBtn.type = "button";
      sendBtn.title = "Send file";
      sendBtn.textContent = "Send";
      const removeBtn = document.createElement("button");
      removeBtn.className = "btn btn-sm btn-secondary";
      removeBtn.type = "button";
      removeBtn.title = "Remove";
      removeBtn.textContent = "Remove";
      actions.appendChild(sendBtn);
      actions.appendChild(removeBtn);

      item.appendChild(thumb);
      item.appendChild(info);
      item.appendChild(actions);
      item.id = id;
      // keep reference to the File object for later send
      item._file = file;
      previewContainer.appendChild(item);

      // Render thumbnail for images/video if possible
      if (
        file.type.startsWith("image/") ||
        file.type.startsWith("video/") ||
        file.type.startsWith("audio/")
      ) {
        const reader = new FileReader();
        reader.onload = function (e) {
          if (file.type.startsWith("image/")) {
            thumb.innerHTML =
              '<img src="' +
              e.target.result +
              '" style="width:100%;height:100%;object-fit:cover;" />';
          } else if (file.type.startsWith("video/")) {
            thumb.innerHTML =
              '<video src="' +
              e.target.result +
              '" style="width:100%;height:100%;object-fit:cover;" muted></video>';
          } else if (file.type.startsWith("audio/")) {
            thumb.innerHTML =
              '<div style="padding:6px;color:#9aa0b4;">Audio</div>';
          }
        };
        reader.readAsDataURL(file);
      } else {
        thumb.innerHTML = '<div style="padding:6px;color:#9aa0b4;">File</div>';
      }

      // Wire actions
      sendBtn.addEventListener("click", () => {
        // disable buttons while uploading
        sendBtn.disabled = true;
        removeBtn.disabled = true;
        uploadFileAndSend(file)
          .then(() => {
            // remove preview after queued
            try {
              previewContainer.removeChild(item);
            } catch (e) {}
          })
          .catch(() => {
            sendBtn.disabled = false;
            removeBtn.disabled = false;
          });
      });

      removeBtn.addEventListener("click", () => {
        try {
          previewContainer.removeChild(item);
        } catch (e) {}
      });
    });

    ev.target.value = "";
  }

  function attach() {
    const el = document.getElementById("chat-file-input");
    if (el) el.addEventListener("change", handler);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attach);
  } else {
    attach();
  }
})();

// backToChatList is now defined in the Blade template with proper mobile handling

// Update online count badge
// Mobile toggle handlers
function backToChatList() {
  const messageBox = document.getElementById("messageBox");
  const sidebar = document.getElementById("chatList");
  if (window.innerWidth <= 768) {
    messageBox.classList.remove("active");
    sidebar.classList.remove("hidden");
  } else {
    const url = new URL(window.location);
    url.searchParams.delete("contact");
    url.searchParams.delete("group");
    window.history.replaceState({}, "", url);
    // Reset UI
    document.getElementById("emptyState").classList.remove("d-none");
    document.getElementById("chat-messages").classList.add("d-none");
    document.getElementById("chat-input-container").style.display = "none";
    document
      .querySelectorAll(".contact-item")
      .forEach((li) => li.classList.remove("active"));
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("chatList");
  sidebar.classList.toggle("hidden");
}

function showChatOnMobile() {
  if (window.innerWidth <= 768) {
    const messageBox = document.getElementById("messageBox");
    const sidebar = document.getElementById("chatList");
    messageBox.classList.add("active");
    sidebar.classList.add("hidden");
  }
}

// Select contact from PHP-rendered list
function selectContact(contact) {
  window.selectedContact = contact;

  // Update URL
  const url = new URL(window.location);
  url.searchParams.set("contact", contact.numericId || contact.id);
  url.searchParams.delete("group");
  window.history.replaceState({}, "", url);

  // Update UI
  document
    .querySelectorAll(".contact-item")
    .forEach((li) => li.classList.remove("active"));
  const li = document.querySelector(`.contact-item[data-id="${contact.id}"]`);
  if (li) li.classList.add("active");

  // Update header
  document.getElementById("chatTitle").innerText = contact.name;
  document.getElementById("chatAvatar").src = contact.avatar;
  document.getElementById("chatAvatarWrapper").style.display = "block";
  document
    .getElementById("chatOnlineIndicator")
    .classList.toggle("bg-success", contact.online);
  document
    .getElementById("chatOnlineIndicator")
    .classList.toggle("bg-danger", !contact.online);
  document.getElementById("chatStatus").innerText = contact.online
    ? "Online"
    : "";

  // Show chat area
  document.getElementById("emptyState").classList.add("d-none");
  document.getElementById("chat-messages").classList.remove("d-none");
  document.getElementById("chat-input-container").style.display = "block";

  // Show on mobile
  showChatOnMobile();

  // Clear unread badge
  if (li) {
    const badge = li.querySelector(".unread-badge");
    if (badge) badge.remove();
  }

  // Chat.js will handle message loading via socket events
  if (typeof selectContactOrGroup === "function") {
    selectContactOrGroup(contact, false, false);
  }
}

// Select group from PHP-rendered list
function selectGroup(group) {
  if (!group.joined) {
    if (typeof zigry !== "undefined" && zigry.confirm) {
      zigry.confirm("Join this group to start chatting?").then((result) => {
        if (result === true) joinGroup(group.id);
      });
    } else if (confirm("Join this group to start chatting?")) {
      joinGroup(group.id);
    }
    return;
  }

  window.selectedContact = group;

  // Update URL
  const url = new URL(window.location);
  url.searchParams.set("group", group.id);
  url.searchParams.delete("contact");
  window.history.replaceState({}, "", url);

  // Update UI
  document
    .querySelectorAll(".contact-item")
    .forEach((li) => li.classList.remove("active"));
  const li = document.querySelector(
    `.contact-item[data-id="${group.id}"][data-type="group"]`
  );
  if (li) li.classList.add("active");

  // Update header
  document.getElementById("chatTitle").innerText = group.name;
  document.getElementById("chatAvatar").src = group.avatar;
  document.getElementById("chatAvatarWrapper").style.display = "block";
  document.getElementById("chatStatus").innerText = "";

  // Show chat area
  document.getElementById("emptyState").classList.add("d-none");
  document.getElementById("chat-messages").classList.remove("d-none");
  document.getElementById("chat-input-container").style.display = "block";

  showChatOnMobile();

  if (typeof selectContactOrGroup === "function") {
    selectContactOrGroup(group, true, false);
  }
}

// Update online count badge
function updateOnlineCount() {
  const onlineContacts = document.querySelectorAll(
    '.contact-item[data-online="true"]'
  );
  const badge = document.getElementById("online-count");
  if (badge) badge.textContent = onlineContacts.length;
}

// Tab switching
document.getElementById("tab-direct")?.addEventListener("click", function () {
  this.classList.add("active");
  document.getElementById("tab-group")?.classList.remove("active");
  document.getElementById("contact-list")?.classList.remove("d-none");
  document.getElementById("group-list")?.classList.add("d-none");
});

document.getElementById("tab-group")?.addEventListener("click", function () {
  this.classList.add("active");
  document.getElementById("tab-direct")?.classList.remove("active");
  document.getElementById("group-list")?.classList.remove("d-none");
  document.getElementById("contact-list")?.classList.add("d-none");
});

// File input handler
document
  .getElementById("chat-file-btn")
  ?.addEventListener("click", function () {
    document.getElementById("chat-file-input")?.click();
  });

// Search functionality handled in chat.js

// Initialize online count on page load
document.addEventListener("DOMContentLoaded", updateOnlineCount);
