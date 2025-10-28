const https = require('https');
const fs = require('fs');
const path = require('path');

const FFMPEG_VERSION = '0.12.10';
const FFMPEG_FILES = [
  'ffmpeg-core.js',
  'ffmpeg-core.wasm',
  'ffmpeg-core.worker.js'
];

const PUBLIC_FFMPEG_DIR = path.join(__dirname, '../public/ffmpeg');

// Create directory if it doesn't exist
if (!fs.existsSync(PUBLIC_FFMPEG_DIR)) {
  fs.mkdirSync(PUBLIC_FFMPEG_DIR, { recursive: true });
}

async function downloadFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${path.basename(filepath)}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {}); // Delete the file async
      reject(err);
    });
  });
}

async function downloadFFmpegFiles() {
  console.log('Downloading FFmpeg.wasm files...');
  
  for (const filename of FFMPEG_FILES) {
    const url = `https://unpkg.com/@ffmpeg/core@${FFMPEG_VERSION}/dist/umd/${filename}`;
    const filepath = path.join(PUBLIC_FFMPEG_DIR, filename);
    
    try {
      await downloadFile(url, filepath);
    } catch (error) {
      console.error(`Failed to download ${filename}:`, error.message);
    }
  }
  
  console.log('FFmpeg.wasm files downloaded successfully!');
}

downloadFFmpegFiles().catch(console.error); 