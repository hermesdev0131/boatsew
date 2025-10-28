export interface ChatMessage {
  id: string
  order_id: number
  sender_id: string
  message_text: string
  created_at: string
  media_url?: string
  media_type?: string
}

export interface ChatMessageWithSender extends ChatMessage {
  isCurrentUser: boolean
}

export interface ChatState {
  messages: ChatMessageWithSender[]
  loading: boolean
  error: string | null
  connected: boolean
} 