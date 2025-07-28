/**
 * Voice Communication Module for F1 Team Engineer HUD
 * Handles push-to-talk, voice recording, and conversation logging
 */

class VoiceCommunication {
    constructor(websocketClient, telemetryProcessor) {
        this.websocketClient = websocketClient;
        this.telemetryProcessor = telemetryProcessor;
        
        // Voice state
        this.isRecording = false;
        this.mediaRecorder = null;
        this.audioStream = null;
        this.audioContext = null;
        this.analyser = null;
        this.voiceLevel = 0;
        
        // UI elements
        this.pttButton = null;
        this.voiceStatus = null;
        this.voiceLevelFill = null;
        this.commLog = null;
        
        // Configuration
        this.pttKey = ' '; // Space bar default
        this.isKeyPressed = false;
        
        // Conversation history
        this.conversationHistory = [];
        
        this.init();
    }
    
    /**
     * Initialize voice communication
     */
    init() {
        // Try to find voice elements - they may not exist on all pages
        this.voiceStatus = document.getElementById('voice-status');
        this.voiceLevelFill = document.getElementById('voice-level');
        this.pttButton = document.getElementById('ptt-button');
        this.compactPttButton = document.getElementById('compact-ptt-button');
        this.commLog = document.getElementById('comm-log');
        this.commStatusBar = document.getElementById('comm-status-bar');
        this.commCount = document.getElementById('comm-count');
        this.commLastMessage = document.getElementById('comm-last-message');
        
        // PTT keybinding configuration
        this.pttKey = 'Space';
        this.isKeyPressed = false;
        
        // Check if we have the minimum required elements for voice functionality
        const hasMinimumElements = this.pttButton || this.compactPttButton;
        
        if (!hasMinimumElements) {
            console.log('[VoiceComm] Voice elements not found - voice functionality disabled');
            return;
        }
        
        this.setupAudio();
        this.setupEventListeners();
        this.setupCommunicationPopup();
        
        console.log('[VoiceComm] Voice communication initialized');
    }
    
