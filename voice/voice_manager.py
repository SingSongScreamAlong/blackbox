"""
Voice Manager
- Handles STT (Deepgram) and TTS (ElevenLabs)
- Manages audio input/output with real-time processing
"""
import sounddevice as sd
import numpy as np
import requests
import json
import threading
import queue
import time
import io
from scipy.io import wavfile

class VoiceManager:
    def __init__(self, config, logger=None):
        self.config = config
        self.logger = logger
        self.active = False
        self.status = 'OK'
        self.status_detail = ''
        
        # Voice processing state
        self.recording = False
        self.audio_queue = queue.Queue()
        self.command_callback = None
        self.sample_rate = 16000  # Standard for speech recognition
        self.channels = 1
        
        # API clients
        self.deepgram_key = self.config.get('api_keys', {}).get('deepgram', '')
        self.elevenlabs_key = self.config.get('api_keys', {}).get('elevenlabs', '')
        
        # Audio devices
        self.input_device = None
        self.output_device = None
        self._setup_audio_devices()

    def _setup_audio_devices(self):
        """Setup audio input/output devices"""
        try:
            input_name = self.config.get('voice', {}).get('input_device', 'default')
            output_name = self.config.get('voice', {}).get('output_device', 'default')
            
            devices = sd.query_devices()
            
            # Find input device
            for i, device in enumerate(devices):
                if device['name'] == input_name and device['max_input_channels'] > 0:
                    self.input_device = i
                    break
            
            # Find output device
            for i, device in enumerate(devices):
                if device['name'] == output_name and device['max_output_channels'] > 0:
                    self.output_device = i
                    break
                    
            if self.logger:
                self.logger.info(f"[Voice] Audio devices: input={self.input_device}, output={self.output_device}")
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Voice] Error setting up audio devices: {e}")

    def validate(self):
        valid = True
        errors = []
        
        # Check Deepgram API key
        if not self.deepgram_key or len(self.deepgram_key) < 10:
            errors.append("Deepgram API key missing or too short.")
            valid = False
            
        # Check ElevenLabs API key
        if not self.elevenlabs_key or len(self.elevenlabs_key) < 10:
            errors.append("ElevenLabs API key missing or too short.")
            valid = False
        
        # Check audio devices
        input_device = self.config.get('voice', {}).get('input_device', 'default')
        output_device = self.config.get('voice', {}).get('output_device', 'default')
        input_devices = [d['name'] for d in sd.query_devices() if d['max_input_channels'] > 0]
        output_devices = [d['name'] for d in sd.query_devices() if d['max_output_channels'] > 0]
        
        if input_device not in input_devices:
            errors.append(f"Input device '{input_device}' not found.")
            valid = False
        if output_device not in output_devices:
            errors.append(f"Output device '{output_device}' not found.")
            valid = False
            
        if not valid:
            self.status = 'ERROR'
            self.status_detail = '; '.join(errors)
            if self.logger:
                self.logger.error(f"[Voice] Validation failed: {self.status_detail}")
        else:
            self.status = 'OK'
            self.status_detail = ''
        return valid

    def get_status(self):
        return self.status, self.status_detail

    def start_recording(self):
        """Start recording audio for voice commands"""
        if not self.active or self.recording:
            return
            
        self.recording = True
        if self.logger:
            self.logger.info("[Voice] Starting voice recording...")
            
        def audio_callback(indata, frames, time, status):
            if status:
                if self.logger:
                    self.logger.warning(f"[Voice] Audio callback status: {status}")
            if self.recording:
                self.audio_queue.put(indata.copy())
        
        try:
            self.stream = sd.InputStream(
                device=self.input_device,
                channels=self.channels,
                samplerate=self.sample_rate,
                callback=audio_callback,
                dtype=np.float32
            )
            self.stream.start()
        except Exception as e:
            self.recording = False
            if self.logger:
                self.logger.error(f"[Voice] Error starting recording: {e}")

    def stop_recording(self):
        """Stop recording and process the audio"""
        if not self.recording:
            return
            
        self.recording = False
        if self.logger:
            self.logger.info("[Voice] Stopping voice recording...")
            
        try:
            if hasattr(self, 'stream'):
                self.stream.stop()
                self.stream.close()
                
            # Collect recorded audio
            audio_data = []
            while not self.audio_queue.empty():
                audio_data.append(self.audio_queue.get())
                
            if audio_data:
                audio_array = np.concatenate(audio_data, axis=0)
                threading.Thread(target=self._process_speech, args=(audio_array,), daemon=True).start()
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Voice] Error stopping recording: {e}")

    def _process_speech(self, audio_data):
        """Process recorded speech using Deepgram STT"""
        try:
            # Convert float32 to int16 for Deepgram
            audio_int16 = (audio_data * 32767).astype(np.int16)
            
            # Create WAV file in memory
            wav_buffer = io.BytesIO()
            wavfile.write(wav_buffer, self.sample_rate, audio_int16)
            wav_data = wav_buffer.getvalue()
            
            # Send to Deepgram
            headers = {
                'Authorization': f'Token {self.deepgram_key}',
                'Content-Type': 'audio/wav'
            }
            
            url = 'https://api.deepgram.com/v1/listen?model=nova-2&smart_format=true'
            response = requests.post(url, headers=headers, data=wav_data, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                transcript = result.get('results', {}).get('channels', [{}])[0].get('alternatives', [{}])[0].get('transcript', '')
                
                if transcript.strip():
                    if self.logger:
                        self.logger.info(f"[Voice] Speech recognized: '{transcript}'")
                    self._handle_voice_command(transcript)
                else:
                    if self.logger:
                        self.logger.info("[Voice] No speech detected")
            else:
                if self.logger:
                    self.logger.error(f"[Voice] Deepgram API error: {response.status_code} {response.text}")
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Voice] Error processing speech: {e}")

    def _handle_voice_command(self, command):
        """Handle recognized voice command"""
        # Basic command processing - can be expanded
        command_lower = command.lower().strip()
        
        if 'pit' in command_lower:
            response = "Pit window is open. Fuel and tires ready."
        elif 'position' in command_lower or 'place' in command_lower:
            response = "You are currently in 3rd place."
        elif 'time' in command_lower or 'lap' in command_lower:
            response = "Current lap time: 1 minute 23 seconds."
        elif 'fuel' in command_lower:
            response = "Fuel level at 75 percent."
        elif 'tire' in command_lower or 'tyre' in command_lower:
            response = "Tire temperatures are optimal."
        else:
            response = f"Command received: {command}"
            
        # Send TTS response
        self.speak(response)
        
        # Notify callback if set
        if self.command_callback:
            self.command_callback(command, response)

    def speak(self, text):
        """Convert text to speech using ElevenLabs and play it"""
        if not text.strip():
            return
            
        try:
            # ElevenLabs TTS API
            url = "https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM"  # Default voice
            headers = {
                "Accept": "audio/mpeg",
                "Content-Type": "application/json",
                "xi-api-key": self.elevenlabs_key
            }
            data = {
                "text": text,
                "model_id": "eleven_monolingual_v1",
                "voice_settings": {
                    "stability": 0.5,
                    "similarity_boost": 0.5
                }
            }
            
            response = requests.post(url, json=data, headers=headers, timeout=10)
            
            if response.status_code == 200:
                # Play audio
                audio_data = response.content
                threading.Thread(target=self._play_audio, args=(audio_data,), daemon=True).start()
                
                if self.logger:
                    self.logger.info(f"[Voice] Speaking: '{text}'")
            else:
                if self.logger:
                    self.logger.error(f"[Voice] ElevenLabs API error: {response.status_code} {response.text}")
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Voice] Error in TTS: {e}")

    def _play_audio(self, audio_data):
        """Play audio data through output device"""
        try:
            # Save to temporary file and play with sounddevice
            import tempfile
            import os
            
            with tempfile.NamedTemporaryFile(suffix='.mp3', delete=False) as temp_file:
                temp_file.write(audio_data)
                temp_path = temp_file.name
            
            # Convert MP3 to WAV for playback (requires pydub)
            try:
                from pydub import AudioSegment
                from pydub.playback import play
                
                audio = AudioSegment.from_mp3(temp_path)
                play(audio)
            except ImportError:
                # Fallback: use system player
                if self.logger:
                    self.logger.warning("[Voice] pydub not available, using system audio player")
                os.system(f"afplay '{temp_path}'")  # macOS
            
            # Cleanup
            os.unlink(temp_path)
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"[Voice] Error playing audio: {e}")

    def set_command_callback(self, callback):
        """Set callback function for voice commands"""
        self.command_callback = callback

    def start(self):
        if self.logger:
            self.logger.info("[Voice] Starting...")
        if not self.validate():
            if self.logger:
                self.logger.error(f"[Voice] Not starting due to config error: {self.status_detail}")
            self.active = False
            return
        self.active = True
        if self.logger:
            self.logger.info("[Voice] Voice system ready. Use start_recording()/stop_recording() for voice commands.")

    def update(self):
        if not self.active:
            return
        # Voice system runs on callbacks and threads, no polling needed
        pass

    def stop(self):
        if self.logger:
            self.logger.info("[Voice] Stopping...")
        if self.recording:
            self.stop_recording()
        self.active = False
