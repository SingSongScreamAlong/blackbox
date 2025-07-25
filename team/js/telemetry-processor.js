/**
 * PROJECT:blackbox - Telemetry Data Processor
 * Processes and manages real-time F1 telemetry data from BlackboxDriver backend
 */

class TelemetryProcessor {
    constructor() {
        this.currentData = {
            // Vehicle Performance
            speed: 0,
            maxSpeed: 0,
            gear: 'N',
            rpm: 0,
            throttle: 0,
            brake: 0,
            clutch: 0,
            steeringAngle: 0,
            
            // Engine & Mechanical
            engineTemp: 0,
            oilPressure: 0,
            oilTemp: 0,
            boostLevel: 0,
            engineMap: 'MAP1',
            pitLimiter: false,
            engineHealth: 100,
            
            // Fuel & Strategy
            fuelLevel: 0,
            fuelCapacity: 100,
            fuelUsagePerLap: 0,
            estimatedLapsRemaining: 0,
            pitWindowOpen: false,
            
            // Tires
            tireTemps: { fl: 0, fr: 0, rl: 0, rr: 0 },
            tirePressures: { fl: 0, fr: 0, rl: 0, rr: 0 },
            tireWear: { fl: 0, fr: 0, rl: 0, rr: 0 },
            tireSlipRatio: 0,
            
            // Suspension & Aerodynamics
            rideHeight: 0,
            suspensionTravel: 0,
            camber: { fl: 0, fr: 0, rl: 0, rr: 0 },
            toe: { fl: 0, fr: 0, rl: 0, rr: 0 },
            
            // Timing & Position
            currentLapTime: 0,
            lastLapTime: 0,
            bestLapTime: 0,
            deltaToOptimal: 0,
            sectorTimes: [0, 0, 0],
            position: 1,
            gapAhead: 0,
            gapBehind: 0,
            
            // Session Info
            sessionType: 'PRACTICE',
            currentLap: 1,
            totalLaps: 0,
            timeRemaining: 0,
            flagStatus: 'GREEN',
            
            // Track Conditions
            trackTemp: 20,
            airTemp: 18,
            trackCondition: 'DRY',
            trackName: 'SILVERSTONE CIRCUIT',
            
            // DRS & KERS
            drsStatus: 'CLOSED',
            kersLevel: 0,
            
            // Incidents & Penalties
            incidentCount: 0,
            penaltyTime: 0,
            
            // Brake Analysis
            brakeTemp: { fl: 0, fr: 0, rl: 0, rr: 0 },
            brakePressure: 0,
            
            // Position & Coordinates
            positionX: 0,
            positionY: 0,
            positionZ: 0,
            velocityX: 0,
            velocityY: 0,
            velocityZ: 0
        };
        
        this.dataHistory = {
            speed: [],
            rpm: [],
            fuelLevel: [],
            lapTimes: [],
            sectorTimes: [],
            tireTemps: { fl: [], fr: [], rl: [], rr: [] },
            engineTemp: [],
            timestamps: []
        };
        
        this.maxHistoryLength = 300; // 5 minutes at 1Hz
        this.updateCallbacks = [];
        this.aiSuggestions = [];
        
        // Initialize with demo data for development
        this.initializeDemoData();
        
        console.log('[Telemetry] TelemetryProcessor initialized');
    }
    
    /**
     * Initialize with demo data for development/testing
     */
    initializeDemoData() {
        this.currentData = {
            ...this.currentData,
            speed: 287,
            maxSpeed: 320,
            gear: '7',
            rpm: 11847,
            throttle: 94,
            brake: 0,
            engineTemp: 89,
            oilPressure: 94,
            boostLevel: 1.4,
            engineMap: 'MAP2',
            fuelLevel: 18.7,
            fuelUsagePerLap: 2.1,
            estimatedLapsRemaining: 8.9,
            pitWindowOpen: true,
            tireTemps: { fl: 89, fr: 91, rl: 95, rr: 93 },
            tirePressures: { fl: 32.1, fr: 32.3, rl: 31.8, rr: 32.0 },
            tireWear: { fl: 23, fr: 18, rl: 31, rr: 29 },
            currentLapTime: 83.5,
            lastLapTime: 81.890,
            bestLapTime: 81.234,
            deltaToOptimal: -0.743,
            sectorTimes: [31.234, 28.891, 21.765],
            position: 3,
            gapAhead: 2.847,
            gapBehind: 1.234,
            currentLap: 12,
            totalLaps: 25,
            drsStatus: 'OPEN',
            kersLevel: 85,
            brakeTemp: { fl: 450, fr: 445, rl: 420, rr: 425 },
            rideHeight: 35,
            suspensionTravel: 12
        };
        
        this.generateAISuggestions();
    }
    
