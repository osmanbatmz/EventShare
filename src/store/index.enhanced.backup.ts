// # src/store/index.ts - Enhanced with Role System
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { 
  Event, 
  Profile, 
  Media, 
  EventParticipant, 
  UploadProgress,
  EventPermissions,
  UserRole,
  EventInvitation,
  EventActivity,
  EventAnalytics,
  MediaApprovalStatus,
  AnonymousUser
} from '../types'

// # Enhanced App State Interface
interface AppState {
  // # User authentication and role
  user: Profile | null
  isAuthenticated: boolean
  currentUserRole: UserRole | null
  currentUserPermissions: EventPermissions | null
  anonymousUser: AnonymousUser | null // # For anonymous uploads
  
  // # Current event context
  currentEvent: Event | null
  currentEventParticipants: EventParticipant[]
  currentEventPermissions: EventPermissions | null
  
  // # Event management (role-based)
  events: Event[] // # All visible events
  myEvents: Event[] // # Created events (organizer role)
  joinedEvents: Event[] // # Participated events
  moderatedEvents: Event[] // # Events where user is moderator
  
  // # Media management
  eventMedia: Media[] // # Current event's approved media
  pendingMedia: Media[] // # Media awaiting approval (organizers only)
  rejectedMedia: Media[] // # Rejected media (for reference)
  myUploads: Media[] // # User's uploaded media
  
  // # Social features
  sentInvitations: EventInvitation[]
  receivedInvitations: EventInvitation[]
  eventActivities: EventActivity[]
  
  // # Analytics (organizers only)
  eventAnalytics: EventAnalytics | null
  
  // # Upload system
  uploadProgress: UploadProgress[]
  isUploading: boolean
  
  // # UI state management
  isLoading: boolean
  error: string | null
  
  // # Modal states
  showEventJoinModal: boolean
  showMediaUploadSheet: boolean
  showEventCreationModal: boolean
  showInvitationModal: boolean
  showModerationPanel: boolean
  showAnalyticsPanel: boolean
  showParticipantManagement: boolean
  
  // # View preferences
  currentView: 'participant' | 'organizer' | 'moderator'
  mediaFilter: 'all' | 'approved' | 'pending' | 'rejected'
  participantFilter: 'all' | 'organizers' | 'moderators' | 'participants'
}

// # Enhanced Actions Interface
interface AppActions {
  // # Authentication and user management
  setUser: (user: Profile | null) => void
  setAuthenticated: (isAuth: boolean) => void
  setAnonymousUser: (anonymousUser: AnonymousUser | null) => void
  updateUserRole: (role: UserRole) => void
  logout: () => void
  
  // # Event context management
  setCurrentEvent: (event: Event | null) => void
  setCurrentUserRole: (role: UserRole | null) => void
  setCurrentUserPermissions: (permissions: EventPermissions | null) => void
  setCurrentEventParticipants: (participants: EventParticipant[]) => void
  
  // # Event CRUD operations
  addEvent: (event: Event) => void
  updateEvent: (id: string, updates: Partial<Event>) => void
  removeEvent: (id: string) => void
  setEvents: (events: Event[]) => void
  setMyEvents: (events: Event[]) => void
  setJoinedEvents: (events: Event[]) => void
  setModeratedEvents: (events: Event[]) => void
  
  // # Participant management (organizer features)
  addParticipant: (participant: EventParticipant) => void
  updateParticipant: (id: string, updates: Partial<EventParticipant>) => void
  removeParticipant: (id: string) => void
  changeParticipantRole: (participantId: string, newRole: UserRole) => void
  
  // # Media management with approval system
  setEventMedia: (media: Media[]) => void
  setPendingMedia: (media: Media[]) => void
  setRejectedMedia: (media: Media[]) => void
  addMediaToEvent: (media: Media) => void
  updateMediaStatus: (mediaId: string, status: MediaApprovalStatus, reason?: string) => void
  removeMediaFromEvent: (mediaId: string) => void
  approveMedia: (mediaId: string, approverId: string) => void
  rejectMedia: (mediaId: string, reason: string, rejectorId: string) => void
  setMyUploads: (uploads: Media[]) => void
  
  // # Invitation system
  sendInvitation: (invitation: EventInvitation) => void
  acceptInvitation: (invitationId: string) => void
  declineInvitation: (invitationId: string) => void
  setSentInvitations: (invitations: EventInvitation[]) => void
  setReceivedInvitations: (invitations: EventInvitation[]) => void
  
