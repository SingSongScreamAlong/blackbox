#!/usr/bin/env python3
"""
Minimal Flask app for Project Blackbox - Python-only deployment test
"""
from flask import Flask
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)

@app.route('/')
def index():
    """Simple test endpoint"""
    return """
    <h1>Project Blackbox Backend</h1>
    <p>Python Flask server is running successfully!</p>
    <p>WebSocket and Team HUD functionality will be added once deployment is stable.</p>
    <p>Status: ✅ Deployment Successful</p>
    """

@app.route('/health')
def health():
    """Health check endpoint"""
    return {"status": "healthy", "service": "project-blackbox"}

@app.route('/api/test')
def api_test():
    """API test endpoint"""
    return {"message": "API is working", "status": "success"}

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8080))
    host = '0.0.0.0'
    
    logger.info(f"Starting minimal Project Blackbox on {host}:{port}")
    app.run(host=host, port=port, debug=False)
