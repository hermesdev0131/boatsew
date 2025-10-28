import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'

class VideoService {
  private ffmpeg: FFmpeg | null = null
  private isLoaded = false

  async load() {
    if (this.isLoaded) return

    this.ffmpeg = new FFmpeg()
    
    try {

      console.log('[FFmpeg] Fetching blob URLs...')
      
      // Fetch blob URLs first (outside of timeout)
      const coreURL = await toBlobURL(`/ffmpeg/ffmpeg-core.js`, 'text/javascript')
      console.log('[FFmpeg] Core JS blob URL obtained')
      
      const wasmURL = await toBlobURL(`/ffmpeg/ffmpeg-core.wasm`, 'application/wasm')
      console.log('[FFmpeg] WASM blob URL obtained')
      
      console.log('[FFmpeg] Starting FFmpeg.load()...')
      
      // Add timeout to catch hanging loads
      const loadPromise = this.ffmpeg.load({
        coreURL,
        wasmURL,
      })
      
      let timeoutId: NodeJS.Timeout | null = null
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          console.error('[FFmpeg] Load timeout - FFmpeg initialization took too long')
          reject(new Error('FFmpeg.load() timed out after 60 seconds'))
        }, 60000)
      })
      
      try {
        await Promise.race([loadPromise, timeoutPromise])
      } finally {
        // Always clear the timeout to prevent it from firing later
        if (timeoutId) {
          clearTimeout(timeoutId)
        }
      }

      console.log('[FFmpeg] Successfully loaded!')
      this.isLoaded = true
    } catch (error) {
      console.error('[FFmpeg] Load failed:', error)
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
      video.style.display = 'none'
      
      let blobUrl: string | null = null
      let hasResolved = false
      
      const cleanup = () => {
        hasResolved = true
        try {
          if (blobUrl) URL.revokeObjectURL(blobUrl)
          if (video.parentNode) {
            video.parentNode.removeChild(video)
          }
          video.src = ''
        } catch (e) {
          // Ignore cleanup errors
        }
      }
      
      // Set a timeout in case the video takes too long to load
      const timeoutId = setTimeout(() => {
        if (!hasResolved) {
          hasResolved = true
          cleanup()
          reject(new Error('Timeout: Video metadata took too long to load'))
        }
      }, 20000) // 20 second timeout
      
      video.onloadedmetadata = function() {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeoutId)
          const duration = video.duration
          resolve(duration)
          cleanup()
        }
      }
      
      video.onerror = function(error) {
        if (!hasResolved) {
          hasResolved = true
          clearTimeout(timeoutId)
          cleanup()
          console.error('Video load error:', error)
          reject(new Error('Failed to load video metadata - the video format may not be supported'))
        }
      }
      
      // Fallback if loadedmetadata doesn't fire but canplay does
      video.oncanplay = function() {
        if (!hasResolved && video.duration && isFinite(video.duration)) {
          hasResolved = true
          clearTimeout(timeoutId)
          const duration = video.duration
          resolve(duration)
          cleanup()
        }
      }
      
      try {
        blobUrl = URL.createObjectURL(file)
        video.src = blobUrl
        // Add to DOM body (hidden) to ensure proper loading
        document.body.appendChild(video)
      } catch (error) {
        hasResolved = true
        clearTimeout(timeoutId)
        reject(new Error('Failed to create blob URL from video file'))
      }
    })
  }

  async trimVideoTo2Minutes(inputFile: File, onProgress?: (progress: number) => void): Promise<Blob> {
    console.log('[trimVideoTo2Minutes] Starting...')
    if (!this.ffmpeg || !this.isLoaded) {
      console.log('[trimVideoTo2Minutes] FFmpeg not loaded, loading now...')
      await this.load()
    }

    if (!this.ffmpeg) {
      console.error('[trimVideoTo2Minutes] FFmpeg is still null after load()')
      throw new Error('FFmpeg failed to load')
    }

    console.log('[trimVideoTo2Minutes] FFmpeg loaded successfully')
    const fileExtension = inputFile.name.split('.').pop()?.toLowerCase() || 'mp4'
    const inputFileName = `input.${fileExtension}`
    const outputFileName = 'output.mp4'

    try {
      // Write input file to FFmpeg virtual filesystem
      console.log('[trimVideoTo2Minutes] Fetching input file...')
      const fetchedFile = await fetchFile(inputFile)
      console.log('[trimVideoTo2Minutes] File fetched, size:', (fetchedFile as any).length)
      
      console.log('[trimVideoTo2Minutes] Writing file to FFmpeg FS...')
      if (onProgress) onProgress(5) // Started
      await this.ffmpeg.writeFile(inputFileName, fetchedFile)
      console.log('[trimVideoTo2Minutes] File written to FFmpeg FS')
      if (onProgress) onProgress(15) // File loaded

      // Trim video to exactly 2 minutes (120 seconds)
      if (onProgress) onProgress(20) // Starting encoding
      
      console.log(`[FFmpeg] Starting video encoding for: ${inputFileName}`)
      
      // Execute FFmpeg with timeout protection
      const execPromise = this.ffmpeg.exec([
        '-i', inputFileName,
        '-t', '120', // Trim to 120 seconds (2 minutes)
        '-c:v', 'libx264', // Use H.264 codec with fast presets
        '-preset', 'veryfast', // Very fast encoding
        '-crf', '28', // Quality setting (28 is good for fast encoding)
        '-c:a', 'aac', // Use AAC audio codec
        '-b:a', '96k', // Lower audio bitrate for speed
        '-y', // Overwrite output file if exists
        outputFileName
      ])
      
      console.log(`[FFmpeg] Exec command started, waiting for completion...`)

      // Set a 120-second timeout for FFmpeg execution (increased for encoding)
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Video trimming timed out (120 seconds)')), 120000)
      )

      const result = await Promise.race([execPromise, timeoutPromise])
      
      console.log(`[FFmpeg] Exec completed with result:`, result)
      
      if (result !== 0 && result !== undefined) {
        console.error(`[FFmpeg] Failed with exit code: ${result}`)
        throw new Error(`FFmpeg encoding failed with exit code ${result}`)
      }

      console.log(`[FFmpeg] Encoding complete, updating progress to 80%`)
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
      
      console.error('Video trimming error:', error)
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
