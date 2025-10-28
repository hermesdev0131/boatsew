'use client'

import React, { useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
} from '@mui/material'
import { NewOrderFormData } from '@/types/order'
import { useAuth } from '@/contexts/AuthContext'

interface ShippingAddressPageProps {
  formData: NewOrderFormData
  setFormData: React.Dispatch<React.SetStateAction<NewOrderFormData>>
  showPrompt: (title: string, message: string, severity?: 'error' | 'warning' | 'info' | 'success') => void
}

export default function ShippingAddressPage({
  formData,
  setFormData,
  showPrompt,
}: ShippingAddressPageProps) {
  const { user } = useAuth()

  // Auto-fill email from user's login when component mounts
  useEffect(() => {
    if (user?.email && !formData.shippingAddress.email) {
      handleAddressChange('email', user.email)
    }
  }, [user])

  const handleAddressChange = (field: keyof NewOrderFormData['shippingAddress'], value: string) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        [field]: value,
      },
    }))
  }

  const getShipByDateStatus = () => {
    if (!formData.shippingAddress.shipByDate) return null
    
    const today = new Date()
    const shipDate = new Date(formData.shippingAddress.shipByDate)
    const daysUntilShip = Math.ceil((shipDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    
    if (daysUntilShip >= 7) {
      return { label: `${daysUntilShip} days`, color: 'success' as const }
    } else if (daysUntilShip >= 2) {
      return { label: `${daysUntilShip} days`, color: 'warning' as const }
    } else {
      return { label: daysUntilShip === 1 ? '1 day' : `${daysUntilShip} days`, color: 'error' as const }
    }
  }

  const shipDateStatus = getShipByDateStatus()

  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Please provide the shipping information for your order.
      </Typography>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shipping Information
        </Typography>
        
        {/* Row 1: Customer/Company Name */}
        <TextField
          fullWidth
          label="Customer/Company Name"
          value={formData.shippingAddress.name}
          onChange={(e) => handleAddressChange('name', e.target.value)}
          required
          placeholder="Enter customer or company name"
          sx={{ mb: 2 }}
        />

        {/* Row 2: Contact Name */}
        <TextField
          fullWidth
          label="Contact Name"
          value={formData.shippingAddress.contactName}
          onChange={(e) => handleAddressChange('contactName', e.target.value)}
          required
          placeholder="Enter contact person name"
          sx={{ mb: 2 }}
        />

        {/* Row 3: Address */}
        <TextField
          fullWidth
          label="Address"
          value={formData.shippingAddress.address}
          onChange={(e) => handleAddressChange('address', e.target.value)}
          required
          placeholder="Street address, P.O. box, company name"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Address Line 2 (Optional)"
          value={formData.shippingAddress.address2 || ''}
          onChange={(e) => handleAddressChange('address2', e.target.value)}
          placeholder="Apartment, suite, unit, building, floor, etc."
          sx={{ mb: 2 }}
        />

        {/* Row 4: Country */}
        <TextField
          fullWidth
          label="Country"
          value={formData.shippingAddress.country}
          onChange={(e) => handleAddressChange('country', e.target.value)}
          required
          placeholder="Enter country"
          sx={{ mb: 2 }}
        />

        {/* Row 5: State and ZIP Code */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="State"
            value={formData.shippingAddress.state}
            onChange={(e) => handleAddressChange('state', e.target.value)}
            required
            placeholder="Enter state"
          />
          <TextField
            fullWidth
            label="ZIP Code"
            value={formData.shippingAddress.zipcode}
            onChange={(e) => handleAddressChange('zipcode', e.target.value)}
            required
            placeholder="Enter ZIP code"
          />
        </Box>

        {/* Row 6: Company Phone (Optional) */}
        <TextField
          fullWidth
          label="Company Phone (Optional)"
          value={formData.shippingAddress.companyPhone || ''}
          onChange={(e) => handleAddressChange('companyPhone', e.target.value)}
          placeholder="Enter company phone number"
          sx={{ mb: 2 }}
        />

        {/* Row 7: Phone */}
        <TextField
          fullWidth
          label="Phone"
          value={formData.shippingAddress.phonenumber}
          onChange={(e) => handleAddressChange('phonenumber', e.target.value)}
          required
          placeholder="Enter phone number"
          sx={{ mb: 2 }}
        />

        {/* Row 8: Email */}
        <TextField
          fullWidth
          label="Email"
          type="email"
          value={formData.shippingAddress.email}
          onChange={(e) => handleAddressChange('email', e.target.value)}
          required
          placeholder="Enter email address"
          helperText="Auto-filled from your account, but you can change it"
          sx={{ mb: 2 }}
        />

        {/* Row 9: Ship by Date */}
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            label="Ship by Date"
            type="date"
            value={formData.shippingAddress.shipByDate || ''}
            onChange={(e) => handleAddressChange('shipByDate', e.target.value)}
            InputLabelProps={{
              shrink: true,
            }}
          />
          {shipDateStatus && (
            <Box sx={{ mt: 1 }}>
              <Chip
                label={shipDateStatus.label}
                color={shipDateStatus.color}
                size="small"
                sx={{ fontWeight: 'bold' }}
              />
            </Box>
          )}
        </Box>

        {/* Summary */}
        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            <strong>Shipping Information Summary:</strong>
            <br />
            {formData.shippingAddress.name && `${formData.shippingAddress.name}`}
            {formData.shippingAddress.contactName && (
              <>
                <br />
                Contact: {formData.shippingAddress.contactName}
              </>
            )}
            {formData.shippingAddress.address && (
              <>
                <br />
                {formData.shippingAddress.address}
              </>
            )}
            {formData.shippingAddress.address2 && (
              <>
                <br />
                {formData.shippingAddress.address2}
              </>
            )}
            {formData.shippingAddress.state && formData.shippingAddress.zipcode && (
              <>
                <br />
                {formData.shippingAddress.state}, {formData.shippingAddress.zipcode}
              </>
            )}
            {formData.shippingAddress.country && (
              <>
                <br />
                {formData.shippingAddress.country}
              </>
            )}
            {formData.shippingAddress.companyPhone && (
              <>
                <br />
                Company Phone: {formData.shippingAddress.companyPhone}
              </>
            )}
            {formData.shippingAddress.phonenumber && (
              <>
                <br />
                Phone: {formData.shippingAddress.phonenumber}
              </>
            )}
            {formData.shippingAddress.email && (
              <>
                <br />
                Email: {formData.shippingAddress.email}
              </>
            )}
            {formData.shippingAddress.shipByDate && (
              <>
                <br />
                Ship by: {formData.shippingAddress.shipByDate}
              </>
            )}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
} 