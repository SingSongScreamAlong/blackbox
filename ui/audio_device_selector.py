"""
Audio Device Selector UI Stub
- Lists available audio input/output devices
- Allows user to select devices
- Integrates with config and voice manager
"""
import sounddevice as sd

class AudioDeviceSelector:
    def __init__(self, config):
        self.config = config

    def list_input_devices(self):
        return [d['name'] for d in sd.query_devices() if d['max_input_channels'] > 0]

    def list_output_devices(self):
        return [d['name'] for d in sd.query_devices() if d['max_output_channels'] > 0]

    def set_input_device(self, device_name):
        self.config['voice']['input_device'] = device_name

    def set_output_device(self, device_name):
        self.config['voice']['output_device'] = device_name
