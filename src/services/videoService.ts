import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

class VideoService {
  private ffmpeg: FFmpeg | null = null
  private isLoaded = false

  async load() {
    if (this.isLoaded) return

    this.ffmpeg = new FFmpeg()
    
    try {
      // Load FFmpeg with CORS configuration
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm'),
        classWorkerURL: await toBlobURL(`/ffmpeg/ffmpeg-core.worker.js`, 'text/javascript'),
      })

      this.isLoaded = true
    } catch (error) {
      this.ffmpeg = null
      this.isLoaded = false
      throw new Error(`Failed to load FFmpeg: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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

    try {
      // Write input file to FFmpeg virtual filesystem
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile))

      // Build FFmpeg command based on options
      const command = this.buildCommand(options, inputFileName, outputFileName)

      // Execute FFmpeg command
      await this.ffmpeg.exec(command)

      // Read output file
      const data = await this.ffmpeg.readFile(outputFileName)
      
      if (!data || (data as any).length === 0) {
        throw new Error('Failed to process video: output file is empty')
      }

      // Clean up input and output files
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }

      // Convert to Blob - handle the type conversion properly
      return new Blob([data as any], { type: 'video/mp4' })
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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
      
      // Set a timeout in case the video takes too long to load
      const timeoutId = setTimeout(() => {
        URL.revokeObjectURL(video.src)
        reject(new Error('Timeout: Video metadata took too long to load'))
      }, 10000) // 10 second timeout
      
      video.onloadedmetadata = function() {
        clearTimeout(timeoutId)
        window.URL.revokeObjectURL(video.src)
        resolve(video.duration)
      }
      
      video.onerror = function() {
        clearTimeout(timeoutId)
        URL.revokeObjectURL(video.src)
        reject(new Error('Failed to load video metadata - the video format may not be supported'))
      }
      
      video.src = URL.createObjectURL(file)
    })
  }

  async trimVideoTo2Minutes(inputFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    if (!this.ffmpeg || !this.isLoaded) {
      await this.load()
    }

    if (!this.ffmpeg) {
      throw new Error('FFmpeg failed to load')
    }

    const fileExtension = inputFile.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`
    const outputFileName = 'output.mp4'

    try {
      // Write input file to FFmpeg virtual filesystem
      if (onProgress) onProgress(5) // Started
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(inputFile))
      if (onProgress) onProgress(15) // File loaded

      // Trim video to exactly 2 minutes (120 seconds) with ultra-fast encoding
      if (onProgress) onProgress(20) // Starting encoding
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-t', '120', // Trim to 120 seconds (2 minutes)
        '-c:v', 'copy', // Copy video stream without re-encoding for speed
        '-c:a', 'aac', // AAC audio codec
        '-b:a', '128k', // Audio bitrate
        '-y', // Overwrite output file if exists
        outputFileName
      ])

      if (onProgress) onProgress(80) // Encoding complete

      // Read output file
      const data = await this.ffmpeg.readFile(outputFileName)
      if (onProgress) onProgress(90) // File read
      
      if (!data || (data as any).length === 0) {
        throw new Error('Failed to process video: output file is empty')
      }

      // Clean up input file
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }

      if (onProgress) onProgress(100) // Complete
      return new Blob([data as any], { type: 'video/mp4' })
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Video trimming failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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

    try {
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file))
      
      // Get video information
      await this.ffmpeg.exec(['-i', inputFileName, '-f', 'null', '-'])
      
      // Parse FFmpeg output to extract video info
      // This is a simplified version - you'd need more sophisticated parsing
      const duration = await this.getVideoDuration(file)
      
      // Clean up input file
      try {
        await this.ffmpeg.deleteFile(inputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }
      
      return {
        duration,
        width: 0,
        height: 0,
        fps: 0,
        bitrate: 0,
      }
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw error
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
    const outputFileName = 'thumbnail.jpg'

    try {
      await this.ffmpeg.writeFile(inputFileName, await fetchFile(file))
      
      // Extract thumbnail at specified time
      await this.ffmpeg.exec([
        '-i', inputFileName,
        '-ss', time.toString(),
        '-vframes', '1',
        '-f', 'image2',
        outputFileName
      ])

      const data = await this.ffmpeg.readFile(outputFileName)
      
      if (!data || (data as any).length === 0) {
        throw new Error('Failed to create thumbnail: output file is empty')
      }

      // Clean up input file
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }

      return new Blob([data as any], { type: 'image/jpeg' })
    } catch (error) {
      // Clean up on error
      try {
        await this.ffmpeg.deleteFile(inputFileName)
        await this.ffmpeg.deleteFile(outputFileName)
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw new Error(`Thumbnail creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
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