  // # Activity logging
  addActivity: (activity: EventActivity) => void
  setEventActivities: (activities: EventActivity[]) => void
  
  // # Analytics (organizer only)
  setEventAnalytics: (analytics: EventAnalytics | null) => void
  refreshAnalytics: (eventId: string) => Promise<void>
  
  // # Upload management
  addUploadProgress: (progress: UploadProgress) => void
  updateUploadProgress: (id: string, updates: Partial<UploadProgress>) => void
  removeUploadProgress: (id: string) => void
  clearCompletedUploads: () => void
  setIsUploading: (isUploading: boolean) => void
  
  // # UI state management
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  
  // # Modal management
  setShowEventJoinModal: (show: boolean) => void
  setShowMediaUploadSheet: (show: boolean) => void
  setShowEventCreationModal: (show: boolean) => void
  setShowInvitationModal: (show: boolean) => void
  setShowModerationPanel: (show: boolean) => void
  setShowAnalyticsPanel: (show: boolean) => void
  setShowParticipantManagement: (show: boolean) => void
  
  // # View management
  setCurrentView: (view: 'participant' | 'organizer' | 'moderator') => void
  setMediaFilter: (filter: 'all' | 'approved' | 'pending' | 'rejected') => void
  setParticipantFilter: (filter: 'all' | 'organizers' | 'moderators' | 'participants') => void
  
  // # Permission helpers
  hasPermission: (permission: keyof EventPermissions) => boolean
  isRole: (role: UserRole) => boolean
  canPerformAction: (action: string) => boolean
  
  // # Utility actions
  reset: () => void
  refreshCurrentEvent: () => Promise<void>
  syncEventData: (eventId: string) => Promise<void>
}

// # Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  currentUserRole: null,
  currentUserPermissions: null,
  anonymousUser: null,
  
  currentEvent: null,
  currentEventParticipants: [],
  currentEventPermissions: null,
  
  events: [],
  myEvents: [],
  joinedEvents: [],
  moderatedEvents: [],
  
  eventMedia: [],
  pendingMedia: [],
  rejectedMedia: [],
  myUploads: [],
  
  sentInvitations: [],
  receivedInvitations: [],
  eventActivities: [],
  
  eventAnalytics: null,
  
  uploadProgress: [],
  isUploading: false,
  
  isLoading: false,
  error: null,
  
  showEventJoinModal: false,
  showMediaUploadSheet: false,
  showEventCreationModal: false,
  showInvitationModal: false,
  showModerationPanel: false,
  showAnalyticsPanel: false,
  showParticipantManagement: false,
  
  currentView: 'participant',
  mediaFilter: 'all',
  participantFilter: 'all',
}

