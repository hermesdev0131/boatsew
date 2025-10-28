'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import {
  Card,
  CardContent,
  Typography,
  Chip,
  Box,
  Badge,
} from '@mui/material'
import { Order } from '@/types/order'

interface OrderCardProps {
  order: Order
  unreadCount?: number
}

const getStatusColor = (status: Order['status']) => {
  switch (status) {
    case 'UNPAID':
      return 'error'
    case 'PAID':
      return 'warning'
    case 'PREPARING':
      return 'info'
    case 'SHIPPING':
      return 'primary'
    case 'DELIVERED':
      return 'success'
    case 'CANCELLED':
      return 'default'
    case 'RETURNED':
      return 'error'
    default:
      return 'default'
  }
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default function OrderCard({ order, unreadCount = 0 }: OrderCardProps) {
  const router = useRouter()
  const poNumber = order.projectname || 'No PO'
  const hasNoPO = !order.projectname

  const handleCardClick = () => {
    router.push(`/chat/orderpage?orderId=${order.id}`)
  }

  return (
    <Badge 
      badgeContent={unreadCount > 0 ? unreadCount : null}
      color="error"
      sx={{
        width: '100%',
        '& .MuiBadge-badge': {
          fontSize: '0.75rem',
          minWidth: '20px',
          height: '20px',
        }
      }}
    >
      <Card 
        onClick={handleCardClick}
        sx={{ 
          width: '100%',
          mb: 2,
          borderRadius: 2,
          boxShadow: 2,
          cursor: 'pointer',
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            boxShadow: 4,
            transform: 'translateY(-2px)',
          }
        }}
      >
      <CardContent>
        <Typography 
          variant="h6" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 'bold',
            color: hasNoPO ? 'text.secondary' : 'text.primary'
          }}
        >
          {poNumber}
        </Typography>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Order #{order.id}
          </Typography>
          <Chip 
            label={order.status} 
            color={getStatusColor(order.status) as any}
            size="small"
          />
        </Box>
        
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Total Cushion Count: {order.cushions_count} ({order.quantity} pieces)
          </Typography>
          {order.color.length > 0 && (
            <Typography variant="body2" color="text.secondary">
              {order.color.map((color, index) => `Color ${index + 1}: ${color}`).join(', ')}
            </Typography>
          )}
        </Box>
        
        <Typography variant="body2" color="text.secondary">
          Created: {formatDate(order.created_at)}
        </Typography>
      </CardContent>
    </Card>
    </Badge>
  )
} 