    /**
     * Process incoming telemetry data from WebSocket
     */
    processTelemetryData(data, timestamp) {
        try {
            // Update current data
            this.updateCurrentData(data);
            
            // Store in history
            this.updateHistory(timestamp);
            
            // Generate AI suggestions if needed
            if (Math.random() < 0.1) { // 10% chance per update
                this.generateAISuggestions();
            }
            
            // Notify subscribers
            this.notifyUpdateCallbacks();
            
            console.log('[Telemetry] Data processed successfully');
            
        } catch (error) {
            console.error('[Telemetry] Processing error:', error);
        }
    }
    
    /**
     * Update current telemetry data
     */
    updateCurrentData(newData) {
        // Merge new data with current data
        Object.keys(newData).forEach(key => {
            if (key in this.currentData) {
                this.currentData[key] = newData[key];
            }
        });
        
        // Calculate derived values
        this.calculateDerivedValues();
    }
    
    /**
     * Calculate derived telemetry values
     */
    calculateDerivedValues() {
        // Update max speed
        if (this.currentData.speed > this.currentData.maxSpeed) {
            this.currentData.maxSpeed = this.currentData.speed;
        }
        
        // Calculate fuel percentage
        this.currentData.fuelPercentage = (this.currentData.fuelLevel / this.currentData.fuelCapacity) * 100;
        
        // Estimate laps remaining
        if (this.currentData.fuelUsagePerLap > 0) {
            this.currentData.estimatedLapsRemaining = this.currentData.fuelLevel / this.currentData.fuelUsagePerLap;
        }
        
        // Calculate average tire temperature
        const tireTemps = Object.values(this.currentData.tireTemps);
        this.currentData.avgTireTemp = tireTemps.reduce((sum, temp) => sum + temp, 0) / tireTemps.length;
        
        // Determine pit window status
        this.currentData.pitWindowOpen = this.currentData.fuelPercentage < 30 || 
                                        this.currentData.estimatedLapsRemaining < 3;
    }
    
    /**
     * Update data history for charts and analysis
     */
    updateHistory(timestamp) {
        const currentTime = timestamp || Date.now();
        
        // Add current values to history
        this.dataHistory.timestamps.push(currentTime);
        this.dataHistory.speed.push(this.currentData.speed);
        this.dataHistory.rpm.push(this.currentData.rpm);
        this.dataHistory.fuelLevel.push(this.currentData.fuelLevel);
        this.dataHistory.engineTemp.push(this.currentData.engineTemp);
        
        // Add tire temperatures
        Object.keys(this.currentData.tireTemps).forEach(tire => {
            this.dataHistory.tireTemps[tire].push(this.currentData.tireTemps[tire]);
        });
        
        // Limit history length
        Object.keys(this.dataHistory).forEach(key => {
            if (Array.isArray(this.dataHistory[key])) {
                if (this.dataHistory[key].length > this.maxHistoryLength) {
                    this.dataHistory[key] = this.dataHistory[key].slice(-this.maxHistoryLength);
                }
            } else if (typeof this.dataHistory[key] === 'object') {
                Object.keys(this.dataHistory[key]).forEach(subKey => {
                    if (this.dataHistory[key][subKey].length > this.maxHistoryLength) {
                        this.dataHistory[key][subKey] = this.dataHistory[key][subKey].slice(-this.maxHistoryLength);
                    }
                });
            }
        });
    }
    
    /**
     * Generate AI strategy suggestions
     */
    generateAISuggestions() {
        this.aiSuggestions = [];
        
        // Fuel strategy suggestions
        if (this.currentData.fuelPercentage < 25) {
            this.aiSuggestions.push({
                priority: 'HIGH PRIORITY',
                text: `PIT WINDOW OPENS LAP ${this.currentData.currentLap + 2}-${this.currentData.currentLap + 4}`,
                gain: `OPTIMAL: LAP ${this.currentData.currentLap + 3}`,
                type: 'strategy'
            });
        }
        
        if (this.currentData.fuelUsagePerLap > 2.5) {
            this.aiSuggestions.push({
                priority: 'FUEL SAVE',
                text: 'REDUCE FUEL USAGE BY 0.2L/LAP',
                gain: `EXTENDS STINT +${Math.floor(this.currentData.fuelLevel * 0.1)} LAPS`,
                type: 'fuel'
            });
        }
        
        // Tire strategy suggestions
        const maxTireTemp = Math.max(...Object.values(this.currentData.tireTemps));
        if (maxTireTemp > 100) {
            this.aiSuggestions.push({
                priority: 'TIRE MANAGEMENT',
                text: 'TIRE TEMPERATURES HIGH - MANAGE PACE',
                gain: 'EXTENDS TIRE LIFE',
                type: 'tires'
            });
        }
        
        // Overtaking opportunities
        if (this.currentData.gapAhead < 1.0 && this.currentData.drsStatus === 'AVAILABLE') {
            this.aiSuggestions.push({
                priority: 'HIGH PRIORITY',
                text: 'OVERTAKE OPPORTUNITY - T13 STOWE CORNER',
                gain: 'POTENTIAL GAIN: +0.3s',
                type: 'overtake'
            });
        }
        
        // Defensive driving
        if (this.currentData.gapBehind < 1.5) {
            this.aiSuggestions.push({
                priority: 'DEFENSIVE',
                text: 'DEFEND INSIDE LINE T1-T3',
                gain: 'RISK LEVEL: MEDIUM',
                type: 'defense'
            });
        }
        
        // Engine management
        if (this.currentData.engineTemp > 95) {
            this.aiSuggestions.push({
                priority: 'ENGINE',
                text: 'ENGINE TEMPERATURE HIGH - LIFT AND COAST',
                gain: 'PREVENTS DAMAGE',
                type: 'engine'
            });
        }
    }
    
