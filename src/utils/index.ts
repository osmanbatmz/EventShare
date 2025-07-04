// # src/utils/index.ts - Enhanced with Role System Helpers
import { UserRole, EventType, EventPermissions, EventParticipant, Profile } from '../types'

// # Existing utility functions (keep all your current functions)

// # Email validation
export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim().toLowerCase())
}

// # Display name validation
export const validateDisplayName = (name: string): string | null => {
  const trimmed = name.trim()
  if (trimmed.length < 2) return 'Ad en az 2 karakter olmalı'
  if (trimmed.length > 50) return 'Ad en fazla 50 karakter olabilir'
  if (!/^[a-zA-ZğüşıöçĞÜŞİÖÇ\s]+$/.test(trimmed)) return 'Ad sadece harf içerebilir'
  return null
}

// # Event title validation
export const validateEventTitle = (title: string): string | null => {
  const trimmed = title.trim()
  if (trimmed.length < 3) return 'Etkinlik adı en az 3 karakter olmalı'
  if (trimmed.length > 100) return 'Etkinlik adı en fazla 100 karakter olabilir'
  return null
}

// # Event code validation
export const validateEventCode = (code: string): boolean => {
  return /^[A-Z0-9]{6}$/.test(code.trim().toUpperCase())
}

// # Generate random event code
export const generateEventCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// # Avatar color generator
export const generateAvatarColor = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// # Event type emoji mapping
export const getEventTypeEmoji = (type: EventType): string => {
  const emojiMap: Record<EventType, string> = {
    wedding: '💒',
    birthday: '🎂',
    corporate: '🏢',
    graduation: '🎓',
    anniversary: '💕',
    other: '🎉'
  }
  return emojiMap[type] || '🎉'
}

