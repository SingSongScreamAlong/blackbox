#!/usr/bin/env python3
"""
PROJECT:BLACKBOX - Remote Update Manager
Handles automatic updates from GitHub and remote deployment
"""

import os
import sys
import json
import time
import requests
import subprocess
import zipfile
import shutil
from pathlib import Path
from datetime import datetime

class UpdateManager:
    def __init__(self, config, logger=None):
        self.config = config
        self.logger = logger
        self.app_dir = Path(__file__).parent
        
        # Update configuration
        self.update_config = config.get('updates', {})
        self.github_repo = self.update_config.get('github_repo', 'your-username/blackbox-driver')
        self.github_token = self.update_config.get('github_token', '')
        self.auto_update = self.update_config.get('auto_update', True)
        self.update_interval = self.update_config.get('check_interval_hours', 6)
        
        # Digital Ocean integration
        self.do_config = config.get('digital_ocean', {})
        self.do_endpoint = self.do_config.get('update_endpoint', '')
        self.do_api_key = self.do_config.get('api_key', '')
        
        # Version tracking
        self.current_version = self.get_current_version()
        self.last_check = 0
        
    def get_current_version(self):
        """Get current version from VERSION.md"""
        try:
            version_file = self.app_dir / 'VERSION.md'
            if version_file.exists():
                with open(version_file, 'r') as f:
                    content = f.read()
                    # Extract version from first line
                    for line in content.split('\n'):
                        if 'v' in line and '.' in line:
                            # Extract version like "v1.0.0"
                            import re
                            match = re.search(r'v(\d+\.\d+\.\d+)', line)
                            if match:
                                return match.group(1)
            return "1.0.0"
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Error reading version: {e}")
            return "1.0.0"
            
    def check_for_updates(self):
        """Check GitHub for new releases"""
        if not self.github_repo:
            return None
            
        try:
            # GitHub API endpoint for latest release
            url = f"https://api.github.com/repos/{self.github_repo}/releases/latest"
            headers = {}
            
            if self.github_token:
                headers['Authorization'] = f'token {self.github_token}'
                
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                release_data = response.json()
                latest_version = release_data['tag_name'].replace('v', '')
                
                if self.logger:
                    self.logger.info(f"[UpdateManager] Current: v{self.current_version}, Latest: v{latest_version}")
                
                # Compare versions
                if self.is_newer_version(latest_version, self.current_version):
                    return {
                        'version': latest_version,
                        'download_url': release_data.get('zipball_url'),
                        'release_notes': release_data.get('body', ''),
                        'published_at': release_data.get('published_at')
                    }
                    
            elif response.status_code == 404:
                if self.logger:
                    self.logger.info("[UpdateManager] No releases found on GitHub")
            else:
                if self.logger:
                    self.logger.warning(f"[UpdateManager] GitHub API error: {response.status_code}")
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Error checking for updates: {e}")
                
        return None
        
    def is_newer_version(self, new_version, current_version):
        """Compare version strings (semantic versioning)"""
        try:
            new_parts = [int(x) for x in new_version.split('.')]
            current_parts = [int(x) for x in current_version.split('.')]
            
            # Pad shorter version with zeros
            max_len = max(len(new_parts), len(current_parts))
            new_parts.extend([0] * (max_len - len(new_parts)))
            current_parts.extend([0] * (max_len - len(current_parts)))
            
            return new_parts > current_parts
        except:
            return False
            
    def download_update(self, update_info):
        """Download and extract update from GitHub"""
        try:
            download_url = update_info['download_url']
            version = update_info['version']
            
            if self.logger:
                self.logger.info(f"[UpdateManager] Downloading update v{version}...")
            
            # Create temp directory
            temp_dir = self.app_dir / 'temp_update'
            if temp_dir.exists():
                shutil.rmtree(temp_dir)
            temp_dir.mkdir()
            
            # Download zip file
            headers = {}
            if self.github_token:
                headers['Authorization'] = f'token {self.github_token}'
                
            response = requests.get(download_url, headers=headers, stream=True)
            
            if response.status_code == 200:
                zip_path = temp_dir / f'update_v{version}.zip'
                
                with open(zip_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                # Extract zip
                with zipfile.ZipFile(zip_path, 'r') as zip_ref:
                    zip_ref.extractall(temp_dir)
                
                return temp_dir
            else:
                raise Exception(f"Download failed: {response.status_code}")
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Download error: {e}")
            return None
            
    def apply_update(self, temp_dir, version):
        """Apply the downloaded update"""
        try:
            if self.logger:
                self.logger.info(f"[UpdateManager] Applying update v{version}...")
            
            # Find extracted directory (GitHub creates nested dirs)
            extracted_dirs = [d for d in temp_dir.iterdir() if d.is_dir()]
            if not extracted_dirs:
                raise Exception("No extracted directory found")
                
            source_dir = extracted_dirs[0]
            
            # Create backup of current installation
            backup_dir = self.app_dir.parent / f'blackbox_backup_{int(time.time())}'
            shutil.copytree(self.app_dir, backup_dir)
            
            if self.logger:
                self.logger.info(f"[UpdateManager] Backup created: {backup_dir}")
            
            # Files to preserve during update
            preserve_files = [
                'config/settings.json',
                'config/settings.local.json',
                'blackbox.log'
            ]
            
            preserved_data = {}
            for file_path in preserve_files:
                full_path = self.app_dir / file_path
                if full_path.exists():
                    with open(full_path, 'r') as f:
                        preserved_data[file_path] = f.read()
            
            # Update files (skip .git and preserved files)
            for item in source_dir.rglob('*'):
                if item.is_file():
                    rel_path = item.relative_to(source_dir)
                    
                    # Skip git files and other unwanted files
                    if any(part.startswith('.git') for part in rel_path.parts):
                        continue
                        
                    dest_path = self.app_dir / rel_path
                    dest_path.parent.mkdir(parents=True, exist_ok=True)
                    
                    # Copy file
                    shutil.copy2(item, dest_path)
            
            # Restore preserved files
            for file_path, content in preserved_data.items():
                full_path = self.app_dir / file_path
                full_path.parent.mkdir(parents=True, exist_ok=True)
                with open(full_path, 'w') as f:
                    f.write(content)
            
            # Update version info
            self.current_version = version
            
            # Clean up temp directory
            shutil.rmtree(temp_dir)
            
            if self.logger:
                self.logger.info(f"[UpdateManager] Update to v{version} completed successfully!")
            
            return True
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Update failed: {e}")
            return False
            
    def check_digital_ocean_updates(self):
        """Check Digital Ocean backend for configuration updates"""
        if not self.do_endpoint or not self.do_api_key:
            return None
            
        try:
            url = f"{self.do_endpoint}/api/updates/check"
            headers = {
                'Authorization': f'Bearer {self.do_api_key}',
                'Content-Type': 'application/json'
            }
            
            data = {
                'current_version': self.current_version,
                'client_id': self.config.get('client_id', 'unknown')
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=10)
            
            if response.status_code == 200:
                update_data = response.json()
                
                if update_data.get('has_updates'):
                    return update_data
                    
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Digital Ocean check error: {e}")
                
        return None
        
    def apply_config_updates(self, update_data):
        """Apply configuration updates from Digital Ocean"""
        try:
            config_updates = update_data.get('config_updates', {})
            
            if config_updates:
                # Update configuration
                current_config = self.config.copy()
                current_config.update(config_updates)
                
                # Save updated config
                config_file = self.app_dir / 'config' / 'settings.json'
                with open(config_file, 'w') as f:
                    json.dump(current_config, f, indent=2)
                
                if self.logger:
                    self.logger.info("[UpdateManager] Configuration updated from Digital Ocean")
                
                return True
                
        except Exception as e:
            if self.logger:
                self.logger.error(f"[UpdateManager] Config update error: {e}")
                
        return False
        
    def auto_update_check(self):
        """Perform automatic update check if enabled"""
        current_time = time.time()
        
        # Check if it's time for an update check
        if current_time - self.last_check < (self.update_interval * 3600):
            return
            
        self.last_check = current_time
        
        if not self.auto_update:
            return
            
        if self.logger:
            self.logger.info("[UpdateManager] Performing automatic update check...")
        
        # Check GitHub for updates
        github_update = self.check_for_updates()
        if github_update:
            if self.logger:
                self.logger.info(f"[UpdateManager] New version available: v{github_update['version']}")
            
            # Download and apply update
            temp_dir = self.download_update(github_update)
            if temp_dir:
                success = self.apply_update(temp_dir, github_update['version'])
                if success:
                    if self.logger:
                        self.logger.info("[UpdateManager] Automatic update completed!")
                    return True
        
        # Check Digital Ocean for config updates
        do_update = self.check_digital_ocean_updates()
        if do_update:
            self.apply_config_updates(do_update)
            
        return False
        
    def manual_update(self):
        """Manually trigger an update check and apply"""
        if self.logger:
            self.logger.info("[UpdateManager] Manual update requested...")
        
        update_info = self.check_for_updates()
        
        if update_info:
            print(f"New version available: v{update_info['version']}")
            print(f"Release notes: {update_info['release_notes'][:200]}...")
            
            response = input("Do you want to update now? (y/n): ")
            if response.lower() == 'y':
                temp_dir = self.download_update(update_info)
                if temp_dir:
                    success = self.apply_update(temp_dir, update_info['version'])
                    if success:
                        print("Update completed successfully!")
                        print("Please restart the application.")
                        return True
                    else:
                        print("Update failed. Check logs for details.")
                        return False
        else:
            print("No updates available.")
            return False
            
    def get_status(self):
        """Get update manager status"""
        return {
            'current_version': self.current_version,
            'auto_update_enabled': self.auto_update,
            'last_check': self.last_check,
            'github_repo': self.github_repo,
            'digital_ocean_enabled': bool(self.do_endpoint and self.do_api_key)
        }

# CLI interface for manual updates
if __name__ == "__main__":
    import sys
    from config.config_manager import load_config
    from logger import Logger
    
    logger = Logger(level="info", to_file=True)
    config = load_config()
    
    update_manager = UpdateManager(config, logger)
    
    if len(sys.argv) > 1 and sys.argv[1] == "check":
        update_manager.manual_update()
    else:
        print("PROJECT:BLACKBOX Update Manager")
        print(f"Current version: v{update_manager.current_version}")
        print("Use 'python update_manager.py check' to check for updates")
