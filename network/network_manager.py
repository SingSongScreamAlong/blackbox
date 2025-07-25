"""
Network Manager
- Handles WebSocket/REST communication with Engine
- Manages authentication, reconnection, and status
"""
import threading
import platform

class NetworkManager:
    def __init__(self, config, logger=None):
        self.config = config
        self.logger = logger
        self.active = False
        self.status = 'OK'
        self.status_detail = ''
        self.connected = False
        self.connection = None
        self.lock = threading.Lock()
        self.os_type = platform.system()

    def validate(self):
        valid = True
        errors = []
        if not self.config.get('network', {}).get('server_url'):
            errors.append("Network server_url missing in config.")
            valid = False
        if not valid:
            self.status = 'ERROR'
            self.status_detail = '; '.join(errors)
            if self.logger:
                self.logger.error(f"[Network] Validation failed: {self.status_detail}")
        else:
            self.status = 'OK'
            self.status_detail = ''
        return valid

    def get_status(self):
        if not self.active:
            return ('ERROR', 'NetworkManager not active')
        if not self.connected:
            return ('ERROR', 'Not connected to backend')
        return (self.status, self.status_detail)

    def connect(self):
        url = self.config.get('network', {}).get('server_url', '')
        api_key = self.config.get('network', {}).get('api_key', '')
        if url.startswith('ws'):
            try:
                import websocket
                headers = []
                if api_key:
                    headers.append(f"Authorization: Bearer {api_key}")
                self.connection = websocket.create_connection(url, header=headers, timeout=5)
                self.connected = True
                self.status = 'OK'
                self.status_detail = 'Connected to backend (WebSocket)'
                if self.logger:
                    self.logger.info(f"[Network] Connected to backend WebSocket: {url}")
            except Exception as e:
                self.connected = False
                self.status = 'ERROR'
                self.status_detail = f'WebSocket connect failed: {e}'
                if self.logger:
                    self.logger.error(f"[Network] WebSocket connect failed: {e}")
        elif url.startswith('http'):
            try:
                import requests
                headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    self.connected = True
                    self.status = 'OK'
                    self.status_detail = 'Connected to backend (HTTP)'
                    if self.logger:
                        self.logger.info(f"[Network] Connected to backend HTTP: {url}")
                else:
                    self.connected = False
                    self.status = 'ERROR'
                    self.status_detail = f'HTTP connect failed: {resp.status_code} {resp.text}'
                    if self.logger:
                        self.logger.error(f"[Network] HTTP connect failed: {resp.status_code} {resp.text}")
            except Exception as e:
                self.connected = False
                self.status = 'ERROR'
                self.status_detail = f'HTTP connect failed: {e}'
                if self.logger:
                    self.logger.error(f"[Network] HTTP connect failed: {e}")
        else:
            self.connected = False
            self.status = 'ERROR'
            self.status_detail = 'Unknown backend URL scheme.'
            if self.logger:
                self.logger.error(f"[Network] Unknown backend URL scheme: {url}")

    def disconnect(self):
        with self.lock:
            if self.connection:
                try:
                    self.connection.close()
                except Exception:
                    pass
                self.connection = None
            self.connected = False
            self.status = 'ERROR'
            self.status_detail = 'Disconnected'
            if self.logger:
                self.logger.info("[Network] Disconnected from backend")

    def send_telemetry(self, data):
        # Send telemetry data to backend
        if not self.connected:
            return False
        url = self.config.get('network', {}).get('server_url', '')
        try:
            if url.startswith('ws'):
                self.connection.send(data)
                return True
            elif url.startswith('http'):
                import requests
                api_key = self.config.get('network', {}).get('api_key', '')
                headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
                resp = requests.post(url, headers=headers, data=data, timeout=5)
                return resp.status_code == 200
        except Exception as e:
            self.status = 'ERROR'
            self.status_detail = f'Send failed: {e}'
            if self.logger:
                self.logger.error(f"[Network] Send failed: {e}")
            return False

    def start(self):
        if self.logger:
            self.logger.info("[Network] Starting...")
        if not self.validate():
            if self.logger:
                self.logger.error(f"[Network] Not starting due to config error: {self.status_detail}")
            self.active = False
            return
        self.active = True
        if self.os_type == 'Windows' or self.config.get('network', {}).get('server_url', '').startswith('ws'):
            threading.Thread(target=self.connect, daemon=True).start()
        else:
            # On Mac, simulate connection for dev
            self.connected = True
            self.status = 'OK'
            self.status_detail = 'Simulated connection (Mac/dev)'
            if self.logger:
                self.logger.info("[Network] Simulated backend connection (Mac/dev)")

    def update(self):
        if not self.active:
            return
        # Optionally, check connection health or try reconnect
        if not self.connected and self.active:
            self.connect()

    def stop(self):
        if self.logger:
            self.logger.info("[Network] Stopping...")
        self.disconnect()
        self.active = False