// # Format date functions
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString('tr-TR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export const formatDateRange = (startDate: string, endDate: string): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  
  if (start.toDateString() === end.toDateString()) {
    return formatDate(startDate)
  }
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`
}

// # File size formatter
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// # NEW: Role System Utilities

// # Role hierarchy and permissions
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  creator: 5,
  organizer: 4,
  moderator: 3,
  participant: 2,
  viewer: 1,
}

// # Role display configurations
export const ROLE_CONFIG: Record<UserRole, {
  label: string
  description: string
  icon: string
  color: string
  permissions: string[]
}> = {
  creator: {
    label: 'Kurucu',
    description: 'Etkinliği oluşturan, tam yetki sahibi',
    icon: '👑',
    color: '#FFD700',
    permissions: ['Tüm yetkiler', 'Etkinlik silebilir', 'Rol değiştirebilir']
  },
  organizer: {
    label: 'Organizatör',
    description: 'Etkinlik yöneticisi, moderasyon yetkisi',
    icon: '🎯',
    color: '#FF6B6B',
    permissions: ['Etkinlik düzenleyebilir', 'Katılımcı yönetebilir', 'Medya silebilir']
  },
  moderator: {
    label: 'Moderatör',
    description: 'İçerik denetleyicisi',
    icon: '⚡',
    color: '#4ECDC4',
    permissions: ['Medya onaylayabilir', 'İçerik moderasyonu', 'Kullanıcı davet edebilir']
  },
  participant: {
    label: 'Katılımcı',
    description: 'Aktif etkinlik üyesi',
    icon: '🎉',
    color: '#A8E6CF',
    permissions: ['Medya yükleyebilir', 'İndirebilir', 'Görüntüleyebilir']
  },
  viewer: {
    label: 'İzleyici',
    description: 'Sadece görüntüleme yetkisi',
    icon: '👁️',
    color: '#D3D3D3',
    permissions: ['Sadece görüntüleyebilir']
  }
}

// # Check if user has higher or equal role
export const hasRoleOrHigher = (userRole: UserRole, requiredRole: UserRole): boolean => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole]
}

// # Check if user can manage another user
export const canManageUser = (managerRole: UserRole, targetRole: UserRole): boolean => {
  // Creator can manage everyone
  if (managerRole === 'creator') return true
  
  // Organizers can manage moderators, participants, and viewers
  if (managerRole === 'organizer') {
    return ['moderator', 'participant', 'viewer'].includes(targetRole)
  }
  
  // Moderators can manage participants and viewers
  if (managerRole === 'moderator') {
    return ['participant', 'viewer'].includes(targetRole)
  }
  
  return false
}

// # Calculate permissions based on role and specific grants
export const calculateUserPermissions = (
  participant: EventParticipant | null,
  eventSettings?: {
    allow_download?: boolean
    auto_approve_media?: boolean
    allow_anonymous_upload?: boolean
  }
): EventPermissions => {
  if (!participant) {
    return {
      canUpload: false,
      canDownload: false,
      canModerate: false,
      canDeleteMedia: false,
      canManageParticipants: false,
      canEditEvent: false,
      canViewAnalytics: false,
      canInviteUsers: false,
      canApproveMedia: false,
      isOrganizer: false,
      isCreator: false,
    }
  }

  const role = participant.role
  const isCreator = role === 'creator'
  const isOrganizer = ['creator', 'organizer'].includes(role)
  const isModerator = ['creator', 'organizer', 'moderator'].includes(role)

  return {
    canUpload: participant.can_upload,
    canDownload: participant.can_download && (eventSettings?.allow_download ?? true),
    canModerate: participant.can_moderate || isModerator,
    canDeleteMedia: participant.can_delete_media || isOrganizer,
    canManageParticipants: participant.can_manage_participants || isOrganizer,
    canEditEvent: participant.can_edit_event || isOrganizer,
    canViewAnalytics: isOrganizer,
    canInviteUsers: isModerator,
    canApproveMedia: isModerator,
    isOrganizer,
    isCreator,
  }
}

// # Get available roles for assignment
export const getAssignableRoles = (assignerRole: UserRole): UserRole[] => {
  switch (assignerRole) {
    case 'creator':
      return ['organizer', 'moderator', 'participant', 'viewer']
    case 'organizer':
      return ['moderator', 'participant', 'viewer']
    case 'moderator':
      return ['participant', 'viewer']
    default:
      return []
  }
}

// # Role badge styling helper
export const getRoleBadgeStyle = (role: UserRole) => {
  const config = ROLE_CONFIG[role]
  return {
    backgroundColor: config.color,
    textColor: role === 'participant' ? '#2D5016' : '#FFFFFF',
    icon: config.icon,
    label: config.label
  }
}

// # Permission action mappings
export const PERMISSION_ACTIONS: Record<string, {
  permission: keyof EventPermissions
  description: string
  icon: string
}> = {
  upload_media: {
    permission: 'canUpload',
    description: 'Medya yükleme',
    icon: '📸'
  },
  download_media: {
    permission: 'canDownload', 
    description: 'Medya indirme',
    icon: '⬇️'
  },
  approve_media: {
    permission: 'canApproveMedia',
    description: 'Medya onaylama',
    icon: '✅'
  },
  delete_media: {
    permission: 'canDeleteMedia',
    description: 'Medya silme',
    icon: '🗑️'
  },
  moderate_content: {
    permission: 'canModerate',
    description: 'İçerik moderasyonu',
    icon: '⚖️'
  },
  manage_participants: {
    permission: 'canManageParticipants',
    description: 'Katılımcı yönetimi',
    icon: '👥'
  },
  edit_event: {
    permission: 'canEditEvent',
    description: 'Etkinlik düzenleme',
    icon: '⚙️'
  },
  view_analytics: {
    permission: 'canViewAnalytics',
    description: 'Analitik görüntüleme',
    icon: '📊'
  },
  invite_users: {
    permission: 'canInviteUsers',
    description: 'Kullanıcı davet etme',
    icon: '➕'
  }
}

// # Check specific permission
export const checkPermission = (
  permissions: EventPermissions | null,
  action: string
): boolean => {
  if (!permissions) return false
  
  const actionConfig = PERMISSION_ACTIONS[action]
  if (!actionConfig) return false
  
  return permissions[actionConfig.permission]
}

// # Generate invitation code
export const generateInvitationCode = (): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// # Anonymous user helpers
export const generateAnonymousDisplayName = (): string => {
  const adjectives = ['Mutlu', 'Neşeli', 'Güler Yüzlü', 'Şirin', 'Tatlı', 'Sevimli', 'Keyifli', 'Enerjik']
  const nouns = ['Katılımcı', 'Misafir', 'Ziyaretçi', 'Arkadaş', 'Dost', 'Üye']
  
  const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const number = Math.floor(Math.random() * 999) + 1
  
  return `${adjective} ${noun} ${number}`
}

export const generateTempToken = (): string => {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// # Media approval helpers
export const getApprovalStatusLabel = (status: string): string => {
  switch (status) {
    case 'approved': return '✅ Onaylı'
    case 'pending': return '⏳ Bekliyor'
    case 'rejected': return '❌ Reddedildi'
    default: return '❓ Bilinmiyor'
  }
}

export const getApprovalStatusColor = (status: string): string => {
  switch (status) {
    case 'approved': return '#6A9F58'
    case 'pending': return '#E8A317'
    case 'rejected': return '#C85450'
    default: return '#8D6E63'
  }
}

// # Activity log helpers
export const getActivityIcon = (actionType: string): string => {
  const iconMap: Record<string, string> = {
    media_upload: '📸',
    media_delete: '🗑️',
    media_approve: '✅',
    media_reject: '❌',
    user_join: '👋',
    user_leave: '👋',
    settings_change: '⚙️',
    role_change: '🔄',
  }
  return iconMap[actionType] || '📝'
}

export const formatActivityMessage = (
  actionType: string,
  userName: string,
  details?: Record<string, any>
): string => {
  switch (actionType) {
    case 'media_upload':
      return `${userName} yeni bir ${details?.file_type || 'medya'} yükledi`
    case 'media_delete':
      return `${userName} bir medyayı sildi`
    case 'media_approve':
      return `${userName} bir medyayı onayladı`
    case 'media_reject':
      return `${userName} bir medyayı reddetti`
    case 'user_join':
      return `${userName} etkinliğe katıldı`
    case 'user_leave':
      return `${userName} etkinlikten ayrıldı`
    case 'settings_change':
      return `${userName} etkinlik ayarlarını değiştirdi`
    case 'role_change':
      return `${userName} bir kullanıcının rolünü değiştirdi`
    default:
      return `${userName} bir işlem gerçekleştirdi`
  }
}

// # Deep link helpers
export const generateEventDeepLink = (eventId: string, eventCode: string): string => {
  return `eventshare://join/${eventCode}?eventId=${eventId}`
}