// # Permission calculator helper
const calculatePermissions = (participant: EventParticipant | null): EventPermissions => {
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

  const isCreator = participant.role === 'creator'
  const isOrganizer = ['creator', 'organizer'].includes(participant.role)
  const isModerator = ['creator', 'organizer', 'moderator'].includes(participant.role)

  return {
    canUpload: participant.can_upload,
    canDownload: participant.can_download,
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

// # Enhanced Zustand Store
export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // # Authentication actions
    setUser: (user) => {
      set({ user })
      // # Auto-determine preferred view based on user type
      if (user?.user_type === 'organizer' || user?.preferred_role === 'organizer') {
        set({ currentView: 'organizer' })
      }
    },
    
    setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    
    setAnonymousUser: (anonymousUser) => set({ anonymousUser }),
    
    updateUserRole: (role) => set({ currentUserRole: role }),
    
    logout: () => {
      set({
        user: null,
        isAuthenticated: false,
        currentUserRole: null,
        currentUserPermissions: null,
        anonymousUser: null,
        currentEvent: null,
        currentEventParticipants: [],
        currentEventPermissions: null,
        events: [],
        myEvents: [],
        joinedEvents: [],
        moderatedEvents: [],
        eventMedia: [],
        pendingMedia: [],
        rejectedMedia: [],
        myUploads: [],
        sentInvitations: [],
        receivedInvitations: [],
        eventActivities: [],
        eventAnalytics: null,
        uploadProgress: [],
        currentView: 'participant',
      })
    },
    
    // # Event context management
  setCurrentEvent: (currentEvent) => set({ currentEvent }),
    
    setCurrentUserRole: (currentUserRole) => set({ currentUserRole }),
    
    setCurrentUserPermissions: (currentUserPermissions) => set({ currentUserPermissions }),
    
   setCurrentEventParticipants: (currentEventParticipants) => set({ currentEventParticipants }),
    
    // # Event management
    addEvent: (event) => {
      set((state) => ({ events: [...state.events, event] }))
      
      // # Add to appropriate category based on user role
      const { user } = get()
      if (user && event.creator_id === user.id) {
        set((state) => ({ myEvents: [...state.myEvents, event] }))
      }
    },
    
    updateEvent: (id, updates) => {
      set((state) => ({
        events: state.events.map(event => 
          event.id === id ? { ...event, ...updates } : event
        ),
        myEvents: state.myEvents.map(event => 
          event.id === id ? { ...event, ...updates } : event
        ),
        joinedEvents: state.joinedEvents.map(event => 
          event.id === id ? { ...event, ...updates } : event
        ),
        moderatedEvents: state.moderatedEvents.map(event => 
          event.id === id ? { ...event, ...updates } : event
        ),
        currentEvent: state.currentEvent?.id === id 
          ? { ...state.currentEvent, ...updates } 
          : state.currentEvent
      }))
    },
    
    removeEvent: (id) => {
      set((state) => ({
        events: state.events.filter(event => event.id !== id),
        myEvents: state.myEvents.filter(event => event.id !== id),
        joinedEvents: state.joinedEvents.filter(event => event.id !== id),
        moderatedEvents: state.moderatedEvents.filter(event => event.id !== id),
        currentEvent: state.currentEvent?.id === id ? null : state.currentEvent
      }))
    },
    
    setEvents: (events) => set({ events }),
    setMyEvents: (myEvents) => set({ myEvents }),
    setJoinedEvents: (joinedEvents) => set({ joinedEvents }),
    setModeratedEvents: (moderatedEvents) => set({ moderatedEvents }),
    
    // # Participant management
    addParticipant: (participant) => {
      set((state) => ({
        currentEventParticipants: [...state.currentEventParticipants, participant]
      }))
    },
    
    updateParticipant: (id, updates) => {
      set((state) => ({
        currentEventParticipants: state.currentEventParticipants.map(participant =>
          participant.id === id ? { ...participant, ...updates } : participant
        )
      }))
    },
    
    removeParticipant: (id) => {
      set((state) => ({
        currentEventParticipants: state.currentEventParticipants.filter(p => p.id !== id)
      }))
    },
    
    changeParticipantRole: (participantId, newRole) => {
      // # Update participant role and recalculate permissions
      set((state) => {
        const updatedParticipants = state.currentEventParticipants.map(participant => {
          if (participant.id === participantId) {
            // # Set role-based permissions
            const basePermissions = {
              can_upload: true,
              can_download: true,
              notification_enabled: participant.notification_enabled,
            }
            
            switch (newRole) {
              case 'creator':
                return {
                  ...participant,
                  ...basePermissions,
                  role: newRole,
                  can_moderate: true,
                  can_delete_media: true,
                  can_manage_participants: true,
                  can_edit_event: true,
                }
              case 'organizer':
                return {
                  ...participant,
                  ...basePermissions,
                  role: newRole,
                  can_moderate: true,
                  can_delete_media: true,
                  can_manage_participants: true,
                  can_edit_event: true,
                }
              case 'moderator':
                return {
                  ...participant,
                  ...basePermissions,
                  role: newRole,
                  can_moderate: true,
                  can_delete_media: false,
                  can_manage_participants: false,
                  can_edit_event: false,
                }
              case 'participant':
              case 'viewer':
              default:
                return {
                  ...participant,
                  ...basePermissions,
                  role: newRole,
                  can_moderate: false,
                  can_delete_media: false,
                  can_manage_participants: false,
                  can_edit_event: false,
                  can_upload: newRole === 'participant',
                }
            }
          }
          return participant
        })
        
        return { currentEventParticipants: updatedParticipants }
      })
    },
    
    // # Media management with approval system
    setEventMedia: (eventMedia) => set({ eventMedia }),
    setPendingMedia: (pendingMedia) => set({ pendingMedia }),
    setRejectedMedia: (rejectedMedia) => set({ rejectedMedia }),
    
    addMediaToEvent: (media) => {
      // # Add to appropriate list based on approval status
      if (media.approval_status === 'approved') {
        set((state) => ({
          eventMedia: [media, ...state.eventMedia]
        }))
      } else if (media.approval_status === 'pending') {
        set((state) => ({
          pendingMedia: [media, ...state.pendingMedia]
        }))
      }
      
      // # Add to user's uploads if they're the uploader
      const { user } = get()
      if (user && media.uploader_id === user.id) {
        set((state) => ({
          myUploads: [media, ...state.myUploads]
        }))
      }
    },
    
    updateMediaStatus: (mediaId, status, reason) => {
      set((state) => {
        // # Find the media item
        let mediaItem: Media | undefined
        
        // # Update in all relevant arrays
        const updateMedia = (mediaArray: Media[]) =>
          mediaArray.map(media => {
            if (media.id === mediaId) {
              mediaItem = { ...media, approval_status: status, rejection_reason: reason }
              return mediaItem
            }
            return media
          })
        
        const updatedEventMedia = updateMedia(state.eventMedia)
        const updatedPendingMedia = updateMedia(state.pendingMedia)
        const updatedRejectedMedia = updateMedia(state.rejectedMedia)
        const updatedMyUploads = updateMedia(state.myUploads)
        
        // # Move media between lists based on new status
        if (mediaItem) {
          if (status === 'approved') {
            return {
              eventMedia: mediaItem.approval_status !== 'approved' 
                ? [mediaItem, ...state.eventMedia.filter(m => m.id !== mediaId)]
                : updatedEventMedia,
              pendingMedia: state.pendingMedia.filter(m => m.id !== mediaId),
              rejectedMedia: state.rejectedMedia.filter(m => m.id !== mediaId),
              myUploads: updatedMyUploads,
            }
          } else if (status === 'rejected') {
            return {
              eventMedia: state.eventMedia.filter(m => m.id !== mediaId),
              pendingMedia: state.pendingMedia.filter(m => m.id !== mediaId),
              rejectedMedia: mediaItem.approval_status !== 'rejected'
                ? [mediaItem, ...state.rejectedMedia.filter(m => m.id !== mediaId)]
                : updatedRejectedMedia,
              myUploads: updatedMyUploads,
            }
          } else if (status === 'pending') {
            return {
              eventMedia: state.eventMedia.filter(m => m.id !== mediaId),
              pendingMedia: mediaItem.approval_status !== 'pending'
                ? [mediaItem, ...state.pendingMedia.filter(m => m.id !== mediaId)]
                : updatedPendingMedia,
              rejectedMedia: state.rejectedMedia.filter(m => m.id !== mediaId),
              myUploads: updatedMyUploads,
            }
          }
        }
        
        return {
          eventMedia: updatedEventMedia,
          pendingMedia: updatedPendingMedia,
          rejectedMedia: updatedRejectedMedia,
          myUploads: updatedMyUploads,
        }
      })
    },
    
    approveMedia: (mediaId, approverId) => {
      get().updateMediaStatus(mediaId, 'approved')
      // # Add activity log
      get().addActivity({
        id: `activity_${Date.now()}`,
        event_id: get().currentEvent?.id || '',
        user_id: approverId,
        action_type: 'media_approve',
        target_type: 'media',
        target_id: mediaId,
        details: { approved_by: approverId },
        created_at: new Date().toISOString(),
      })
    },
    
    rejectMedia: (mediaId, reason, rejectorId) => {
      get().updateMediaStatus(mediaId, 'rejected', reason)
      // # Add activity log
      get().addActivity({
        id: `activity_${Date.now()}`,
        event_id: get().currentEvent?.id || '',
        user_id: rejectorId,
        action_type: 'media_reject',
        target_type: 'media',
        target_id: mediaId,
        details: { rejected_by: rejectorId, reason },
        created_at: new Date().toISOString(),
      })
    },
    
    removeMediaFromEvent: (mediaId) => {
      set((state) => ({
        eventMedia: state.eventMedia.filter(media => media.id !== mediaId),
        pendingMedia: state.pendingMedia.filter(media => media.id !== mediaId),
        rejectedMedia: state.rejectedMedia.filter(media => media.id !== mediaId),
        myUploads: state.myUploads.filter(media => media.id !== mediaId)
      }))
    },
    
    setMyUploads: (myUploads) => set({ myUploads }),
    
    // # Invitation system
    sendInvitation: (invitation) => {
      set((state) => ({
        sentInvitations: [...state.sentInvitations, invitation]
      }))
    },
    
    acceptInvitation: (invitationId) => {
      set((state) => ({
        receivedInvitations: state.receivedInvitations.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'accepted' as const } : inv
        )
      }))
    },
    
    declineInvitation: (invitationId) => {
      set((state) => ({
        receivedInvitations: state.receivedInvitations.map(inv =>
          inv.id === invitationId ? { ...inv, status: 'declined' as const } : inv
        )
      }))
    },
    
    setSentInvitations: (sentInvitations) => set({ sentInvitations }),
    setReceivedInvitations: (receivedInvitations) => set({ receivedInvitations }),
    
    // # Activity management
    addActivity: (activity) => {
      set((state) => ({
        eventActivities: [activity, ...state.eventActivities.slice(0, 99)] // # Keep last 100
      }))
    },
    
    setEventActivities: (eventActivities) => set({ eventActivities }),
    
    // # Analytics
    setEventAnalytics: (eventAnalytics) => set({ eventAnalytics }),
    
    refreshAnalytics: async (eventId) => {
      // # This would typically make an API call
      // # For now, it's a placeholder
      set({ isLoading: true })
      try {
        // # API call would go here
        console.log('Refreshing analytics for event:', eventId)
      } catch (error) {
        console.error('Analytics refresh failed:', error)
      } finally {
        set({ isLoading: false })
      }
    },
    
    // # Upload management (existing)
    addUploadProgress: (progress) => {
      set((state) => ({
        uploadProgress: [...state.uploadProgress, progress]
      }))
    },
    
    updateUploadProgress: (id, updates) => {
      set((state) => ({
        uploadProgress: state.uploadProgress.map(progress =>
          progress.id === id ? { ...progress, ...updates } : progress
        )
      }))
    },
    
    removeUploadProgress: (id) => {
      set((state) => ({
        uploadProgress: state.uploadProgress.filter(progress => progress.id !== id)
      }))
    },
    
    clearCompletedUploads: () => {
      set((state) => ({
        uploadProgress: state.uploadProgress.filter(
          progress => progress.status !== 'completed' && progress.status !== 'error'
        )
      }))
    },
    
    setIsUploading: (isUploading) => set({ isUploading }),
    
    // # UI state management
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    
    // # Modal management
    setShowEventJoinModal: (showEventJoinModal) => set({ showEventJoinModal }),
    setShowMediaUploadSheet: (showMediaUploadSheet) => set({ showMediaUploadSheet }),
    setShowEventCreationModal: (showEventCreationModal) => set({ showEventCreationModal }),
    setShowInvitationModal: (showInvitationModal) => set({ showInvitationModal }),
    setShowModerationPanel: (showModerationPanel) => set({ showModerationPanel }),
    setShowAnalyticsPanel: (showAnalyticsPanel) => set({ showAnalyticsPanel }),
    setShowParticipantManagement: (showParticipantManagement) => set({ showParticipantManagement }),
    
    // # View management
    setCurrentView: (currentView) => set({ currentView }),
    setMediaFilter: (mediaFilter) => set({ mediaFilter }),
    setParticipantFilter: (participantFilter) => set({ participantFilter }),
    
    // # Permission helpers
    hasPermission: (permission) => {
      const { currentUserPermissions } = get()
      return currentUserPermissions?.[permission] || false
    },
    
    isRole: (role) => {
      const { currentUserRole } = get()
      return currentUserRole === role
    },
    
    canPerformAction: (action) => {
      const { currentUserPermissions } = get()
      if (!currentUserPermissions) return false
      
      // # Map actions to permissions
      const actionMap: Record<string, keyof EventPermissions> = {
        'upload_media': 'canUpload',
        'approve_media': 'canApproveMedia',
        'delete_media': 'canDeleteMedia',
        'manage_participants': 'canManageParticipants',
        'edit_event': 'canEditEvent',
        'view_analytics': 'canViewAnalytics',
        'invite_users': 'canInviteUsers',
        'moderate_content': 'canModerate',
      }
      
      const permission = actionMap[action]
      return permission ? currentUserPermissions[permission] : false
    },
    
    // # Utility actions
    reset: () => set(initialState),
    
    refreshCurrentEvent: async () => {
      const { currentEvent } = get()
      if (!currentEvent) return
      
      set({ isLoading: true })
      try {
        // # API call would go here to refresh event data
        console.log('Refreshing current event:', currentEvent.id)
      } catch (error) {
        console.error('Event refresh failed:', error)
      } finally {
        set({ isLoading: false })
      }
    },
    
    syncEventData: async (eventId) => {
      set({ isLoading: true })
      try {
        // # API calls would go here to sync all event-related data
        console.log('Syncing event data:', eventId)
      } catch (error) {
        console.error('Event sync failed:', error)
      } finally {
        set({ isLoading: false })
      }
    },
  }))
)

