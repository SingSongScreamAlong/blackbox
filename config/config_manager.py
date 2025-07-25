"""
Config manager for Blackbox Driver Side
- Loads and saves config/settings
- Supports per-profile config (track/car)
- Explicit support for ElevenLabs and Whisper API keys via 'api_keys' dict
- Supports customizable keybindings for all user actions

Usage:
- API keys for ElevenLabs, Whisper, etc. are stored in config['api_keys']
- Keybindings for overlay, PTT, device cycling, etc. are stored in config['keybindings']
"""
import json
import os
from platformdirs import user_config_dir

CONFIG_PATH = user_config_dir("BlackboxDriver")
SETTINGS_FILE = os.path.join(CONFIG_PATH, "settings.json")
SETTINGS_LOCAL_FILE = os.path.join(os.path.dirname(__file__), "settings.local.json")

DEFAULT_CONFIG = {
    "network": {
        "server_url": "wss://your.digitalocean.server/ws",
        "api_key": "YOUR_BACKEND_API_KEY"
    },
    "api_keys": {
        "elevenlabs": "YOUR_ELEVENLABS_API_KEY_HERE",
        "deepgram": "YOUR_DEEPGRAM_API_KEY_HERE"
    },
    "voice": {
        "stt": "deepgram",
        "tts": "elevenlabs",
        "input_device": "default",
        "output_device": "default",
        "volume": 1.0
    },
    "ui": {
        "overlay_enabled": True,
        "toggle_key": "F1"
    },
    "keybindings": {
        "toggle_overlay": "F1",
        "push_to_talk": "V",
        "next_audio_device": "F2",
        "prev_audio_device": "F3"
    },
    "profile": "default"
}

def load_config():
    """Load configuration from settings file, preferring local settings"""
    config = DEFAULT_CONFIG.copy()
    
    # First try to load from user config directory
    if os.path.exists(SETTINGS_FILE):
        try:
            with open(SETTINGS_FILE, 'r') as f:
                config.update(json.load(f))
        except Exception as e:
            print(f"Error loading config from {SETTINGS_FILE}: {e}")
    
    # Then try to load from local settings (overrides user config)
    if os.path.exists(SETTINGS_LOCAL_FILE):
        try:
            with open(SETTINGS_LOCAL_FILE, 'r') as f:
                config.update(json.load(f))
        except Exception as e:
            print(f"Error loading local config from {SETTINGS_LOCAL_FILE}: {e}")
    
    # If no config files exist, create default in user config dir
    if not os.path.exists(SETTINGS_FILE) and not os.path.exists(SETTINGS_LOCAL_FILE):
        os.makedirs(CONFIG_PATH, exist_ok=True)
        save_config(config)
    
    return config

def save_config(config):
    os.makedirs(CONFIG_PATH, exist_ok=True)
    with open(SETTINGS_FILE, "w") as f:
        json.dump(config, f, indent=2)
