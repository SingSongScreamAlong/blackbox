/**
 * PROJECT:blackbox - Racing Series Detection & Adaptive UI
 * Automatically detects racing series type and adapts UI accordingly
 */

class RacingSeriesDetector {
    constructor() {
        this.currentSeries = null;
        this.seriesConfig = {
            'f1': {
                name: 'Formula 1',
                panelTitle: '🏎️ F1 RACE STRATEGY',
                gapFormat: 'seconds', // +1.234
                tireCompounds: ['soft', 'medium', 'hard'],
                tireLabels: ['S', 'M', 'H'],
                maxStints: 3,
                typicalTireAge: [5, 25],
                fieldSize: 20,
                features: ['drs', 'ers', 'fuel', 'sectors']
            },
            'endurance': {
                name: 'Endurance Racing',
                panelTitle: '🏁 ENDURANCE STRATEGY',
                gapFormat: 'minutes', // +2:34.567
                tireCompounds: ['soft', 'medium', 'hard'],
                tireLabels: ['S', 'M', 'H'],
                maxStints: 6,
                typicalTireAge: [20, 80],
                fieldSize: 30,
                features: ['fuel', 'driver_changes', 'night_racing']
            },
            'nascar': {
                name: 'NASCAR',
                panelTitle: '🏁 NASCAR STRATEGY',
                gapFormat: 'laps', // -2 LAPS
                tireCompounds: ['fresh', 'scuffed', 'worn'],
                tireLabels: ['F', 'S', 'W'],
                maxStints: 4,
                typicalTireAge: [10, 50],
                fieldSize: 40,
                features: ['fuel', 'cautions', 'drafting', 'pit_strategy']
            },
            'oval': {
                name: 'Oval Racing',
                panelTitle: '🏁 OVAL STRATEGY',
                gapFormat: 'laps', // -1 LAP
                tireCompounds: ['fresh', 'worn'],
                tireLabels: ['F', 'W'],
                maxStints: 3,
                typicalTireAge: [15, 60],
                fieldSize: 33,
                features: ['fuel', 'drafting', 'pit_windows']
            },
            'dirt': {
                name: 'Dirt Racing',
                panelTitle: '🏁 DIRT STRATEGY',
                gapFormat: 'seconds', // +3.456
                tireCompounds: ['hard', 'soft'],
                tireLabels: ['H', 'S'],
                maxStints: 2,
                typicalTireAge: [5, 30],
                fieldSize: 24,
                features: ['track_conditions', 'grip_changes', 'cautions']
            },
            'gt': {
                name: 'GT Racing',
                panelTitle: '🏁 GT STRATEGY',
                gapFormat: 'seconds', // +12.345
                tireCompounds: ['soft', 'medium', 'hard'],
                tireLabels: ['S', 'M', 'H'],
                maxStints: 4,
                typicalTireAge: [15, 45],
                fieldSize: 28,
                features: ['fuel', 'balance_of_performance', 'driver_changes']
            }
        };
        
        this.init();
    }
    
    init() {
        console.log('[RacingSeriesDetector] Initializing universal racing series detector');
        this.detectSeries();
    }
    
    /**
     * Detect racing series based on available telemetry data
     */
    detectSeries() {
        // In a real implementation, this would analyze telemetry data
        // For now, we'll simulate detection based on various factors
        
        const detectionFactors = {
            trackLength: this.getTrackLength(),
            fieldSize: this.getFieldSize(),
            lapTimes: this.getAverageLapTime(),
            carType: this.getCarType(),
            sessionType: this.getSessionType()
        };
        
        const detectedSeries = this.analyzeTelemetryForSeries(detectionFactors);
        this.setSeries(detectedSeries);
        
        console.log(`[RacingSeriesDetector] Detected series: ${detectedSeries}`, detectionFactors);
    }
    
    /**
     * Analyze telemetry factors to determine racing series
     */
    analyzeTelemetryForSeries(factors) {
        // F1 Detection
        if (factors.lapTimes < 120 && factors.fieldSize === 20 && factors.trackLength > 3000) {
            return 'f1';
        }
        
        // NASCAR Detection
        if (factors.trackLength < 3000 && factors.fieldSize > 35 && factors.carType.includes('stock')) {
            return 'nascar';
        }
        
        // Oval Detection
        if (factors.trackLength < 4000 && factors.carType.includes('indy')) {
            return 'oval';
        }
        
        // Endurance Detection
        if (factors.sessionType.includes('endurance') || factors.sessionType.includes('24h')) {
            return 'endurance';
        }
        
        // Dirt Detection
        if (factors.carType.includes('dirt') || factors.trackLength < 1000) {
            return 'dirt';
        }
        
        // GT Racing Detection
        if (factors.carType.includes('gt') || factors.carType.includes('touring')) {
            return 'gt';
        }
        
        // Default to endurance for demo
        return 'endurance';
    }
    