// # Enhanced selector hooks with role-based logic
export const useAuth = () => {
  return useAppStore((state) => ({
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    anonymousUser: state.anonymousUser,
    currentUserRole: state.currentUserRole,
    setUser: state.setUser,
    setAuthenticated: state.setAuthenticated,
    setAnonymousUser: state.setAnonymousUser,
    updateUserRole: state.updateUserRole,
    logout: state.logout,
  }))
}

export const useCurrentEvent = () => {
  return useAppStore((state) => ({
    currentEvent: state.currentEvent,
    participants: state.currentEventParticipants,
    permissions: state.currentUserPermissions,
    userRole: state.currentUserRole,
    setCurrentEvent: state.setCurrentEvent,
    setCurrentEventParticipants: state.setCurrentEventParticipants,
    addParticipant: state.addParticipant,
    updateParticipant: state.updateParticipant,
    removeParticipant: state.removeParticipant,
    changeParticipantRole: state.changeParticipantRole,
  }))
}

export const useEventMedia = () => {
  return useAppStore((state) => ({
    eventMedia: state.eventMedia,
    pendingMedia: state.pendingMedia,
    rejectedMedia: state.rejectedMedia,
    myUploads: state.myUploads,
    mediaFilter: state.mediaFilter,
    setEventMedia: state.setEventMedia,
    setPendingMedia: state.setPendingMedia,
    setRejectedMedia: state.setRejectedMedia,
    addMediaToEvent: state.addMediaToEvent,
    updateMediaStatus: state.updateMediaStatus,
    approveMedia: state.approveMedia,
    rejectMedia: state.rejectMedia,
    removeMediaFromEvent: state.removeMediaFromEvent,
    setMediaFilter: state.setMediaFilter,
  }))
}

