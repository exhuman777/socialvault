#!/bin/bash
set -e

# SocialVault Installer
# Usage: curl -fsSL https://raw.githubusercontent.com/exhuman777/socialvault/main/install.sh | bash

REPO="https://github.com/exhuman777/socialvault.git"
INSTALL_DIR="$HOME/socialvault"
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

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}[x] Node.js not found.${NC}"
    echo "    Install: brew install node (macOS) or https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo -e "${RED}[x] Node.js 18+ required. Found: $(node -v)${NC}"
    exit 1
fi
echo -e "${GREEN}[ok]${NC} Node.js $(node -v)"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}[x] npm not found.${NC}"
    exit 1
fi
echo -e "${GREEN}[ok]${NC} npm $(npm -v)"

# Check yt-dlp
if ! command -v yt-dlp &> /dev/null; then
    echo -e "${RED}[x] yt-dlp not found.${NC}"
    echo "    Install: brew install yt-dlp (macOS) or pip install yt-dlp"
    exit 1
fi
echo -e "${GREEN}[ok]${NC} yt-dlp $(yt-dlp --version)"

# Check gallery-dl
if ! command -v gallery-dl &> /dev/null; then
    echo -e "${RED}[x] gallery-dl not found.${NC}"
    echo "    Install: pip install gallery-dl"
    exit 1
fi
echo -e "${GREEN}[ok]${NC} gallery-dl $(gallery-dl --version 2>&1 | head -1)"

# Check ffmpeg (optional)
if command -v ffmpeg &> /dev/null; then
    echo -e "${GREEN}[ok]${NC} ffmpeg found (optional)"
else
    echo -e "${YELLOW}[--]${NC} ffmpeg not found (optional, for thumbnails)"
fi

echo ""

# Clone or pull
if [ -d "$INSTALL_DIR" ]; then
    echo "Updating existing installation..."
    cd "$INSTALL_DIR"
    git pull --ff-only
else
    echo "Cloning SocialVault..."
    git clone "$REPO" "$INSTALL_DIR"
    cd "$INSTALL_DIR"
fi

# Install dependencies
echo "Installing dependencies..."
npm install

echo ""
echo -e "${GREEN}SocialVault installed successfully.${NC}"
echo ""
echo "  Start the dashboard:"
echo -e "  ${PURPLE}cd ~/socialvault && npm run dev${NC}"
echo ""
echo "  Downloads save to: ~/Downloads/socialvault/"
echo ""
