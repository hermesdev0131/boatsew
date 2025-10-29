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
  const autocompleteService = useRef<any>(null)
  const placesService = useRef<any>(null)
  const [predictions, setPredictions] = useState<any[]>([])
  const [showPredictions, setShowPredictions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

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

        if (window.google?.maps?.places) {
          autocompleteService.current = new window.google.maps.places.AutocompleteService()
          placesService.current = new window.google.maps.places.PlacesService(
            document.createElement('div')
          )
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

    if (!initialized || !autocompleteService.current || input.length < 3) {
      setPredictions([])
      setShowPredictions(false)
      return
    }

    try {
      setLoading(true)

      // First, search for USA results
      const usaResponse = await autocompleteService.current.getPlacePredictions({
        input: input,
        componentRestrictions: { country: ['us'] },
      })

      let allPredictions: any[] = []

      // Add USA results first
      if (usaResponse?.status === 'OK' && usaResponse?.predictions) {
        allPredictions = [...usaResponse.predictions]
      }

      // Then search for Canada results
      const canadaResponse = await autocompleteService.current.getPlacePredictions({
        input: input,
        componentRestrictions: { country: ['ca'] },
      })

      // Add Canada results after USA
      if (canadaResponse?.status === 'OK' && canadaResponse?.predictions) {
        allPredictions = [...allPredictions, ...canadaResponse.predictions]
      }

      if (allPredictions.length > 0) {
        setPredictions(allPredictions)
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

  const handlePredictionClick = (placeId: string, description: string) => {
    onChange(description)
    setShowPredictions(false)

    // Fetch detailed place information
    if (!placesService.current) return

    try {
      placesService.current.getDetails(
        { placeId: placeId, fields: ['address_components', 'formatted_address'] },
        (place: any, status: string) => {
          if (status !== 'OK' || !place) {
            console.warn('Failed to get place details. Status:', status)
            return
          }

          const addressData = parseAddressComponents(place.address_components, place.formatted_address)
          if (onAddressSelect) {
            onAddressSelect(addressData)
          }
        }
      )
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
        onFocus={() => value.length > 0 && predictions.length > 0 && setShowPredictions(true)}
        onBlur={() => setTimeout(() => setShowPredictions(false), 200)}
        required={required}
        placeholder={placeholder}
        sx={{ mb: 2 }}
        InputProps={{
          endAdornment: loading ? <CircularProgress color="inherit" size={20} /> : null,
        }}
      />

      {showPredictions && predictions.length > 0 && (
        <Paper
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
            {predictions.map((prediction) => (
              <ListItem key={prediction.place_id} sx={{ py: 0 }}>
                <ListItemButton
                  onClick={() =>
                    handlePredictionClick(prediction.place_id, prediction.description)
                  }
                >
                  <ListItemText
                    primary={prediction.main_text}
                    secondary={prediction.secondary_text}
                    sx={{
                      '& .MuiListItemText-primary': {
                        fontSize: '0.95rem',
                      },
                      '& .MuiListItemText-secondary': {
                        fontSize: '0.85rem',
                      },
                    }}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  )
}