export const usePermissions = () => {
  return useAppStore((state) => ({
    permissions: state.currentUserPermissions,
    hasPermission: state.hasPermission,
    isRole: state.isRole,
    canPerformAction: state.canPerformAction,
  }))
}

export const useModeration = () => {
  return useAppStore((state) => ({
    pendingMedia: state.pendingMedia,
    rejectedMedia: state.rejectedMedia,
    showModerationPanel: state.showModerationPanel,
    approveMedia: state.approveMedia,
    rejectMedia: state.rejectMedia,
    setShowModerationPanel: state.setShowModerationPanel,
    canModerate: state.hasPermission('canModerate'),
  }))
}

export const useAnalytics = () => {
  return useAppStore((state) => ({
    analytics: state.eventAnalytics,
    showAnalyticsPanel: state.showAnalyticsPanel,
    setEventAnalytics: state.setEventAnalytics,
    refreshAnalytics: state.refreshAnalytics,
    setShowAnalyticsPanel: state.setShowAnalyticsPanel,
    canViewAnalytics: state.hasPermission('canViewAnalytics'),
  }))
}

export const useUpload = () => {
  return useAppStore((state) => ({
    uploadProgress: state.uploadProgress,
    isUploading: state.isUploading,
    addUploadProgress: state.addUploadProgress,
    updateUploadProgress: state.updateUploadProgress,
    removeUploadProgress: state.removeUploadProgress,
    setIsUploading: state.setIsUploading,
    clearCompletedUploads: state.clearCompletedUploads,
    canUpload: state.hasPermission('canUpload'),
  }))
}

export const useUI = () => {
  return useAppStore((state) => ({
    isLoading: state.isLoading,
    error: state.error,
    currentView: state.currentView,
    setLoading: state.setLoading,
    setError: state.setError,
    clearError: state.clearError,
    setCurrentView: state.setCurrentView,
  }))
}