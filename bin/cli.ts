#!/usr/bin/env node

import { execSync, spawn } from 'child_process';
import { join } from 'path';

const BANNER = `
╔═══════════════════════════════════════╗
║         SocialVault v2.0.0            ║
║   Local TikTok & Instagram Downloader ║
╚═══════════════════════════════════════╝
`;

function checkCommand(cmd: string): string | null {
  try {
    return execSync(`${cmd} --version 2>&1`, { encoding: 'utf-8' }).trim().split('\n')[0];
  } catch {
    return null;
  }
}

function main() {
  console.log(BANNER);

  // Check dependencies
  const deps = {
    'yt-dlp': checkCommand('yt-dlp'),
    'gallery-dl': checkCommand('gallery-dl'),
    'ffmpeg': checkCommand('ffmpeg'),
    'node': checkCommand('node'),
  };

  console.log('Checking dependencies...\n');

  let allGood = true;
  for (const [name, version] of Object.entries(deps)) {
    if (version) {
      console.log(`  ✓ ${name}: ${version}`);
    } else {
      console.log(`  ✗ ${name}: NOT FOUND`);
      allGood = false;
    }
  }

  if (!allGood) {
    console.log('\nMissing dependencies. Install them:');
    if (!deps['yt-dlp']) console.log('  brew install yt-dlp');
    if (!deps['gallery-dl']) console.log('  pip install gallery-dl');
    if (!deps['ffmpeg']) console.log('  brew install ffmpeg');
    console.log('\nThen run socialvault again.');
    process.exit(1);
  }

  console.log('\nStarting SocialVault...\n');

  const nextDev = spawn('npx', ['next', 'dev'], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });

  nextDev.on('error', (err) => {
    console.error('Failed to start:', err.message);
    process.exit(1);
  });

  nextDev.on('close', (code) => {
    process.exit(code || 0);
  });
}

main();
