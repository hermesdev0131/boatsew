import React from 'react'
import { Paper, Typography, Box } from '@mui/material'
import { ChatMessageWithSender } from '@/types/chat'
import MediaPreview from './MediaPreview'

interface MessageBubbleProps {
  message: ChatMessageWithSender
  index: number
  orderId: number
}

const formatTime = (timestamp: string) => {
  return new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

export default function MessageBubble({ message, index, orderId }: MessageBubbleProps) {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: message.isCurrentUser ? 'flex-end' : 'flex-start',
        mb: 1,
        animation: 'slideInUp 0.3s ease-out',
        animationDelay: `${index * 0.1}s`,
        '@keyframes slideInUp': {
          '0%': {
            opacity: 0,
            transform: 'translateY(20px)'
          },
          '100%': {
            opacity: 1,
            transform: 'translateY(0)'
          }
        }
      }}
    >
      <Paper
        elevation={1}
        sx={{
          maxWidth: '70%',
          p: 1.5,
          backgroundColor: message.isCurrentUser ? 'primary.main' : 'grey.100',
          color: message.isCurrentUser ? 'white' : 'text.primary',
          borderRadius: 2,
          position: 'relative',
          wordBreak: 'break-word'
        }}
      >

        <Typography variant="body2">
          {message.message_text}
        </Typography>
        
        {/* Media Preview */}
        {message.media_url && message.media_type && (
          <MediaPreview
            mediaFileName={message.media_url}
            mediaType={message.media_type}
            orderId={orderId}
          />
        )}
        
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            mt: 0.5,
            opacity: 0.7,
            textAlign: message.isCurrentUser ? 'right' : 'left'
          }}
        >
          {formatTime(message.created_at)}
        </Typography>
      </Paper>
    </Box>
  )
} 