export const generateWebLink = (eventId: string, eventCode: string): string => {
  return `https://eventshare.app/join/${eventCode}?eventId=${eventId}`
}

// # QR code data generator
export const generateQRCodeData = (eventId: string, eventCode: string, eventTitle: string, organizerName: string) => {
  return {
    eventId,
    eventCode,
    eventTitle,
    organizerName,
    webUrl: generateWebLink(eventId, eventCode),
    deepLink: generateEventDeepLink(eventId, eventCode),
    qrVersion: '1.0',
    timestamp: new Date().toISOString()
  }
}

// # User type helpers
export const getUserTypeLabel = (userType: string): string => {
  switch (userType) {
    case 'organizer': return 'Organizatör'
    case 'participant': return 'Katılımcı' 
    case 'both': return 'Karma'
    default: return 'Katılımcı'
  }
}

// # Event visibility helpers
export const getVisibilityLabel = (visibility: string): string => {
  switch (visibility) {
    case 'public': return '🌍 Herkese Açık'
    case 'private': return '🔒 Özel'
    case 'unlisted': return '🔗 Sadece Link İle'
    default: return '🌍 Herkese Açık'
  }
}

export const getVisibilityDescription = (visibility: string): string => {
  switch (visibility) {
    case 'public': return 'Herkes görebilir ve katılabilir'
    case 'private': return 'Sadece davet edilenler katılabilir'
    case 'unlisted': return 'Link bilenlere açık'
    default: return 'Herkes görebilir ve katılabilir'
  }
}

