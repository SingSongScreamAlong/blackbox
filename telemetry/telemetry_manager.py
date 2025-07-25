"""
Telemetry Manager
- Handles iRacing SDK (Windows) or stub (Mac)
- Collects and sends telemetry data
"""
import platform

class TelemetryManager:
    def __init__(self, config, os_type, logger=None):
        self.config = config
        self.os_type = os_type
        self.logger = logger
        self.active = False
        if self.os_type == "Windows":
            try:
                import irsdk
                self.irsdk = irsdk
                if self.logger:
                    self.logger.info("[Telemetry] irsdk loaded.")
            except ImportError:
                if self.logger:
                    self.logger.error("[Telemetry] irsdk not available. Install on Windows.")
                self.irsdk = None
        else:
            self.irsdk = None

    def start(self):
        if self.logger:
            self.logger.info(f"[Telemetry] Starting for {self.os_type}...")
        self.active = True
        # Windows: connect to iRacing SDK
        # Mac: stub only

    def update(self):
        if not self.active:
            return
        try:
            if self.os_type == "Windows" and self.irsdk:
                # Example: get session info or telemetry packet
                data = str(self.irsdk.get_session_info())
            else:
                data = '{"stub_telemetry": true, "timestamp": 0}'
            if hasattr(self, 'network') and self.network and self.network.connected:
                sent = self.network.send_telemetry(data)
                if self.logger:
                    if sent:
                        self.logger.info("[Telemetry] Telemetry sent to backend.")
                    else:
                        self.logger.error("[Telemetry] Failed to send telemetry to backend.")
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Telemetry] Exception during update: {e}")
        if self.irsdk:
            # TODO: Read and send telemetry
            if self.logger:
                self.logger.debug("[Telemetry] Reading real telemetry data.")
            pass
        else:
            # Stub: print fake data
            if self.logger:
                self.logger.debug("[Telemetry] (stub) No real telemetry on this platform.")

    def stop(self):
        if self.logger:
            self.logger.info("[Telemetry] Stopping...")
        self.active = False
