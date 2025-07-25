#!/usr/bin/env python3
"""
PROJECT:BLACKBOX - Driver Overlay UI
Minimal, racing-focused overlay for drivers during races
- Real-time telemetry display
- Voice communication interface
- Quick status indicators
- Non-intrusive design
"""

import tkinter as tk
from tkinter import ttk
import threading
import time
from datetime import datetime

class DriverOverlay:
    def __init__(self, config, telemetry_manager, voice_manager, network_manager, logger=None):
        self.config = config
        self.telemetry_manager = telemetry_manager
        self.voice_manager = voice_manager
        self.network_manager = network_manager
        self.logger = logger
        
        # UI State
        self.root = None
        self.active = False
        self.is_recording = False
        self.minimized = False
        
        # Telemetry data
        self.current_data = {}
        self.last_update = time.time()
        
        # Voice state
        self.ptt_key = config.get('voice', {}).get('ptt_key', 'space')
        self.conversation_log = []
        
    def start(self):
        """Initialize and show the driver overlay"""
        if self.logger:
            self.logger.info("[DriverOverlay] Starting driver interface...")
            
        self.active = True
        self.create_overlay()
        
    def create_overlay(self):
        """Create the main driver overlay window"""
        self.root = tk.Tk()
        self.root.title("BLACKBOX DRIVER")
        self.root.geometry("400x300")
        self.root.configure(bg='#000000')
        
        # Make window always on top but not intrusive
        self.root.attributes('-topmost', True)
        self.root.attributes('-alpha', 0.9)
        
        # Position in top-right corner
        self.root.geometry("+{}+{}".format(
            self.root.winfo_screenwidth() - 420, 20
        ))
        
        self.create_main_interface()
        self.setup_keybindings()
        
        # Start update loop
        self.update_loop()
        
    def create_main_interface(self):
        """Create the main driver interface"""
        # Header with minimize/close
        header_frame = tk.Frame(self.root, bg='#1a1a1a', height=30)
        header_frame.pack(fill='x')
        header_frame.pack_propagate(False)
        
        # Title
        title_label = tk.Label(header_frame, text="🏁 BLACKBOX DRIVER", 
                              font=('Arial', 10, 'bold'),
                              fg='#00ff41', bg='#1a1a1a')
        title_label.pack(side='left', padx=10, pady=5)
        
        # Minimize button
        minimize_btn = tk.Button(header_frame, text="−", 
                               font=('Arial', 12, 'bold'),
                               fg='#ffffff', bg='#333333',
                               width=3, command=self.toggle_minimize)
        minimize_btn.pack(side='right', padx=2, pady=2)
        
        # Main content frame
        self.content_frame = tk.Frame(self.root, bg='#000000')
        self.content_frame.pack(fill='both', expand=True, padx=10, pady=5)
        
        self.create_telemetry_display()
        self.create_voice_interface()
        self.create_status_bar()
        
    def create_telemetry_display(self):
        """Create compact telemetry display"""
        telem_frame = tk.LabelFrame(self.content_frame, text="TELEMETRY", 
                                   font=('Arial', 9, 'bold'),
                                   fg='#00ff41', bg='#000000')
        telem_frame.pack(fill='x', pady=5)
        
        # Create telemetry labels
        self.telem_labels = {}
        
        # Row 1: Speed, RPM
        row1 = tk.Frame(telem_frame, bg='#000000')
        row1.pack(fill='x', padx=5, pady=2)
        
        tk.Label(row1, text="SPEED:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['speed'] = tk.Label(row1, text="--- mph", 
                                            font=('Arial', 8, 'bold'),
                                            fg='#ffffff', bg='#000000')
        self.telem_labels['speed'].pack(side='left', padx=(5, 20))
        
        tk.Label(row1, text="RPM:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['rpm'] = tk.Label(row1, text="---- rpm", 
                                          font=('Arial', 8, 'bold'),
                                          fg='#ffffff', bg='#000000')
        self.telem_labels['rpm'].pack(side='left', padx=5)
        
        # Row 2: Gear, Fuel
        row2 = tk.Frame(telem_frame, bg='#000000')
        row2.pack(fill='x', padx=5, pady=2)
        
        tk.Label(row2, text="GEAR:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['gear'] = tk.Label(row2, text="-", 
                                           font=('Arial', 8, 'bold'),
                                           fg='#00ff41', bg='#000000')
        self.telem_labels['gear'].pack(side='left', padx=(5, 20))
        
        tk.Label(row2, text="FUEL:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['fuel'] = tk.Label(row2, text="-- L", 
                                           font=('Arial', 8, 'bold'),
                                           fg='#ffffff', bg='#000000')
        self.telem_labels['fuel'].pack(side='left', padx=5)
        
        # Row 3: Position, Gap
        row3 = tk.Frame(telem_frame, bg='#000000')
        row3.pack(fill='x', padx=5, pady=2)
        
        tk.Label(row3, text="POS:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['position'] = tk.Label(row3, text="--", 
                                                font=('Arial', 8, 'bold'),
                                                fg='#ffff00', bg='#000000')
        self.telem_labels['position'].pack(side='left', padx=(5, 20))
        
        tk.Label(row3, text="GAP:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.telem_labels['gap'] = tk.Label(row3, text="+-.---", 
                                          font=('Arial', 8, 'bold'),
                                          fg='#ffffff', bg='#000000')
        self.telem_labels['gap'].pack(side='left', padx=5)
        
    def create_voice_interface(self):
        """Create compact voice communication interface"""
        voice_frame = tk.LabelFrame(self.content_frame, text="TEAM RADIO", 
                                   font=('Arial', 9, 'bold'),
                                   fg='#007bff', bg='#000000')
        voice_frame.pack(fill='x', pady=5)
        
        # PTT Button
        ptt_frame = tk.Frame(voice_frame, bg='#000000')
        ptt_frame.pack(fill='x', padx=5, pady=5)
        
        self.ptt_button = tk.Button(ptt_frame, text="🎙️ HOLD TO TALK (SPACE)", 
                                   font=('Arial', 9, 'bold'),
                                   fg='#ffffff', bg='#1a1a1a',
                                   activeforeground='#ffffff', 
                                   activebackground='#007bff',
                                   relief='raised', bd=2,
                                   height=2)
        self.ptt_button.pack(fill='x')
        
        # Voice status
        status_frame = tk.Frame(voice_frame, bg='#000000')
        status_frame.pack(fill='x', padx=5, pady=2)
        
        tk.Label(status_frame, text="STATUS:", font=('Arial', 8), 
                fg='#888888', bg='#000000').pack(side='left')
        self.voice_status = tk.Label(status_frame, text="READY", 
                                   font=('Arial', 8, 'bold'),
                                   fg='#00ff41', bg='#000000')
        self.voice_status.pack(side='left', padx=5)
        
        # Last message
        self.last_message = tk.Label(voice_frame, text="Press SPACE to talk to team", 
                                   font=('Arial', 8),
                                   fg='#888888', bg='#000000',
                                   wraplength=350)
        self.last_message.pack(fill='x', padx=5, pady=2)
        
    def create_status_bar(self):
        """Create status bar"""
        status_frame = tk.Frame(self.content_frame, bg='#1a1a1a', height=25)
        status_frame.pack(fill='x', side='bottom')
        status_frame.pack_propagate(False)
        
        # Connection status
        self.conn_status = tk.Label(status_frame, text="● CONNECTED", 
                                  font=('Arial', 8),
                                  fg='#00ff41', bg='#1a1a1a')
        self.conn_status.pack(side='left', padx=5, pady=2)
        
        # Time
        self.time_label = tk.Label(status_frame, text="", 
                                 font=('Arial', 8),
                                 fg='#888888', bg='#1a1a1a')
        self.time_label.pack(side='right', padx=5, pady=2)
        
    def setup_keybindings(self):
        """Setup keyboard shortcuts"""
        self.root.bind('<KeyPress-space>', self.start_recording)
        self.root.bind('<KeyRelease-space>', self.stop_recording)
        self.root.bind('<F1>', lambda e: self.toggle_minimize())
        self.root.bind('<Escape>', lambda e: self.root.quit())
        
        # Bind PTT button events
        self.ptt_button.bind('<Button-1>', self.start_recording)
        self.ptt_button.bind('<ButtonRelease-1>', self.stop_recording)
        
        # Make window focusable for key events
        self.root.focus_set()
        
    def start_recording(self, event=None):
        """Start voice recording"""
        if self.is_recording:
            return
            
        self.is_recording = True
        
        # Update UI
        self.ptt_button.configure(bg='#ff4500', text="🔴 RECORDING... (RELEASE)")
        self.voice_status.configure(text="RECORDING", fg='#ff4500')
        
        # Start recording via voice manager
        if self.voice_manager:
            try:
                self.voice_manager.start_recording()
                if self.logger:
                    self.logger.info("[DriverOverlay] Started voice recording")
            except Exception as e:
                if self.logger:
                    self.logger.error(f"[DriverOverlay] Recording error: {e}")
                self.voice_status.configure(text="ERROR", fg='#ff4444')
        
    def stop_recording(self, event=None):
        """Stop voice recording"""
        if not self.is_recording:
            return
            
        self.is_recording = False
        
        # Update UI
        self.ptt_button.configure(bg='#1a1a1a', text="🎙️ HOLD TO TALK (SPACE)")
        self.voice_status.configure(text="SENDING", fg='#ffff00')
        
        # Stop recording and send
        if self.voice_manager:
            try:
                audio_data = self.voice_manager.stop_recording()
                
                # Send via network manager
                if self.network_manager and audio_data:
                    self.network_manager.send_voice_data(audio_data)
                    self.last_message.configure(text="Message sent to team")
                    
                self.voice_status.configure(text="READY", fg='#00ff41')
                
                if self.logger:
                    self.logger.info("[DriverOverlay] Voice message sent")
                    
            except Exception as e:
                if self.logger:
                    self.logger.error(f"[DriverOverlay] Send error: {e}")
                self.voice_status.configure(text="ERROR", fg='#ff4444')
        
    def toggle_minimize(self):
        """Toggle between minimized and normal view"""
        if self.minimized:
            # Restore
            self.content_frame.pack(fill='both', expand=True, padx=10, pady=5)
            self.root.geometry("400x300")
            self.minimized = False
        else:
            # Minimize
            self.content_frame.pack_forget()
            self.root.geometry("400x30")
            self.minimized = True
            
    def update_telemetry_display(self):
        """Update telemetry display with current data"""
        if not self.telemetry_manager:
            return
            
        try:
            # Get current telemetry data
            data = self.telemetry_manager.get_current_data()
            
            if data:
                # Update speed
                speed = data.get('speed', 0)
                self.telem_labels['speed'].configure(text=f"{speed:.0f} mph")
                
                # Update RPM
                rpm = data.get('rpm', 0)
                self.telem_labels['rpm'].configure(text=f"{rpm:.0f} rpm")
                
                # Update gear
                gear = data.get('gear', 0)
                gear_text = "R" if gear == -1 else "N" if gear == 0 else str(gear)
                self.telem_labels['gear'].configure(text=gear_text)
                
                # Update fuel
                fuel = data.get('fuel_level', 0)
                self.telem_labels['fuel'].configure(text=f"{fuel:.1f} L")
                
                # Update position
                position = data.get('position', 0)
                self.telem_labels['position'].configure(text=str(position))
                
                # Update gap
                gap = data.get('gap_to_leader', 0)
                if gap > 0:
                    self.telem_labels['gap'].configure(text=f"+{gap:.3f}")
                else:
                    self.telem_labels['gap'].configure(text="LEADER")
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"[DriverOverlay] Telemetry update error: {e}")
                
    def update_connection_status(self):
        """Update connection status indicators"""
        try:
            # Check network status
            if self.network_manager:
                status = self.network_manager.get_status()
                if status[0] == 'OK':
                    self.conn_status.configure(text="● CONNECTED", fg='#00ff41')
                else:
                    self.conn_status.configure(text="● DISCONNECTED", fg='#ff4444')
            else:
                self.conn_status.configure(text="● NO NETWORK", fg='#888888')
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[DriverOverlay] Status update error: {e}")
                
    def update_time_display(self):
        """Update time display"""
        current_time = datetime.now().strftime("%H:%M:%S")
        self.time_label.configure(text=current_time)
        
    def update_loop(self):
        """Main update loop"""
        if not self.active:
            return
            
        try:
            # Update displays
            self.update_telemetry_display()
            self.update_connection_status()
            self.update_time_display()
            
            # Schedule next update
            if self.root:
                self.root.after(500, self.update_loop)  # Update every 500ms
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[DriverOverlay] Update loop error: {e}")
                
    def handle_voice_response(self, speaker, message):
        """Handle incoming voice responses from team"""
        self.last_message.configure(text=f"{speaker}: {message}")
        
        # Play audio response if available
        if self.voice_manager:
            self.voice_manager.play_tts_response(message)
            
    def update(self):
        """Called by main loop"""
        if self.root:
            self.root.update_idletasks()
            
    def get_status(self):
        """Return current status"""
        if self.active and self.root:
            return ('OK', 'Driver overlay running')
        else:
            return ('ERROR', 'Driver overlay not active')
            
    def stop(self):
        """Stop the driver overlay"""
        if self.logger:
            self.logger.info("[DriverOverlay] Stopping driver interface...")
            
        self.active = False
        if self.root:
            self.root.quit()
            self.root.destroy()
            self.root = None
