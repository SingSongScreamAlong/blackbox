/**
 * PROJECT:blackbox - Adaptive Driver Data Generator
 * Generates realistic driver data based on racing series and available telemetry
 */

class DriverDataGenerator {
    constructor() {
        this.driverNames = [
            'SMITH', 'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES', 'GARCIA', 'MILLER', 'DAVIS',
            'RODRIGUEZ', 'MARTINEZ', 'HERNANDEZ', 'LOPEZ', 'GONZALEZ', 'WILSON', 'ANDERSON', 'THOMAS',
            'TAYLOR', 'MOORE', 'JACKSON', 'MARTIN', 'LEE', 'PEREZ', 'THOMPSON', 'WHITE',
            'HARRIS', 'SANCHEZ', 'CLARK', 'RAMIREZ', 'LEWIS', 'ROBINSON', 'WALKER', 'YOUNG',
            'ALLEN', 'KING', 'WRIGHT', 'SCOTT', 'TORRES', 'NGUYEN', 'HILL', 'FLORES'
        ];
        
        this.teamTemplates = {
            'f1': [
                'Racing Team', 'Motorsport', 'F1 Team', 'Grand Prix Racing', 'Racing',
                'International', 'World Racing', 'GP Team', 'Formula Racing', 'Speed Team'
            ],
            'endurance': [
                'Racing', 'Motorsport', 'Team', 'Racing Team', 'Endurance Racing',
                'Le Mans Team', '24H Racing', 'Endurance Team', 'Racing Squad', 'Motor Racing'
            ],
            'nascar': [
                'Racing', 'Motorsports', 'Racing Team', 'Speedway Team', 'Stock Car Racing',
                'Cup Series Team', 'Racing Enterprises', 'Motor Racing', 'Speed Team', 'Racing Inc'
            ],
            'oval': [
                'Racing', 'Motorsports', 'IndyCar Team', 'Speedway Racing', 'Oval Racing',
                'Championship Racing', 'Racing Team', 'Motor Racing', 'Speed Racing', 'Racing Squad'
            ],
            'dirt': [
                'Racing', 'Dirt Racing', 'Sprint Car Racing', 'Dirt Track Racing', 'Racing Team',
                'Speedway Racing', 'Dirt Motorsports', 'Track Racing', 'Racing Squad', 'Motor Racing'
            ],
            'gt': [
                'Racing', 'GT Racing', 'Sports Car Racing', 'Racing Team', 'Motorsport',
                'GT Team', 'Racing Squad', 'Sports Racing', 'Motor Racing', 'Championship Racing'
            ]
        };
        
        this.carTemplates = {
            'f1': ['F1-24', 'F1-23', 'Formula Car', 'GP Car'],
            'endurance': [
                'Porsche 963', 'Toyota GR010', 'Ferrari 499P', 'BMW M4 GT3', 'Audi R8 LMS',
                'Mercedes AMG GT3', 'Lamborghini Huracan GT3', 'McLaren 720S GT3', 'Aston Martin Vantage GT3'
            ],
            'nascar': [
                'Chevrolet Camaro ZL1', 'Ford Mustang GT', 'Toyota Camry TRD', 'Chevrolet Silverado',
                'Ford F-150', 'Toyota Tundra TRD Pro'
            ],
            'oval': [
                'Dallara DW12', 'Dallara IR18', 'IndyCar Chassis', 'Indy 500 Special',
                'Championship Car', 'Oval Racer'
            ],
            'dirt': [
                'Sprint Car', '410 Sprint', '360 Sprint', 'Late Model', 'Modified',
                'Midget Car', 'Micro Sprint', 'Dirt Late Model'
            ],
            'gt': [
                'BMW M4 GT3', 'Mercedes AMG GT3', 'Audi R8 LMS GT3', 'Porsche 911 GT3 R',
                'Ferrari 488 GT3', 'McLaren 720S GT3', 'Lamborghini Huracan GT3'
            ]
        };
        
        this.manufacturers = {
            'f1': ['Mercedes', 'Red Bull', 'Ferrari', 'McLaren', 'Alpine', 'Aston Martin', 'Williams', 'AlphaTauri'],
            'endurance': ['Porsche', 'Toyota', 'Ferrari', 'BMW', 'Audi', 'Mercedes', 'Lamborghini', 'McLaren', 'Aston Martin'],
            'nascar': ['Chevrolet', 'Ford', 'Toyota'],
            'oval': ['Chevrolet', 'Honda'],
            'dirt': ['Ford', 'Chevrolet', 'Mopar', 'Toyota'],
            'gt': ['BMW', 'Mercedes', 'Audi', 'Porsche', 'Ferrari', 'McLaren', 'Lamborghini', 'Aston Martin']
        };
        
        this.init();
    }
    