    /**
     * Set the current racing series and update UI
     */
    setSeries(seriesType) {
        if (!this.seriesConfig[seriesType]) {
            console.warn(`[RacingSeriesDetector] Unknown series type: ${seriesType}`);
            seriesType = 'endurance'; // fallback
        }
        
        this.currentSeries = seriesType;
        this.updateUI();
        
        // Notify other systems
        if (window.competitorAnalysis) {
            window.competitorAnalysis.updateSeriesConfig(this.seriesConfig[seriesType]);
        }
        
        console.log(`[RacingSeriesDetector] Series set to: ${this.seriesConfig[seriesType].name}`);
    }
    
    /**
     * Update UI elements based on detected series
     */
    updateUI() {
        const config = this.seriesConfig[this.currentSeries];
        
        // Update panel title
        const panelTitle = document.querySelector('.strategy-panel h3');
        if (panelTitle) {
            panelTitle.textContent = config.panelTitle;
        }
        
        // Update column headers if needed
        this.updateColumnHeaders(config);
        
        // Update tire compound styling
        this.updateTireCompounds(config);
        
        // Update gap formatting
        this.updateGapFormatting(config);
    }
    
    /**
     * Update column headers based on series type
     */
    updateColumnHeaders(config) {
        const headers = document.querySelector('.standings-header');
        if (!headers) return;
        
        // Adjust headers based on series
        if (this.currentSeries === 'nascar' || this.currentSeries === 'oval') {
            // NASCAR/Oval might show laps down instead of time gap
            const gapCol = headers.querySelector('.gap-col');
            if (gapCol) gapCol.textContent = 'LAPS';
        } else {
            const gapCol = headers.querySelector('.gap-col');
            if (gapCol) gapCol.textContent = 'GAP';
        }
    }
    
    /**
     * Update tire compound styling and labels
     */
    updateTireCompounds(config) {
        const tireCompounds = document.querySelectorAll('.tire-compound');
        tireCompounds.forEach(compound => {
            // Update labels based on series
            const currentLabel = compound.textContent;
            const labelIndex = ['S', 'M', 'H', 'F', 'W'].indexOf(currentLabel);
            if (labelIndex !== -1 && config.tireLabels[labelIndex]) {
                compound.textContent = config.tireLabels[labelIndex];
            }
        });
    }
    
    /**
     * Update gap formatting based on series type
     */
    updateGapFormatting(config) {
        const gaps = document.querySelectorAll('.gap:not(.leader)');
        gaps.forEach(gap => {
            const currentGap = gap.textContent;
            if (currentGap.includes('+')) {
                gap.textContent = this.formatGap(currentGap, config.gapFormat);
            }
        });
    }
    
    /**
     * Format gap display based on series type
     */
    formatGap(gap, format) {
        const numericGap = parseFloat(gap.replace(/[^\d.]/g, ''));
        
        switch (format) {
            case 'seconds':
                return `+${numericGap.toFixed(3)}`;
            case 'minutes':
                const minutes = Math.floor(numericGap / 60);
                const seconds = (numericGap % 60).toFixed(3);
                return `+${minutes}:${seconds.padStart(6, '0')}`;
            case 'laps':
                const lapsDown = Math.floor(numericGap / 100); // Simplified calculation
                return lapsDown > 0 ? `-${lapsDown} LAP${lapsDown > 1 ? 'S' : ''}` : gap;
            default:
                return gap;
        }
    }
    
    /**
     * Get current series configuration
     */
    getCurrentSeriesConfig() {
        return this.seriesConfig[this.currentSeries];
    }
    
    /**
     * Force series change (for testing/manual override)
     */
    forceSeries(seriesType) {
        console.log(`[RacingSeriesDetector] Forcing series to: ${seriesType}`);
        this.setSeries(seriesType);
    }
    
    // Placeholder methods for telemetry detection (would be replaced with real telemetry analysis)
    getTrackLength() { return Math.random() * 6000 + 1000; }
    getFieldSize() { return Math.floor(Math.random() * 20) + 20; }
    getAverageLapTime() { return Math.random() * 120 + 60; }
    getCarType() { return ['f1', 'stock', 'gt', 'indy', 'dirt'][Math.floor(Math.random() * 5)]; }
    getSessionType() { return ['sprint', 'race', 'endurance', '24h'][Math.floor(Math.random() * 4)]; }
}

// Initialize the racing series detector
const racingSeriesDetector = new RacingSeriesDetector();

// Export for use by other modules
window.racingSeriesDetector = racingSeriesDetector;
