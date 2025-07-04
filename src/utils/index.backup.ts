import { EVENT_CODE, FILE_LIMITS, VALIDATION } from '../constants'
import { EventType, MediaType } from '../types'

// # Etkinlik kodu oluşturucu
// # "ABC123" formatında 6 haneli unique kod üretir
export const generateEventCode = (): string => {
  const { LENGTH, CHARACTERS } = EVENT_CODE
  let result = ''
  
  for (let i = 0; i < LENGTH; i++) {
    result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length))
  }
  
  return result
}

// # Etkinlik kodunu valide et
export const validateEventCode = (code: string): boolean => {
  const { LENGTH, CHARACTERS } = EVENT_CODE
  
  if (code.length !== LENGTH) return false
  
  return code.split('').every(char => CHARACTERS.includes(char))
}

// # Dosya boyutunu human-readable format'a çevir
// # formatFileSize(1024) -> "1 KB"
// # formatFileSize(1048576) -> "1 MB"
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// # Dosya tipini kontrol et (image/video)
export const getFileType = (mimeType: string): MediaType | null => {
  if (FILE_LIMITS.ALLOWED_IMAGE_TYPES.includes(mimeType)) {
    return 'image'
  }
  
  if (FILE_LIMITS.ALLOWED_VIDEO_TYPES.includes(mimeType)) {
    return 'video'
  }
  
  return null
}

// # Dosya boyutu limitini kontrol et
export const validateFileSize = (fileSize: number, fileType: MediaType): boolean => {
  const maxSizeBytes = fileType === 'image' 
    ? FILE_LIMITS.MAX_IMAGE_SIZE_MB * 1024 * 1024
    : FILE_LIMITS.MAX_VIDEO_SIZE_MB * 1024 * 1024
    
  return fileSize <= maxSizeBytes
}

// # Tarihi güzel formatta göster
// # formatDate(new Date()) -> "25 Haziran 2025"
export const formatDate = (date: string | Date): string => {
  const d = typeof date === 'string' ? new Date(date) : date
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]
  
  return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`
}

// # Tarih aralığını formatla
// # formatDateRange(start, end) -> "25-27 Haziran 2025"
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate
  
  const months = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ]
  
  // # Aynı gün ise
  if (start.toDateString() === end.toDateString()) {
    return formatDate(start)
  }
  
  // # Aynı ay ise
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${start.getDate()}-${end.getDate()} ${months[start.getMonth()]} ${start.getFullYear()}`
  }
  
  // # Farklı aylar
  return `${formatDate(start)} - ${formatDate(end)}`
}

// # Zamanı "2 saat önce" formatında göster
export const formatTimeAgo = (date: string | Date): string => {
  const now = new Date()
  const past = typeof date === 'string' ? new Date(date) : date
  const diffMs = now.getTime() - past.getTime()
  
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  
  if (diffMinutes < 1) return 'Şimdi'
  if (diffMinutes < 60) return `${diffMinutes} dakika önce`
  if (diffHours < 24) return `${diffHours} saat önce`
  if (diffDays < 7) return `${diffDays} gün önce`
  
  return formatDate(past)
}

// # Email validasyonu
export const validateEmail = (email: string): boolean => {
  return VALIDATION.USER.EMAIL_REGEX.test(email)
}

// # Etkinlik başlığı validasyonu
export const validateEventTitle = (title: string): string | null => {
  const { TITLE_MIN_LENGTH, TITLE_MAX_LENGTH } = VALIDATION.EVENT
  
  if (title.length < TITLE_MIN_LENGTH) {
    return `Başlık en az ${TITLE_MIN_LENGTH} karakter olmalı`
  }
  
  if (title.length > TITLE_MAX_LENGTH) {
    return `Başlık en fazla ${TITLE_MAX_LENGTH} karakter olabilir`
  }
  
  return null
}

// # Kullanıcı adı validasyonu
export const validateDisplayName = (name: string): string | null => {
  const { NAME_MIN_LENGTH, NAME_MAX_LENGTH } = VALIDATION.USER
  
  if (name.length < NAME_MIN_LENGTH) {
    return `İsim en az ${NAME_MIN_LENGTH} karakter olmalı`
  }
  
  if (name.length > NAME_MAX_LENGTH) {
    return `İsim en fazla ${NAME_MAX_LENGTH} karakter olabilir`
  }
  
  return null
}

// # Renk utility'leri
// # Hex rengi RGB'ye çevir
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

// # Rengin açık mı koyu mu olduğunu kontrol et (text color için)
export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex)
  if (!rgb) return true
  
  // # Luminance hesapla
  const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255
  return luminance > 0.5
}

// # Deep link URL'i oluştur
// # createDeepLink('event', 'ABC123') -> "eventshare://event/ABC123"
export const createDeepLink = (type: 'event' | 'profile', id: string): string => {
  return `eventshare://${type}/${id}`
}

// # Etkinlik paylaşım linkini oluştur
export const createShareLink = (eventCode: string): string => {
  return `https://eventshare.app/join/${eventCode}`
}

// # Dosya uzantısını al
export const getFileExtension = (fileName: string): string => {
  return fileName.split('.').pop()?.toLowerCase() || ''
}

// # Unique ID generator (UUID benzeri)
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// # Debounce function (search için)
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void => {
  let timeout: NodeJS.Timeout
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

// # Array'i chunks'lara böl
// # chunkArray([1,2,3,4,5], 2) -> [[1,2], [3,4], [5]]
export const chunkArray = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

// # Rastgele avatar rengi oluştur
export const generateAvatarColor = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
    '#FECA57', '#FF9FF3', '#54A0FF', '#5F27CD'
  ]
  
  // # İsme göre consistent renk seç
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  return colors[Math.abs(hash) % colors.length]
}

// # Etkinlik tipine göre emoji al
export const getEventTypeEmoji = (type: EventType): string => {
  const emojis = {
    wedding: '💒',
    birthday: '🎂',
    corporate: '🏢',
    graduation: '🎓',
    anniversary: '💕',
    other: '🎉'
  }
  
  return emojis[type] || '🎉'
}

// # Error handling helper
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message
  }
  
  if (error.message) {
    return error.message
  }
  
  return 'Beklenmeyen bir hata oluştu'
}

// # Storage path helper'ları
export const getAvatarPath = (userId: string): string => {
  return `avatars/${userId}.jpg`
}

export const getMediaPath = (eventId: string, fileName: string): string => {
  return `events/${eventId}/media/${fileName}`
}

export const getThumbnailPath = (eventId: string, fileName: string): string => {
  return `events/${eventId}/thumbnails/${fileName}`
}