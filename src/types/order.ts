export type OrderStatus = 'UNPAID' | 'PAID' | 'PREPARING' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED' | 'RETURNED'

export interface Cushion {
  id: string
  name: string // Cushion A, B, C, etc.
  quantity: number
  isMirrored: boolean
  videos: VideoFile[]
  colorPhotos?: VideoFile[]
}

export interface DatabaseCushion {
  id: string
  order_id: number
  name: string
  quantity: number
  mirror: boolean
  videos: string[] // Array of video filenames
}

export interface VideoFile {
  id: string
  file: File
  name: string
  size: number
  type: string
  uploadedFileName?: string
}

export interface Order {
  id: number
  user_id: string
  created_at: string
  projectname: string | null // Display as "PO number"
  quantity: number // Display as "Total Cushion Count"
  color: string[] // Display as "Color 1", "Color 2", "Color 3"
  name: string // Display as "Customer/Company Name"
  contact_name: string | null
  address: string
  address2: string | null
  country: string | null
  city: string | null
  zipcode: string
  state: string
  company_phone: string | null
  phonenumber: string // Display as "Phone"
  email: string | null
  ship_by_date: string | null
  boat_make: string | null
  boat_model: string | null
  boat_year: number | null
  boat_length: number | null
  boat_HIN: string | null
  status: OrderStatus
  payment_intent_id: string[]
  paid_at: string | null
  updated_at: string
  cushions_count: number // Display as "Total Cushion Count"
  color_images: Record<string, any> | null
  outstanding_amount: number | null
  cushions?: DatabaseCushion[]
}

export interface CreateOrderData {
  projectname?: string
  quantity: number
  color: string[]
  name: string
  contact_name?: string
  address: string
  address2?: string
  country?: string
  city?: string
  zipcode: string
  state: string
  company_phone?: string
  phonenumber: string
  email?: string
  ship_by_date?: string
  boat_make?: string
  boat_model?: string
  boat_year?: number
  boat_length?: number
  boat_HIN?: string
  cushions_count?: number
  color_images?: Record<string, any>
  cushions?: {
    name: string
    quantity: number
    mirror: boolean
    videos: string[] // Array of video filenames
  }[]
}

export interface NewOrderFormData {
  purchaseOrderNumber?: string
  cushions: Cushion[]
  selectedColors: string[]
  shippingAddress: {
    name: string // Customer/Company Name
    contactName: string
    address: string
    address2?: string
    country: string
    city: string
    zipcode: string
    state: string
    companyPhone?: string
    phonenumber: string
    email: string
    shipByDate?: string
  }
  boatInformation: {
    make: string
    model: string
    year: string // 4-digit year
    length: string // 1-2 digit whole number in feet
    boatHin: string // Hull Identification Number
  }
}

export interface UploadProgress {
  fileName: string
  status: 'pending' | 'uploading' | 'completed' | 'error'
  progress?: number
  error?: string
} 