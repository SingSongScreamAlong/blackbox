#!/usr/bin/env python3
"""
Simple backend server for Project Blackbox on DigitalOcean App Platform
Handles WebSocket connections, telemetry streaming, and voice communication
"""
import asyncio
import websockets
import json
import logging
import os
import sys
from datetime import datetime

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Store active connections
clients = set()

print("Starting Project Blackbox server...")
logger.info("Server initialization starting")

async def handle_client(websocket, path):
    """Handle WebSocket client connections"""
    clients.add(websocket)
    logger.info(f"Client connected. Total clients: {len(clients)}")
    
    try:
        async for message in websocket:
            try:
                data = json.loads(message)
                message_type = data.get('type', 'unknown')
                
                # Handle different message types
                if message_type == 'telemetry':
                    # Broadcast telemetry to all connected clients
                    await broadcast_to_clients({
                        'type': 'telemetry_update',
                        'data': data.get('data', {}),
                        'timestamp': datetime.now().isoformat()
                    })
                    
                elif message_type == 'voice':
                    # Handle voice communication
                    await broadcast_to_clients({
                        'type': 'voice_message',
                        'data': data.get('data', {}),
                        'timestamp': datetime.now().isoformat()
                    })
                    
                elif message_type == 'ping':
                    # Respond to ping with pong
                    await websocket.send(json.dumps({
                        'type': 'pong',
                        'timestamp': datetime.now().isoformat()
                    }))
                    
                elif message_type == 'status':
                    # Send status update
                    await websocket.send(json.dumps({
                        'type': 'status_response',
                        'connected_clients': len(clients),
                        'timestamp': datetime.now().isoformat()
                    }))
                    
                else:
                    logger.warning(f"Unknown message type: {message_type}")
                    
            except json.JSONDecodeError:
                logger.error("Invalid JSON received")
            except Exception as e:
                logger.error(f"Error handling message: {e}")
                
    except websockets.exceptions.ConnectionClosed:
        logger.info("Client disconnected")
    finally:
        clients.discard(websocket)
        logger.info(f"Client removed. Total clients: {len(clients)}")

async def broadcast_to_clients(message):
    """Broadcast message to all connected clients"""
    if clients:
        message_json = json.dumps(message)
        await asyncio.gather(
            *[client.send(message_json) for client in clients],
            return_exceptions=True
        )

async def health_check():
    """Periodic health check and cleanup"""
    while True:
        await asyncio.sleep(30)  # Check every 30 seconds
        
        # Remove disconnected clients
        disconnected = []
        for client in clients.copy():
            if client.closed:
                disconnected.append(client)
        
        for client in disconnected:
            clients.discard(client)
            
        if disconnected:
            logger.info(f"Cleaned up {len(disconnected)} disconnected clients")

import http.server
import socketserver
import threading
from urllib.parse import urlparse

def serve_static_files():
    """Serve static files from team directory"""
    import os
    os.chdir('team')
    handler = http.server.SimpleHTTPRequestHandler
    httpd = socketserver.TCPServer(("", 8081), handler)
    logger.info("Static file server started on port 8081")
    httpd.serve_forever()

def main():
    """Main server entry point"""
    port = int(os.environ.get('PORT', 8080))
    host = '0.0.0.0'
    
    logger.info(f"Starting Project Blackbox WebSocket server on {host}:{port}")
    
    # Start static file server in background thread
    static_thread = threading.Thread(target=serve_static_files, daemon=True)
    static_thread.start()
    
    # Start health check task
    asyncio.get_event_loop().create_task(health_check())
    
    # Start WebSocket server
    start_server = websockets.serve(handle_client, host, port)
    
    logger.info("Server started successfully")
    asyncio.get_event_loop().run_until_complete(start_server)
    asyncio.get_event_loop().run_forever()

if __name__ == "__main__":
    main()
