/**
 * PROJECT:blackbox - WebSocket Client
 * Connects to BlackboxDriver backend for real-time telemetry streaming
 */

class BlackboxWebSocketClient {
    constructor(config = {}) {
        this.config = {
            serverUrl: config.serverUrl || 'ws://137.184.151.3:8766',
            apiKey: config.apiKey || '',
            reconnectInterval: config.reconnectInterval || 3000,
            maxReconnectAttempts: config.maxReconnectAttempts || 10,
            heartbeatInterval: config.heartbeatInterval || 30000,
            ...config
        };
        
        this.ws = null;
        this.isConnected = false;
        this.reconnectAttempts = 0;
        this.reconnectTimer = null;
        this.heartbeatTimer = null;
        this.messageHandlers = new Map();
        this.connectionCallbacks = [];
        
        // Bind methods
        this.connect = this.connect.bind(this);
        this.disconnect = this.disconnect.bind(this);
        this.send = this.send.bind(this);
        this.onMessage = this.onMessage.bind(this);
        this.onOpen = this.onOpen.bind(this);
        this.onClose = this.onClose.bind(this);
        this.onError = this.onError.bind(this);
        
        console.log('[WebSocket] BlackboxWebSocketClient initialized');
    }
    
    /**
     * Connect to the BlackboxDriver backend
     */
    connect() {
        if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
            console.log('[WebSocket] Already connected or connecting');
            return;
        }
        
