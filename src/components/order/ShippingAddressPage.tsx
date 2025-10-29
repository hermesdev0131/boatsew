'use client'

import React, { useEffect } from 'react'
import {
  Box,
  Typography,
  TextField,
  Paper,
  Chip,
  Select,
  MenuItem,
} from '@mui/material'
import { NewOrderFormData } from '@/types/order'
import { useAuth } from '@/contexts/AuthContext'
import AddressAutocomplete, { AddressData } from '@/components/AddressAutocomplete'

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

  // Auto-fill email from user's login and set default country when component mounts
  useEffect(() => {
    if (user?.email && !formData.shippingAddress.email) {
      handleAddressChange('email', user.email)
    }
    // Set default country to United States if not already set
    if (!formData.shippingAddress.country) {
      handleAddressChange('country', 'United States')
    }
    // Auto-set ship by date to today
    if (!formData.shippingAddress.shipByDate) {
      handleAddressChange('shipByDate', new Date().toISOString().split('T')[0])
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

  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      shippingAddress: {
        ...prev.shippingAddress,
        address: addressData.street,
        state: addressData.state,
        zipcode: addressData.zipcode,
        country: addressData.country,
      },
    }))
  }



  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Please provide the shipping information for your order.
      </Typography>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Shipping Information
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
          {/* CONTACT INFORMATION */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Contact Information
            </Typography>

            {/* Company Name */}
            <TextField
              fullWidth
              label="Customer/Company Name"
              value={formData.shippingAddress.name}
              onChange={(e) => handleAddressChange('name', e.target.value)}
              required
              placeholder="Enter customer or company name"
              sx={{ mb: 2 }}
            />

            {/* Company Phone */}
            <TextField
              fullWidth
              label="Company Phone (Optional)"
              value={formData.shippingAddress.companyPhone || ''}
              onChange={(e) => handleAddressChange('companyPhone', e.target.value)}
              placeholder="Enter company phone number"
              sx={{ mb: 2 }}
            />

            {/* Contact Name */}
            <TextField
              fullWidth
              label="Contact Name"
              value={formData.shippingAddress.contactName}
              onChange={(e) => handleAddressChange('contactName', e.target.value)}
              required
              placeholder="Enter contact person name"
              sx={{ mb: 2 }}
            />

            {/* Phone Number */}
            <TextField
              fullWidth
              label="Contact Phone"
              value={formData.shippingAddress.phonenumber}
              onChange={(e) => handleAddressChange('phonenumber', e.target.value)}
              required
              placeholder="Enter phone number"
              sx={{ mb: 2 }}
            />

            {/* Email */}
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={formData.shippingAddress.email}
              onChange={(e) => handleAddressChange('email', e.target.value)}
              required
              placeholder="Enter email address"
              helperText="Auto-filled from your account, but you can change it"
            />
          </Box>

          {/* ADDRESS INFORMATION */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2 }}>
              Address
            </Typography>

            {/* Address Line 1 */}
              <AddressAutocomplete
                value={formData.shippingAddress.address}
                onChange={(value) => handleAddressChange('address', value)}
                onAddressSelect={handleAddressSelect}
                placeholder="Street address, P.O. box, company name"
                required
              />

            {/* Address Line 2 */}
            <TextField
              fullWidth
              label="Address Line 2 (Optional)"
              value={formData.shippingAddress.address2 || ''}
              onChange={(e) => handleAddressChange('address2', e.target.value)}
              placeholder="Apartment, suite, unit, building, floor, etc."
              sx={{ mb: 2 }}
            />

            {/* State */}
            <TextField
              fullWidth
              label="State"
              value={formData.shippingAddress.state}
              onChange={(e) => handleAddressChange('state', e.target.value)}
              required
              placeholder="Enter state"
              sx={{ mb: 2 }}
            />

            {/* ZIP Code */}
            <TextField
              fullWidth
              label="ZIP Code"
              value={formData.shippingAddress.zipcode}
              onChange={(e) => handleAddressChange('zipcode', e.target.value)}
              required
              placeholder="Enter ZIP code"
              sx={{ mb: 2 }}
            />

            {/* Country */}
            <Select
              fullWidth
              value={formData.shippingAddress.country || 'United States'}
              onChange={(e) => handleAddressChange('country', e.target.value)}
              required
              sx={{ mb: 2 }}
            >
              <MenuItem value="United States">United States</MenuItem>
              <MenuItem value="Canada">Canada</MenuItem>
            </Select>
          </Box>
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
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
} 