    /**
     * Get current telemetry data
     */
    getCurrentData() {
        return { ...this.currentData };
    }
    
    /**
     * Get data history for charts
     */
    getDataHistory() {
        return { ...this.dataHistory };
    }
    
    /**
     * Get AI suggestions
     */
    getAISuggestions() {
        return [...this.aiSuggestions];
    }
    
    /**
     * Register callback for data updates
     */
    onUpdate(callback) {
        this.updateCallbacks.push(callback);
    }
    
    /**
     * Remove update callback
     */
    offUpdate(callback) {
        const index = this.updateCallbacks.indexOf(callback);
        if (index > -1) {
            this.updateCallbacks.splice(index, 1);
        }
    }
    
    /**
     * Notify all update callbacks
     */
    notifyUpdateCallbacks() {
        this.updateCallbacks.forEach(callback => {
            try {
                callback(this.currentData, this.dataHistory);
            } catch (error) {
                console.error('[Telemetry] Update callback error:', error);
            }
        });
    }
    
    /**
     * Format time in MM:SS.mmm format
     */
    formatTime(seconds) {
        if (!seconds || seconds <= 0) return '0:00.000';
        
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        
        return `${minutes}:${secs.toFixed(3).padStart(6, '0')}`;
    }
    
    /**
     * Format delta time with + or - prefix
     */
    formatDelta(delta) {
        if (!delta) return '0.000';
        
        const prefix = delta > 0 ? '+' : '';
        return `${prefix}${delta.toFixed(3)}`;
    }
    
    /**
     * Get position suffix (1st, 2nd, 3rd, etc.)
     */
    getPositionSuffix(position) {
        const suffixes = ['th', 'st', 'nd', 'rd'];
        const lastDigit = position % 10;
        const lastTwoDigits = position % 100;
        
        if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
            return `${position}th`;
        }
        
        return `${position}${suffixes[lastDigit] || suffixes[0]}`;
    }
    
    /**
     * Simulate real-time data updates for development
     */
    startSimulation() {
        setInterval(() => {
            // Simulate changing values
            this.currentData.speed += (Math.random() - 0.5) * 20;
            this.currentData.speed = Math.max(0, Math.min(350, this.currentData.speed));
            
            this.currentData.rpm += (Math.random() - 0.5) * 1000;
            this.currentData.rpm = Math.max(1000, Math.min(15000, this.currentData.rpm));
            
            this.currentData.throttle = Math.max(0, Math.min(100, this.currentData.throttle + (Math.random() - 0.5) * 20));
            
            this.currentData.fuelLevel = Math.max(0, this.currentData.fuelLevel - 0.01);
            
            // Update tire temperatures
            Object.keys(this.currentData.tireTemps).forEach(tire => {
                this.currentData.tireTemps[tire] += (Math.random() - 0.5) * 5;
                this.currentData.tireTemps[tire] = Math.max(60, Math.min(120, this.currentData.tireTemps[tire]));
            });
            
            this.calculateDerivedValues();
            this.updateHistory();
            this.notifyUpdateCallbacks();
            
        }, 1000); // Update every second
        
        console.log('[Telemetry] Simulation started');
    }
    
    /**
     * Reset all data
     */
    reset() {
        this.initializeDemoData();
        
        // Clear history
        Object.keys(this.dataHistory).forEach(key => {
            if (Array.isArray(this.dataHistory[key])) {
                this.dataHistory[key] = [];
            } else if (typeof this.dataHistory[key] === 'object') {
                Object.keys(this.dataHistory[key]).forEach(subKey => {
                    this.dataHistory[key][subKey] = [];
                });
            }
        });
        
        this.notifyUpdateCallbacks();
        console.log('[Telemetry] Data reset');
    }
}

// Export for use in other modules
window.TelemetryProcessor = TelemetryProcessor;
