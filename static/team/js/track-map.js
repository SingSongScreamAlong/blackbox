/**
 * PROJECT:blackbox - Track Map Renderer
 * Canvas-based track visualization with real-time car positioning
 */

class TrackMapRenderer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        
        // Track data
        this.trackData = null;
        this.currentTrack = 'silverstone';
        
        // Car positions
        this.cars = new Map();
        this.playerCarId = 'player';
        
        // Rendering settings
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.trackWidth = 8;
        this.carSize = 6;
        
        // Colors
        this.colors = {
            track: '#30363d',
            trackBorder: '#58a6ff',
            grass: '#238636',
            gravel: '#8b949e',
            playerCar: '#f85149',
            otherCar: '#58a6ff',
            racingLine: '#ffc107',
            sector1: '#238636',
            sector2: '#58a6ff',
            sector3: '#f85149'
        };
        
        // Initialize
        this.setupCanvas();
        this.loadTrackData();
        this.startRenderLoop();
        
        console.log('[TrackMap] TrackMapRenderer initialized');
    }
    
    /**
     * Setup canvas and event listeners
     */
    setupCanvas() {
        // Set canvas size
        this.resizeCanvas();
        
        // Add event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
        
        // Mouse/touch controls for pan and zoom
        this.setupInteractionControls();
    }
    
    /**
     * Resize canvas to fit container
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        // Update scale and offset to center track
        this.centerTrack();
    }
    
    /**
     * Setup mouse/touch interaction controls
     */
    setupInteractionControls() {
        let isDragging = false;
        let lastX = 0;
        let lastY = 0;
        
        // Mouse events
        this.canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            lastX = e.clientX;
            lastY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const deltaX = (e.clientX - lastX) * 0.8; // Reduce pan sensitivity
                const deltaY = (e.clientY - lastY) * 0.8;
                
                this.offsetX += deltaX;
                this.offsetY += deltaY;
                
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            isDragging = false;
            this.canvas.style.cursor = 'grab';
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            this.canvas.style.cursor = 'default';
        });
        
        // Zoom with mouse wheel - much less sensitive
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // Reduce sensitivity significantly
            const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Zoom towards mouse position with damping
            const newScale = this.scale * zoomFactor;
            
            // Limit zoom range more strictly
            if (newScale >= 0.3 && newScale <= 3.0) {
                this.offsetX = mouseX - (mouseX - this.offsetX) * zoomFactor;
                this.offsetY = mouseY - (mouseY - this.offsetY) * zoomFactor;
                this.scale = newScale;
            }
        });
        
        this.canvas.style.cursor = 'grab';
    }
    
    /**
     * Load track data (Silverstone circuit)
     */
    loadTrackData() {
        // Simplified Silverstone circuit layout
        this.trackData = {
            name: 'Silverstone Circuit',
            length: 5891, // meters
            width: 15, // meters
            sectors: [
                { start: 0, end: 0.33, color: this.colors.sector1 },
                { start: 0.33, end: 0.66, color: this.colors.sector2 },
                { start: 0.66, end: 1.0, color: this.colors.sector3 }
            ],
            // Track centerline points (normalized 0-1)
            centerline: [
                // Start/Finish straight
                { x: 0.5, y: 0.9, sector: 1 },
                { x: 0.5, y: 0.8, sector: 1 },
                
                // Turn 1 (Copse)
                { x: 0.45, y: 0.75, sector: 1 },
                { x: 0.4, y: 0.7, sector: 1 },
                
                // Maggotts and Becketts complex
                { x: 0.35, y: 0.6, sector: 1 },
                { x: 0.3, y: 0.5, sector: 1 },
                { x: 0.25, y: 0.4, sector: 1 },
                { x: 0.3, y: 0.3, sector: 1 },
                { x: 0.4, y: 0.25, sector: 1 },
                
                // Hangar Straight
                { x: 0.5, y: 0.2, sector: 2 },
                { x: 0.6, y: 0.15, sector: 2 },
                { x: 0.7, y: 0.1, sector: 2 },
                
                // Stowe
                { x: 0.75, y: 0.15, sector: 2 },
                { x: 0.8, y: 0.2, sector: 2 },
                
                // Vale and Club
                { x: 0.85, y: 0.3, sector: 2 },
                { x: 0.9, y: 0.4, sector: 2 },
                { x: 0.85, y: 0.5, sector: 2 },
                { x: 0.8, y: 0.6, sector: 2 },
                
                // Abbey
                { x: 0.75, y: 0.7, sector: 3 },
                { x: 0.7, y: 0.75, sector: 3 },
                
                // Farm Curve
                { x: 0.65, y: 0.8, sector: 3 },
                { x: 0.6, y: 0.85, sector: 3 },
                
                // Back to start/finish
                { x: 0.55, y: 0.9, sector: 3 },
                { x: 0.5, y: 0.9, sector: 3 }
            ],
            // Key corners for reference
            corners: [
                { name: 'Copse', x: 0.4, y: 0.7, number: 1 },
                { name: 'Maggotts', x: 0.3, y: 0.5, number: 6 },
                { name: 'Becketts', x: 0.35, y: 0.35, number: 7 },
                { name: 'Stowe', x: 0.75, y: 0.15, number: 13 },
                { name: 'Vale', x: 0.85, y: 0.3, number: 14 },
                { name: 'Club', x: 0.85, y: 0.5, number: 15 },
                { name: 'Abbey', x: 0.75, y: 0.7, number: 16 },
                { name: 'Farm', x: 0.65, y: 0.8, number: 17 }
            ]
        };
        
        this.centerTrack();
    }
    
    /**
     * Center track in canvas
     */
    centerTrack() {
        if (!this.trackData) return;
        
        const padding = 80;
        const availableWidth = this.canvas.width - padding * 2;
        const availableHeight = this.canvas.height - padding * 2;
        
        // Set a more reasonable initial scale
        this.scale = Math.min(availableWidth, availableHeight) * 0.6;
        this.offsetX = this.canvas.width / 2;
        this.offsetY = this.canvas.height / 2;
    }
    
    /**
     * Convert track coordinates to canvas coordinates
     */
    trackToCanvas(trackX, trackY) {
        const canvasX = this.offsetX + (trackX - 0.5) * this.scale;
        const canvasY = this.offsetY + (trackY - 0.5) * this.scale;
        return { x: canvasX, y: canvasY };
    }
    
    /**
     * Update car position
     */
    updateCarPosition(carId, x, y, heading = 0, isPlayer = false) {
        this.cars.set(carId, {
            x: x,
            y: y,
            heading: heading,
            isPlayer: isPlayer,
            lastUpdate: Date.now()
        });
        
        if (isPlayer) {
            this.playerCarId = carId;
        }
    }
    
    /**
     * Start render loop
     */
    startRenderLoop() {
        const render = () => {
            this.render();
            this.animationId = requestAnimationFrame(render);
        };
        
        render();
    }
    
    /**
     * Stop render loop
     */
    stopRenderLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * Main render function
     */
    render() {
        // Clear canvas
        this.ctx.fillStyle = this.colors.grass;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (!this.trackData) return;
        
        // Draw track
        this.drawTrack();
        
        // Draw sectors
        this.drawSectors();
        
        // Draw corner markers
        this.drawCorners();
        
        // Draw cars
        this.drawCars();
        
        // Draw racing line (optional)
        if (this.showRacingLine) {
            this.drawRacingLine();
        }
        
        // Draw UI overlay
        this.drawUIOverlay();
    }
    
    /**
     * Draw track layout
     */
    drawTrack() {
        const points = this.trackData.centerline;
        if (points.length < 2) return;
        
        this.ctx.lineWidth = this.trackWidth * (this.scale / 400);
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        // Draw track surface
        this.ctx.strokeStyle = this.colors.track;
        this.ctx.beginPath();
        
        const firstPoint = this.trackToCanvas(points[0].x, points[0].y);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < points.length; i++) {
            const point = this.trackToCanvas(points[i].x, points[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        
        // Close the loop
        this.ctx.lineTo(firstPoint.x, firstPoint.y);
        this.ctx.stroke();
        
        // Draw track borders
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = this.colors.trackBorder;
        this.ctx.stroke();
    }
    
    /**
     * Draw sector indicators
     */
    drawSectors() {
        const points = this.trackData.centerline;
        
        for (let i = 0; i < points.length - 1; i++) {
            const point = points[i];
            const nextPoint = points[i + 1];
            
            // Change color based on sector
            let sectorColor = this.colors.sector1;
            if (point.sector === 2) sectorColor = this.colors.sector2;
            if (point.sector === 3) sectorColor = this.colors.sector3;
            
            const canvasPoint = this.trackToCanvas(point.x, point.y);
            const canvasNextPoint = this.trackToCanvas(nextPoint.x, nextPoint.y);
            
            // Draw sector line segment
            this.ctx.strokeStyle = sectorColor;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.moveTo(canvasPoint.x, canvasPoint.y);
            this.ctx.lineTo(canvasNextPoint.x, canvasNextPoint.y);
            this.ctx.stroke();
        }
    }
    
    /**
     * Draw corner markers and names
     */
    drawCorners() {
        if (this.scale < 200) return; // Only show when zoomed in enough
        
        this.trackData.corners.forEach(corner => {
            const canvasPos = this.trackToCanvas(corner.x, corner.y);
            
            // Draw corner marker
            this.ctx.fillStyle = this.colors.trackBorder;
            this.ctx.beginPath();
            this.ctx.arc(canvasPos.x, canvasPos.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Draw corner name
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px JetBrains Mono';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(corner.name, canvasPos.x, canvasPos.y - 8);
            this.ctx.fillText(`T${corner.number}`, canvasPos.x, canvasPos.y + 16);
        });
    }
    
    /**
     * Draw cars on track
     */
    drawCars() {
        this.cars.forEach((car, carId) => {
            const canvasPos = this.trackToCanvas(car.x, car.y);
            const carSize = this.carSize * (this.scale / 400);
            
            this.ctx.save();
            this.ctx.translate(canvasPos.x, canvasPos.y);
            this.ctx.rotate(car.heading);
            
            // Draw car body
            const color = car.isPlayer ? this.colors.playerCar : this.colors.otherCar;
            this.ctx.fillStyle = color;
            this.ctx.fillRect(-carSize/2, -carSize/4, carSize, carSize/2);
            
            // Draw car direction indicator
            this.ctx.fillStyle = '#ffffff';
            this.ctx.fillRect(carSize/3, -carSize/8, carSize/6, carSize/4);
            
            this.ctx.restore();
            
            // Draw car trail for player
            if (car.isPlayer && this.showCarTrail) {
                this.drawCarTrail(carId);
            }
            
            // Draw car info
            if (this.scale > 300) {
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = '8px JetBrains Mono';
                this.ctx.textAlign = 'center';
                this.ctx.fillText(carId, canvasPos.x, canvasPos.y - carSize);
            }
        });
    }
    
    /**
     * Draw racing line
     */
    drawRacingLine() {
        const points = this.trackData.centerline;
        
        this.ctx.strokeStyle = this.colors.racingLine;
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        
        const firstPoint = this.trackToCanvas(points[0].x, points[0].y);
        this.ctx.moveTo(firstPoint.x, firstPoint.y);
        
        for (let i = 1; i < points.length; i++) {
            const point = this.trackToCanvas(points[i].x, points[i].y);
            this.ctx.lineTo(point.x, point.y);
        }
        
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }
    
    /**
     * Draw UI overlay with track info
     */
    drawUIOverlay() {
        // Draw scale indicator
        this.ctx.fillStyle = 'rgba(13, 17, 23, 0.8)';
        this.ctx.fillRect(10, this.canvas.height - 60, 150, 50);
        
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '10px JetBrains Mono';
        this.ctx.textAlign = 'left';
        this.ctx.fillText(`Scale: ${(this.scale / 400 * 100).toFixed(0)}%`, 15, this.canvas.height - 40);
        this.ctx.fillText(`Cars: ${this.cars.size}`, 15, this.canvas.height - 25);
        this.ctx.fillText('Scroll: Zoom, Drag: Pan', 15, this.canvas.height - 10);
    }
    
    /**
     * Simulate car movement for demo
     */
    startSimulation() {
        let progress = 0;
        const speed = 0.002; // Track progress per frame
        
        const simulate = () => {
            progress += speed;
            if (progress >= 1) progress = 0;
            
            // Calculate position along track
            const pointIndex = Math.floor(progress * (this.trackData.centerline.length - 1));
            const nextIndex = (pointIndex + 1) % this.trackData.centerline.length;
            const localProgress = (progress * (this.trackData.centerline.length - 1)) % 1;
            
            const currentPoint = this.trackData.centerline[pointIndex];
            const nextPoint = this.trackData.centerline[nextIndex];
            
            // Interpolate position
            const x = currentPoint.x + (nextPoint.x - currentPoint.x) * localProgress;
            const y = currentPoint.y + (nextPoint.y - currentPoint.y) * localProgress;
            
            // Calculate heading
            const heading = Math.atan2(nextPoint.y - currentPoint.y, nextPoint.x - currentPoint.x);
            
            this.updateCarPosition('player', x, y, heading, true);
            
            // Add some AI cars
            for (let i = 1; i <= 3; i++) {
                const aiProgress = (progress + i * 0.1) % 1;
                const aiPointIndex = Math.floor(aiProgress * (this.trackData.centerline.length - 1));
                const aiNextIndex = (aiPointIndex + 1) % this.trackData.centerline.length;
                const aiLocalProgress = (aiProgress * (this.trackData.centerline.length - 1)) % 1;
                
                const aiCurrentPoint = this.trackData.centerline[aiPointIndex];
                const aiNextPoint = this.trackData.centerline[aiNextIndex];
                
                const aiX = aiCurrentPoint.x + (aiNextPoint.x - aiCurrentPoint.x) * aiLocalProgress;
                const aiY = aiCurrentPoint.y + (aiNextPoint.y - aiCurrentPoint.y) * aiLocalProgress;
                const aiHeading = Math.atan2(aiNextPoint.y - aiCurrentPoint.y, aiNextPoint.x - aiCurrentPoint.x);
                
                this.updateCarPosition(`ai${i}`, aiX, aiY, aiHeading, false);
            }
            
            setTimeout(simulate, 50); // 20 FPS
        };
        
        simulate();
        console.log('[TrackMap] Simulation started');
    }
    
    /**
     * Toggle racing line display
     */
    toggleRacingLine() {
        this.showRacingLine = !this.showRacingLine;
    }
    
    /**
     * Toggle car trail display
     */
    toggleCarTrail() {
        this.showCarTrail = !this.showCarTrail;
    }
    
    /**
     * Reset view to center
     */
    resetView() {
        this.centerTrack();
    }
    
    /**
     * Cleanup
     */
    destroy() {
        this.stopRenderLoop();
        this.cars.clear();
    }
}

// Export for use in other modules
window.TrackMapRenderer = TrackMapRenderer;
