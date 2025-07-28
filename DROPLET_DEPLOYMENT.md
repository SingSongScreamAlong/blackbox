# DigitalOcean Droplet Deployment Guide

Since DigitalOcean App Platform continues to have Node.js detection issues, we're switching to a **Droplet-based deployment** for full control and reliability.

## Quick Droplet Setup

### 1. Create a DigitalOcean Droplet
- Go to DigitalOcean Dashboard → "Create" → "Droplets"
- **Image**: Ubuntu 22.04 LTS
- **Size**: Basic plan, $6/month (1GB RAM, 1 vCPU) is sufficient
- **Region**: Choose closest to your location
- **Authentication**: Add your SSH key or use password
- **Hostname**: `project-blackbox` or similar

### 2. Deploy Project Blackbox
Once your droplet is created, SSH into it and run:

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Download and run the deployment script
curl -fsSL https://raw.githubusercontent.com/SingSongScreamAlong/blackbox/master/deploy_droplet.sh | bash
```

**That's it!** The script will automatically:
- Install Python, Flask, and all dependencies
- Clone your GitHub repository
- Set up Nginx reverse proxy
- Configure systemd service for auto-start
- Set up firewall rules
- Create an update script for easy deployments

### 3. Access Your Application
After deployment completes, your Project Blackbox will be available at:
- **URL**: `http://YOUR_DROPLET_IP`
- **WebSocket**: `ws://YOUR_DROPLET_IP/socket.io/`

### 4. Update Your Application
To deploy changes from GitHub:
```bash
ssh root@YOUR_DROPLET_IP
/opt/project-blackbox/update.sh
```

## Advantages of Droplet Deployment

✅ **No Node.js Detection Issues**: Full control over the environment
✅ **Persistent Storage**: Your data and logs are preserved
✅ **Custom Configuration**: Complete flexibility for your setup
✅ **Easy Updates**: Simple script to pull latest changes
✅ **Better Performance**: Dedicated resources, no platform limitations
✅ **Cost Effective**: $6/month vs App Platform's variable pricing

## Management Commands

```bash
# Check service status
sudo systemctl status project-blackbox

# View live logs
sudo journalctl -u project-blackbox -f

# Restart service
sudo systemctl restart project-blackbox

# Update from GitHub
/opt/project-blackbox/update.sh
```

## Next Steps

1. **Create your droplet** using the instructions above
2. **Run the deployment script** 
3. **Update your local configs** to point to `http://YOUR_DROPLET_IP`
4. **Test the connection** with your driver and team HUD

This approach eliminates all the App Platform detection issues and gives you a reliable, production-ready deployment!
