"""
Project: Blackbox Driver Side
Main entry point for the driver-side telemetry and voice client.

- Initializes all modules (telemetry, voice, network, UI)
- Loads config
- Handles platform detection (Windows/Mac)
- Starts the main event loop
"""
import sys
import platform
from config.config_manager import load_config
from telemetry.telemetry_manager import TelemetryManager
from voice.voice_manager import VoiceManager
from network.network_manager import NetworkManager
from ui.driver_overlay import DriverOverlay
from update_manager import UpdateManager
from logger import Logger

def validate_config(config, logger):
    valid = True
    errors = []
    # ElevenLabs API key validation (basic length check, should be tested via UI for live check)
    elevenlabs_key = config.get('api_keys', {}).get('elevenlabs', '')
    if not elevenlabs_key or len(elevenlabs_key) < 10:
        logger.error("[Preflight] ElevenLabs API key missing or too short.")
        errors.append("ElevenLabs API key missing or too short.")
        valid = False
    # Whisper key validation (optional, placeholder)
    # Audio device validation
    import sounddevice as sd
    input_device = config.get('voice', {}).get('input_device', 'default')
    output_device = config.get('voice', {}).get('output_device', 'default')
    input_devices = [d['name'] for d in sd.query_devices() if d['max_input_channels'] > 0]
    output_devices = [d['name'] for d in sd.query_devices() if d['max_output_channels'] > 0]
    if input_device not in input_devices:
        logger.error(f"[Preflight] Input device '{input_device}' not found.")
        errors.append(f"Input device '{input_device}' not found.")
        valid = False
    if output_device not in output_devices:
        logger.error(f"[Preflight] Output device '{output_device}' not found.")
        errors.append(f"Output device '{output_device}' not found.")
        valid = False
    if not valid:
        logger.error("[Preflight] Configuration validation failed.")
        print("\nCONFIGURATION ERRORS:")
        for err in errors:
            print(f"- {err}")
        print("\nPlease run 'python ui/config_panel.py' to fix your configuration.")
    else:
        logger.info("[Preflight] Configuration validated successfully.")
    return valid

import time

def main():
    logger = Logger(level="info", to_file=True)
    logger.info("[BlackboxDriver] Starting...")
    config = load_config()
    os_type = platform.system()

    # Pre-flight validation
    if not validate_config(config, logger):
        logger.error("[BlackboxDriver] Exiting due to invalid configuration.")
        return

    # Initialize modules
    telemetry = TelemetryManager(config, os_type, logger=logger)
    voice = VoiceManager(config, logger=logger)
    network = NetworkManager(config, logger=logger)
    ui = DriverOverlay(config, telemetry, voice, network, logger=logger)
    update_manager = UpdateManager(config, logger=logger)

    # Start modules
    telemetry.start()
    voice.start()
    network.start()
    ui.start()
    
    # Check for updates on startup
    logger.info("[BlackboxDriver] Checking for updates...")
    update_manager.auto_update_check()

    logger.info("[BlackboxDriver] All systems started. Running main loop...")
    try:
        while True:
            telemetry.update()
            voice.update()
            network.update()
            ui.update()
            # Periodic health check and UI update
            tele_stat = telemetry.get_status() if hasattr(telemetry, 'get_status') else ('OK', '')
            voice_stat = voice.get_status() if hasattr(voice, 'get_status') else ('OK', '')
            net_stat = network.get_status() if hasattr(network, 'get_status') else ('OK', '')
            ui_stat = ui.get_status() if hasattr(ui, 'get_status') else ('OK', '')
            ui.update_status(tele_stat, voice_stat, net_stat, ui_stat)
            time.sleep(0.5)
            
            # Periodic update check
            update_manager.auto_update_check()
    except KeyboardInterrupt:
        logger.info("[BlackboxDriver] Shutting down...")
        telemetry.stop()
        voice.stop()
        network.stop()
        ui.stop()
    except Exception as e:
        logger.error(f"[BlackboxDriver] Unhandled exception: {e}")
        telemetry.stop()
        voice.stop()
        network.stop()
        ui.stop()

if __name__ == "__main__":
    main()
