"""
UI Manager
- Handles minimal overlay, config panel, and voice communication UI
- Provides push-to-talk interface matching team engineer HUD
"""
import tkinter as tk
from tkinter import ttk
import threading
import time

class UIManager:
    def __init__(self, config, telemetry_manager, voice_manager, network_manager, logger=None):
        self.config = config
        self.telemetry_manager = telemetry_manager
        self.voice_manager = voice_manager
        self.network_manager = network_manager
        self.logger = logger
        self.active = False
        
        # UI Windows
        self.status_window = None
        self.voice_window = None
        self.status_labels = {}
        
        # Voice Communication State
        self.is_recording = False
        self.ptt_key = 'space'
        self.conversation_log = []

    def start(self):
        if self.logger:
            self.logger.info("[UI] Starting...")
        self.active = True
        self.init_status_window()
        self.init_voice_window()

    def init_status_window(self):
        self.status_window = tk.Tk()
        self.status_window.title("Blackbox Driver - System Health")
        frame = ttk.Frame(self.status_window, padding=10)
        frame.pack(fill='both', expand=True)
        for mod in ["Telemetry", "Voice", "Network", "UI"]:
            row = ttk.Frame(frame)
            row.pack(fill='x', pady=2)
            ttk.Label(row, text=f"{mod}:", width=10).pack(side='left')
            lbl = tk.Label(row, text="...", width=30, anchor='w')
            lbl.pack(side='left')
            self.status_labels[mod] = lbl
        self.status_window.after(1000, self.status_window.update)

    def update_status(self, telemetry_status, voice_status, network_status, ui_status):
        status_map = {
            "Telemetry": telemetry_status,
            "Voice": voice_status,
            "Network": network_status,
            "UI": ui_status
        }
        for mod, (stat, detail) in status_map.items():
            if stat == 'OK':
                self.status_labels[mod].config(text="OK", fg="green")
            else:
                self.status_labels[mod].config(text=f"ERROR: {detail}", fg="red")
        self.status_window.update_idletasks()

    def update(self):
        if not self.active:
            return
        # Placeholder: update UI system

    def init_voice_window(self):
        """Initialize voice communication window matching team engineer HUD"""
        self.voice_window = tk.Toplevel()
        self.voice_window.title("Blackbox Driver - Team Radio")
        self.voice_window.geometry("400x600")
        self.voice_window.configure(bg='#0d1117')
        
        # Main frame
        main_frame = tk.Frame(self.voice_window, bg='#0d1117', padx=20, pady=20)
        main_frame.pack(fill='both', expand=True)
        
        # Title
        title_label = tk.Label(main_frame, text="🎙️ TEAM RADIO", 
                              font=('JetBrains Mono', 16, 'bold'),
                              fg='#007bff', bg='#0d1117')
        title_label.pack(pady=(0, 20))
        
        # PTT Button Frame
        ptt_frame = tk.Frame(main_frame, bg='#0d1117')
        ptt_frame.pack(pady=20)
        
        # PTT Button
        self.ptt_button = tk.Button(ptt_frame, text="🎙️\nHOLD TO TALK\nSPACE",
                                   font=('JetBrains Mono', 12, 'bold'),
                                   fg='#ffffff', bg='#1a1a1a',
                                   activeforeground='#ffffff', activebackground='#007bff',
                                   relief='raised', bd=3,
                                   width=15, height=6)
        self.ptt_button.pack()
        
        # Bind PTT events
        self.ptt_button.bind('<Button-1>', self.start_recording)
        self.ptt_button.bind('<ButtonRelease-1>', self.stop_recording)
        self.voice_window.bind('<KeyPress-space>', self.start_recording)
        self.voice_window.bind('<KeyRelease-space>', self.stop_recording)
        self.voice_window.focus_set()
        
        # Status Frame
        status_frame = tk.Frame(main_frame, bg='#0d1117')
        status_frame.pack(pady=20)
        
        tk.Label(status_frame, text="STATUS:", font=('JetBrains Mono', 10),
                fg='#8b949e', bg='#0d1117').pack()
        
        self.voice_status_label = tk.Label(status_frame, text="READY",
                                          font=('JetBrains Mono', 12, 'bold'),
                                          fg='#00ff7f', bg='#0d1117')
        self.voice_status_label.pack()
        
        # Communication Log Frame
        log_frame = tk.Frame(main_frame, bg='#0d1117')
        log_frame.pack(fill='both', expand=True, pady=20)
        
        tk.Label(log_frame, text="📻 COMMUNICATION LOG",
                font=('JetBrains Mono', 12, 'bold'),
                fg='#007bff', bg='#0d1117').pack()
        
        # Log text widget with scrollbar
        log_container = tk.Frame(log_frame, bg='#0d1117')
        log_container.pack(fill='both', expand=True, pady=10)
        
        self.log_text = tk.Text(log_container, 
                               font=('JetBrains Mono', 9),
                               bg='#161b22', fg='#c9d1d9',
                               insertbackground='#c9d1d9',
                               selectbackground='#264f78',
                               wrap=tk.WORD, height=15)
        
        scrollbar = tk.Scrollbar(log_container, command=self.log_text.yview)
        self.log_text.configure(yscrollcommand=scrollbar.set)
        
        self.log_text.pack(side='left', fill='both', expand=True)
        scrollbar.pack(side='right', fill='y')
        
        # Add sample entries
        self.add_to_conversation_log("SYSTEM", "Voice communication initialized")
        self.add_to_conversation_log("SYSTEM", "Press SPACE or click button to talk")
        
    def start_recording(self, event=None):
        """Start voice recording"""
        if self.is_recording or not self.voice_manager:
            return
            
        try:
            self.is_recording = True
            self.voice_manager.start_recording()
            
            # Update UI
            self.ptt_button.configure(bg='#ff4500', text="🔴\nRECORDING...\nRELEASE TO SEND")
            self.voice_status_label.configure(text="RECORDING", fg='#ff4500')
            
            if self.logger:
                self.logger.info("[UI] Started voice recording")
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UI] Failed to start recording: {e}")
            self.voice_status_label.configure(text="ERROR", fg='#ff4444')
    
    def stop_recording(self, event=None):
        """Stop voice recording"""
        if not self.is_recording or not self.voice_manager:
            return
            
        try:
            self.is_recording = False
            audio_data = self.voice_manager.stop_recording()
            
            # Send to backend via network manager
            if self.network_manager and audio_data:
                self.network_manager.send_voice_data(audio_data)
                self.add_to_conversation_log("DRIVER", "Voice message sent")
            
            # Update UI
            self.ptt_button.configure(bg='#1a1a1a', text="🎙️\nHOLD TO TALK\nSPACE")
            self.voice_status_label.configure(text="READY", fg='#00ff7f')
            
            if self.logger:
                self.logger.info("[UI] Stopped voice recording")
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UI] Failed to stop recording: {e}")
            self.voice_status_label.configure(text="ERROR", fg='#ff4444')
    
    def add_to_conversation_log(self, speaker, message):
        """Add entry to conversation log"""
        timestamp = time.strftime("%H:%M:%S")
        
        # Color coding for different speakers
        color_map = {
            "DRIVER": "#007bff",
            "AI ENGINEER": "#00ff7f", 
            "AI STRATEGIST": "#ff4500",
            "SYSTEM": "#8b949e"
        }
        
        color = color_map.get(speaker, "#c9d1d9")
        
        # Add to conversation history
        entry = {
            "timestamp": timestamp,
            "speaker": speaker,
            "message": message
        }
        self.conversation_log.append(entry)
        
        # Update UI
        if self.log_text:
            self.log_text.configure(state='normal')
            self.log_text.insert('end', f"[{timestamp}] {speaker}: {message}\n")
            self.log_text.configure(state='disabled')
            self.log_text.see('end')
        
        # Limit log entries (keep last 100)
        if len(self.conversation_log) > 100:
            self.conversation_log.pop(0)
    
    def handle_voice_response(self, speaker, message):
        """Handle incoming voice responses from AI"""
        self.add_to_conversation_log(speaker, message)
        
        # Play audio if available (would integrate with voice_manager TTS)
        if self.voice_manager:
            self.voice_manager.play_tts_response(message)

    def stop(self):
        if self.logger:
            self.logger.info("[UI] Stopping...")
        if self.status_window:
            self.status_window.destroy()
        if self.voice_window:
            self.voice_window.destroy()
        self.active = False
