"""
Config Panel UI (cross-platform, minimal)
- Allows user to view/edit API keys, select audio devices, and customize keybindings
- Uses Tkinter for native cross-platform support (can be swapped for Tauri/Electron later)
"""
import tkinter as tk
from tkinter import ttk, messagebox
from config.config_manager import load_config, save_config
from ui.audio_device_selector import AudioDeviceSelector
from ui.keybinding_manager import KeybindingManager

import requests
import sounddevice as sd
from logger import Logger

class ConfigPanel:
    def __init__(self, root):
        self.root = root
        self.root.title("Blackbox Driver Config Panel")
        self.config = load_config()
        self.audio_selector = AudioDeviceSelector(self.config)
        self.keybinding_manager = KeybindingManager(self.config)
        self.logger = Logger(level="info", to_file=True)
        self.status_var = tk.StringVar()
        self.build_ui()

    def build_ui(self):
        tab_control = ttk.Notebook(self.root)
        tab_api = ttk.Frame(tab_control)
        tab_audio = ttk.Frame(tab_control)
        tab_keys = ttk.Frame(tab_control)
        tab_network = ttk.Frame(tab_control)
        tab_control.add(tab_api, text='API Keys')
        tab_control.add(tab_audio, text='Audio Devices')
        tab_control.add(tab_keys, text='Keybindings')
        tab_control.add(tab_network, text='Network')
        tab_control.pack(expand=1, fill='both')

        # API Keys Tab
        ttk.Label(tab_api, text="ElevenLabs API Key:").pack(anchor='w')
        self.elevenlabs_var = tk.StringVar(value=self.config.get('api_keys', {}).get('elevenlabs', ''))
        tk.Entry(tab_api, textvariable=self.elevenlabs_var, width=50).pack(anchor='w')
        ttk.Button(tab_api, text="Test", command=self.test_elevenlabs_key).pack(anchor='w', pady=2)
        ttk.Label(tab_api, text="Deepgram API Key:").pack(anchor='w')
        self.deepgram_var = tk.StringVar(value=self.config.get('api_keys', {}).get('deepgram', ''))
        tk.Entry(tab_api, textvariable=self.deepgram_var, width=50).pack(anchor='w')
        ttk.Button(tab_api, text="Test", command=self.test_deepgram_key).pack(anchor='w', pady=2)

        # Audio Devices Tab
        ttk.Label(tab_audio, text="Input Device:").pack(anchor='w')
        self.input_device_var = tk.StringVar(value=self.config['voice'].get('input_device', 'default'))
        input_devices = self.audio_selector.list_input_devices()
        self.input_combo = ttk.Combobox(tab_audio, textvariable=self.input_device_var, values=input_devices, width=50)
        self.input_combo.pack(anchor='w')
        ttk.Button(tab_audio, text="Test Input Device", command=self.test_input_device).pack(anchor='w', pady=2)
        ttk.Label(tab_audio, text="Output Device:").pack(anchor='w')
        self.output_device_var = tk.StringVar(value=self.config['voice'].get('output_device', 'default'))
        output_devices = self.audio_selector.list_output_devices()
        self.output_combo = ttk.Combobox(tab_audio, textvariable=self.output_device_var, values=output_devices, width=50)
        self.output_combo.pack(anchor='w')
        ttk.Button(tab_audio, text="Test Output Device", command=self.test_output_device).pack(anchor='w', pady=2)

        # Keybindings Tab
        self.key_vars = {}
        self.binding_buttons = {}
        self.waiting_for_key = None
        
        for action, key in self.config.get('keybindings', {}).items():
            frame = tk.Frame(tab_keys)
            frame.pack(anchor='w', fill='x', pady=2)
            
            ttk.Label(frame, text=f"{action.replace('_',' ').title()}:", width=20).pack(side='left')
            
            var = tk.StringVar(value=key)
            self.key_vars[action] = var
            
            key_label = tk.Label(frame, textvariable=var, width=10, relief='sunken', bg='white')
            key_label.pack(side='left', padx=5)
            
            bind_btn = ttk.Button(frame, text="Bind Key", command=lambda a=action: self.start_key_binding(a))
            bind_btn.pack(side='left', padx=5)
            self.binding_buttons[action] = bind_btn
        
        # Bind key capture to the entire window
        self.root.bind('<KeyPress>', self.on_key_press)
        self.root.focus_set()

        # Network Tab
        ttk.Label(tab_network, text="Backend Server URL:").pack(anchor='w')
        self.server_url_var = tk.StringVar(value=self.config.get('network', {}).get('server_url', ''))
        tk.Entry(tab_network, textvariable=self.server_url_var, width=50).pack(anchor='w')
        ttk.Label(tab_network, text="Backend API Key:").pack(anchor='w')
        self.backend_api_key_var = tk.StringVar(value=self.config.get('network', {}).get('api_key', ''))
        tk.Entry(tab_network, textvariable=self.backend_api_key_var, width=50).pack(anchor='w')
        ttk.Button(tab_network, text="Test Connection", command=self.test_backend_connection).pack(anchor='w', pady=2)

        # Status Label
        ttk.Label(self.root, textvariable=self.status_var, foreground="blue").pack(side='bottom', pady=2)
        # Save Button
        ttk.Button(self.root, text="Save Settings", command=self.save).pack(side='bottom', pady=10)

    def set_status(self, msg, error=False):
        self.status_var.set(msg)
        if error:
            self.logger.error(msg)
        else:
            self.logger.info(msg)

    def test_elevenlabs_key(self):
        key = self.elevenlabs_var.get()
        try:
            resp = requests.get(
                "https://api.elevenlabs.io/v1/user",
                headers={"xi-api-key": key}, timeout=5)
            if resp.status_code == 200:
                self.set_status("ElevenLabs key is valid.")
                messagebox.showinfo("Test Result", "ElevenLabs key is valid.")
            else:
                self.set_status("ElevenLabs key invalid or not authorized.", error=True)
                messagebox.showerror("Test Result", "ElevenLabs key invalid or not authorized.")
        except Exception as e:
            self.set_status(f"Error testing ElevenLabs key: {e}", error=True)
            messagebox.showerror("Test Result", f"Error testing ElevenLabs key: {e}")

    def test_deepgram_key(self):
        key = self.deepgram_var.get()
        if not key or len(key) < 10:
            self.set_status("Deepgram key missing or too short.", error=True)
            messagebox.showerror("Test Result", "Deepgram key missing or too short.")
            return
        
        try:
            # Test Deepgram API key with a simple request
            resp = requests.get(
                "https://api.deepgram.com/v1/projects",
                headers={"Authorization": f"Token {key}"}, timeout=5)
            if resp.status_code == 200:
                self.set_status("Deepgram key is valid.")
                messagebox.showinfo("Test Result", "Deepgram key is valid.")
            else:
                self.set_status("Deepgram key invalid or not authorized.", error=True)
                messagebox.showerror("Test Result", "Deepgram key invalid or not authorized.")
        except Exception as e:
            self.set_status(f"Error testing Deepgram key: {e}", error=True)
            messagebox.showerror("Test Result", f"Error testing Deepgram key: {e}")

    def test_input_device(self):
        device = self.input_device_var.get()
        try:
            idx = [d['name'] for d in sd.query_devices() if d['max_input_channels'] > 0].index(device)
            with sd.InputStream(device=idx):
                self.set_status(f"Input device '{device}' is available.")
                messagebox.showinfo("Test Result", f"Input device '{device}' is available.")
        except Exception as e:
            self.set_status(f"Error testing input device: {e}", error=True)
            messagebox.showerror("Test Result", f"Error testing input device: {e}")

    def test_output_device(self):
        device = self.output_device_var.get()
        try:
            idx = [d['name'] for d in sd.query_devices() if d['max_output_channels'] > 0].index(device)
            sd.play([0]*1000, samplerate=44100, device=idx)
            self.set_status(f"Output device '{device}' is available (played test sound).")
            messagebox.showinfo("Test Result", f"Output device '{device}' is available (played test sound).")
        except Exception as e:
            self.set_status(f"Error testing output device: {e}", error=True)
            messagebox.showerror("Test Result", f"Error testing output device: {e}")

    def test_backend_connection(self):
        url = self.server_url_var.get()
        api_key = self.backend_api_key_var.get()
        if not url:
            self.set_status("Backend server URL is required.", error=True)
            messagebox.showerror("Test Result", "Backend server URL is required.")
            return
        
        try:
            if url.startswith('ws'):
                import websocket
                headers = []
                if api_key:
                    headers.append(f"Authorization: Bearer {api_key}")
                ws = websocket.create_connection(url, header=headers, timeout=5)
                ws.close()
                self.set_status("Backend WebSocket connection successful.")
                messagebox.showinfo("Test Result", "Backend WebSocket connection successful.")
            elif url.startswith('http'):
                headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
                resp = requests.get(url, headers=headers, timeout=5)
                if resp.status_code == 200:
                    self.set_status("Backend HTTP connection successful.")
                    messagebox.showinfo("Test Result", "Backend HTTP connection successful.")
                else:
                    self.set_status(f"Backend HTTP connection failed: {resp.status_code}", error=True)
                    messagebox.showerror("Test Result", f"Backend HTTP connection failed: {resp.status_code}")
            else:
                self.set_status("Unknown backend URL scheme. Use ws:// or http://", error=True)
                messagebox.showerror("Test Result", "Unknown backend URL scheme. Use ws:// or http://")
        except Exception as e:
            self.set_status(f"Backend connection failed: {e}", error=True)
            messagebox.showerror("Test Result", f"Backend connection failed: {e}")

    def save(self):
        # Update config from UI
        self.config['api_keys']['elevenlabs'] = self.elevenlabs_var.get()
        self.config['api_keys']['deepgram'] = self.deepgram_var.get()
        self.config['voice']['input_device'] = self.input_device_var.get()
        self.config['voice']['output_device'] = self.output_device_var.get()
        self.config['network']['server_url'] = self.server_url_var.get()
        self.config['network']['api_key'] = self.backend_api_key_var.get()
        for action, var in self.key_vars.items():
            self.config['keybindings'][action] = var.get()
        save_config(self.config)
        self.set_status("Settings saved.")
        messagebox.showinfo("Settings Saved", "Your settings have been saved.")
    
    def start_key_binding(self, action):
        """Start waiting for a key press to bind to the given action"""
        self.waiting_for_key = action
        self.binding_buttons[action].config(text="Press any key...", state='disabled')
        self.set_status(f"Press any key to bind to '{action.replace('_', ' ').title()}'...")
        self.root.focus_set()  # Ensure window has focus for key capture
    
    def on_key_press(self, event):
        """Handle key press events for binding"""
        if self.waiting_for_key is None:
            return
        
        # Get the key name
        key = event.keysym
        
        # Handle special keys
        if key == 'Escape':
            # Cancel binding
            self.cancel_key_binding()
            return
        
        # Update the binding
        action = self.waiting_for_key
        self.key_vars[action].set(key)
        
        # Reset UI
        self.binding_buttons[action].config(text="Bind Key", state='normal')
        self.set_status(f"Bound '{key}' to '{action.replace('_', ' ').title()}'")
        self.waiting_for_key = None
    
    def cancel_key_binding(self):
        """Cancel the current key binding operation"""
        if self.waiting_for_key:
            self.binding_buttons[self.waiting_for_key].config(text="Bind Key", state='normal')
            self.set_status("Key binding cancelled.")
            self.waiting_for_key = None

if __name__ == "__main__":
    root = tk.Tk()
    app = ConfigPanel(root)
    root.mainloop()
