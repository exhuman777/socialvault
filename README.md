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
<p align="center"><a href="#quick-install">Install</a> &middot; <a href="#features">Features</a> &middot; <a href="#api">API</a> &middot; <a href="docs/zo-upload-guide.md">Zo Upload</a></p>
<p align="center"><img src="https://img.shields.io/badge/version-2.0.0-violet" /> <img src="https://img.shields.io/badge/license-MIT-green" /> <img src="https://img.shields.io/badge/node-%3E%3D18-blue" /> <img src="https://img.shields.io/badge/Next.js-15-black" /></p>

## Quick Install

```bash
brew install yt-dlp gallery-dl node
curl -fsSL https://raw.githubusercontent.com/exhuman777/socialvault/main/install.sh | bash
```

Then start the dashboard:

```bash
cd ~/socialvault && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Manual Setup

```bash
git clone https://github.com/exhuman777/socialvault.git ~/socialvault
cd ~/socialvault
npm install
npm run dev
```

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
- **Real-time progress** -- watch downloads happen in the dashboard
- **Organized files** -- `~/Downloads/socialvault/{platform}/{username}/{date}/`
- **Metadata sidecars** -- captions, hashtags, metrics saved as JSON
- **Job history** -- persists across app restarts
- **Drag & drop URLs** -- drop a link onto the window
- **Cmd+V detection** -- paste a social URL from anywhere
- **Open in Finder** -- one click to your downloaded files
- **Dependency check** -- shows missing tools with install commands
- **Dark theme** -- easy on the eyes

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

## zo.computer Upload

SocialVault can prepare your downloads for upload to [zo.computer](https://zo.computer) (100GB free storage). See [docs/zo-upload-guide.md](docs/zo-upload-guide.md) for details.

## API

All endpoints are local (localhost:3000).

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

### Example

```bash
# Download a TikTok video
curl -X POST http://localhost:3000/api/v1/download \
  -H "Content-Type: application/json" \
  -d '{"target": "https://tiktok.com/@user/video/123", "mode": "single"}'

# Download an Instagram profile
curl -X POST http://localhost:3000/api/v1/download \
  -H "Content-Type: application/json" \
  -d '{"target": "https://instagram.com/username", "mode": "profile"}'

# Check status
curl http://localhost:3000/api/v1/download?job_id=sv_xxx
```

## Tech Stack

- **Next.js 15** -- React framework
- **Tailwind CSS v4** -- Styling
- **yt-dlp** -- Video downloads
- **gallery-dl** -- Gallery downloads
- **TypeScript** -- Type safety

## License

MIT