    setupEventListeners() {
        // PTT Button events (original button)
        if (this.pttButton) {
            this.pttButton.addEventListener('mousedown', () => this.startRecording());
            this.pttButton.addEventListener('mouseup', () => this.stopRecording());
            this.pttButton.addEventListener('mouseleave', () => this.stopRecording());
            this.pttButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startRecording();
            });
            this.pttButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopRecording();
            });
        }
        
        // Compact PTT Button events
        if (this.compactPttButton) {
            this.compactPttButton.addEventListener('mousedown', () => this.startRecording());
            this.compactPttButton.addEventListener('mouseup', () => this.stopRecording());
            this.compactPttButton.addEventListener('mouseleave', () => this.stopRecording());
            this.compactPttButton.addEventListener('touchstart', (e) => {
                e.preventDefault();
                this.startRecording();
            });
            this.compactPttButton.addEventListener('touchend', (e) => {
                e.preventDefault();
                this.stopRecording();
            });
        }
        
        // Keyboard events for PTT (configurable key)
        document.addEventListener('keydown', (e) => {
            if (e.code === this.pttKey && !this.isKeyPressed) {
                e.preventDefault();
                this.isKeyPressed = true;
                this.startRecording();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            if (e.code === this.pttKey && this.isKeyPressed) {
                e.preventDefault();
                this.isKeyPressed = false;
                this.stopRecording();
            }
        });
        
        // Communication log controls
        const clearLogBtn = document.getElementById('clear-log');
        const exportLogBtn = document.getElementById('export-log');
        
        if (clearLogBtn) {
            clearLogBtn.addEventListener('click', () => this.clearCommunicationLog());
        }
        
        if (exportLogBtn) {
            exportLogBtn.addEventListener('click', () => this.exportCommunicationLog());
        }
        
        // WebSocket message handlers
        if (this.websocketClient) {
            this.websocketClient.on('voice_message', (data) => this.handleVoiceMessage(data));
            this.websocketClient.on('ai_response', (data) => this.handleAIResponse(data));
        }
    }
    
    async initializeAudio() {
        try {
            // Request microphone access
            this.audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                    sampleRate: 44100
                }
            });
            
            // Set up audio context for level monitoring
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.audioStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            source.connect(this.analyser);
            
            // Set up media recorder
            this.mediaRecorder = new MediaRecorder(this.audioStream, {
                mimeType: 'audio/webm;codecs=opus'
            });
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.sendVoiceData(event.data);
                }
            };
            
            this.updateVoiceStatus('READY', 'ready');
            console.log('[VoiceComm] Audio initialized successfully');
            
        } catch (error) {
            console.error('[VoiceComm] Failed to initialize audio:', error);
            this.updateVoiceStatus('MIC ERROR', 'error');
        }
    }
    
    startVoiceLevelMonitoring() {
        const updateLevel = () => {
            if (this.analyser && this.voiceLevelFill) {
                const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
                this.analyser.getByteFrequencyData(dataArray);
                
                // Calculate average volume
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i];
                }
                const average = sum / dataArray.length;
                const level = Math.min(100, (average / 255) * 100);
                
                this.voiceLevel = level;
                this.voiceLevelFill.style.width = `${level}%`;
            }
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }
    
    startRecording() {
        if (this.isRecording || !this.mediaRecorder) return;
        
        try {
            this.isRecording = true;
            this.mediaRecorder.start();
            
            // Update UI for both buttons
            if (this.pttButton) {
                this.pttButton.classList.add('active');
            }
            if (this.compactPttButton) {
                this.compactPttButton.classList.add('recording');
            }
            this.updateVoiceStatus('RECORDING', 'recording');
            
            // Add visual feedback
            const statusIndicator = this.voiceStatus.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.classList.add('recording');
            }
            
            console.log('[VoiceComm] Started recording');
            
        } catch (error) {
            console.error('[VoiceComm] Failed to start recording:', error);
            this.updateVoiceStatus('ERROR', 'error');
        }
    }
    
    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        try {
            this.isRecording = false;
            this.mediaRecorder.stop();
            
            // Update UI for both buttons
            if (this.pttButton) {
                this.pttButton.classList.remove('active');
            }
            if (this.compactPttButton) {
                this.compactPttButton.classList.remove('recording');
            }
            this.updateVoiceStatus('PROCESSING', 'ready');
            
            // Remove visual feedback
            const statusIndicator = this.voiceStatus.querySelector('.status-indicator');
            if (statusIndicator) {
                statusIndicator.classList.remove('recording');
            }
            
            console.log('[VoiceComm] Stopped recording');
            
        } catch (error) {
            console.error('[VoiceComm] Failed to stop recording:', error);
            this.updateVoiceStatus('ERROR', 'error');
        }
    }
    
    sendVoiceData(audioBlob) {
        console.log('[VoiceComm] Processing voice data...');
        this.updateVoiceStatus('PROCESSING', 'ready');
        
        // Add to conversation log
        this.addToConversationLog('ENGINEER', 'Voice message recorded', 'engineer');
        
        if (!this.websocketClient || !this.websocketClient.isConnected()) {
            console.warn('[VoiceComm] WebSocket not connected, using mock response');
            
            // Simulate processing time
            setTimeout(() => {
                this.simulateAIResponse();
            }, 1500);
            return;
        }
        
        // Convert blob to base64 for transmission
        const reader = new FileReader();
        reader.onload = () => {
            const base64Audio = reader.result.split(',')[1];
            
            const voiceMessage = {
                type: 'voice_input',
                data: {
                    audio: base64Audio,
                    format: 'webm',
                    timestamp: Date.now(),
                    source: 'team_engineer',
                    session_id: this.telemetryProcessor?.sessionData?.sessionId || 'unknown'
                }
            };
            
            this.websocketClient.send(voiceMessage);
            
            console.log('[VoiceComm] Voice data sent to backend');
            
            // Fallback to mock response if no response in 3 seconds
            setTimeout(() => {
                if (this.voiceStatus?.querySelector('span')?.textContent === 'PROCESSING') {
                    console.log('[VoiceComm] No backend response, using mock response');
                    this.simulateAIResponse();
                }
            }, 3000);
        };
        
        reader.readAsDataURL(audioBlob);
    }
    
    /**
     * Simulate AI response for testing
     */
    simulateAIResponse() {
        const responses = [
            {
                speaker: 'AI ENGINEER',
                message: 'Roger that. Tire temperatures look good. Consider reducing front wing by 1 click for better balance.',
                cssClass: 'engineer'
            },
            {
                speaker: 'AI STRATEGIST', 
                message: 'Copy. Pit window opens in 3 laps. Gap to P2 is manageable for undercut strategy.',
                cssClass: 'strategist'
            },
            {
                speaker: 'AI ENGINEER',
                message: 'Understood. Engine parameters are optimal. Fuel consumption is within target range.',
                cssClass: 'engineer'
            },
            {
                speaker: 'AI STRATEGIST',
                message: 'Acknowledged. Weather radar shows possible rain in 15 minutes. Consider intermediate tire strategy.',
                cssClass: 'strategist'
            }
        ];
        
        const response = responses[Math.floor(Math.random() * responses.length)];
        
        console.log('[VoiceComm] Simulating AI response:', response);
        
        // Add AI response to conversation log
        this.addToConversationLog(response.speaker, response.message, response.cssClass);
        
        // Simulate TTS playback (in a real implementation, this would play audio)
        this.updateVoiceStatus('AI RESPONDING', 'ready');
        
        setTimeout(() => {
            this.updateVoiceStatus('READY', 'ready');
        }, 2000);
    }
    
    /**
     * Setup communication popup functionality
     */
    setupCommunicationPopup() {
        // Create popup modal HTML
        this.createCommunicationPopup();
        
        // Add click handler to status bar
        if (this.commStatusBar) {
            this.commStatusBar.addEventListener('click', () => {
                this.showCommunicationPopup();
            });
        }
        
        // Initialize conversation log array
        this.conversationLog = [
            {
                timestamp: '13:45:23',
                speaker: 'DRIVER',
                message: 'How\'s the tire degradation looking? Feeling some understeer in sector 2.',
                cssClass: 'driver'
            },
            {
                timestamp: '13:45:28',
                speaker: 'AI ENGINEER',
                message: 'Tire temps are optimal. Recommend reducing front wing by 1 click for better balance.',
                cssClass: 'engineer'
            },
            {
                timestamp: '13:45:35',
                speaker: 'AI STRATEGIST',
                message: 'Pit window opens in 3 laps. Current gap to P2 is manageable for undercut.',
                cssClass: 'strategist'
            }
        ];
        
        this.updateStatusBar();
    }
    
    /**
     * Create communication popup modal
     */
    createCommunicationPopup() {
        const popupHTML = `
            <div class="comm-popup-overlay" id="comm-popup-overlay">
                <div class="comm-popup-modal">
                    <div class="comm-popup-header">
                        <div class="comm-popup-title">
                            <span>📻</span>
                            TEAM COMMUNICATION LOG
                        </div>
                        <div class="comm-popup-controls">
                            <button class="comm-popup-btn" id="comm-clear-btn">🗑️ Clear</button>
                            <button class="comm-popup-btn" id="comm-export-btn">💾 Export</button>
                            <button class="comm-popup-close" id="comm-popup-close">×</button>
                        </div>
                    </div>
                    <div class="comm-popup-content">
                        <div class="comm-popup-log" id="comm-popup-log">
                            <!-- Messages will be populated here -->
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', popupHTML);
        
        // Setup event listeners
        const overlay = document.getElementById('comm-popup-overlay');
        const closeBtn = document.getElementById('comm-popup-close');
        const clearBtn = document.getElementById('comm-clear-btn');
        const exportBtn = document.getElementById('comm-export-btn');
        
        // Close popup handlers
        closeBtn?.addEventListener('click', () => this.hideCommunicationPopup());
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hideCommunicationPopup();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay?.classList.contains('active')) {
                this.hideCommunicationPopup();
            }
        });
        
        // Clear and export handlers
        clearBtn?.addEventListener('click', () => this.clearCommunicationLog());
        exportBtn?.addEventListener('click', () => this.exportCommunicationLog());
    }
    
    /**
     * Show communication popup
     */
    showCommunicationPopup() {
        const overlay = document.getElementById('comm-popup-overlay');
        if (overlay) {
            overlay.classList.add('active');
            this.populatePopupLog();
        }
    }
    
    /**
     * Hide communication popup
     */
    hideCommunicationPopup() {
        const overlay = document.getElementById('comm-popup-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
    }
    
    /**
     * Populate popup with conversation log
     */
    populatePopupLog() {
        const popupLog = document.getElementById('comm-popup-log');
        if (!popupLog) return;
        
        popupLog.innerHTML = '';
        
        this.conversationLog.forEach(entry => {
            const entryElement = document.createElement('div');
            entryElement.className = `comm-entry ${entry.cssClass}`;
            entryElement.innerHTML = `
                <div class="comm-timestamp">${entry.timestamp}</div>
                <div class="comm-speaker">${entry.speaker}</div>
                <div class="comm-message">"${entry.message}"</div>
            `;
            popupLog.appendChild(entryElement);
        });
        
        // Scroll to bottom
        popupLog.scrollTop = popupLog.scrollHeight;
    }
    
    /**
     * Update compact radio status bar
     */
    updateCompactRadioStatus() {
        const radioCount = document.getElementById('radio-message-count');
        const radioLastMessage = document.getElementById('radio-last-message');
        
        if (radioCount) {
            radioCount.textContent = `${this.conversationLog.length} messages`;
        }
        
        if (radioLastMessage && this.conversationLog.length > 0) {
            const lastMessage = this.conversationLog[this.conversationLog.length - 1];
            const preview = lastMessage.message.length > 50 
                ? lastMessage.message.substring(0, 50) + '...'
                : lastMessage.message;
            
            radioLastMessage.innerHTML = `
                <span class="radio-speaker">${lastMessage.speaker}:</span>
                <span class="radio-preview">"${preview}"</span>
            `;
        }
    }
    
    /**
     * Update bottom messages panel with recent conversation
     */
    updateBottomMessagesPanel() {
        const messagesContainer = document.getElementById('bottom-messages-container');
        const messageCount = document.getElementById('bottom-message-count');
        
        if (messageCount) {
            messageCount.textContent = `${this.conversationLog.length} messages`;
        }
        
        if (!messagesContainer) return;
        
        messagesContainer.innerHTML = '';
        
        // Show most recent 10 messages in reverse order (newest first)
        const recentMessages = this.conversationLog.slice(-10).reverse();
        
        recentMessages.forEach(entry => {
            const messageItem = document.createElement('div');
            messageItem.className = 'message-item';
            messageItem.innerHTML = `
                <div class="message-time">${entry.timestamp}</div>
                <div class="message-speaker">${entry.speaker}</div>
                <div class="message-content">${entry.message}</div>
            `;
            messagesContainer.appendChild(messageItem);
        });
    }
    
    /**
     * Update status bar with latest message info
     */
    updateStatusBar() {
        if (this.commCount) {
            this.commCount.textContent = `${this.conversationLog.length} messages`;
        }
        
        if (this.commLastMessage && this.conversationLog.length > 0) {
            const lastMessage = this.conversationLog[this.conversationLog.length - 1];
            const preview = lastMessage.message.length > 40 
                ? lastMessage.message.substring(0, 40) + '...'
                : lastMessage.message;
            
            this.commLastMessage.innerHTML = `
                <span class="comm-speaker">${lastMessage.speaker}:</span>
                <span class="comm-preview">"${preview}"</span>
            `;
        }
    }
    
    /**
     * Clear communication log
     */
    clearCommunicationLog() {
        if (confirm('Clear all communication log entries?')) {
            this.conversationLog = [];
            this.updateStatusBar();
            this.populatePopupLog();
        }
    }
    
    /**
     * Export communication log
     */
    exportCommunicationLog() {
        const logData = this.conversationLog.map(entry => 
            `${entry.timestamp} - ${entry.speaker}: ${entry.message}`
        ).join('\n');
        
        const blob = new Blob([logData], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team-radio-log-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
    
    handleVoiceMessage(data) {
        console.log('[VoiceComm] Received voice message:', data);
        
        // Add to conversation log
        const speaker = data.source === 'driver' ? 'DRIVER' : 'TEAM';
        this.addToConversationLog(speaker, data.transcript || 'Voice message received', 'driver');
        
        // Play audio if available
        if (data.audio_url) {
            this.playAudioResponse(data.audio_url);
        }
    }
    
    handleAIResponse(data) {
        console.log('[VoiceComm] Received AI response:', data);
        
        // Determine AI type
        const aiType = data.type === 'strategy' ? 'AI STRATEGIST' : 'AI ENGINEER';
        const cssClass = data.type === 'strategy' ? 'strategist' : 'engineer';
        
        // Add to conversation log
        this.addToConversationLog(aiType, data.message, cssClass);
        
        // Play TTS audio if available
        if (data.audio_url) {
            this.playAudioResponse(data.audio_url);
        }
    }
    
    playAudioResponse(audioUrl) {
        const audio = new Audio(audioUrl);
        audio.volume = 0.8;
        audio.play().catch(error => {
            console.error('[VoiceComm] Failed to play audio response:', error);
        });
    }
    
    addToConversationLog(speaker, message, cssClass = 'driver') {
        const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false });
        
        // Add to conversation log array
        const logEntry = {
            timestamp,
            speaker,
            message,
            cssClass
        };
        
        this.conversationLog.push(logEntry);
        
        // Update all UI components
        this.updateStatusBar();
        this.updateCompactRadioStatus();
        this.updateBottomMessagesPanel();
        this.populatePopupLog();
        
        // If popup is open, update it
        const overlay = document.getElementById('comm-popup-overlay');
        if (overlay && overlay.classList.contains('active')) {
            this.populatePopupLog();
        }
        
        // Limit log entries (keep last 50)
        if (this.conversationLog.length > 50) {
            this.conversationLog = this.conversationLog.slice(-50);
        }
        
        console.log(`[VoiceComm] Added to conversation log: ${speaker}: ${message}`);
    }
    
    clearCommunicationLog() {
        if (this.commLog) {
            this.commLog.innerHTML = '';
            this.conversationHistory = [];
            console.log('[VoiceComm] Communication log cleared');
        }
    }
    
    exportCommunicationLog() {
        if (this.conversationHistory.length === 0) {
            alert('No communication history to export');
            return;
        }
        
        const logData = {
            session_id: this.telemetryProcessor?.sessionData?.sessionId || 'unknown',
            export_time: new Date().toISOString(),
            entries: this.conversationHistory
        };
        
        const blob = new Blob([JSON.stringify(logData, null, 2)], { 
            type: 'application/json' 
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `team_comm_log_${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('[VoiceComm] Communication log exported');
    }
    
    updateVoiceStatus(text, statusClass) {
        if (this.voiceStatus) {
            const statusText = this.voiceStatus.querySelector('span');
            const statusIndicator = this.voiceStatus.querySelector('.status-indicator');
            
            if (statusText) {
                statusText.textContent = text;
            }
            
            if (statusIndicator) {
                statusIndicator.className = `status-indicator ${statusClass}`;
            }
        }
    }
    
    // Public methods for external control
    setKeybinding(key) {
        this.pttKey = key;
        const keybindDisplay = this.pttButton?.querySelector('.ptt-keybind');
        if (keybindDisplay) {
            keybindDisplay.textContent = key.toUpperCase();
        }
    }
    
    getConversationHistory() {
        return this.conversationHistory;
    }
    
    isVoiceReady() {
        return this.audioStream && this.mediaRecorder && !this.isRecording;
    }
}

// Export for use in other modules
window.VoiceCommunication = VoiceCommunication;
