```
███████╗ ██████╗  ██████╗██╗ █████╗ ██╗
██╔════╝██╔═══██╗██╔════╝██║██╔══██╗██║
███████╗██║   ██║██║     ██║███████║██║
╚════██║██║   ██║██║     ██║██╔══██║██║
███████║╚██████╔╝╚██████╗██║██║  ██║███████╗
╚══════╝ ╚═════╝  ╚═════╝╚═╝╚═╝  ╚═╝╚══════╝

██╗   ██╗ █████╗ ██╗   ██╗██╗  ████████╗
██║   ██║██╔══██╗██║   ██║██║  ╚══██╔══╝
██║   ██║███████║██║   ██║██║     ██║
╚██╗ ██╔╝██╔══██║██║   ██║██║     ██║
 ╚████╔╝ ██║  ██║╚██████╔╝███████╗██║
  ╚═══╝  ╚═╝  ╚═╝ ╚═════╝ ╚══════╝╚═╝
```

<p align="center"><strong>SocialVault</strong></p>
<p align="center"><em>Local TikTok & Instagram downloader with dashboard. Own your content.</em></p>
<p align="center"><a href="#quick-install">Install</a> &middot; <a href="#features">Features</a> &middot; <a href="#network-access">Network</a> &middot; <a href="#api">API</a> &middot; <a href="docs/zo-upload-guide.md">Zo Upload</a></p>
<p align="center"><img src="https://img.shields.io/badge/version-2.0.0-violet" /> <img src="https://img.shields.io/badge/license-MIT-green" /> <img src="https://img.shields.io/badge/node-%3E%3D18-blue" /> <img src="https://img.shields.io/badge/Next.js-15-black" /></p>

## Quick Install

```bash
brew install yt-dlp gallery-dl node
curl -fsSL https://raw.githubusercontent.com/exhuman777/socialvault/main/install.sh | bash
```

The installer builds for production, optionally sets up auto-start on login (macOS), and makes the dashboard accessible to all devices on your network.

```bash
cd ~/socialvault && npm run start
```

Open [http://localhost:3777](http://localhost:3777) or access from any device on your network.

## Manual Setup

```bash
git clone https://github.com/exhuman777/socialvault.git ~/socialvault
cd ~/socialvault
npm install
npm run build
npm run start
```

For development: `npm run dev` (hot reload, same network access).

## Requirements

| Tool | Install | Required |
|------|---------|----------|
| **Node.js 18+** | `brew install node` | Yes |
| **yt-dlp** | `brew install yt-dlp` | Yes |
| **gallery-dl** | `pip install gallery-dl` | Yes |
| **ffmpeg** | `brew install ffmpeg` | Optional |

SocialVault checks for these on startup and shows install instructions if anything is missing.

### Platform-specific

**macOS**
```bash
brew install node yt-dlp ffmpeg
pip install gallery-dl
```

**Linux**
```bash
sudo apt install nodejs npm ffmpeg
pip install yt-dlp gallery-dl
```

## Features

- **TikTok downloads** -- single videos or full profiles
- **Instagram downloads** -- posts, reels, stories, carousels
- **Gallery dashboard** -- grid, timeline, captions, research, and stats views
- **Real-time progress** -- watch downloads happen live
- **Organized files** -- `~/Downloads/socialvault/{platform}/{username}/{date}/`
- **Metadata sidecars** -- captions, hashtags, metrics saved as JSON
- **Lightbox viewer** -- click any item for full-screen media with metadata
- **Search & filter** -- search captions/hashtags, filter by type, sort by date or likes
- **Job history** -- persists across app restarts
- **Network accessible** -- anyone on your WiFi can use the dashboard
- **Auto-start** -- LaunchAgent keeps it running on macOS
- **Drag & drop URLs** -- drop a link onto the window
- **Cmd+V detection** -- paste a social URL from anywhere
- **Open in Finder** -- one click to your downloaded files

## Network Access

SocialVault binds to `0.0.0.0` so any device on your local network can access the dashboard.

```
http://localhost:3777          # This machine
http://<your-ip>:3777         # Any device on your network
```

Port 3777 is the default for production. Dev mode uses port 3000.

### Auto-Start (macOS)

The install script can set up a LaunchAgent that starts SocialVault on login and keeps it running. To set it up manually:

```bash
cd ~/socialvault
npm run build
# The install script creates the LaunchAgent automatically
```

To stop: `launchctl unload ~/Library/LaunchAgents/com.socialvault.server.plist`

## Gallery Views

Click a completed download in History to open the gallery:

| View | Description |
|------|-------------|
| **Grid** | Thumbnail cards with hover overlays, platform badges, engagement metrics |
| **Timeline** | Posts grouped by month with compact thumbnails |
| **Captions** | Caption-focused layout with search highlighting |
| **Research** | Deep search with hashtag cloud and filtered results |
| **Stats** | Metrics cards, monthly chart, top posts, content analysis |

## File Structure

```
~/Downloads/socialvault/
├── tiktok/
│   └── {username}/
│       └── {date}/
│           ├── {video_id}.mp4
│           ├── {video_id}.info.json
│           └── _metadata.json
├── instagram/
│   └── {username}/
│       └── {date}/
│           ├── {post_id}.jpg
│           ├── {post_id}.jpg.json
│           ├── {reel_id}.mp4
│           └── _metadata.json
└── .socialvault/
    └── jobs.json
```

## zo.computer

SocialVault can prepare your downloads for upload to [zo.computer](https://zo.computer) (100GB free storage). See [docs/zo-upload-guide.md](docs/zo-upload-guide.md) for details.

## API

All endpoints available on port 3777 (production) or 3000 (dev).

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/download` | Create a download job |
| `GET` | `/api/v1/download?job_id=xxx` | Get job status |
| `GET` | `/api/v1/jobs` | List all jobs |
| `DELETE` | `/api/v1/jobs?job_id=xxx` | Cancel a queued job |
| `GET` | `/api/v1/capabilities` | List supported platforms |
| `GET` | `/api/v1/health` | Health check + dependency status |
| `GET` | `/api/v1/storage` | Storage stats |
| `POST` | `/api/v1/storage` | Prepare Zo upload |
| `GET` | `/api/v1/media?path=...` | Serve downloaded media files |

### Example

```bash
# Download a TikTok video
curl -X POST http://localhost:3777/api/v1/download \
  -H "Content-Type: application/json" \
  -d '{"target": "https://tiktok.com/@user/video/123", "mode": "single"}'

# Download an Instagram profile (first 10 posts)
curl -X POST http://localhost:3777/api/v1/download \
  -H "Content-Type: application/json" \
  -d '{"target": "https://instagram.com/username", "mode": "profile", "limit": 10}'

# Check status
curl http://localhost:3777/api/v1/download?job_id=sv_xxx
```

## Tech Stack

- **Next.js 15** -- React framework with App Router
- **Tailwind CSS v4** -- Styling
- **yt-dlp** -- TikTok & Instagram video downloads
- **gallery-dl** -- Instagram profile downloads
- **TypeScript** -- Type safety

## Authors

- **Exhuman** -- [@3xhuman](https://x.com/3xhuman)
- **Exhto** -- [@exhto](https://instagram.com/exhto)

## License

MIT