        try {
            console.log(`[WebSocket] Connecting to ${this.config.serverUrl}...`);
            
            // Create WebSocket connection with authentication
            const wsUrl = new URL(this.config.serverUrl);
            if (this.config.apiKey) {
                wsUrl.searchParams.set('auth', this.config.apiKey);
            }
            
            this.ws = new WebSocket(wsUrl.toString());
            
            // Set up event listeners
            this.ws.onopen = this.onOpen;
            this.ws.onmessage = this.onMessage;
            this.ws.onclose = this.onClose;
            this.ws.onerror = this.onError;
            
            // Connection timeout
            setTimeout(() => {
                if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
                    console.warn('[WebSocket] Connection timeout');
                    this.ws.close();
                }
            }, 10000);
            
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            this.scheduleReconnect();
        }
    }
    
    /**
     * Disconnect from the backend
     */
    disconnect() {
        console.log('[WebSocket] Disconnecting...');
        
        this.isConnected = false;
        this.clearTimers();
        
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onclose = null;
            this.ws.onerror = null;
            
            if (this.ws.readyState === WebSocket.OPEN) {
                this.ws.close(1000, 'Client disconnect');
            }
            this.ws = null;
        }
        
        this.notifyConnectionChange('disconnected');
    }
    
    /**
     * Send message to backend
     */
    send(type, data = {}) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
            console.warn('[WebSocket] Cannot send message - not connected');
            return false;
        }
        
        try {
            const message = {
                type,
                timestamp: Date.now(),
                data
            };
            
            this.ws.send(JSON.stringify(message));
            console.log(`[WebSocket] Sent message: ${type}`);
            return true;
        } catch (error) {
            console.error('[WebSocket] Send error:', error);
            return false;
        }
    }
    
    /**
     * Handle incoming messages
     */
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            const { type, data, timestamp } = message;
            
            console.log(`[WebSocket] Received: ${type}`);
            
            // Handle system messages
            if (type === 'ping') {
                this.send('pong', { timestamp });
                return;
            }
            
            if (type === 'pong') {
                console.log('[WebSocket] Heartbeat acknowledged');
                return;
            }
            
            // Route message to handlers
            if (this.messageHandlers.has(type)) {
                const handlers = this.messageHandlers.get(type);
                handlers.forEach(handler => {
                    try {
                        handler(data, timestamp);
                    } catch (error) {
                        console.error(`[WebSocket] Handler error for ${type}:`, error);
                    }
                });
            } else {
                console.warn(`[WebSocket] No handler for message type: ${type}`);
            }
            
        } catch (error) {
            console.error('[WebSocket] Message parsing error:', error);
        }
    }
    
    /**
     * Handle connection open
     */
    onOpen(event) {
        console.log('[WebSocket] Connected successfully');
        
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.clearTimers();
        
        // Start heartbeat
        this.startHeartbeat();
        
        // Send authentication if API key provided
        if (this.config.apiKey) {
            this.send('auth', { apiKey: this.config.apiKey });
        }
        
        // Request initial data
        this.send('subscribe', { 
            channels: ['telemetry', 'session', 'timing', 'strategy'] 
        });
        
        this.notifyConnectionChange('connected');
    }
    
    /**
     * Handle connection close
     */
    onClose(event) {
        console.log(`[WebSocket] Connection closed: ${event.code} - ${event.reason}`);
        
        this.isConnected = false;
        this.clearTimers();
        
        // Don't reconnect if it was a clean close
        if (event.code !== 1000) {
            this.scheduleReconnect();
        }
        
        this.notifyConnectionChange('disconnected', event.reason);
    }
    
    /**
     * Handle connection error
     */
    onError(event) {
        console.error('[WebSocket] Connection error:', event);
        this.notifyConnectionChange('error', 'Connection error');
    }
    
    /**
     * Schedule reconnection attempt
     */
    scheduleReconnect() {
        if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
            console.error('[WebSocket] Max reconnection attempts reached');
            this.notifyConnectionChange('failed', 'Max reconnection attempts reached');
            return;
        }
        
        this.reconnectAttempts++;
        const delay = Math.min(this.config.reconnectInterval * this.reconnectAttempts, 30000);
        
        console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
        
        this.reconnectTimer = setTimeout(() => {
            this.connect();
        }, delay);
        
        this.notifyConnectionChange('reconnecting', `Attempt ${this.reconnectAttempts}`);
    }
    
    /**
     * Start heartbeat to keep connection alive
     */
    startHeartbeat() {
        this.heartbeatTimer = setInterval(() => {
            if (this.isConnected) {
                this.send('ping', { timestamp: Date.now() });
            }
        }, this.config.heartbeatInterval);
    }
    
    /**
     * Clear all timers
     */
    clearTimers() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = null;
        }
    }
    
    /**
     * Register message handler
     */
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
        
        console.log(`[WebSocket] Registered handler for: ${messageType}`);
    }
    
    /**
     * Remove message handler
     */
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index > -1) {
                handlers.splice(index, 1);
            }
        }
    }
    
    /**
     * Register connection status callback
     */
    onConnectionChange(callback) {
        this.connectionCallbacks.push(callback);
    }
    
    /**
     * Notify connection status change
     */
    notifyConnectionChange(status, details = '') {
        console.log(`[WebSocket] Connection status: ${status} ${details}`);
        
        this.connectionCallbacks.forEach(callback => {
            try {
                callback(status, details);
            } catch (error) {
                console.error('[WebSocket] Connection callback error:', error);
            }
        });
    }
    
    /**
     * Get connection status
     */
    getStatus() {
        if (!this.ws) return 'disconnected';
        
        switch (this.ws.readyState) {
            case WebSocket.CONNECTING: return 'connecting';
            case WebSocket.OPEN: return 'connected';
            case WebSocket.CLOSING: return 'closing';
            case WebSocket.CLOSED: return 'disconnected';
            default: return 'unknown';
        }
    }
    
    /**
     * Request specific telemetry data
     */
    requestTelemetry(categories = []) {
        return this.send('request_telemetry', { categories });
    }
    
    /**
     * Update subscription channels
     */
    updateSubscription(channels = []) {
        return this.send('subscribe', { channels });
    }
    
    /**
     * Send voice command
     */
    sendVoiceCommand(command, metadata = {}) {
        return this.send('voice_command', { command, metadata });
    }
    
    /**
     * Request strategy update
     */
    requestStrategy(context = {}) {
        return this.send('request_strategy', { context });
    }
}

// Export for use in other modules
window.BlackboxWebSocketClient = BlackboxWebSocketClient;
