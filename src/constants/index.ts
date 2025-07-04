// # Uygulama sabitleri ve konfigürasyonları

// # Renkler - Tema sistemini buradan yöneteceğiz
export const COLORS = {
  // # Ana renkler
  primary: '#6366f1', // # Indigo - Ana mavi
  secondary: '#ec4899', // # Pink - Vurgu rengi
  accent: '#10b981', // # Emerald - Başarı rengi
  
  // # Durum renkleri
  success: '#10b981', // # Yeşil
  warning: '#f59e0b', // # Turuncu
  error: '#ef4444', // # Kırmızı
  info: '#3b82f6', // # Mavi
  
  // # Gri tonları
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
  },
  
  // # Özel renkler
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
  
  // # Arka plan renkleri
  background: '#f8fafc',
  surface: '#ffffff',
  card: '#ffffff',
}

// # Etkinlik türlerine göre tema renkleri
export const EVENT_THEME_COLORS = {
  wedding: '#f43f5e', // # Romantik kırmızı
  birthday: '#8b5cf6', // # Eğlenceli mor
  corporate: '#1f2937', // # Kurumsal gri
  graduation: '#059669', // # Başarı yeşili
  anniversary: '#dc2626', // # Yıldönümü kırmızısı
  other: '#6366f1', // # Varsayılan indigo
}

// # Font boyutları
export const FONT_SIZES = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 36,
}

// # Spacing sistemi (padding, margin için)
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
  '3xl': 64,
}

// # Border radius değerleri
export const BORDER_RADIUS = {
  none: 0,
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}

// # Dosya yükleme limitleri
export const FILE_LIMITS = {
  MAX_IMAGE_SIZE_MB: 10, // # 10MB max fotoğraf
  MAX_VIDEO_SIZE_MB: 100, // # 100MB max video
  MAX_FILES_PER_UPLOAD: 10, // # Bir seferde max 10 dosya
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/heic', 'image/webp'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/mov', 'video/avi'],
  
  // # Sıkıştırma ayarları
  IMAGE_QUALITY: 0.8, // # 0-1 arası, fotoğraf kalitesi
  THUMBNAIL_SIZE: 300, // # Thumbnail genişliği px
}

// # Etkinlik kodları için ayarlar
export const EVENT_CODE = {
  LENGTH: 6, // # 6 haneli kod
  CHARACTERS: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', // # Kullanılacak karakterler
  EXPIRY_DAYS: 30, // # Kod kaç gün geçerli
}

// # Paginasyon ayarları
export const PAGINATION = {
  DEFAULT_LIMIT: 20, // # Sayfa başına kayıt
  MAX_LIMIT: 100, // # Maximum limit
  MEDIA_GRID_LIMIT: 12, // # Grid'de gösterilecek medya sayısı
}

// # Cache ayarları
export const CACHE = {
  USER_PROFILE_TTL: 300, // # 5 dakika (saniye)
  EVENT_LIST_TTL: 180, // # 3 dakika
  MEDIA_LIST_TTL: 120, // # 2 dakika
}

// # Validasyon kuralları
export const VALIDATION = {
  EVENT: {
    TITLE_MIN_LENGTH: 3,
    TITLE_MAX_LENGTH: 100,
    DESCRIPTION_MAX_LENGTH: 500,
    CODE_LENGTH: 6,
  },
  
  USER: {
    NAME_MIN_LENGTH: 2,
    NAME_MAX_LENGTH: 50,
    EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  
  MEDIA: {
    FILENAME_MAX_LENGTH: 255,
  }
}

// # API endpoint'leri (gelecekte backend değişirse buradan güncelleriz)
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    PROFILE: '/auth/profile',
  },
  
  EVENTS: {
    LIST: '/events',
    CREATE: '/events',
    DETAIL: '/events/:id',
    JOIN: '/events/:id/join',
    LEAVE: '/events/:id/leave',
  },
  
  MEDIA: {
    UPLOAD: '/media/upload',
    LIST: '/media',
    DELETE: '/media/:id',
    DOWNLOAD: '/media/:id/download',
  }
}

// # Supabase storage bucket isimleri
export const STORAGE_BUCKETS = {
  MEDIA: 'event-media', // # Fotoğraf ve videolar
  AVATARS: 'avatars', // # Profil fotoğrafları
  EVENT_COVERS: 'event-covers', // # Etkinlik kapak fotoğrafları
  THUMBNAILS: 'thumbnails', // # Video thumbnail'ları
}

// # Real-time subscription kanal isimleri
export const REALTIME_CHANNELS = {
  EVENT_MEDIA: 'event-media-changes',
  EVENT_PARTICIPANTS: 'event-participants-changes',
  USER_NOTIFICATIONS: 'user-notifications',
}

// # Notification tipleri
export const NOTIFICATION_TYPES = {
  NEW_MEDIA: 'new_media',
  EVENT_INVITE: 'event_invite',
  EVENT_ENDED: 'event_ended',
  MEDIA_APPROVED: 'media_approved',
}

// # Etkinlik türleri için display isimleri
export const EVENT_TYPE_LABELS = {
  wedding: 'Düğün',
  birthday: 'Doğum Günü',
  corporate: 'Kurumsal Etkinlik',
  graduation: 'Mezuniyet',
  anniversary: 'Yıldönümü',
  other: 'Diğer',
}

// # Uygulama konfigürasyonu
export const APP_CONFIG = {
  NAME: 'EventShare',
  VERSION: '1.0.0',
  DESCRIPTION: 'Etkinliklerde fotoğraf ve video paylaşım uygulaması',
  
  // # Deep linking
  SCHEME: 'eventshare',
  
  // # Toast mesaj süreleri
  TOAST_DURATION: {
    SHORT: 2000,
    LONG: 4000,
  },
  
  // # Loading timeout'ları
  TIMEOUT: {
    API_REQUEST: 10000, // # 10 saniye
    FILE_UPLOAD: 60000, // # 1 dakika
    IMAGE_LOAD: 5000, // # 5 saniye
  }
}