'use client'

import React, { useState, useRef, useEffect } from 'react'
import {
  Box,
  Typography,
  Button,
  Container,
  Paper,
  AppBar,
  Toolbar,
  IconButton,
  Tabs,
  Tab,
  useTheme,
  useMediaQuery,
} from '@mui/material'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/ProtectedRoute'
import ProjectDetailsPage from '@/components/order/ProjectDetailsPage'
import ColorPickerPage from '@/components/order/ColorPickerPage'
import ShippingAddressPage from '@/components/order/ShippingAddressPage'
import BoatInformationPage from '@/components/order/BoatInformationPage'
import FullscreenPrompt from '@/components/FullscreenPrompt'
import { NewOrderFormData } from '@/types/order'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { orderService } from '@/services/orderService'
import UploadProgressDialog from '@/components/UploadProgressDialog'
import { UploadProgress } from '@/types/order'

// Generate UUID for file naming
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

type SubPage = 'project' | 'colors' | 'boat' | 'shipping'

export default function NewOrderPage() {
  const router = useRouter()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const { user } = useAuth()
  
  const [currentPage, setCurrentPage] = useState<SubPage>('project')
  const [formData, setFormData] = useState<NewOrderFormData>({
    purchaseOrderNumber: '',
    cushions: [
      {
        id: '1',
        name: 'Cushion A',
        quantity: 1,
        isMirrored: false,
        videos: [],
      },
    ],
    selectedColors: [],
    shippingAddress: {
      name: '',
      contactName: '',
      address: '',
      address2: '',
      country: '',
      zipcode: '',
      state: '',
      companyPhone: '',
      phonenumber: '',
      email: '',
      shipByDate: '',
    },
    boatInformation: {
      make: '',
      model: '',
      year: '',
      length: '',
      boatHin: '',
    },
  })

  const [promptOpen, setPromptOpen] = useState(false)
  const [promptConfig, setPromptConfig] = useState({
    title: '',
    message: '',
    severity: 'error' as 'error' | 'warning' | 'info' | 'success',
  })

  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [showUploadProgress, setShowUploadProgress] = useState(false)

  const touchStartX = useRef<number | null>(null)
  const touchEndX = useRef<number | null>(null)

  const pages: { key: SubPage; label: string }[] = [
    { key: 'project', label: 'Project Details' },
    { key: 'colors', label: 'Color Picker' },
    { key: 'boat', label: 'Boat Information' },
    { key: 'shipping', label: 'Shipping Information' },
  ]

  const handlePageChange = (newPage: SubPage) => {
    setCurrentPage(newPage)
  }

  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = pages.findIndex(page => page.key === currentPage)
    
    if (direction === 'left' && currentIndex < pages.length - 1) {
      setCurrentPage(pages[currentIndex + 1].key)
    } else if (direction === 'right' && currentIndex > 0) {
      setCurrentPage(pages[currentIndex - 1].key)
    }
  }

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX
  }

  const handleTouchEnd = () => {
    if (touchStartX.current && touchEndX.current) {
      const diff = touchStartX.current - touchEndX.current
      const minSwipeDistance = 50

      if (Math.abs(diff) > minSwipeDistance) {
        if (diff > 0) {
          handleSwipe('left')
        } else {
          handleSwipe('right')
        }
      }
    }
    
    touchStartX.current = null
    touchEndX.current = null
  }

  const showPrompt = (title: string, message: string, severity: 'error' | 'warning' | 'info' | 'success' = 'error') => {
    setPromptConfig({ title, message, severity })
    setPromptOpen(true)
  }

  const handleBack = () => {
    router.push('/orders')
  }

  const handleSubmit = async () => {
    try {
      if (!user) {
        throw new Error('User not authenticated')
      }

      // Validation: Check that each cushion has at least one video uploaded
      for (const cushion of formData.cushions) {
        if (cushion.videos.length === 0) {
          throw new Error(`Cushion "${cushion.name}" must have at least one video uploaded.`)
        }
      }

      // Validation: Check that each selected color has one image uploaded
      if (formData.selectedColors.length >= 2) {
        for (const colorName of formData.selectedColors) {
          const hasImage = formData.cushions.some(cushion => 
            cushion.colorPhotos?.some(photo => photo.name === colorName)
          )
          if (!hasImage) {
            throw new Error(`Color "${colorName}" must have an image uploaded.`)
          }
        }
      }

      // Collect all files and validate sizes
      const allFiles: Array<{ file: File; name: string; type: 'video' | 'photo'; cushionId: string }> = []
      const colorImages: Array<{ file: File; colorName: string }> = []
      
      for (const cushion of formData.cushions) {
        // Add videos
        for (const video of cushion.videos) {
          if (video.file.size > 1024 * 1024 * 1024) { // 1GB limit
            throw new Error(`File ${video.name} is too large. Maximum size is 1GB.`)
          }
          allFiles.push({
            file: video.file,
            name: video.name,
            type: 'video',
            cushionId: cushion.id
          })
        }
        
        // Add color photos (one per color)
        if (cushion.colorPhotos) {
          for (const photo of cushion.colorPhotos) {
            if (photo.file.size > 1024 * 1024 * 1024) { // 1GB limit
              throw new Error(`File ${photo.name} is too large. Maximum size is 1GB.`)
            }
            colorImages.push({
              file: photo.file,
              colorName: photo.name
            })
          }
        }
      }

      if (allFiles.length === 0) {
        // No files to upload, just create the order
        const orderData = {
          projectname: formData.purchaseOrderNumber || undefined,
          quantity: formData.cushions.reduce((total, c) => total + c.quantity, 0),
          color: formData.selectedColors,
          name: formData.shippingAddress.name,
          contact_name: formData.shippingAddress.contactName || undefined,
          address: formData.shippingAddress.address,
          address2: formData.shippingAddress.address2 || undefined,
          country: formData.shippingAddress.country || undefined,
          zipcode: formData.shippingAddress.zipcode,
          state: formData.shippingAddress.state,
          company_phone: formData.shippingAddress.companyPhone || undefined,
          phonenumber: formData.shippingAddress.phonenumber,
          email: formData.shippingAddress.email || undefined,
          ship_by_date: formData.shippingAddress.shipByDate || undefined,
          boat_make: formData.boatInformation.make || undefined,
          boat_model: formData.boatInformation.model || undefined,
          boat_year: formData.boatInformation.year ? parseInt(formData.boatInformation.year) : undefined,
          boat_length: formData.boatInformation.length ? parseInt(formData.boatInformation.length) : undefined,
          boat_HIN: formData.boatInformation.boatHin || undefined,
          cushions_count: formData.cushions.length,
          color_images: {},
          cushions: formData.cushions.map(cushion => ({
            name: cushion.name,
            quantity: cushion.quantity,
            mirror: cushion.isMirrored,
            videos: []
          }))
        }

        // Get user session for authorization
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          throw new Error('No active session')
        }

        // Call the edge function
        const { data, error } = await supabase.functions.invoke('create-order', {
          body: orderData,
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        })

        if (error) {
          throw new Error(`Failed to create order: ${error.message}`)
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to create order')
        }

        const newOrder = data.data.order
        
        setPromptConfig({
          title: 'Order Created Successfully',
          message: `Your order has been created with ID: ${newOrder.id}.`,
          severity: 'success'
        })
        setPromptOpen(true)
        
        setTimeout(() => {
          router.push('/orders')
        }, 2000)
        
        return
      }

      // Initialize upload progress for videos and images
      const progress: UploadProgress[] = [
        ...allFiles.map(file => ({
          fileName: file.name,
          status: 'pending' as const,
          progress: 0
        })),
        ...colorImages.map(image => ({
          fileName: `${image.colorName} - ${image.file.name}`,
          status: 'pending' as const,
          progress: 0
        }))
      ]
      
      setUploadProgress(progress)
      setShowUploadProgress(true)

      // Generate timestamp for file organization
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      
      // Upload video files with progress tracking
      const uploadedFiles: Record<string, string> = {}
      
      for (let i = 0; i < allFiles.length; i++) {
        const file = allFiles[i]
        
        // Update status to uploading
        setUploadProgress(prev => prev.map((p, index) => 
          index === i ? { ...p, status: 'uploading' } : p
        ))

        try {
          // Generate UUID for file name
          const fileExtension = file.name.split('.').pop() || 'mp4'
          const uuid = generateUUID()
          const fileName = `${uuid}.${fileExtension}`
          
          const { data, error } = await supabase.storage
            .from('scans')
            .upload(`${user.id}/${timestamp}/${fileName}`, file.file)
          
          if (error) {
            throw new Error(error.message)
          }
          
          // Store mapping from original file ID to full path
          uploadedFiles[`${file.cushionId}_${file.name}`] = `${user.id}/${timestamp}/${fileName}`
          
          // Update status to completed
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { ...p, status: 'completed', progress: 100 } : p
          ))
          
        } catch (error) {
          // Update status to error
          setUploadProgress(prev => prev.map((p, index) => 
            index === i ? { 
              ...p, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : p
          ))
          
          throw new Error(`Failed to upload ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Upload color images to scans bucket with progress tracking
      const colorImagesMap: Record<string, string> = {}
      
      for (let i = 0; i < colorImages.length; i++) {
        const colorImage = colorImages[i]
        const progressIndex = allFiles.length + i
        
        // Update status to uploading
        setUploadProgress(prev => prev.map((p, index) => 
          index === progressIndex ? { ...p, status: 'uploading' } : p
        ))

        try {
          // Generate UUID for file name with proper extension
          const fileExtension = colorImage.file.name.split('.').pop() || 'jpg'
          const uuid = generateUUID()
          const fileName = `${uuid}.${fileExtension}`
          
          const { data, error } = await supabase.storage
            .from('scans')
            .upload(`${user.id}/${timestamp}/${fileName}`, colorImage.file)
          
          if (error) {
            throw new Error(error.message)
          }
          
          // Store mapping from color name to full path
          colorImagesMap[colorImage.colorName] = `${user.id}/${timestamp}/${fileName}`
          
          // Update status to completed
          setUploadProgress(prev => prev.map((p, index) => 
            index === progressIndex ? { ...p, status: 'completed', progress: 100 } : p
          ))
          
        } catch (error) {
          // Update status to error
          setUploadProgress(prev => prev.map((p, index) => 
            index === progressIndex ? { 
              ...p, 
              status: 'error', 
              error: error instanceof Error ? error.message : 'Upload failed' 
            } : p
          ))
          
          throw new Error(`Failed to upload color image for ${colorImage.colorName}: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }

      // Hide upload progress
      setShowUploadProgress(false)

      // Create order using edge function
      const orderData = {
        projectname: formData.purchaseOrderNumber || undefined,
        quantity: formData.cushions.reduce((total, c) => total + c.quantity, 0),
        color: formData.selectedColors,
        name: formData.shippingAddress.name,
        contact_name: formData.shippingAddress.contactName || undefined,
        address: formData.shippingAddress.address,
        address2: formData.shippingAddress.address2 || undefined,
        country: formData.shippingAddress.country || undefined,
        zipcode: formData.shippingAddress.zipcode,
        state: formData.shippingAddress.state,
        company_phone: formData.shippingAddress.companyPhone || undefined,
        phonenumber: formData.shippingAddress.phonenumber,
        email: formData.shippingAddress.email || undefined,
        ship_by_date: formData.shippingAddress.shipByDate || undefined,
        boat_make: formData.boatInformation.make || undefined,
        boat_model: formData.boatInformation.model || undefined,
        boat_year: formData.boatInformation.year ? parseInt(formData.boatInformation.year) : undefined,
        boat_length: formData.boatInformation.length ? parseInt(formData.boatInformation.length) : undefined,
        boat_HIN: formData.boatInformation.boatHin || undefined,
        cushions_count: formData.cushions.length,
        color_images: colorImagesMap,
                     cushions: formData.cushions.map(cushion => {
               const videoFileNames = cushion.videos.map(video => {
                 const originalKey = `${cushion.id}_${video.name}`
                 return uploadedFiles[originalKey]
               }).filter(Boolean) // Remove any undefined values
               
               return {
                 name: cushion.name,
                 quantity: cushion.quantity,
                 mirror: cushion.isMirrored,
                 videos: videoFileNames // Array of strings
               }
             })
      }

      // Get user session for authorization
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('No active session')
      }

      // Call the edge function
      const { data, error } = await supabase.functions.invoke('create-order', {
        body: orderData,
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      if (error) {
        throw new Error(`Failed to create order: ${error.message}`)
      }

      if (!data.success) {
        throw new Error(data.error || 'Failed to create order')
      }

      const newOrder = data.data.order

      // Show success message
      setPromptConfig({
        title: 'Order Created Successfully',
        message: `Your order has been created with ID: ${newOrder.id}. Redirecting to orders page...`,
        severity: 'success'
      })
      setPromptOpen(true)

      // Redirect to orders page after a delay, but don't allow prompt to close
      setTimeout(() => {
        router.push('/orders')
      }, 3000)

    } catch (error) {
      console.error('Order submission error:', error)
      
      // Hide upload progress if it's open
      setShowUploadProgress(false)
      
      setPromptConfig({
        title: 'Order Creation Failed',
        message: error instanceof Error ? error.message : 'Failed to create order. Please try again.',
        severity: 'error'
      })
      setPromptOpen(true)
    }
  }

  const canProceed = () => {
    switch (currentPage) {
      case 'project':
        return formData.cushions.length > 0 && 
               formData.cushions.every(c => c.quantity > 0)
      case 'colors':
        return formData.selectedColors.length > 0
      case 'boat':
        return formData.boatInformation.make && 
               formData.boatInformation.model && 
               formData.boatInformation.year && 
               formData.boatInformation.length
      case 'shipping':
        return formData.shippingAddress.name && 
               formData.shippingAddress.contactName && 
               formData.shippingAddress.address && 
               formData.shippingAddress.country && 
               formData.shippingAddress.zipcode && 
               formData.shippingAddress.state && 
               formData.shippingAddress.phonenumber && 
               formData.shippingAddress.email
      default:
        return false
    }
  }

  const getNextPage = (): SubPage | null => {
    const currentIndex = pages.findIndex(page => page.key === currentPage)
    return currentIndex < pages.length - 1 ? pages[currentIndex + 1].key : null
  }

  const getPrevPage = (): SubPage | null => {
    const currentIndex = pages.findIndex(page => page.key === currentPage)
    return currentIndex > 0 ? pages[currentIndex - 1].key : null
  }

  return (
    <ProtectedRoute>
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <IconButton
              edge="start"
              color="inherit"
              onClick={handleBack}
              sx={{ mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              New Order
            </Typography>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 2, mb: 2 }}>
          {/* Page Navigation Tabs */}
          <Paper elevation={2} sx={{ mb: 2 }}>
            <Tabs
              value={currentPage}
              onChange={(_, newValue) => setCurrentPage(newValue)}
              variant={isMobile ? 'scrollable' : 'fullWidth'}
              scrollButtons={isMobile ? 'auto' : false}
              sx={{
                '& .MuiTab-root': {
                  minHeight: isMobile ? 48 : 64,
                  fontSize: isMobile ? '0.8rem' : '0.9rem',
                  py: isMobile ? 1 : 2,
                },
              }}
            >
              {pages.map((page) => (
                <Tab
                  key={page.key}
                  value={page.key}
                  label={page.label}
                  sx={{
                    fontWeight: currentPage === page.key ? 'bold' : 'normal',
                  }}
                />
              ))}
            </Tabs>
          </Paper>

          {/* Page Content */}
          <Box
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            sx={{ minHeight: '60vh' }}
          >
            {currentPage === 'project' && (
              <ProjectDetailsPage
                formData={formData}
                setFormData={setFormData}
                showPrompt={showPrompt}
              />
            )}
            
            {currentPage === 'colors' && (
              <ColorPickerPage
                formData={formData}
                setFormData={setFormData}
                showPrompt={showPrompt}
              />
            )}
            
            {currentPage === 'boat' && (
              <BoatInformationPage
                formData={formData}
                setFormData={setFormData}
                showPrompt={showPrompt}
              />
            )}
            
            {currentPage === 'shipping' && (
              <ShippingAddressPage
                formData={formData}
                setFormData={setFormData}
                showPrompt={showPrompt}
              />
            )}
          </Box>

          {/* Navigation Buttons */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
            <Button
              variant="outlined"
              onClick={() => {
                const prevPage = getPrevPage()
                if (prevPage) setCurrentPage(prevPage)
              }}
              disabled={!getPrevPage()}
            >
              Previous
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              {getNextPage() ? (
                <Button
                  variant="contained"
                  onClick={() => {
                    if (canProceed()) {
                      const nextPage = getNextPage()
                      if (nextPage) setCurrentPage(nextPage)
                    } else {
                      showPrompt(
                        'Incomplete Information',
                        'Please complete all required fields before proceeding.',
                        'warning'
                      )
                    }
                  }}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  disabled={!canProceed()}
                >
                  Create Order
                </Button>
              )}
            </Box>
          </Box>
        </Container>

        <FullscreenPrompt
          open={promptOpen}
          onClose={() => setPromptOpen(false)}
          title={promptConfig.title}
          message={promptConfig.message}
          severity={promptConfig.severity}
          confirmText={promptConfig.severity === 'success' ? 'Redirecting...' : 'OK'}
          showCloseButton={promptConfig.severity !== 'success'}
        />
        
        <UploadProgressDialog
          open={showUploadProgress}
          progress={uploadProgress}
          title="Uploading Files..."
        />
      </Box>
    </ProtectedRoute>
  )
} 