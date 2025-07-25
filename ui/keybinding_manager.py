"""
Keybinding Manager
- Manages customizable keybindings for all user actions
- Loads/saves from config
- Provides interface for UI to update and listen for key events
"""
import json

class KeybindingManager:
    def __init__(self, config):
        self.keybindings = config.get("keybindings", {})

    def get_key(self, action):
        return self.keybindings.get(action)

    def set_key(self, action, key):
        self.keybindings[action] = key

    def save(self, config_path):
        with open(config_path, "w") as f:
            json.dump(self.keybindings, f, indent=2)
