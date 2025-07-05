// # src/types/index.ts - Enhanced with Role System

// # Navigation Types
export type RootStackParamList = {
  Auth: undefined
  Home: undefined
  EventDetail: { eventId: string }
  CreateEvent: undefined
  JoinEvent: { eventCode?: string }
  Profile: undefined
  // # Web-specific screens
  WebHome: undefined
  WebJoin: undefined
  // # New role-specific screens
  OrganizerDashboard: { eventId: string }
  EventManagement: { eventId: string }
  ParticipantManagement: { eventId: string }
  MediaModeration: { eventId: string }
  EventAnalytics: { eventId: string }
}

// # User Roles and Permissions
export type UserType = 'organizer' | 'participant' | 'both'
export type UserRole = 'creator' | 'organizer' | 'moderator' | 'participant' | 'viewer'

// # Event Related Types
export type EventType = 'wedding' | 'birthday' | 'corporate' | 'graduation' | 'anniversary' | 'other'
export type MediaType = 'image' | 'video'
export type EventStatus = 'draft' | 'active' | 'ended' | 'archived'
export type EventVisibility = 'public' | 'private' | 'unlisted'

// # Media Approval System
export type MediaApprovalStatus = 'pending' | 'approved' | 'rejected'

// # Invitation System
export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired'

// # Activity Logging
export type ActivityType = 'media_upload' | 'media_delete' | 'user_join' | 'user_leave' | 'settings_change' | 'media_approve' | 'media_reject'
export type TargetType = 'media' | 'user' | 'event'

// # Enhanced Profile Interface
export interface Profile {
  id: string
  email: string
  display_name: string
  avatar_url?: string
  phone?: string
  
  // # Role System
  user_type: UserType
  is_verified: boolean
  preferred_role: UserRole
  
  // # Statistics
  total_uploads: number
  total_events_created: number
  total_events_joined: number
  
  created_at: string
  updated_at: string
}

// # Enhanced Event Interface
export interface Event {
  id: string
  title: string
  description?: string
  event_code: string
  event_type: EventType
  creator_id: string
  start_date: string
  end_date: string
  status: EventStatus
  
  // # New properties
  visibility: EventVisibility
  auto_approve_media: boolean
  allow_anonymous_upload: boolean
  max_media_per_user: number
  
  // # Visuals
  theme_color: string
  cover_image_url?: string
  logo_url?: string
  
  // # Statistics
  participant_count: number
  media_count: number
  pending_media_count: number // # New
  
  // # Settings (legacy - kept for compatibility)
  allow_download: boolean
  require_approval: boolean // # Deprecated, use auto_approve_media
  max_file_size_mb: number
  
  created_at: string
  updated_at: string
  
  // # Populated relations
  creator?: Profile
  current_user_role?: UserRole // # Current user's role in this event
  user_permissions?: EventPermissions // # Current user's permissions
}

// # Enhanced Event Participant Interface
export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  user_name: string
  
  // # Enhanced Role System
  role: UserRole
  
  // # Granular Permissions
  can_upload: boolean
  can_download: boolean
  can_moderate: boolean
  can_delete_media: boolean
  can_manage_participants: boolean
  can_edit_event: boolean
  notification_enabled: boolean
  
  joined_at: string
  
  // # Populated relations
  user?: Profile
}

// # Permission helper interface
export interface EventPermissions {
  canUpload: boolean
  canDownload: boolean
  canModerate: boolean
  canDeleteMedia: boolean
  canManageParticipants: boolean
  canEditEvent: boolean
  canViewAnalytics: boolean
  canInviteUsers: boolean
  canApproveMedia: boolean
  isOrganizer: boolean
  isCreator: boolean
}

// # Enhanced Media Interface
export interface Media {
  id: string
  event_id: string
  uploader_id: string
  uploader_name: string
  
  // # File info
  file_url: string
  file_name: string
  file_type: MediaType
  file_size: number
  
  // # Media metadata
  width?: number
  height?: number
  thumbnail_url?: string
  duration_seconds?: number
  taken_at?: string
  
  // # Enhanced approval system
  approval_status: MediaApprovalStatus
  approved_by?: string
  approved_at?: string
  rejection_reason?: string
  
  // # Legacy (kept for compatibility)
  is_approved: boolean
  is_featured: boolean
  
  uploaded_at: string
  
  // # Populated relations
  uploader?: Profile
  approver?: Profile
}

// # Event Invitation Interface
export interface EventInvitation {
  id: string
  event_id: string
  inviter_id: string
  invitee_email?: string
  invitee_phone?: string
  invitation_code: string
  role: UserRole
  status: InvitationStatus
  expires_at: string
  created_at: string
  accepted_at?: string
  
  // # Populated relations
  event?: Event
  inviter?: Profile
}

