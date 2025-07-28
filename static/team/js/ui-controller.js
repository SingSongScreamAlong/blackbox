/**
 * PROJECT:blackbox - UI Controller
 * Main controller for F1 Team Engineer HUD interface
 */

class UIController {
    constructor() {
        this.wsClient = null;
        this.telemetryProcessor = null;
        this.trackMap = null;
        
        // UI elements
        this.elements = {};
        this.panels = {};
        this.charts = {};
        
        // State
        this.isConnected = false;
        this.currentView = 'overview';
        this.updateInterval = null;
        
        // Initialize
        this.initializeElements();
        this.setupEventListeners();
        this.initializeModules();
        this.startUpdateLoop();
        
        console.log('[UI] UIController initialized');
    }
    
    /**
     * Initialize UI elements
     */
    initializeElements() {
        // Connection status
        this.elements.connectionStatus = document.getElementById('connection-status');
        this.elements.connectionIndicator = document.querySelector('.connection-indicator');
        
        // Vehicle data elements (sidebar)
        this.elements.speed = document.getElementById('speed-value');
        this.elements.gear = document.getElementById('gear-value');
        this.elements.rpm = document.getElementById('rpm-value');
        this.elements.throttle = document.getElementById('throttle-value');
        this.elements.brake = document.getElementById('brake-value');
        
        // Main large telemetry displays
        this.elements.mainSpeed = document.getElementById('main-speed-value');
        this.elements.mainRpm = document.getElementById('main-rpm-value');
        this.elements.mainGear = document.getElementById('main-gear-value');
        this.elements.mainThrottle = document.getElementById('main-throttle-value');
        this.elements.engineTemp = document.getElementById('engine-temp-value');
        this.elements.oilPressure = document.getElementById('oil-pressure-value');
        this.elements.boostLevel = document.getElementById('boost-level-value');
        
        // Fuel data
        this.elements.fuelLevel = document.getElementById('fuel-level-value');
        this.elements.fuelUsage = document.getElementById('fuel-usage-value');
        this.elements.estimatedLaps = document.getElementById('estimated-laps-value');
        this.elements.fuelBar = document.querySelector('.fuel-bar-fill');
        
        // Tire data
        this.elements.tireTemps = {
            fl: document.getElementById('tire-temp-fl'),
            fr: document.getElementById('tire-temp-fr'),
            rl: document.getElementById('tire-temp-rl'),
            rr: document.getElementById('tire-temp-rr')
        };
        this.elements.tirePressures = {
            fl: document.getElementById('tire-pressure-fl'),
            fr: document.getElementById('tire-pressure-fr'),
            rl: document.getElementById('tire-pressure-rl'),
            rr: document.getElementById('tire-pressure-rr')
        };
        this.elements.tireWear = {
            fl: document.getElementById('tire-wear-fl'),
            fr: document.getElementById('tire-wear-fr'),
            rl: document.getElementById('tire-wear-rl'),
            rr: document.getElementById('tire-wear-rr')
        };
        
        // Timing data (sidebar)
        this.elements.currentLap = document.getElementById('current-lap-value');
        this.elements.lastLapTime = document.getElementById('last-lap-value');
        this.elements.bestLapTime = document.getElementById('best-lap-value');
        this.elements.deltaTime = document.getElementById('delta-value');
        this.elements.position = document.getElementById('position-value');
        this.elements.gapAhead = document.getElementById('gap-ahead-value');
        this.elements.gapBehind = document.getElementById('gap-behind-value');
        
        // Main race info displays
        this.elements.mainPosition = document.getElementById('main-position-value');
        this.elements.mainCurrentLap = document.getElementById('main-current-lap');
        this.elements.mainLastLap = document.getElementById('main-last-lap');
        this.elements.mainBestLap = document.getElementById('main-best-lap');
        this.elements.mainDelta = document.getElementById('main-delta');
        this.elements.mainGapAhead = document.getElementById('main-gap-ahead');
        this.elements.mainGapBehind = document.getElementById('main-gap-behind');
        this.elements.mainSessionType = document.getElementById('main-session-type');
        
        // Session info
        this.elements.sessionType = document.getElementById('session-type');
        this.elements.timeRemaining = document.getElementById('time-remaining');
        this.elements.flagStatus = document.getElementById('flag-status');
        
        // AI Strategy
        this.elements.aiSuggestions = document.getElementById('ai-suggestions');
        
        // Extended telemetry
        this.elements.extendedTelemetry = document.getElementById('extended-telemetry-content');
        
        // Panel controls
        this.elements.panelControls = document.querySelectorAll('.panel-control');
        this.elements.viewButtons = document.querySelectorAll('.view-btn');
        
        console.log('[UI] Elements initialized');
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Panel controls
        this.elements.panelControls.forEach(control => {
            control.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                const panel = e.target.closest('.panel').id;
                this.handlePanelControl(panel, action);
            });
        });
        
        // View buttons
        this.elements.viewButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            this.handleKeyboardShortcut(e);
        });
        
        // Window resize
        window.addEventListener('resize', () => {
            this.handleResize();
        });
        
        console.log('[UI] Event listeners setup');
    }
    
    /**
     * Initialize modules
     */
    initializeModules() {
        // Initialize WebSocket client
        this.wsClient = new BlackboxWebSocketClient({
            serverUrl: 'ws://137.184.151.3:8766',
            apiKey: '', // Will be set from config
            reconnectInterval: 3000,
            maxReconnectAttempts: 10
        });
        
        // Setup WebSocket event handlers
        this.wsClient.onConnectionChange((status, details) => {
            this.updateConnectionStatus(status, details);
        });
        
        this.wsClient.on('telemetry', (data, timestamp) => {
            this.telemetryProcessor.processTelemetryData(data, timestamp);
        });
        
        this.wsClient.on('session', (data) => {
            this.updateSessionInfo(data);
        });
        
        this.wsClient.on('timing', (data) => {
            this.updateTimingInfo(data);
        });
        
        this.wsClient.on('strategy', (data) => {
            this.updateStrategyInfo(data);
        });
        
        // Initialize voice communication
        this.voiceComm = new VoiceCommunication(this.wsClient, this.telemetryProcessor);
        
        console.log('[UI] All modules initialized');
        
        // Start demo mode for development
        this.startDemoMode();
        
        console.log('[UI] Modules initialized');
    }
    
    /**
     * Start update loop
     */
    startUpdateLoop() {
        this.updateInterval = setInterval(() => {
            this.updateUI();
        }, 100); // 10 FPS UI updates
        
        console.log('[UI] Update loop started');
    }
    
    /**
     * Update connection status
     */
    updateConnectionStatus(status, details) {
        this.isConnected = status === 'connected';
        
        // Update status text
        this.elements.connectionStatus.textContent = status.toUpperCase();
        if (details) {
            this.elements.connectionStatus.textContent += ` - ${details}`;
        }
        
        // Update indicator color
        this.elements.connectionIndicator.className = 'connection-indicator';
        if (status === 'connected') {
            this.elements.connectionIndicator.classList.add('connected');
        } else if (status === 'connecting' || status === 'reconnecting') {
            this.elements.connectionIndicator.classList.add('connecting');
        } else {
            this.elements.connectionIndicator.classList.add('disconnected');
        }
        
        console.log(`[UI] Connection status: ${status}`);
    }
    
    /**
     * Update telemetry display
     */
    updateTelemetryDisplay(data, history) {
        // Vehicle performance (sidebar)
        if (this.elements.speed) this.elements.speed.textContent = Math.round(data.speed);
        if (this.elements.gear) this.elements.gear.textContent = data.gear;
        if (this.elements.rpm) this.elements.rpm.textContent = Math.round(data.rpm);
        if (this.elements.throttle) this.elements.throttle.textContent = Math.round(data.throttle);
        if (this.elements.brake) this.elements.brake.textContent = Math.round(data.brake);
        
        // Main large telemetry displays
        if (this.elements.mainSpeed) this.elements.mainSpeed.textContent = Math.round(data.speed);
        if (this.elements.mainRpm) this.elements.mainRpm.textContent = Math.round(data.rpm);
        if (this.elements.mainGear) this.elements.mainGear.textContent = data.gear;
        if (this.elements.mainThrottle) this.elements.mainThrottle.textContent = Math.round(data.throttle);
        
        // Engine data
        this.elements.engineTemp.textContent = Math.round(data.engineTemp);
        this.elements.oilPressure.textContent = Math.round(data.oilPressure);
        this.elements.boostLevel.textContent = data.boostLevel.toFixed(1);
        
        // Fuel data
        this.elements.fuelLevel.textContent = data.fuelLevel.toFixed(1);
        this.elements.fuelUsage.textContent = data.fuelUsagePerLap.toFixed(2);
        this.elements.estimatedLaps.textContent = data.estimatedLapsRemaining.toFixed(1);
        
        // Update fuel bar
        const fuelPercentage = (data.fuelLevel / data.fuelCapacity) * 100;
        this.elements.fuelBar.style.width = `${fuelPercentage}%`;
        
        // Color code fuel bar
        if (fuelPercentage < 20) {
            this.elements.fuelBar.style.backgroundColor = '#f85149';
        } else if (fuelPercentage < 40) {
            this.elements.fuelBar.style.backgroundColor = '#ffc107';
        } else {
            this.elements.fuelBar.style.backgroundColor = '#238636';
        }
        
        // Tire data
        Object.keys(data.tireTemps).forEach(tire => {
            if (this.elements.tireTemps[tire]) {
                this.elements.tireTemps[tire].textContent = Math.round(data.tireTemps[tire]);
                
                // Color code tire temperatures
                const temp = data.tireTemps[tire];
                let color = '#58a6ff'; // Normal
                if (temp > 100) color = '#f85149'; // Hot
                else if (temp > 90) color = '#ffc107'; // Warm
                else if (temp < 70) color = '#79c0ff'; // Cold
                
                this.elements.tireTemps[tire].style.color = color;
            }
            
            if (this.elements.tirePressures[tire]) {
                this.elements.tirePressures[tire].textContent = data.tirePressures[tire].toFixed(1);
            }
            
            if (this.elements.tireWear[tire]) {
                this.elements.tireWear[tire].textContent = Math.round(data.tireWear[tire]);
            }
        });
        
        // Timing data
        this.elements.currentLap.textContent = data.currentLap;
        this.elements.lastLapTime.textContent = this.telemetryProcessor.formatTime(data.lastLapTime);
        this.elements.bestLapTime.textContent = this.telemetryProcessor.formatTime(data.bestLapTime);
        this.elements.deltaTime.textContent = this.telemetryProcessor.formatDelta(data.deltaToOptimal);
        
        // Color code delta
        if (data.deltaToOptimal < 0) {
            this.elements.deltaTime.style.color = '#238636'; // Green for faster
        } else {
            this.elements.deltaTime.style.color = '#f85149'; // Red for slower
        }
        
        // Position data (sidebar)
        if (this.elements.position) this.elements.position.textContent = this.telemetryProcessor.getPositionSuffix(data.position);
        if (this.elements.gapAhead) this.elements.gapAhead.textContent = data.gapAhead > 0 ? `+${data.gapAhead.toFixed(3)}` : '-';
        if (this.elements.gapBehind) this.elements.gapBehind.textContent = data.gapBehind > 0 ? `-${data.gapBehind.toFixed(3)}` : '-';
        
        // Main race info displays
        if (this.elements.mainPosition) this.elements.mainPosition.textContent = this.telemetryProcessor.getPositionSuffix(data.position);
        if (this.elements.mainCurrentLap) this.elements.mainCurrentLap.textContent = data.currentLap;
        if (this.elements.mainLastLap) this.elements.mainLastLap.textContent = this.telemetryProcessor.formatTime(data.lastLapTime);
        if (this.elements.mainBestLap) this.elements.mainBestLap.textContent = this.telemetryProcessor.formatTime(data.bestLapTime);
        if (this.elements.mainDelta) {
            this.elements.mainDelta.textContent = this.telemetryProcessor.formatDelta(data.deltaToOptimal);
            // Color code delta
            if (data.deltaToOptimal < 0) {
                this.elements.mainDelta.style.color = '#238636'; // Green for faster
            } else {
                this.elements.mainDelta.style.color = '#f85149'; // Red for slower
            }
        }
        if (this.elements.mainGapAhead) this.elements.mainGapAhead.textContent = data.gapAhead > 0 ? `+${data.gapAhead.toFixed(3)}` : '-';
        if (this.elements.mainGapBehind) this.elements.mainGapBehind.textContent = data.gapBehind > 0 ? `-${data.gapBehind.toFixed(3)}` : '-';
        if (this.elements.mainSessionType) this.elements.mainSessionType.textContent = data.sessionType || 'PRACTICE';
        
        // Update track map car position
        if (this.trackMap && data.positionX !== undefined && data.positionY !== undefined) {
            // Convert world coordinates to track coordinates (simplified)
            const trackX = (data.positionX % 1000) / 1000;
            const trackY = (data.positionZ % 1000) / 1000;
            this.trackMap.updateCarPosition('player', trackX, trackY, 0, true);
        }
        
        // Update AI suggestions
        this.updateAISuggestions(this.telemetryProcessor.getAISuggestions());
    }
    
    /**
     * Update AI suggestions display
     */
    updateAISuggestions(suggestions) {
        this.elements.aiSuggestions.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const suggestionEl = document.createElement('div');
            suggestionEl.className = 'ai-suggestion';
            suggestionEl.innerHTML = `
                <div class="suggestion-priority ${suggestion.type}">${suggestion.priority}</div>
                <div class="suggestion-text">${suggestion.text}</div>
                <div class="suggestion-gain">${suggestion.gain}</div>
            `;
            this.elements.aiSuggestions.appendChild(suggestionEl);
        });
    }
    
    /**
     * Update session info
     */
    updateSessionInfo(data) {
        if (data.sessionType) {
            this.elements.sessionType.textContent = data.sessionType;
        }
        
        if (data.timeRemaining) {
            this.elements.timeRemaining.textContent = this.formatSessionTime(data.timeRemaining);
        }
        
        if (data.flagStatus) {
            this.elements.flagStatus.textContent = data.flagStatus;
            this.elements.flagStatus.className = `flag-status ${data.flagStatus.toLowerCase()}`;
        }
    }
    
    /**
     * Update timing info
     */
    updateTimingInfo(data) {
        // Handle timing-specific updates
        console.log('[UI] Timing info updated:', data);
    }
    
    /**
     * Update strategy info
     */
    updateStrategyInfo(data) {
        // Handle strategy-specific updates
        console.log('[UI] Strategy info updated:', data);
    }
    
    /**
     * Handle panel controls
     */
    handlePanelControl(panel, action) {
        console.log(`[UI] Panel control: ${panel} - ${action}`);
        
        switch (action) {
            case 'minimize':
                this.minimizePanel(panel);
                break;
            case 'maximize':
                this.maximizePanel(panel);
                break;
            case 'settings':
                this.showPanelSettings(panel);
                break;
            case 'refresh':
                this.refreshPanel(panel);
                break;
        }
    }
    
    /**
     * Setup event listeners
     */
    setupEventListeners() {
        console.log('[UI] Setting up event listeners...');
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            switch(e.key) {
                case '1':
                    this.switchView('overview');
                    break;
                case '2':
                    this.switchView('telemetry');
                    break;
                case '3':
                    this.switchView('strategy');
                    break;
                case '4':
                    this.switchView('analysis');
                    break;
                case 'r':
                case 'R':
                    this.refreshData();
                    break;
            }
        });
        
        // View control buttons
        const viewButtons = document.querySelectorAll('.view-btn');
        viewButtons.forEach(button => {
            button.addEventListener('click', () => {
                const view = button.dataset.view;
                this.switchView(view);
            });
        });
        
        // Panel control buttons
        this.setupPanelButtons();
        
        // Simple test - add click handlers directly
        this.addDirectButtonHandlers();
        
        // Communication log buttons
        this.setupCommunicationButtons();
        
        // Window resize handler
        window.addEventListener('resize', () => {
            if (this.trackMap) {
                this.trackMap.handleResize();
            }
        });
    }
    
    /**
     * Setup panel control buttons
     */
    setupPanelButtons() {
        // Get all control buttons in panels
        const controlButtons = document.querySelectorAll('.control-btn');
        
        controlButtons.forEach(button => {
            // Add tooltip based on button content
            const icon = button.textContent.trim();
            let tooltip = '';
            
            switch(icon) {
                case '📊':
                    tooltip = 'View detailed charts and graphs';
                    break;
                case '⚙':
                case '⚙️':
                    tooltip = 'Open panel settings';
                    break;
                case '🔧':
                    tooltip = 'Mechanical diagnostics';
                    break;
                case '⛽':
                    tooltip = 'Fuel management';
                    break;
                case '🧠':
                case '🤖':
                    tooltip = 'AI analysis options';
                    break;
                case '🏁':
                    tooltip = 'Track information';
                    break;
                case '⏱':
                case '⏱️':
                    tooltip = 'Timing analysis';
                    break;
                default:
                    tooltip = 'Panel options';
            }
            
            button.title = tooltip;
            
            // Add click handler
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handlePanelButtonClick(button, icon);
            });
            
            // Add hover effects
            button.addEventListener('mouseenter', () => {
                button.style.transform = 'scale(1.1)';
                button.style.boxShadow = '0 4px 12px rgba(0, 123, 255, 0.3)';
            });
            
            button.addEventListener('mouseleave', () => {
                button.style.transform = 'scale(1)';
                button.style.boxShadow = 'none';
            });
        });
    }
    
    /**
     * Handle panel button clicks
     */
    handlePanelButtonClick(button, icon) {
        const panel = button.closest('.telemetry-panel');
        const panelTitle = panel.querySelector('.panel-title')?.textContent || 'Unknown Panel';
        
        console.log(`[UI] Panel button clicked: ${icon} on ${panelTitle}`);
        console.log(`[UI] About to call modal function for icon: ${icon}`);
        
        try {
            switch(icon) {
                case '📊':
                    console.log('[UI] Calling showDetailedCharts');
                    this.showDetailedCharts(panelTitle);
                    break;
                case '⚙':
                case '⚙️':
                    console.log('[UI] Calling showPanelSettings');
                    this.showPanelSettings(panelTitle);
                    break;
                case '🔧':
                    console.log('[UI] Calling showMechanicalDiagnostics');
                    this.showMechanicalDiagnostics();
                    break;
                case '⛽':
                    console.log('[UI] Calling showFuelManagement');
                    this.showFuelManagement();
                    break;
                case '🧠':
                case '🤖':
                    console.log('[UI] Calling showAIOptions');
                    this.showAIOptions();
                    break;
                case '🏁':
                    console.log('[UI] Calling showTrackInfo');
                    this.showTrackInfo();
                    break;
                case '⏱':
                case '⏱️':
                    console.log('[UI] Calling showTimingAnalysis');
                    this.showTimingAnalysis();
                    break;
                default:
                    console.log('[UI] Calling showGenericPanelOptions');
                    this.showGenericPanelOptions(panelTitle);
            }
        } catch (error) {
            console.error('[UI] Error in handlePanelButtonClick:', error);
            alert(`Button clicked: ${icon}\nPanel: ${panelTitle}\nError: ${error.message}`);
        }
        
        // Visual feedback
        button.style.backgroundColor = '#007bff';
        setTimeout(() => {
            button.style.backgroundColor = '';
        }, 200);
    }
    
    /**
     * Add direct button handlers as a fallback
     */
    addDirectButtonHandlers() {
        console.log('[UI] Adding direct button handlers...');
        
        // Get all control buttons and add simple click handlers
        document.querySelectorAll('.control-btn').forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const icon = button.textContent.trim();
                console.log(`[UI] Direct button handler triggered for: ${icon}`);
                
                // Show a simple modal for testing
                this.showSimpleModal(icon, button);
            });
            
            console.log(`[UI] Added direct handler to button ${index}: ${button.textContent.trim()}`);
        });
    }
    
    /**
     * Show simple modal for testing
     */
    showSimpleModal(icon, button) {
        const panel = button.closest('.telemetry-panel');
        const panelTitle = panel?.querySelector('.panel-title')?.textContent || 'Unknown Panel';
        
        console.log(`[UI] Creating simple modal for ${icon} on ${panelTitle}`);
        
        // Create simple modal
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
        `;
        
        modal.innerHTML = `
            <div style="
                background: #161b22;
                border: 2px solid #007bff;
                border-radius: 12px;
                padding: 20px;
                max-width: 500px;
                color: #c9d1d9;
                font-family: 'JetBrains Mono', monospace;
            ">
                <h2 style="color: #007bff; margin-bottom: 15px;">${panelTitle} - ${icon}</h2>
                <p>Button clicked successfully!</p>
                <p>Panel: ${panelTitle}</p>
                <p>Icon: ${icon}</p>
                <div style="margin-top: 20px;">
                    <button onclick="this.closest('div[style*=fixed]').remove()" style="
                        background: #007bff;
                        border: none;
                        color: white;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: 'JetBrains Mono', monospace;
                    ">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        console.log('[UI] Simple modal created and added to DOM');
    }
    
    /**
     * Setup communication log buttons
     */
    setupCommunicationButtons() {
        const clearLogBtn = document.getElementById('clear-log');
        const exportLogBtn = document.getElementById('export-log');
        
        if (clearLogBtn) {
            clearLogBtn.title = 'Clear communication log';
            clearLogBtn.addEventListener('click', () => {
                if (confirm('Clear all communication history?')) {
                    if (this.voiceComm) {
                        this.voiceComm.clearCommunicationLog();
                    }
                    this.showNotification('Communication log cleared', 'success');
                }
            });
        }
        
        if (exportLogBtn) {
            exportLogBtn.title = 'Export communication log';
            exportLogBtn.addEventListener('click', () => {
                if (this.voiceComm) {
                    this.voiceComm.exportCommunicationLog();
                    this.showNotification('Communication log exported', 'success');
                } else {
                    this.showNotification('No communication data to export', 'warning');
                }
            });
        }
    }
    
    /**
     * Show detailed charts for a panel
     */
    showDetailedCharts(panelTitle) {
        this.showModal('Detailed Charts', `
            <div class="chart-modal">
                <h3>${panelTitle} - Detailed View</h3>
                <p>Interactive charts and historical data visualization would appear here.</p>
                <div class="chart-placeholder">
                    <canvas id="detail-chart" width="400" height="200" style="border: 1px solid #333; background: #1a1a1a;"></canvas>
                </div>
                <div class="chart-controls">
                    <button onclick="alert('Zoom In')">🔍 Zoom In</button>
                    <button onclick="alert('Zoom Out')">🔍 Zoom Out</button>
                    <button onclick="alert('Export Chart')">💾 Export</button>
                </div>
            </div>
        `);
    }
    
    /**
     * Show panel settings
     */
    showPanelSettings(panelTitle) {
        this.showModal('Panel Settings', `
            <div class="settings-modal">
                <h3>${panelTitle} - Settings</h3>
                <div class="setting-group">
                    <label>Update Frequency:</label>
                    <select>
                        <option>Real-time</option>
                        <option>1 second</option>
                        <option>5 seconds</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label>Display Units:</label>
                    <select>
                        <option>Metric</option>
                        <option>Imperial</option>
                    </select>
                </div>
                <div class="setting-group">
                    <label><input type="checkbox" checked> Show Alerts</label>
                </div>
                <div class="setting-group">
                    <label><input type="checkbox"> Auto-minimize on Idle</label>
                </div>
                <button onclick="alert('Settings saved!')">Save Settings</button>
            </div>
        `);
    }
    
    /**
     * Show mechanical diagnostics
     */
    showMechanicalDiagnostics() {
        this.showModal('Mechanical Diagnostics', `
            <div class="diagnostics-modal">
                <h3>🔧 Engine & Mechanical Systems</h3>
                <div class="diagnostic-grid">
                    <div class="diag-item">
                        <span class="diag-label">Engine Health:</span>
                        <span class="diag-value good">OPTIMAL</span>
                    </div>
                    <div class="diag-item">
                        <span class="diag-label">Transmission:</span>
                        <span class="diag-value good">NORMAL</span>
                    </div>
                    <div class="diag-item">
                        <span class="diag-label">Brake System:</span>
                        <span class="diag-value warning">WARM</span>
                    </div>
                    <div class="diag-item">
                        <span class="diag-label">Suspension:</span>
                        <span class="diag-value good">OPTIMAL</span>
                    </div>
                </div>
                <button onclick="alert('Running full diagnostic...')">🔍 Full Diagnostic</button>
            </div>
        `);
    }
    
    /**
     * Show fuel management
     */
    showFuelManagement() {
        this.showModal('Fuel Management', `
            <div class="fuel-modal">
                <h3>⛽ Fuel Strategy</h3>
                <div class="fuel-info">
                    <div class="fuel-current">
                        <h4>Current Status</h4>
                        <p>Fuel: 18.7L (31%)</p>
                        <p>Usage: 2.1L/lap</p>
                        <p>Remaining: 8.9 laps</p>
                    </div>
                    <div class="fuel-strategy">
                        <h4>Strategy Options</h4>
                        <button onclick="alert('Fuel save mode activated')">🐌 Fuel Save Mode</button>
                        <button onclick="alert('Calculating pit window...')">🏁 Optimal Pit Window</button>
                        <button onclick="alert('Push mode activated')">🚀 Push Mode</button>
                    </div>
                </div>
            </div>
        `);
    }
    
    /**
     * Show AI options
     */
    showAIOptions() {
        this.showModal('AI Analysis Options', `
            <div class="ai-modal">
                <h3>🤖 AI Assistant Settings</h3>
                <div class="ai-options">
                    <div class="ai-option">
                        <label><input type="checkbox" checked> Strategy Suggestions</label>
                    </div>
                    <div class="ai-option">
                        <label><input type="checkbox" checked> Performance Analysis</label>
                    </div>
                    <div class="ai-option">
                        <label><input type="checkbox"> Predictive Alerts</label>
                    </div>
                    <div class="ai-option">
                        <label><input type="checkbox" checked> Voice Responses</label>
                    </div>
                </div>
                <div class="ai-controls">
                    <button onclick="alert('AI recalibrating...')">🔄 Recalibrate AI</button>
                    <button onclick="alert('Requesting strategy update...')">📊 Update Strategy</button>
                </div>
            </div>
        `);
    }
    
    /**
     * Show track information
     */
    showTrackInfo() {
        this.showModal('Track Information', `
            <div class="track-modal">
                <h3>🏁 Silverstone Grand Prix Circuit</h3>
                <div class="track-details">
                    <div class="track-stat">
                        <span class="stat-label">Length:</span>
                        <span class="stat-value">5.891 km</span>
                    </div>
                    <div class="track-stat">
                        <span class="stat-label">Corners:</span>
                        <span class="stat-value">18</span>
                    </div>
                    <div class="track-stat">
                        <span class="stat-label">Track Temp:</span>
                        <span class="stat-value">22°C</span>
                    </div>
                    <div class="track-stat">
                        <span class="stat-label">Conditions:</span>
                        <span class="stat-value">Dry</span>
                    </div>
                </div>
                <div class="track-controls">
                    <button onclick="alert('Showing racing line...')">🏎️ Racing Line</button>
                    <button onclick="alert('Weather forecast...')">🌤️ Weather</button>
                </div>
            </div>
        `);
    }
    
    /**
     * Show timing analysis
     */
    showTimingAnalysis() {
        this.showModal('Timing Analysis', `
            <div class="timing-modal">
                <h3>⏱️ Detailed Timing Analysis</h3>
                <div class="timing-table">
                    <table style="width: 100%; color: #c9d1d9;">
                        <thead>
                            <tr style="background: #21262d;">
                                <th>Sector</th>
                                <th>Current</th>
                                <th>Best</th>
                                <th>Delta</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Sector 1</td>
                                <td>31.234</td>
                                <td>30.891</td>
                                <td style="color: #ff4444;">+0.343</td>
                            </tr>
                            <tr>
                                <td>Sector 2</td>
                                <td>28.891</td>
                                <td>29.123</td>
                                <td style="color: #00ff7f;">-0.232</td>
                            </tr>
                            <tr>
                                <td>Sector 3</td>
                                <td>21.765</td>
                                <td>21.456</td>
                                <td style="color: #ff4444;">+0.309</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <button onclick="alert('Analyzing sector performance...')">📈 Sector Analysis</button>
            </div>
        `);
    }
    
    /**
     * Show generic panel options
     */
    showGenericPanelOptions(panelTitle) {
        this.showModal(`${panelTitle} Options`, `
            <div class="generic-modal">
                <h3>${panelTitle}</h3>
                <p>Panel-specific options and controls would appear here.</p>
                <div class="generic-controls">
                    <button onclick="alert('Refreshing panel...')">🔄 Refresh</button>
                    <button onclick="alert('Exporting data...')">💾 Export Data</button>
                    <button onclick="alert('Panel minimized')">📦 Minimize</button>
                </div>
            </div>
        `);
    }
    
    /**
     * Show modal dialog
     */
    showModal(title, content) {
        console.log(`[UI] Showing modal: ${title}`);
        
        try {
            // Remove existing modal if any
            const existingModal = document.querySelector('.modal-overlay');
            if (existingModal) {
                existingModal.remove();
                console.log('[UI] Removed existing modal');
            }
            
            // Create modal
            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>${title}</h2>
                        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            console.log('[UI] Modal added to DOM');
            
            // Close on background click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    modal.remove();
                    console.log('[UI] Modal closed by background click');
                }
            });
            
            // Add escape key handler
            const escapeHandler = (e) => {
                if (e.key === 'Escape') {
                    modal.remove();
                    document.removeEventListener('keydown', escapeHandler);
                    console.log('[UI] Modal closed by escape key');
                }
            };
            document.addEventListener('keydown', escapeHandler);
            
        } catch (error) {
            console.error('[UI] Error creating modal:', error);
            // Fallback: show alert
            alert(`${title}\n\nModal content would appear here. Error: ${error.message}`);
        }
    }
    
    /**
     * Show notification
     */
    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '6px',
            color: '#ffffff',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '14px',
            zIndex: '10000',
            animation: 'slideIn 0.3s ease'
        });
        
        // Set color based on type
        switch(type) {
            case 'success':
                notification.style.backgroundColor = '#00ff7f';
                notification.style.color = '#000000';
                break;
            case 'warning':
                notification.style.backgroundColor = '#ff4500';
                break;
            case 'error':
                notification.style.backgroundColor = '#ff4444';
                break;
            default:
                notification.style.backgroundColor = '#007bff';
        }
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }
    
    /**
     * Update panel visibility based on view
     */
    updatePanelVisibility(view) {
        const panels = document.querySelectorAll('.panel');
        
        panels.forEach(panel => {
            const panelViews = panel.dataset.views ? panel.dataset.views.split(',') : ['overview'];
            
            if (panelViews.includes(view) || panelViews.includes('all')) {
                panel.style.display = 'block';
            } else {
                panel.style.display = 'none';
            }
        });
    }
    
    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcut(e) {
        // Ctrl/Cmd + number keys for view switching
        if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '4') {
            e.preventDefault();
            const views = ['overview', 'telemetry', 'strategy', 'analysis'];
            const viewIndex = parseInt(e.key) - 1;
            if (views[viewIndex]) {
                this.switchView(views[viewIndex]);
            }
        }
        
        // F5 for refresh
        if (e.key === 'F5') {
            e.preventDefault();
            this.refreshAllPanels();
        }
        
        // Escape to reset view
        if (e.key === 'Escape') {
            this.switchView('overview');
        }
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        // Trigger track map resize
        if (this.trackMap) {
            this.trackMap.resizeCanvas();
        }
        
        // Update responsive layout
        this.updateResponsiveLayout();
    }
    
    /**
     * Update responsive layout
     */
    updateResponsiveLayout() {
        const width = window.innerWidth;
        const body = document.body;
        
        // Remove existing responsive classes
        body.classList.remove('mobile', 'tablet', 'desktop');
        
        // Add appropriate class
        if (width < 768) {
            body.classList.add('mobile');
        } else if (width < 1024) {
            body.classList.add('tablet');
        } else {
            body.classList.add('desktop');
        }
    }
    
    /**
     * Start demo mode for development
     */
    startDemoMode() {
        // Start telemetry simulation
        this.telemetryProcessor.startSimulation();
        
        // Start track map simulation
        this.trackMap.startSimulation();
        
        // Simulate connection status
        setTimeout(() => {
            this.updateConnectionStatus('connected', 'Demo Mode');
        }, 1000);
        
        console.log('[UI] Demo mode started');
    }
    
    /**
     * Connect to backend
     */
    connect(serverUrl, apiKey) {
        this.wsClient.config.serverUrl = serverUrl;
        this.wsClient.config.apiKey = apiKey;
        this.wsClient.connect();
    }
    
    /**
     * Disconnect from backend
     */
    disconnect() {
        this.wsClient.disconnect();
    }
    
    /**
     * Format session time
     */
    formatSessionTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    /**
     * Minimize panel
     */
    minimizePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.add('minimized');
        }
    }
    
    /**
     * Maximize panel
     */
    maximizePanel(panelId) {
        const panel = document.getElementById(panelId);
        if (panel) {
            panel.classList.remove('minimized');
        }
    }
    
    /**
     * Show panel settings
     */
    showPanelSettings(panelId) {
        console.log(`[UI] Show settings for panel: ${panelId}`);
        // TODO: Implement panel settings modal
    }
    
    /**
     * Refresh panel
     */
    refreshPanel(panelId) {
        console.log(`[UI] Refresh panel: ${panelId}`);
        // TODO: Implement panel-specific refresh logic
    }
    
    /**
     * Refresh all panels
     */
    refreshAllPanels() {
        console.log('[UI] Refresh all panels');
        // Reset telemetry processor
        this.telemetryProcessor.reset();
        
        // Reset track map
        this.trackMap.resetView();
    }
    
    /**
     * Update UI (called periodically)
     */
    updateUI() {
        // Update responsive layout if needed
        this.updateResponsiveLayout();
        
        // Update connection indicator animation
        if (!this.isConnected) {
            this.elements.connectionIndicator.classList.toggle('pulse');
        }
    }
    
    /**
     * Cleanup
     */
    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        if (this.wsClient) {
            this.wsClient.disconnect();
        }
        
        if (this.trackMap) {
            this.trackMap.destroy();
        }
        
        console.log('[UI] UIController destroyed');
    }
}

// Initialize UI when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.uiController = new UIController();
    console.log('[UI] Team Engineer HUD initialized');
});

// Export for use in other modules
window.UIController = UIController;
