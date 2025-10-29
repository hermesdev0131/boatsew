'use client'

import React, { useRef, useEffect, useState } from 'react'
import { TextField, Box, Paper, List, ListItem, ListItemButton, ListItemText, CircularProgress } from '@mui/material'
import { Loader } from '@googlemaps/js-api-loader'

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onAddressSelect?: (addressData: AddressData) => void
  placeholder?: string
  required?: boolean
}

export interface AddressData {
  fullAddress: string
  street: string
  city: string
  state: string
  zipcode: string
  country: string
}

declare global {
  interface Window {
    google?: any
  }
}

export default function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = 'Enter address',
  required = false,
}: AddressAutocompleteProps) {
  const [predictions, setPredictions] = useState<any[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const hideTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    const initGoogleMaps = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
        if (!apiKey) {
          console.warn('Google Maps API key not found. Address autocomplete will not work.')
          setInitialized(true)
          return
        }

        const loader = new Loader({
          apiKey: apiKey,
          libraries: ['places'],
        })

        await loader.load()

        if (window.google?.maps) {
          setInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize Google Maps:', error)
        setInitialized(true)
      }
    }

    initGoogleMaps()
  }, [])

  const handleInputChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const input = event.target.value
    onChange(input)

    if (!initialized || input.length < 3) {
      setPredictions([])
      setShowPredictions(false)
      return
    }

    try {
      setLoading(true)

      // Use new AutocompleteSuggestion API
      const { AutocompleteSuggestion } = (await window.google?.maps?.importLibrary?.('places')) as any

      if (!AutocompleteSuggestion) {
        console.warn('AutocompleteSuggestion not available')
        setPredictions([])
        setShowPredictions(false)
        return
      }

      // Fetch predictions with region restrictions for US and Canada
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: input,
        includedRegionCodes: ['us', 'ca'],
      })

      if (suggestions && suggestions.length > 0) {
        console.log('Suggestions received:', suggestions)
        setPredictions(suggestions)
        setShowPredictions(true)
      } else {
        setPredictions([])
        setShowPredictions(false)
      }
    } catch (error) {
      console.error('Error fetching predictions:', error)
      setPredictions([])
      setShowPredictions(false)
    } finally {
      setLoading(false)
    }
  }

  const handlePredictionClick = async (placeId: string, description: string) => {
    if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    onChange(description)
    setShowPredictions(false)

    // Only fetch place details if we have a valid place ID (not our fallback)
    if (!placeId || placeId.startsWith('suggestion-')) {
      return
    }

    // Fetch detailed place information using new Place API
    try {
      const { Place } = (await window.google?.maps?.importLibrary?.('places')) as any

      if (!Place) {
        console.warn('Place API not available')
        return
      }

      const place = new Place({
        id: placeId,
      })

      await place.fetchFields({
        fields: ['addressComponents', 'formattedAddress'],
      })

      const addressData = parseAddressComponents(
        place.addressComponents || [],
        place.formattedAddress || ''
      )
      if (onAddressSelect) {
        onAddressSelect(addressData)
      }
    } catch (error) {
      console.error('Error fetching place details:', error)
    }
  }

  const parseAddressComponents = (components: any[], formattedAddress: string): AddressData => {
    let street = ''
    let city = ''
    let state = ''
    let zipcode = ''
    let country = ''

    for (const component of components) {
      const types = component.types

      if (types.includes('street_number')) {
        street = component.short_name + ' ' + street
      }
      if (types.includes('route')) {
        street += component.short_name
      }
      if (types.includes('locality')) {
        city = component.long_name
      }
      if (types.includes('administrative_area_level_1')) {
        state = component.short_name
      }
      if (types.includes('postal_code')) {
        zipcode = component.short_name
      }
      if (types.includes('country')) {
        country = component.long_name
      }
    }

    return {
      fullAddress: formattedAddress,
      street: street.trim(),
      city: city,
      state: state,
      zipcode: zipcode,
      country: country,
    }
  }

  return (
    <Box sx={{ position: 'relative' }}>
      <TextField
        ref={inputRef}
        fullWidth
        label="Address"
        value={value}
        onChange={handleInputChange}
        onFocus={() => predictions.length > 0 && setShowPredictions(true)}
        onBlur={() => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = setTimeout(() => setShowPredictions(false), 200)
        }}
        required={required}
        placeholder={placeholder}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: loading ? <CircularProgress color="inherit" size={20} /> : null,
        }}
      />

      {showPredictions && predictions.length > 0 && (
        <Paper
          onMouseDown={(e) => {
            if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
            e.preventDefault()
          }}
          sx={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            maxHeight: '300px',
            overflow: 'auto',
            mt: -1,
          }}
        >
          <List sx={{ py: 0 }}>
            {predictions.map((suggestion, index) => {
              // New Google Places API returns data under placePrediction
              const placePrediction = suggestion.placePrediction || suggestion
              const placeId = placePrediction.placeId || placePrediction.id || `suggestion-${index}`
              
              // Extract text from the new API structure
              const mainText = placePrediction.mainText?.text || ''
              const secondaryText = placePrediction.secondaryText?.text || ''
              const displayText = placePrediction.description || ''

              return (
                <ListItem key={placeId} sx={{ py: 0 }}>
                  <ListItemButton
                    onClick={() =>
                      handlePredictionClick(placeId, displayText)
                    }
                  >
                    <ListItemText
                      primary={displayText}
                      sx={{
                        '& .MuiListItemText-primary': {
                          fontSize: '0.95rem',
                          color: 'text.primary',
                        },
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              )
            })}
          </List>
        </Paper>
      )}
    </Box>
  )
}