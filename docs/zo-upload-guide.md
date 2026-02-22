# Uploading to zo.computer

zo.computer gives you 100GB of free storage. Here's how to upload your SocialVault downloads.

## Folder Structure

SocialVault organizes downloads at:

```
~/Downloads/socialvault/
├── tiktok/
│   └── username/
│       └── 2024-01-15/
│           ├── video_id.mp4
│           ├── video_id.info.json
│           └── _metadata.json
├── instagram/
│   └── username/
│       └── 2024-01-15/
│           ├── post_id.jpg
│           ├── reel_id.mp4
│           └── _metadata.json
└── _zo-upload/
    └── manifest.json
```

## Prepare for Upload

1. Open SocialVault dashboard
2. Use the API to prepare files:

```bash
curl -X POST http://localhost:3000/api/v1/storage \
  -H "Content-Type: application/json" \
  -d '{"action": "prepare-zo-upload"}'
```

This copies all media files and metadata into `~/Downloads/socialvault/_zo-upload/` with a manifest.

## Upload to Zo

1. Go to [zo.computer](https://zo.computer)
2. Create an account (100GB free)
3. Create a new folder for your archive
4. Drag the contents of `_zo-upload/` into your Zo folder
5. Zo will preserve the folder structure

## Building a Personal Page

Once your content is on Zo, you can:

- Create a public page showcasing your best content
- Organize by platform, date, or theme
- Share individual files or entire collections
- Build a personal archive that outlasts any platform

## Metadata

Each download folder includes `_metadata.json` with:

- Platform and username
- Download timestamp
- Source URL
- Item count and total size
- Per-item: filename, type, caption, hashtags, duration, metrics (views/likes/comments)

Use this metadata to build dashboards, searchable archives, or data visualizations on Zo.
