import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

class VideoService {
  private ffmpeg: FFmpeg | null = null
  private isLoaded = false

  async load() {
    if (this.isLoaded) return

    this.ffmpeg = new FFmpeg()
    
    // Load FFmpeg with CORS configuration
    await this.ffmpeg.load({
      coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm'),
    })

    this.isLoaded = true
  }

  async processVideo(inputFile: File, options: VideoProcessingOptions): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load()
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to load')
    }

    // Determine input file extension and use appropriate filename
    const fileExtension = inputFile.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`
    const outputFileName = 'output.mp4' // Always output as MP4 for consistency

    // Write input file to FFmpeg virtual filesystem
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile))

    // Build FFmpeg command based on options
    const command = this.buildCommand(options, inputFileName, outputFileName)

    // Execute FFmpeg command
    await this.ffmpeg.exec(command)

    // Read output file
    const data = await this.ffmpeg.readFile(outputFileName)
    
    // Convert to Blob - handle the type conversion properly
    return new Blob([data as any], { type: 'video/mp4' })
  }

  private buildCommand(options: VideoProcessingOptions, inputFileName: string, outputFileName: string): string[] {
    const args = ['-i', inputFileName]

    // Add filters based on options
    const filters: string[] = []

    if (options.resize) {
      filters.push(`scale=${options.resize.width}:${options.resize.height}`)
    }

    if (options.crop) {
      filters.push(`crop=${options.crop.width}:${options.crop.height}:${options.crop.x}:${options.crop.y}`)
    }

    if (options.trim) {
      args.push('-ss', options.trim.start.toString())
      args.push('-t', (options.trim.end - options.trim.start).toString())
    }

    if (options.quality) {
      args.push('-crf', options.quality.toString())
    }

    if (filters.length > 0) {
      args.push('-vf', filters.join(','))
    }

    args.push(outputFileName)
    return args
  }

  async getVideoDuration(file: File): Promise<number> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      
      video.onloadedmetadata = function() {
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      
      video.onerror = function() {
        reject(new Error('Failed to load video metadata'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }

  async trimVideoTo2Minutes(inputFile: File): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load()
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to load')
    }

    const fileExtension = inputFile.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`
    const outputFileName = 'output.mp4'

    // Write input file to FFmpeg virtual filesystem
    await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile))

    // Trim video to exactly 2 minutes (120 seconds) with highest quality
    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-t', '120', // Trim to 120 seconds (2 minutes)
      '-c:v', 'libx264', // Use H.264 codec
      '-crf', '18', // High quality (lower = better, 18 is visually lossless)
      '-preset', 'slow', // Slower encoding for better quality
      '-c:a', 'aac', // Use AAC for audio
      '-b:a', '192k', // High quality audio bitrate
      outputFileName
    ])

    // Read output file
    const data = await this.ffmpeg.readFile(outputFileName)
    
    return new Blob([data as any], { type: 'video/mp4' })
  }

  async getVideoInfo(file: File): Promise<VideoInfo> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load()
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to load')
    }

    // Determine input file extension and use appropriate filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`

    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file))
    
    // Get video information
    await this.ffmpeg.exec(['-i', inputFileName, '-f', 'null', '-'])
    
    // Parse FFmpeg output to extract video info
    // This is a simplified version - you'd need more sophisticated parsing
    const duration = await this.getVideoDuration(file)
    
    return {
      duration,
      width: 0,
      height: 0,
      fps: 0,
      bitrate: 0,
    }
  }

  async createThumbnail(file: File, time: number = 0): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load()
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to load')
    }

    // Determine input file extension and use appropriate filename
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`

    await this.ffmpeg.writeFile(inputFileName, await fetchFile(file))
    
    // Extract thumbnail at specified time
    await this.ffmpeg.exec([
      '-i', inputFileName,
      '-ss', time.toString(),
      '-vframes', '1',
      '-f', 'image2',
      'thumbnail.jpg'
    ])

    const data = await this.ffmpeg.readFile('thumbnail.jpg')
    return new Blob([data as any], { type: 'image/jpeg' })
  }
}

export interface VideoProcessingOptions {
  resize?: {
    width: number
    height: number
  }
  crop?: {
    x: number
    y: number
    width: number
    height: number
  }
  trim?: {
    start: number
    end: number
  }
  quality?: number // 0-51, lower is better
}

export interface VideoInfo {
  duration: number
  width: number
  height: number
  fps: number
  bitrate: number
}

export const videoService = new VideoService() 