#!/usr/bin/env python3
"""
PROJECT:BLACKBOX - Simple Deployment Script
Easy setup for GitHub and Digital Ocean remote updates
"""

import os
import json
import subprocess
from pathlib import Path

def setup_github_repo():
    """Initialize GitHub repository for remote updates"""
    print("🐙 Setting up GitHub repository...")
    
    # Check if git is initialized
    if not Path('.git').exists():
        print("Initializing git repository...")
        subprocess.run(['git', 'init'], check=True)
        
    # Create .gitignore if it doesn't exist
    gitignore_content = """
# Python
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
env/
venv/
.venv/
pip-log.txt
pip-delete-this-directory.txt

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Logs
*.log
blackbox.log

# Config (keep templates only)
config/settings.json
config/settings.local.json
config/*.bak

# Temp files
temp_update/
dist/
build/
*.zip
"""
    
    with open('.gitignore', 'w') as f:
        f.write(gitignore_content.strip())
    
    # Add all files
    subprocess.run(['git', 'add', '.'], check=True)
    
    # Initial commit
    try:
        subprocess.run(['git', 'commit', '-m', 'Initial commit - PROJECT:BLACKBOX v1.0.0'], check=True)
        print("✅ Git repository initialized")
    except subprocess.CalledProcessError:
        print("ℹ️  Git repository already has commits")
    
    print("\n📋 Next steps for GitHub:")
    print("1. Create a new repository on GitHub")
    print("2. Run: git remote add origin https://github.com/YOUR-USERNAME/blackbox-driver.git")
    print("3. Run: git push -u origin main")
    print("4. Add GitHub secrets: GITHUB_TOKEN, DO_API_TOKEN, DO_ENDPOINT")

def setup_digital_ocean():
    """Setup Digital Ocean configuration"""
    print("\n🌊 Setting up Digital Ocean configuration...")
    
    # Load current config
    config_file = Path('config/settings.json')
    if config_file.exists():
        with open(config_file, 'r') as f:
            config = json.load(f)
    else:
        config = {}
    
    # Get Digital Ocean settings
    print("\nEnter your Digital Ocean settings:")
    do_endpoint = input("Digital Ocean App URL (e.g., https://your-app.digitalocean.app): ").strip()
    do_api_key = input("Digital Ocean API Key: ").strip()
    github_repo = input("GitHub Repository (e.g., username/blackbox-driver): ").strip()
    github_token = input("GitHub Personal Access Token (optional): ").strip()
    
    # Update config
    config.update({
        "updates": {
            "auto_update": True,
            "check_interval_hours": 6,
            "github_repo": github_repo,
            "github_token": github_token,
            "backup_before_update": True,
            "notify_on_update": True
        },
        "digital_ocean": {
            "update_endpoint": do_endpoint,
            "api_key": do_api_key,
            "enable_remote_config": True,
            "sync_interval_minutes": 30
        }
    })
    
    # Save config
    config_file.parent.mkdir(exist_ok=True)
    with open(config_file, 'w') as f:
        json.dump(config, f, indent=2)
    
    print("✅ Digital Ocean configuration saved")

def create_release():
    """Create a new release"""
    print("\n🏷️  Creating release...")
    
    # Get version
    version = input("Enter version (e.g., 1.0.1): ").strip()
    if not version.startswith('v'):
        version = f'v{version}'
    
    # Create and push tag
    subprocess.run(['git', 'tag', version], check=True)
    subprocess.run(['git', 'push', 'origin', version], check=True)
    
    print(f"✅ Release {version} created and pushed to GitHub")
    print("GitHub Actions will automatically build and deploy the release")

def test_update_system():
    """Test the update system"""
    print("\n🧪 Testing update system...")
    
    from config.config_manager import load_config
    from update_manager import UpdateManager
    from logger import Logger
    
    logger = Logger(level="info")
    config = load_config()
    
    update_manager = UpdateManager(config, logger)
    
    print(f"Current version: v{update_manager.current_version}")
    print(f"GitHub repo: {update_manager.github_repo}")
    print(f"Auto-update enabled: {update_manager.auto_update}")
    print(f"Digital Ocean enabled: {bool(update_manager.do_endpoint)}")
    
    # Check for updates
    print("\nChecking for updates...")
    update_info = update_manager.check_for_updates()
    
    if update_info:
        print(f"✅ Update available: v{update_info['version']}")
    else:
        print("✅ No updates available (you're up to date)")
    
    # Check Digital Ocean
    if update_manager.do_endpoint:
        print("\nChecking Digital Ocean...")
        do_update = update_manager.check_digital_ocean_updates()
        if do_update:
            print("✅ Digital Ocean configuration updates available")
        else:
            print("✅ Digital Ocean configuration up to date")

def main():
    """Main deployment setup"""
    print("🏁 PROJECT:BLACKBOX Deployment Setup")
    print("=====================================")
    
    while True:
        print("\nChoose an option:")
        print("1. Setup GitHub repository")
        print("2. Configure Digital Ocean")
        print("3. Create new release")
        print("4. Test update system")
        print("5. Exit")
        
        choice = input("\nEnter choice (1-5): ").strip()
        
        if choice == '1':
            setup_github_repo()
        elif choice == '2':
            setup_digital_ocean()
        elif choice == '3':
            create_release()
        elif choice == '4':
            test_update_system()
        elif choice == '5':
            break
        else:
            print("Invalid choice. Please try again.")
    
    print("\n🎉 Deployment setup complete!")
    print("\nYour PROJECT:BLACKBOX system now supports:")
    print("✅ Automatic updates from GitHub")
    print("✅ Remote configuration via Digital Ocean")
    print("✅ Continuous deployment workflow")
    print("\nUsers will receive updates automatically without manual file transfers!")

if __name__ == "__main__":
    main()