// # Time and date helpers
export const getTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMilliseconds = now.getTime() - date.getTime()
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60))
  const diffInHours = Math.floor(diffInMinutes / 60)
  const diffInDays = Math.floor(diffInHours / 24)

  if (diffInMinutes < 1) return 'Az önce'
  if (diffInMinutes < 60) return `${diffInMinutes} dakika önce`
  if (diffInHours < 24) return `${diffInHours} saat önce`
  if (diffInDays < 7) return `${diffInDays} gün önce`
  
  return formatDate(dateString)
}

export const getRemainingTime = (endDate: string): string => {
  const end = new Date(endDate)
  const now = new Date()
  const diffInMilliseconds = end.getTime() - now.getTime()
  
  if (diffInMilliseconds <= 0) return 'Sona erdi'
  
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24))
  const diffInHours = Math.floor((diffInMilliseconds % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  
  if (diffInDays > 0) return `${diffInDays} gün kaldı`
  if (diffInHours > 0) return `${diffInHours} saat kaldı`
  
  const diffInMinutes = Math.floor((diffInMilliseconds % (1000 * 60 * 60)) / (1000 * 60))
  return `${diffInMinutes} dakika kaldı`
}

// # Error handling helpers
export const getErrorMessage = (error: any): string => {
  if (typeof error === 'string') return error
  if (error?.message) return error.message
  if (error?.error_description) return error.error_description
  return 'Bilinmeyen bir hata oluştu'
}

// # Validation helpers for role system
export const validateRoleChange = (
  currentUserRole: UserRole,
  targetUserRole: UserRole,
  newRole: UserRole
): { valid: boolean; message?: string } => {
  // Can't change your own role
  if (currentUserRole === targetUserRole) {
    return { valid: false, message: 'Kendi rolünüzü değiştiremezsiniz' }
  }
  
  // Can't manage higher or equal roles
  if (!canManageUser(currentUserRole, targetUserRole)) {
    return { valid: false, message: 'Bu kullanıcının rolünü değiştirme yetkiniz yok' }
  }
  
  // Can't assign higher roles than your own
  if (ROLE_HIERARCHY[newRole] >= ROLE_HIERARCHY[currentUserRole]) {
    return { valid: false, message: 'Kendi rolünüzden yüksek rol atayamazsınız' }
  }
  
  return { valid: true }
}

// # Constants for UI
export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  wedding: 'Düğün',
  birthday: 'Doğum Günü',
  corporate: 'Kurumsal',
  graduation: 'Mezuniyet',
  anniversary: 'Yıl Dönümü',
  other: 'Diğer'
}

export const EVENT_THEME_COLORS: Record<EventType, string> = {
  wedding: '#FFB6C1',
  birthday: '#FF69B4',
  corporate: '#4169E1',
  graduation: '#32CD32',
  anniversary: '#DC143C',
  other: '#8B5A3C'
}

// # Export all utilities
export default {
  // Validation
  validateEmail,
  validateDisplayName,
  validateEventTitle,
  validateEventCode,
  validateRoleChange,
  
  // Generators
  generateEventCode,
  generateAvatarColor,
  generateInvitationCode,
  generateAnonymousDisplayName,
  generateTempToken,
  generateEventDeepLink,
  generateWebLink,
  generateQRCodeData,
  
  // Formatters
  formatDate,
  formatDateRange,
  formatFileSize,
  formatActivityMessage,
  getTimeAgo,
  getRemainingTime,
  
  // Role system
  hasRoleOrHigher,
  canManageUser,
  calculateUserPermissions,
  getAssignableRoles,
  getRoleBadgeStyle,
  checkPermission,
  
  // UI helpers
  getEventTypeEmoji,
  getApprovalStatusLabel,
  getApprovalStatusColor,
  getActivityIcon,
  getUserTypeLabel,
  getVisibilityLabel,
  getVisibilityDescription,
  getErrorMessage,
  
  // Constants
  ROLE_HIERARCHY,
  ROLE_CONFIG,
  PERMISSION_ACTIONS,
  EVENT_TYPE_LABELS,
  EVENT_THEME_COLORS,
}