// # Anonymous User Interface
export interface AnonymousUser {
  id: string
  event_id: string
  display_name: string
  temp_token: string
  ip_address?: string
  user_agent?: string
  upload_count: number
  last_activity: string
  created_at: string
  expires_at: string
}

// # Activity Log Interface
export interface EventActivity {
  id: string
  event_id: string
  user_id?: string
  action_type: ActivityType
  target_type?: TargetType
  target_id?: string
  details?: Record<string, any>
  created_at: string
  
  // # Populated relations
  user?: Profile
}

// # Enhanced App State Interface
export interface AppState {
  // # User info
  user: Profile | null
  isAuthenticated: boolean
  currentUserRole: UserRole | null
  currentUserPermissions: EventPermissions | null
  
  // # Current event context
  currentEvent: Event | null
  currentEventParticipants: EventParticipant[]
  currentEventPermissions: EventPermissions | null
  
  // # Event lists
  events: Event[]
  myEvents: Event[] // # Created events
  joinedEvents: Event[] // # Participated events
  moderatedEvents: Event[] // # Events where user is moderator
  
  // # Media
  eventMedia: Media[]
  pendingMedia: Media[] // # Media awaiting approval
  myUploads: Media[]
  
  // # Invitations
  sentInvitations: EventInvitation[]
  receivedInvitations: EventInvitation[]
  
  // # Activity
  eventActivities: EventActivity[]
  
  // # Upload management
  uploadProgress: UploadProgress[]
  isUploading: boolean
  
  // # UI states
  isLoading: boolean
  error: string | null
  
  // # Modals
  showEventJoinModal: boolean
  showMediaUploadSheet: boolean
  showEventCreationModal: boolean
  showInvitationModal: boolean
  showModerationPanel: boolean
}

// # API Response Types
export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
  statusCode?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// # Form Types
export interface CreateEventForm {
  title: string
  description?: string
  event_type: EventType
  start_date: Date
  end_date: Date
  visibility: EventVisibility
  auto_approve_media: boolean
  allow_anonymous_upload: boolean
  max_media_per_user: number
  theme_color: string
  cover_image?: string
}

export interface InviteUserForm {
  email?: string
  phone?: string
  role: UserRole
  message?: string
}

export interface ModerationAction {
  mediaId: string
  action: 'approve' | 'reject'
  reason?: string
}

// # Permission Checking Helpers
export interface PermissionCheck {
  hasPermission: (permission: keyof EventPermissions) => boolean
  isRole: (role: UserRole) => boolean
  canPerformAction: (action: string) => boolean
}

// # Upload Progress Interface
export interface UploadProgress {
  id: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
  mediaType: MediaType
  eventId: string
}

// # Validation Types
export interface ValidationError {
  field: string
  message: string
  code?: string
}

export interface FormValidation {
  isValid: boolean
  errors: ValidationError[]
  warnings?: ValidationError[]
}

// # Analytics Types
export interface EventAnalytics {
  eventId: string
  totalParticipants: number
  totalMedia: number
  totalUploads: number
  participantsByRole: Record<UserRole, number>
  mediaByType: Record<MediaType, number>
  uploadsOverTime: Array<{
    date: string
    count: number
  }>
  topUploaders: Array<{
    userId: string
    userName: string
    uploadCount: number
  }>
  averageFileSize: number
  storageUsed: number
  engagementStats: {
    activeUsers: number
    averageMediaPerUser: number
    retentionRate: number
  }
}

// # Notification Types
export type NotificationType = 
  | 'media_uploaded' 
  | 'media_approved' 
  | 'media_rejected' 
  | 'user_joined' 
  | 'user_left'
  | 'invitation_received'
  | 'event_updated'
  | 'role_changed'

export interface Notification {
  id: string
  userId: string
  eventId?: string
  type: NotificationType
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

// # WebSocket Types for Real-time Features
export interface WebSocketMessage {
  type: 'media_upload' | 'user_join' | 'user_leave' | 'media_approved' | 'typing'
  eventId: string
  userId: string
  data: any
  timestamp: string
}

// # QR Code Types
export interface QRCodeData {
  eventId: string
  eventCode: string
  eventTitle: string
  organizerName: string
  qrVersion: string // # For future compatibility
}

// # Deep Link Types
export interface DeepLinkData {
  type: 'event_join' | 'event_view' | 'media_view'
  eventId?: string
  eventCode?: string
  mediaId?: string
  invitationCode?: string
  userId?: string
}

// # Export helper type for component props
export type ComponentProps<T> = T extends React.ComponentType<infer P> ? P : never

// # Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>

// # Environment Configuration
export interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  environment: 'development' | 'staging' | 'production'
  features: {
    anonymousUpload: boolean
    mediaApproval: boolean
    realTimeUpdates: boolean
    pushNotifications: boolean
    analytics: boolean
  }
  limits: {
    maxFileSize: number
    maxFilesPerUser: number
    maxParticipantsPerEvent: number
    qrCodeExpiry: number
  }
}