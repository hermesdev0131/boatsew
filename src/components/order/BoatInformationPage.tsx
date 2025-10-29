'use client'

import React from 'react'
import {
  Box,
  Typography,
  TextField,
  Paper,
} from '@mui/material'
import { NewOrderFormData } from '@/types/order'

interface BoatInformationPageProps {
  formData: NewOrderFormData
  setFormData: React.Dispatch<React.SetStateAction<NewOrderFormData>>
  showPrompt: (title: string, message: string, severity?: 'error' | 'warning' | 'info' | 'success') => void
}

export default function BoatInformationPage({
  formData,
  setFormData,
  showPrompt,
}: BoatInformationPageProps) {
  const handleBoatInfoChange = (field: keyof NewOrderFormData['boatInformation'], value: string) => {
    setFormData(prev => ({
      ...prev,
      boatInformation: {
        ...prev.boatInformation,
        [field]: value,
      },
    }))
  }

  const handleYearChange = (value: string) => {
    // Only allow 4-digit numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 4)
    handleBoatInfoChange('year', numericValue)
  }

  const handleLengthChange = (value: string) => {
    // Only allow 1-2 digit whole numbers
    const numericValue = value.replace(/\D/g, '').slice(0, 2)
    handleBoatInfoChange('length', numericValue)
  }

  return (
    <Box>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        Please provide information about your boat.
      </Typography>

      <Paper elevation={2} sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Boat Information
        </Typography>
        
        <TextField
          fullWidth
          label="Make"
          value={formData.boatInformation.make}
          onChange={(e) => handleBoatInfoChange('make', e.target.value)}
          required
          placeholder="Enter boat manufacturer/make"
          sx={{ mb: 2 }}
        />

        <TextField
          fullWidth
          label="Model"
          value={formData.boatInformation.model}
          onChange={(e) => handleBoatInfoChange('model', e.target.value)}
          required
          placeholder="Enter boat model"
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <TextField
            fullWidth
            label="Year"
            value={formData.boatInformation.year}
            onChange={(e) => handleYearChange(e.target.value)}
            required
            placeholder="Enter 4-digit year"
            inputProps={{
              maxLength: 4,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            helperText="4-digit year only"
          />

          <TextField
            fullWidth
            label="Length (in feet)"
            value={formData.boatInformation.length}
            onChange={(e) => handleLengthChange(e.target.value)}
            required
            placeholder="Enter length in feet"
            inputProps={{
              maxLength: 2,
              inputMode: 'numeric',
              pattern: '[0-9]*',
            }}
            helperText="1-2 digit whole number"
          />
        </Box>

        <TextField
          fullWidth
          label="HIN (Hull Identification Number)"
          value={formData.boatInformation.boatHin}
          onChange={(e) => handleBoatInfoChange('boatHin', e.target.value)}
          required
          placeholder="Enter Hull Identification Number"
          sx={{ mb: 2 }}
          helperText="Located on the transom or inside the hull"
        />

        <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5 }}>
            Boat Information Summary
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {formData.boatInformation.make && formData.boatInformation.model && (
              <>
                {formData.boatInformation.year && `${formData.boatInformation.year} `}
                {formData.boatInformation.make} {formData.boatInformation.model}
                {formData.boatInformation.length && ` - ${formData.boatInformation.length}ft`}
                {formData.boatInformation.boatHin && (
                  <>
                    <br />
                    <strong>HIN:</strong> {formData.boatInformation.boatHin}
                  </>
                )}
              </>
            )}
            {!formData.boatInformation.make && !formData.boatInformation.model && (
              <em>No boat information provided yet</em>
            )}
          </Typography>
        </Box>
      </Paper>
    </Box>
  )
}