    init() {
        console.log('[DriverDataGenerator] Initializing adaptive driver data generator');
    }
    
    /**
     * Generate complete field of drivers based on current racing series
     */
    generateDriverField(seriesType, fieldSize) {
        const drivers = [];
        const usedNames = new Set();
        
        for (let i = 1; i <= fieldSize; i++) {
            const driver = this.generateDriver(seriesType, i, usedNames);
            drivers.push(driver);
        }
        
        return drivers;
    }
    
    /**
     * Generate individual driver data
     */
    generateDriver(seriesType, position, usedNames = new Set()) {
        // Get unique driver name
        let driverName;
        do {
            driverName = this.driverNames[Math.floor(Math.random() * this.driverNames.length)];
        } while (usedNames.has(driverName));
        usedNames.add(driverName);
        
        const manufacturer = this.getRandomFromArray(this.manufacturers[seriesType] || this.manufacturers['endurance']);
        const carNumber = this.generateCarNumber(seriesType);
        const carModel = this.getRandomFromArray(this.carTemplates[seriesType] || this.carTemplates['endurance']);
        const teamSuffix = this.getRandomFromArray(this.teamTemplates[seriesType] || this.teamTemplates['endurance']);
        
        return {
            code: driverName,
            position: position,
            name: driverName,
            carNumber: carNumber,
            carModel: carModel,
            manufacturer: manufacturer,
            team: `${manufacturer} ${teamSuffix}`,
            gap: this.generateGap(position, seriesType),
            availableData: this.generateAvailableData(seriesType),
            lastUpdate: Date.now()
        };
    }
    
    /**
     * Generate car number based on series
     */
    generateCarNumber(seriesType) {
        switch (seriesType) {
            case 'f1':
                return Math.floor(Math.random() * 99) + 1;
            case 'nascar':
                return Math.floor(Math.random() * 99) + 1;
            case 'oval':
                return Math.floor(Math.random() * 99) + 1;
            case 'dirt':
                return Math.floor(Math.random() * 999) + 1;
            default:
                return Math.floor(Math.random() * 999) + 1;
        }
    }
    
    /**
     * Generate gap based on series type and position
     */
    generateGap(position, seriesType) {
        if (position === 1) return 'LEADER';
        
        const baseGap = (position - 1) * (Math.random() * 2 + 0.5);
        
        switch (seriesType) {
            case 'f1':
                return `+${baseGap.toFixed(3)}`;
            case 'endurance':
                const minutes = Math.floor(baseGap / 60);
                const seconds = (baseGap % 60).toFixed(3);
                return minutes > 0 ? `+${minutes}:${seconds.padStart(6, '0')}` : `+${baseGap.toFixed(3)}`;
            case 'nascar':
            case 'oval':
                const lapsDown = Math.floor(baseGap / 30);
                return lapsDown > 0 ? `-${lapsDown} LAP${lapsDown > 1 ? 'S' : ''}` : `+${baseGap.toFixed(3)}`;
            case 'dirt':
                return `+${(baseGap * 2).toFixed(3)}`;
            default:
                return `+${baseGap.toFixed(3)}`;
        }
    }
    
    /**
     * Generate available data items based on series and what telemetry is available
     */
    generateAvailableData(seriesType) {
        const availableData = [];
        
        // Always try to include basic data
        if (this.hasDataAvailable('tire', 0.9)) {
            const tireData = this.generateTireData(seriesType);
            availableData.push({
                type: 'tire',
                value: tireData.compound + tireData.age,
                tooltip: `Tire: ${tireData.compound}, ${tireData.age} laps`,
                icon: this.getTireIcon(tireData.compound)
            });
        }
        
        if (this.hasDataAvailable('fuel', 0.8)) {
            const fuelData = this.generateFuelData(seriesType);
            availableData.push({
                type: 'fuel',
                value: fuelData.remaining,
                tooltip: `Fuel: ${fuelData.remaining}L remaining`,
                icon: '⛽'
            });
        }
        
        if (this.hasDataAvailable('temp', 0.7)) {
            const tempData = this.generateTempData();
            availableData.push({
                type: 'temp',
                value: tempData.engine,
                tooltip: `Engine temp: ${tempData.engine}°C`,
                icon: '🌡️'
            });
        }
        
        if (this.hasDataAvailable('speed', 0.6)) {
            const speedData = this.generateSpeedData(seriesType);
            availableData.push({
                type: 'speed',
                value: speedData.current,
                tooltip: `Current speed: ${speedData.current} KMH`,
                icon: '💨'
            });
        }
        
        // Series-specific data
        if (seriesType === 'nascar' || seriesType === 'oval') {
            if (this.hasDataAvailable('draft', 0.5)) {
                availableData.push({
                    type: 'draft',
                    value: 'DFT',
                    tooltip: 'In draft position',
                    icon: '🏁'
                });
            }
        }
        
        if (seriesType === 'dirt') {
            if (this.hasDataAvailable('grip', 0.6)) {
                const gripLevels = ['LOW', 'MED', 'HIGH'];
                const grip = gripLevels[Math.floor(Math.random() * gripLevels.length)];
                availableData.push({
                    type: 'grip',
                    value: grip,
                    tooltip: `Track grip: ${grip}`,
                    icon: '🏁'
                });
            }
        }
        
        if (seriesType === 'f1') {
            if (this.hasDataAvailable('drs', 0.7)) {
                availableData.push({
                    type: 'drs',
                    value: 'DRS',
                    tooltip: 'DRS available',
                    icon: '⚡'
                });
            }
            
            if (this.hasDataAvailable('ers', 0.6)) {
                const ersLevel = Math.floor(Math.random() * 100);
                availableData.push({
                    type: 'ers',
                    value: `${ersLevel}%`,
                    tooltip: `ERS: ${ersLevel}% charged`,
                    icon: '🔋'
                });
            }
        }
        
        return availableData;
    }
    
