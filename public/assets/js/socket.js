class ZigrySocket {
  constructor(url, token) {
    this.baseUrl = url;
    this.token = token;
    this.socket = null;
    this.id = Math.floor(Math.random() * 1e9);
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.handlers = {};
    this.pingInterval = null;
    this.isManualClose = false;
    this.connecting = false;
    this.lastConnectAttempt = 0;
    this.minReconnectInterval = 800; // ms - throttle rapid connect attempts
    this.connect();
  }

  connect() {
    const now = Date.now();
    if (this.connecting) {
      return;
    }
    if (now - (this.lastConnectAttempt || 0) < this.minReconnectInterval) {
      const retryAfter =
        this.minReconnectInterval - (now - this.lastConnectAttempt);
      setTimeout(() => this.connect(), retryAfter + 5);
      return;
    }
    this.lastConnectAttempt = now;

    // prevent creating a new socket if an active one exists
    // prevent creating a new socket if an active one exists
    if (
      this.socket &&
      (this.socket.readyState === WebSocket.OPEN ||
        this.socket.readyState === WebSocket.CONNECTING)
    ) {
      return;
    }

    this.connecting = true;
    const token = this.token;
    if (token == "") {
      this.close();
      return;
    }
    const wsUrl = this.baseUrl;
    try {
      this.socket = new WebSocket(this.baseUrl, [token]);
    } catch (err) {
      this.connecting = false;
      this.tryReconnect();
      return;
    }
    this.socket.onopen = () => {
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.startPing();
      if (typeof this.handlers["open"] === "function") {
        this.handlers["open"]();
      }
    };

    this.socket.onmessage = (event) => {
      let data;
      try {
        const raw = event.data instanceof ArrayBuffer ? this.decode(event.data) : event.data;
        data = typeof raw === "string" ? JSON.parse(raw) : raw;
      } catch (e) {
        return;
      }

      if (data && data.type && this.handlers[data.type]) {
        this.handlers[data.type](data);
      } else if (this.handlers["message"]) {
        this.handlers["message"](data);
      }
    };

    this.socket.onclose = (event) => {
      this.stopPing();
      this.connecting = false;
      if (!this.isManualClose) {
        this.tryReconnect();
      }
      if (typeof this.handlers["close"] === "function") {
        this.handlers["close"](event);
      }
    };

    this.socket.onerror = (e) => {
      this.connecting = false;
      // Let onclose handle the reconnect
      if (typeof this.handlers["error"] === "function") {
        this.handlers["error"](e);
      }
      // If not already closing, close to trigger reconnect
      if (
        this.socket &&
        this.socket.readyState !== WebSocket.CLOSING &&
        this.socket.readyState !== WebSocket.CLOSED
      ) {
        this.socket.close();
      }
    };
  }

  startPing() {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      // Optionally, send an application-level ping
      // this.send({type: 'ping'});
    }, 10000);
  }

  stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  tryReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      const delay = Math.min(30000, Math.pow(2, this.reconnectAttempts) * 1000);
      this.reconnectAttempts++;
      setTimeout(() => {
        // double-check we didn't get a manual close or another instance
        if (this.isManualClose) {
          return;
        }
        this.connect();
      }, delay);
    } else {
      // Optionally, notify the user or emit an event that connection failed
      if (typeof this.handlers["reconnect_failed"] === "function") {
        this.handlers["reconnect_failed"]();
      }
    }
  }

  close() {
    this.isManualClose = true;
    this.stopPing();
    if (this.socket) {
      this.socket.close();
      // mark socket reference to avoid duplicate connect attempts
      this.socket = null;
    }
  }

  send(data) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      let encoded;
      if (typeof data === "object") {
        encoded = this.encode(JSON.stringify(data));
      } else {
        encoded = this.encode(data);
      }
      this.socket.send(encoded);
    }
  }

  encode(str) {
    return new TextEncoder().encode(str);
  }

  decode(buffer) {
    return new TextDecoder().decode(buffer);
  }

  static async encrypt(plainText, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(plainText);
    const cryptoKey = await this.importKey(key);

    const encrypted = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      enc
    );

    // Merge IV + encrypted data
    const combined = new Uint8Array(iv.byteLength + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.byteLength);

    return this.base64Encode(combined);
  }

  static async decrypt(encryptedBase64, key) {
    const data = this.base64Decode(encryptedBase64);
    const iv = data.slice(0, 12);
    const encrypted = data.slice(12);
    const cryptoKey = await this.importKey(key);

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      cryptoKey,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  }

  static async importKey(keyStr) {
    const keyData = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(keyStr)
    );
    return crypto.subtle.importKey("raw", keyData, { name: "AES-GCM" }, false, [
      "encrypt",
      "decrypt",
    ]);
  }

  static base64Encode(buffer) {
    return btoa(String.fromCharCode(...buffer));
  }

  static base64Decode(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  to(clientId, message) {
    this.send({ type: "private", to: clientId, message });
  }

  broadcast(message) {
    this.send({ type: "broadcast", message });
  }

  group(roomId, message) {
    this.send({ type: "group", to: roomId, message });
  }

  on(event, handler) {
    this.handlers[event] = handler;
  }

  off(event) {
    delete this.handlers[event];
  }
}
