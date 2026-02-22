#!/bin/bash
set -e

# SocialVault Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/exhuman777/socialvault/main/install.sh | bash

REPO="https://github.com/exhuman777/socialvault.git"
INSTALL_DIR="$HOME/socialvault"
PORT=3777
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m'

echo ""
echo -e "${PURPLE}  ███████╗ ██████╗  ██████╗██╗ █████╗ ██╗    ██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗${NC}"
echo -e "${PURPLE}  ██╔════╝██╔═══██╗██╔════╝██║██╔══██╗██║    ██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝${NC}"
echo -e "${PURPLE}  ███████╗██║   ██║██║     ██║███████║██║    ██║   ██║███████║██║   ██║██║     ██║   ${NC}"
echo -e "${PURPLE}  ╚════██║██║   ██║██║     ██║██╔══██║██║    ╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║   ${NC}"
echo -e "${PURPLE}  ███████║╚██████╔╝╚██████╗██║██║  ██║███████╗╚████╔╝ ██║  ██║╚██████╔╝███████╗██║   ${NC}"
echo -e "${PURPLE}  ╚══════╝ ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝ ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝   ${NC}"
echo ""
echo -e "  ${GREEN}Local TikTok & Instagram downloader with dashboard${NC}"
echo ""

# ── Check dependencies ──

MISSING=0

if ! command -v node &> /dev/null; then
    echo -e "${RED}[x] Node.js not found.${NC}"
    echo "    Install: brew install node (macOS) or https://nodejs.org"
    MISSING=1
else
    NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        echo -e "${RED}[x] Node.js 18+ required. Found: $(node -v)${NC}"
        MISSING=1
    else
        echo -e "${GREEN}[ok]${NC} Node.js $(node -v)"
    fi
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}[x] npm not found.${NC}"
    MISSING=1
else
    echo -e "${GREEN}[ok]${NC} npm $(npm -v)"
fi

if ! command -v yt-dlp &> /dev/null; then
    echo -e "${RED}[x] yt-dlp not found.${NC}"
    echo "    Install: brew install yt-dlp (macOS) or pip install yt-dlp"
    MISSING=1
else
    echo -e "${GREEN}[ok]${NC} yt-dlp $(yt-dlp --version)"
fi

if ! command -v gallery-dl &> /dev/null; then
    echo -e "${RED}[x] gallery-dl not found.${NC}"
    echo "    Install: pip install gallery-dl"
    MISSING=1
else
    echo -e "${GREEN}[ok]${NC} gallery-dl $(gallery-dl --version 2>&1 | head -1)"
fi

if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}[ok]${NC} ffmpeg found (optional)"
else
    echo -e "${YELLOW}[--]${NC} ffmpeg not found (optional, for thumbnails)"
fi

if [ "$MISSING" -eq 1 ]; then
    echo ""
    echo -e "${RED}Install missing dependencies first, then re-run this script.${NC}"
    exit 1
fi

echo ""

# ── Clone or update ──

if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull --ff-only
else
    echo "Cloning SocialVault..."
    git clone "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# ── Install & build ──

echo "Installing dependencies..."
npm install

echo "Building for production..."
npm run build

echo ""

# ── Auto-start (macOS LaunchAgent) ──

if [ "$(uname)" = "Darwin" ]; then
    PLIST_NAME="com.socialvault.server"
    PLIST_PATH="$HOME/Library/LaunchAgents/${PLIST_NAME}.plist"
    NPX_PATH=$(which npx)

    echo -e "Set up auto-start on login? (SocialVault will run on port ${PORT})"
    echo -n "  [y/N] "
    # Default to no if piped (non-interactive)
    if [ -t 0 ]; then
        read -r AUTOSTART
    else
        AUTOSTART="y"
        echo "y (auto)"
    fi

    if [ "$AUTOSTART" = "y" ] || [ "$AUTOSTART" = "Y" ]; then
        # Unload old if exists
        launchctl unload "$PLIST_PATH" 2>/dev/null || true

        cat > "$PLIST_PATH" << PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>${PLIST_NAME}</string>
    <key>ProgramArguments</key>
    <array>
        <string>${NPX_PATH}</string>
        <string>next</string>
        <string>start</string>
        <string>-H</string>
        <string>0.0.0.0</string>
        <string>-p</string>
        <string>${PORT}</string>
    </array>
    <key>WorkingDirectory</key>
    <string>${INSTALL_DIR}</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>${HOME}/.socialvault.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/.socialvault.err.log</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>$(dirname $(which gallery-dl)):$(dirname $(which yt-dlp)):/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin</string>
    </dict>
</dict>
</plist>
PLIST

        launchctl load "$PLIST_PATH"
        echo -e "${GREEN}[ok]${NC} LaunchAgent installed. SocialVault will auto-start on login."
        echo ""
    fi
fi

# ── Done ──

# Get local IP
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "your-ip")

echo -e "${GREEN}SocialVault installed successfully.${NC}"
echo ""
echo "  Start the dashboard:"
echo -e "  ${PURPLE}cd ~/socialvault && npm run start${NC}"
echo ""
echo "  Or for development:"
echo -e "  ${PURPLE}cd ~/socialvault && npm run dev${NC}"
echo ""
echo "  Access from this machine:"
echo -e "  ${PURPLE}http://localhost:${PORT}${NC}"
echo ""
echo "  Access from any device on your network:"
echo -e "  ${PURPLE}http://${LOCAL_IP}:${PORT}${NC}"
echo ""
echo "  Downloads save to: ~/Downloads/socialvault/"
echo ""
echo -e "  Built by ${PURPLE}@3xhuman${NC} & ${PURPLE}@exhto${NC}"
echo ""