    /**
     * Check if specific data type is available (simulates telemetry availability)
     */
    hasDataAvailable(dataType, probability = 0.8) {
        return Math.random() < probability;
    }
    
    /**
     * Generate tire data based on series
     */
    generateTireData(seriesType) {
        let compounds, ageRange;
        
        switch (seriesType) {
            case 'f1':
                compounds = ['S', 'M', 'H'];
                ageRange = [1, 30];
                break;
            case 'endurance':
                compounds = ['S', 'M', 'H'];
                ageRange = [10, 80];
                break;
            case 'nascar':
            case 'oval':
                compounds = ['F', 'S', 'W']; // Fresh, Scuffed, Worn
                ageRange = [5, 60];
                break;
            case 'dirt':
                compounds = ['H', 'S']; // Hard, Soft
                ageRange = [1, 40];
                break;
            default:
                compounds = ['S', 'M', 'H'];
                ageRange = [5, 50];
        }
        
        return {
            compound: compounds[Math.floor(Math.random() * compounds.length)],
            age: Math.floor(Math.random() * (ageRange[1] - ageRange[0])) + ageRange[0]
        };
    }
    
    /**
     * Generate fuel data
     */
    generateFuelData(seriesType) {
        const fuelRange = seriesType === 'endurance' ? [15, 80] : [5, 40];
        return {
            remaining: (Math.random() * (fuelRange[1] - fuelRange[0]) + fuelRange[0]).toFixed(1)
        };
    }
    
    /**
     * Generate temperature data
     */
    generateTempData() {
        return {
            engine: Math.floor(Math.random() * 30) + 80, // 80-110°C
            oil: Math.floor(Math.random() * 20) + 90,    // 90-110°C
            water: Math.floor(Math.random() * 25) + 85   // 85-110°C
        };
    }
    
    /**
     * Generate speed data
     */
    generateSpeedData(seriesType) {
        let speedRange;
        
        switch (seriesType) {
            case 'f1':
                speedRange = [250, 350];
                break;
            case 'nascar':
            case 'oval':
                speedRange = [280, 320];
                break;
            case 'endurance':
                speedRange = [200, 300];
                break;
            case 'dirt':
                speedRange = [120, 180];
                break;
            default:
                speedRange = [200, 280];
        }
        
        return {
            current: Math.floor(Math.random() * (speedRange[1] - speedRange[0]) + speedRange[0])
        };
    }
    
    /**
     * Get tire compound icon
     */
    getTireIcon(compound) {
        const icons = {
            'S': '🔴', 'M': '🟡', 'H': '⚪',
            'F': '🟢', 'W': '🔴'
        };
        return icons[compound] || '⚪';
    }
    
    /**
     * Get random element from array
     */
    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
    
    /**
     * Update driver data (simulates real-time telemetry updates)
     */
    updateDriverData(driver, seriesType) {
        // Update available data with new values
        driver.availableData = this.generateAvailableData(seriesType);
        driver.lastUpdate = Date.now();
        return driver;
    }
    
    /**
     * Get formatted driver display data
     */
    getDriverDisplayData(driver) {
        return {
            name: driver.name,
            carInfo: `#${driver.carNumber} ${driver.carModel}`,
            team: driver.team,
            gap: driver.gap,
            availableData: driver.availableData
        };
    }
}

// Initialize the driver data generator
const driverDataGenerator = new DriverDataGenerator();

// Export for use by other modules
window.driverDataGenerator = driverDataGenerator;
