"""
Lightweight logger for Blackbox Driver
- Supports info, warning, error, debug
- Logs to console and optionally to file
"""
import datetime
import os

LOG_LEVELS = {"info": 1, "warning": 2, "error": 3, "debug": 0}
LOG_FILE = os.path.join(os.path.dirname(__file__), "blackbox.log")

class Logger:
    def __init__(self, level="info", to_file=False):
        self.level = level
        self.to_file = to_file

    def log(self, msg, level="info"):
        if LOG_LEVELS[level] >= LOG_LEVELS[self.level]:
            timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            out = f"[{timestamp}] [{level.upper()}] {msg}"
            print(out)
            if self.to_file:
                with open(LOG_FILE, "a") as f:
                    f.write(out + "\n")

    def info(self, msg):
        self.log(msg, "info")
    def warning(self, msg):
        self.log(msg, "warning")
    def error(self, msg):
        self.log(msg, "error")
    def debug(self, msg):
        self.log(msg, "debug")
