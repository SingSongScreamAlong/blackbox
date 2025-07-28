/**
 * PROJECT:blackbox - Competitor Analysis Modal
 * Handles detailed competitor analysis popup with performance, strategy, and telemetry data
 */

class CompetitorAnalysis {
    constructor() {
        this.modal = null;
        this.overlay = null;
        this.currentDriver = null;
        this.competitorData = {};
        
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('competitor-modal-overlay');
        this.overlay = document.getElementById('competitor-modal-overlay');
        
        if (!this.modal) {
            console.error('[CompetitorAnalysis] Modal not found');
            return;
        }
        
        this.setupEventListeners();
        this.initializeCompetitorData();
        
        console.log('[CompetitorAnalysis] Competitor analysis system initialized');
    }
    
    setupEventListeners() {
        // Close modal handlers
        const closeBtn = document.getElementById('competitor-modal-close');
        closeBtn?.addEventListener('click', () => this.closeModal());
        
        // Click outside to close
        this.overlay?.addEventListener('click', (e) => {
            if (e.target === this.overlay) {
                this.closeModal();
            }
        });
        
        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal?.classList.contains('active')) {
                this.closeModal();
            }
        });
        
        // Tab switching
        const tabs = document.querySelectorAll('.modal-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                this.switchTab(tab.dataset.tab);
            });
        });
        
        // Driver row click handlers
        const driverRows = document.querySelectorAll('.clickable-driver');
        driverRows.forEach(row => {
            row.addEventListener('click', () => {
                const driverCode = row.dataset.driver;
                const teamCode = row.dataset.team;
                this.openModal(driverCode, teamCode);
            });
        });
    }
    
    initializeCompetitorData() {
        // Initialize with realistic F1 driver and team data
        this.competitorData = {
            'VER': {
                name: 'Max Verstappen',
                team: 'Red Bull Racing',
                position: 1,
                gap: 'LEADER',
                performance: {
                    currentLap: '1:20.456',
                    bestLap: '1:19.234',
                    avgSpeed: '295 KMH',
                    sectors: ['30.123', '27.891', '21.765']
                },
                technical: {
                    engine: { status: 'Optimal', color: 'green' },
                    tires: { status: '82% Remaining', color: 'green' },
                    fuel: { status: '24.1L (9 laps)', color: 'green' },
                    drs: { status: 'Available', color: 'green' }
                },
                strategy: {
                    stints: [
                        { tire: 'hard', laps: 'Laps 1-18', status: 'completed' },
                        { tire: 'medium', laps: 'Laps 19-35', status: 'current' },
                        { tire: 'soft', laps: 'Laps 36-50', status: 'planned' }
                    ],
                    threats: [
                        { level: 'low', desc: 'Comfortable lead maintained' },
                        { level: 'medium', desc: 'Tire degradation monitoring' }
                    ]
                },
                telemetry: {
                    tireTemps: { fl: '87°C', fr: '89°C', rl: '91°C', rr: '88°C' },
                    engine: {
                        temp: '87°C',
                        oilPressure: '96 PSI',
                        rpm: '11,234',
                        boost: '1.3 BAR'
                    }
                }
            },
            'HAM': {
                name: 'Lewis Hamilton',
                team: 'Mercedes-AMG Petronas',
                position: 2,
                gap: '+1.234',
                performance: {
                    currentLap: '1:21.123',
                    bestLap: '1:20.456',
                    avgSpeed: '289 KMH',
                    sectors: ['30.456', '28.234', '22.123']
                },
                technical: {
                    engine: { status: 'Optimal', color: 'green' },
                    tires: { status: '74% Remaining', color: 'yellow' },
                    fuel: { status: '22.8L (7 laps)', color: 'yellow' },
                    drs: { status: 'Available', color: 'green' }
                },
                strategy: {
                    stints: [
                        { tire: 'medium', laps: 'Laps 1-16', status: 'completed' },
                        { tire: 'hard', laps: 'Laps 17-38', status: 'current' },
                        { tire: 'medium', laps: 'Laps 39-50', status: 'planned' }
                    ],
                    threats: [
                        { level: 'high', desc: 'Undercut opportunity lap 22' },
                        { level: 'medium', desc: 'Tire degradation increasing' }
                    ]
                },
                telemetry: {
                    tireTemps: { fl: '92°C', fr: '94°C', rl: '96°C', rr: '93°C' },
                    engine: {
                        temp: '91°C',
                        oilPressure: '93 PSI',
                        rpm: '11,456',
                        boost: '1.4 BAR'
                    }
                }
            },
            'LEC': {
                name: 'Charles Leclerc',
                team: 'Scuderia Ferrari',
                position: 4,
                gap: '+4.156',
                performance: {
                    currentLap: '1:21.789',
                    bestLap: '1:20.891',
                    avgSpeed: '284 KMH',
                    sectors: ['30.891', '28.567', '22.331']
                },
                technical: {
                    engine: { status: 'Optimal', color: 'green' },
                    tires: { status: '91% Remaining', color: 'green' },
                    fuel: { status: '26.2L (11 laps)', color: 'green' },
                    drs: { status: 'Available', color: 'green' }
                },
                strategy: {
                    stints: [
                        { tire: 'soft', laps: 'Laps 1-12', status: 'completed' },
                        { tire: 'hard', laps: 'Laps 13-40', status: 'current' },
                        { tire: 'medium', laps: 'Laps 41-50', status: 'planned' }
                    ],
                    threats: [
                        { level: 'medium', desc: 'DRS train forming behind' },
                        { level: 'low', desc: 'Fresh tires advantage' }
                    ]
                },
                telemetry: {
                    tireTemps: { fl: '85°C', fr: '87°C', rl: '89°C', rr: '86°C' },
                    engine: {
                        temp: '89°C',
                        oilPressure: '95 PSI',
                        rpm: '11,678',
                        boost: '1.5 BAR'
                    }
                }
            },
            'RUS': {
                name: 'George Russell',
                team: 'Mercedes-AMG Petronas',
                position: 5,
                gap: '+6.789',
                performance: {
                    currentLap: '1:22.234',
                    bestLap: '1:21.123',
                    avgSpeed: '281 KMH',
                    sectors: ['31.234', '28.891', '22.567']
                },
                technical: {
                    engine: { status: 'Optimal', color: 'green' },
                    tires: { status: '68% Remaining', color: 'yellow' },
                    fuel: { status: '21.5L (6 laps)', color: 'red' },
                    drs: { status: 'Available', color: 'green' }
                },
                strategy: {
                    stints: [
                        { tire: 'medium', laps: 'Laps 1-15', status: 'completed' },
                        { tire: 'hard', laps: 'Laps 16-35', status: 'current' },
                        { tire: 'soft', laps: 'Laps 36-50', status: 'planned' }
                    ],
                    threats: [
                        { level: 'high', desc: 'Fuel critical - early pit required' },
                        { level: 'medium', desc: 'Losing pace to leaders' }
                    ]
                },
                telemetry: {
                    tireTemps: { fl: '94°C', fr: '96°C', rl: '98°C', rr: '95°C' },
                    engine: {
                        temp: '93°C',
                        oilPressure: '91 PSI',
                        rpm: '11,891',
                        boost: '1.6 BAR'
                    }
                }
            }
        };
    }
    
    openModal(driverCode, teamCode) {
        const data = this.competitorData[driverCode];
        if (!data) {
            console.warn(`[CompetitorAnalysis] No data found for driver: ${driverCode}`);
            return;
        }
        
        this.currentDriver = driverCode;
        this.populateModalData(data);
        this.modal.classList.add('active');
        
        console.log(`[CompetitorAnalysis] Opened analysis for ${data.name}`);
    }
    
    closeModal() {
        this.modal.classList.remove('active');
        this.currentDriver = null;
    }
    
    populateModalData(data) {
        // Update header information
        document.getElementById('competitor-avatar').textContent = this.currentDriver;
        document.getElementById('competitor-name').textContent = data.name;
        document.getElementById('competitor-team').textContent = data.team;
        document.getElementById('competitor-position').textContent = data.position;
        document.getElementById('competitor-gap').textContent = data.gap;
        
        // Update performance data
        document.getElementById('perf-current-lap').textContent = data.performance.currentLap;
        document.getElementById('perf-best-lap').textContent = data.performance.bestLap;
        document.getElementById('perf-avg-speed').textContent = data.performance.avgSpeed;
        document.getElementById('perf-s1').textContent = data.performance.sectors[0];
        document.getElementById('perf-s2').textContent = data.performance.sectors[1];
        document.getElementById('perf-s3').textContent = data.performance.sectors[2];
        
        // Update technical status
        this.updateTechnicalStatus(data.technical);
        
        // Update strategy data
        this.updateStrategyData(data.strategy);
        
        // Update telemetry data
        this.updateTelemetryData(data.telemetry);
    }
    
    updateTechnicalStatus(technical) {
        const statusContainer = document.querySelector('.technical-status');
        if (!statusContainer) return;
        
        statusContainer.innerHTML = `
            <div class="status-item">
                <span class="status-icon ${technical.engine.color}">●</span>
                <span>Engine: ${technical.engine.status}</span>
            </div>
            <div class="status-item">
                <span class="status-icon ${technical.tires.color}">●</span>
                <span>Tires: ${technical.tires.status}</span>
            </div>
            <div class="status-item">
                <span class="status-icon ${technical.fuel.color}">●</span>
                <span>Fuel: ${technical.fuel.status}</span>
            </div>
            <div class="status-item">
                <span class="status-icon ${technical.drs.color}">●</span>
                <span>DRS: ${technical.drs.status}</span>
            </div>
        `;
    }
    
    updateStrategyData(strategy) {
        // Update strategy timeline
        const timeline = document.querySelector('.strategy-timeline');
        if (timeline) {
            timeline.innerHTML = strategy.stints.map(stint => `
                <div class="strategy-stint">
                    <div class="stint-info">
                        <span class="stint-tire ${stint.tire}">${stint.tire.toUpperCase()}</span>
                        <span class="stint-laps">${stint.laps}</span>
                    </div>
                    <div class="stint-status ${stint.status}">${stint.status.toUpperCase()}</div>
                </div>
            `).join('');
        }
        
        // Update threat analysis
        const threats = document.querySelector('.threat-analysis');
        if (threats) {
            threats.innerHTML = strategy.threats.map(threat => `
                <div class="threat-item ${threat.level}">
                    <span class="threat-level">${threat.level.toUpperCase()}</span>
                    <span class="threat-desc">${threat.desc}</span>
                </div>
            `).join('');
        }
    }
    
    updateTelemetryData(telemetry) {
        // Update tire temperatures
        const tireTemps = document.querySelector('.tire-temps');
        if (tireTemps) {
            tireTemps.innerHTML = `
                <div class="tire-temp fl">
                    <span class="tire-label">FL</span>
                    <span class="tire-value">${telemetry.tireTemps.fl}</span>
                </div>
                <div class="tire-temp fr">
                    <span class="tire-label">FR</span>
                    <span class="tire-value">${telemetry.tireTemps.fr}</span>
                </div>
                <div class="tire-temp rl">
                    <span class="tire-label">RL</span>
                    <span class="tire-value">${telemetry.tireTemps.rl}</span>
                </div>
                <div class="tire-temp rr">
                    <span class="tire-label">RR</span>
                    <span class="tire-value">${telemetry.tireTemps.rr}</span>
                </div>
            `;
        }
        
        // Update engine data
        const engineData = document.querySelector('.engine-data');
        if (engineData) {
            engineData.innerHTML = `
                <div class="engine-stat">
                    <span class="engine-label">Temperature</span>
                    <span class="engine-value">${telemetry.engine.temp}</span>
                </div>
                <div class="engine-stat">
                    <span class="engine-label">Oil Pressure</span>
                    <span class="engine-value">${telemetry.engine.oilPressure}</span>
                </div>
                <div class="engine-stat">
                    <span class="engine-label">RPM</span>
                    <span class="engine-value">${telemetry.engine.rpm}</span>
                </div>
                <div class="engine-stat">
                    <span class="engine-label">Boost</span>
                    <span class="engine-value">${telemetry.engine.boost}</span>
                </div>
            `;
        }
    }
    
    switchTab(tabName) {
        // Remove active class from all tabs and content
        document.querySelectorAll('.modal-tab').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.modal-tab-content').forEach(content => {
            content.classList.remove('active');
        });
        
        // Add active class to selected tab and content
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
        document.getElementById(`tab-${tabName}`).classList.add('active');
    }
    
    /**
     * Update competitor data from telemetry processor
     */
    updateCompetitorData(driverCode, newData) {
        if (this.competitorData[driverCode]) {
            this.competitorData[driverCode] = { ...this.competitorData[driverCode], ...newData };
            
            // If this driver's modal is currently open, refresh the display
            if (this.currentDriver === driverCode && this.modal.classList.contains('active')) {
                this.populateModalData(this.competitorData[driverCode]);
            }
        }
    }
    
    /**
     * Get competitor data for external use
     */
    getCompetitorData(driverCode) {
        return this.competitorData[driverCode] || null;
    }
}

// Initialize competitor analysis system
const competitorAnalysis = new CompetitorAnalysis();

// Export for use by other modules
window.competitorAnalysis = competitorAnalysis;
