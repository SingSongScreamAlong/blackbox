#!/bin/bash
# DigitalOcean Droplet Deployment Script for Project Blackbox
# This script sets up the Project Blackbox system on a fresh Ubuntu droplet

set -e  # Exit on any error

echo "🚀 Starting Project Blackbox Droplet Deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Python 3 and pip
echo "🐍 Installing Python 3 and dependencies..."
sudo apt install -y python3 python3-pip python3-venv git nginx

# Clone the repository
echo "📥 Cloning Project Blackbox repository..."
cd /opt
sudo git clone https://github.com/SingSongScreamAlong/blackbox.git project-blackbox
sudo chown -R $USER:$USER /opt/project-blackbox
cd /opt/project-blackbox

# Create virtual environment
echo "🔧 Setting up Python virtual environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python dependencies
echo "📚 Installing Python dependencies..."
pip install --upgrade pip
pip install Flask>=2.3.0 Flask-SocketIO>=5.3.0 requests>=2.31.0 gunicorn

# Create systemd service
echo "⚙️ Creating systemd service..."
sudo tee /etc/systemd/system/project-blackbox.service > /dev/null <<EOF
[Unit]
Description=Project Blackbox Racing HUD System
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=/opt/project-blackbox
Environment=PATH=/opt/project-blackbox/venv/bin
Environment=PORT=8080
ExecStart=/opt/project-blackbox/venv/bin/gunicorn --bind 0.0.0.0:8080 --workers 4 app:app
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

# Configure Nginx reverse proxy
echo "🌐 Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/project-blackbox > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Enable Nginx site
sudo ln -sf /etc/nginx/sites-available/project-blackbox /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Start and enable services
echo "🔄 Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable project-blackbox
sudo systemctl start project-blackbox
sudo systemctl enable nginx
sudo systemctl restart nginx

# Setup firewall
echo "🔒 Configuring firewall..."
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw --force enable

# Create update script
echo "📝 Creating update script..."
tee /opt/project-blackbox/update.sh > /dev/null <<EOF
#!/bin/bash
cd /opt/project-blackbox
git pull origin master
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart project-blackbox
echo "✅ Project Blackbox updated successfully!"
EOF
chmod +x /opt/project-blackbox/update.sh

echo "✅ Project Blackbox deployment completed!"
echo ""
echo "🌐 Your application is now running at: http://$(curl -s ifconfig.me)"
echo "🔧 To update the application, run: /opt/project-blackbox/update.sh"
echo "📊 To check status: sudo systemctl status project-blackbox"
echo "📋 To view logs: sudo journalctl -u project-blackbox -f"
echo ""
echo "🎉 Deployment successful! Your Project Blackbox Racing HUD is live!"
