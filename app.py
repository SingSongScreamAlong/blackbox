#!/usr/bin/env python3
"""
Simple Flask app for Project Blackbox on DigitalOcean App Platform
Serves both WebSocket connections and static files
"""
from flask import Flask, render_template, send_from_directory
from flask_socketio import SocketIO, emit
import os
import logging
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, 
            static_folder='static/team',
            template_folder='static/team')
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'blackbox-secret-key')

# Initialize SocketIO
socketio = SocketIO(app, cors_allowed_origins="*")

print("Starting Project Blackbox Flask app...")
logger.info("Flask app initialization starting")

@app.route('/')
def index():
    """Serve the Team Engineer HUD"""
    try:
        return send_from_directory('static/team', 'index.html')
    except Exception as e:
        logger.error(f"Error serving index.html: {e}")
        return f"<h1>Project Blackbox</h1><p>Team Engineer HUD loading...</p><p>Error: {e}</p>"

@app.route('/<path:filename>')
def static_files(filename):
    """Serve static files"""
    try:
        return send_from_directory('static/team', filename)
    except Exception as e:
        logger.error(f"Error serving {filename}: {e}")
        return f"File not found: {filename}", 404

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    logger.info(f"Client connected: {request.sid if 'request' in globals() else 'unknown'}")
    emit('status', {
        'type': 'connection_confirmed',
        'timestamp': datetime.now().isoformat(),
        'message': 'Connected to Project Blackbox backend'
    })

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    logger.info(f"Client disconnected: {request.sid if 'request' in globals() else 'unknown'}")

@socketio.on('telemetry')
def handle_telemetry(data):
    """Handle telemetry data"""
    logger.info("Received telemetry data")
    # Broadcast to all connected clients
    emit('telemetry_update', {
        'type': 'telemetry_update',
        'data': data,
        'timestamp': datetime.now().isoformat()
    }, broadcast=True)

@socketio.on('voice')
def handle_voice(data):
    """Handle voice communication"""
    logger.info("Received voice data")
    # Broadcast to all connected clients
    emit('voice_message', {
        'type': 'voice_message',
        'data': data,
        'timestamp': datetime.now().isoformat()
    }, broadcast=True)

@socketio.on('ping')
def handle_ping():
    """Handle ping requests"""
    emit('pong', {
        'type': 'pong',
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    host = '0.0.0.0'
    
    logger.info(f"Starting Project Blackbox on {host}:{port}")
    
    # Run the Flask-SocketIO app
    socketio.run(app, host=host, port=port, debug=False)
