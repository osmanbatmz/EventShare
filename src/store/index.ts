import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import { Event, Profile, Media, EventParticipant, UploadProgress } from '../types'
import { supabase } from '../services/supabase'

// # Basit App State
interface AppState {
  user: Profile | null
  isAuthenticated: boolean | undefined
  isGuestMode: boolean
  guestName: string | null
  currentEvent: Event | null
  currentEventParticipants: EventParticipant[]
  events: Event[]
  myEvents: Event[]
  joinedEvents: Event[]
  eventMedia: Media[]
  myUploads: Media[]
  uploadProgress: UploadProgress[]
  isUploading: boolean
  isLoading: boolean
  error: string | null
  showEventJoinModal: boolean
  showMediaUploadSheet: boolean
  showEventCreationModal: boolean
}

// # Basit Actions
interface AppActions {
  setUser: (user: Profile | null) => void
  setAuthenticated: (isAuth: boolean) => void
  setGuestMode: (isGuest: boolean, guestName?: string) => void
  logout: () => void
  setCurrentEvent: (event: Event | null) => void
  setCurrentEventParticipants: (participants: EventParticipant[]) => void
  addEvent: (event: Event) => void
  updateEvent: (id: string, updates: Partial<Event>) => void
  removeEvent: (id: string) => void
  setEvents: (events: Event[]) => void
  setMyEvents: (events: Event[]) => void
  setJoinedEvents: (events: Event[]) => void
  setEventMedia: (media: Media[]) => void
  addMediaToEvent: (media: Media) => void
  removeMediaFromEvent: (mediaId: string) => void
  setMyUploads: (uploads: Media[]) => void
  addUploadProgress: (progress: UploadProgress) => void
  updateUploadProgress: (id: string, updates: Partial<UploadProgress>) => void
  removeUploadProgress: (id: string) => void
  clearCompletedUploads: () => void
  setIsUploading: (isUploading: boolean) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearError: () => void
  setShowEventJoinModal: (show: boolean) => void
  setShowMediaUploadSheet: (show: boolean) => void
  setShowEventCreationModal: (show: boolean) => void
  reset: () => void
  refreshCurrentEvent: () => Promise<void>
}

const initialState: AppState = {
  user: null,
  isAuthenticated: undefined, // undefined olarak başlat, session kontrolü yapılana kadar
  isGuestMode: false,
  guestName: null,
  currentEvent: null,
  currentEventParticipants: [],
  events: [],
  myEvents: [],
  joinedEvents: [],
  eventMedia: [],
  myUploads: [],
  uploadProgress: [],
  isUploading: false,
  isLoading: false,
  error: null,
  showEventJoinModal: false,
  showMediaUploadSheet: false,
  showEventCreationModal: false,
}

export const useAppStore = create<AppState & AppActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    setUser: (user) => set({ user }),
    setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setGuestMode: (isGuest, guestName) => set({ isGuestMode: isGuest, guestName }),
    logout: async () => {
      try {
        console.log('🚪 Logging out...')
        // Supabase session'ını temizle
        const { error } = await supabase.auth.signOut()
        if (error) {
          console.error('Supabase logout error:', error)
        } else {
          console.log('✅ Supabase session cleared')
        }
      } catch (error) {
        console.error('Logout error:', error)
      }
      
      console.log('🧹 Clearing local state...')
      set({ 
        user: null, 
        isAuthenticated: false,
        isGuestMode: false,
        guestName: null,
        currentEvent: null,
        currentEventParticipants: [],
        events: [],
        myEvents: [],
        joinedEvents: [],
        eventMedia: [],
        myUploads: [],
        uploadProgress: [],
      })
      console.log('✅ Logout completed')
    },
    
    setCurrentEvent: (currentEvent) => set({ currentEvent }),
    setCurrentEventParticipants: (currentEventParticipants) => set({ currentEventParticipants }),
    
    addEvent: (event) => set((state) => ({
      events: [event, ...state.events],
      myEvents: event.creator_id === state.user?.id 
        ? [event, ...state.myEvents] 
        : state.myEvents,
      joinedEvents: event.creator_id !== state.user?.id 
        ? [event, ...state.joinedEvents] 
        : state.joinedEvents
    })),
    
    updateEvent: (id, updates) => set((state) => ({
      events: state.events.map(event => 
        event.id === id ? { ...event, ...updates } : event
      ),
      myEvents: state.myEvents.map(event => 
        event.id === id ? { ...event, ...updates } : event
      ),
      joinedEvents: state.joinedEvents.map(event => 
        event.id === id ? { ...event, ...updates } : event
      ),
      currentEvent: state.currentEvent?.id === id 
        ? { ...state.currentEvent, ...updates } 
        : state.currentEvent
    })),
    
    removeEvent: (id) => set((state) => ({
      events: state.events.filter(event => event.id !== id),
      myEvents: state.myEvents.filter(event => event.id !== id),
      joinedEvents: state.joinedEvents.filter(event => event.id !== id),
      currentEvent: state.currentEvent?.id === id ? null : state.currentEvent
    })),
    
    setEvents: (events) => set({ events }),
    setMyEvents: (myEvents) => set({ myEvents }),
    setJoinedEvents: (joinedEvents) => set({ joinedEvents }),
    
    setEventMedia: (eventMedia) => set({ eventMedia }),
    addMediaToEvent: (media) => set((state) => ({
      eventMedia: [media, ...state.eventMedia],
      myUploads: media.uploader_id === state.user?.id 
        ? [media, ...state.myUploads] 
        : state.myUploads
    })),
    
    removeMediaFromEvent: (mediaId) => set((state) => ({
      eventMedia: state.eventMedia.filter(media => media.id !== mediaId),
      myUploads: state.myUploads.filter(media => media.id !== mediaId)
    })),
    
    setMyUploads: (myUploads) => set({ myUploads }),
    
    addUploadProgress: (progress) => set((state) => ({
      uploadProgress: [...state.uploadProgress, progress]
    })),
    
    updateUploadProgress: (id, updates) => set((state) => ({
      uploadProgress: state.uploadProgress.map(progress => 
        progress.id === id ? { ...progress, ...updates } : progress
      )
    })),
    
    removeUploadProgress: (id) => set((state) => ({
      uploadProgress: state.uploadProgress.filter(progress => progress.id !== id)
    })),
    
    clearCompletedUploads: () => set((state) => ({
      uploadProgress: state.uploadProgress.filter(
        progress => progress.status !== 'completed' && progress.status !== 'error'
      )
    })),
    
    setIsUploading: (isUploading) => set({ isUploading }),
    setLoading: (isLoading) => set({ isLoading }),
    setError: (error) => set({ error }),
    clearError: () => set({ error: null }),
    
    setShowEventJoinModal: (showEventJoinModal) => set({ showEventJoinModal }),
    setShowMediaUploadSheet: (showMediaUploadSheet) => set({ showMediaUploadSheet }),
    setShowEventCreationModal: (showEventCreationModal) => set({ showEventCreationModal }),
    
    reset: () => set(initialState),
    
    refreshCurrentEvent: async () => {
      const { currentEvent } = get()
      if (!currentEvent) return
      console.log('Refreshing current event:', currentEvent.id)
    }
  }))
)

export const useAuth = () => {
  const user = useAppStore((state) => state.user)
  const isAuthenticated = useAppStore((state) => state.isAuthenticated)
  const isGuestMode = useAppStore((state) => state.isGuestMode)
  const guestName = useAppStore((state) => state.guestName)
  const setUser = useAppStore((state) => state.setUser)
  const setAuthenticated = useAppStore((state) => state.setAuthenticated)
  const setGuestMode = useAppStore((state) => state.setGuestMode)
  const logout = useAppStore((state) => state.logout)
  
  return { 
    user, 
    isAuthenticated, 
    isGuestMode, 
    guestName,
    setUser, 
    setAuthenticated, 
    setGuestMode,
    logout 
  }
}

export const useCurrentEvent = () => {
  const currentEvent = useAppStore((state) => state.currentEvent)
  const participants = useAppStore((state) => state.currentEventParticipants)
  const media = useAppStore((state) => state.eventMedia)
  const setCurrentEvent = useAppStore((state) => state.setCurrentEvent)
  const setCurrentEventParticipants = useAppStore((state) => state.setCurrentEventParticipants)
  const setEventMedia = useAppStore((state) => state.setEventMedia)
  const addMediaToEvent = useAppStore((state) => state.addMediaToEvent)
  
  return { currentEvent, participants, media, setCurrentEvent, setCurrentEventParticipants, setEventMedia, addMediaToEvent }
}

export const useUpload = () => {
  const uploadProgress = useAppStore((state) => state.uploadProgress)
  const isUploading = useAppStore((state) => state.isUploading)
  const addUploadProgress = useAppStore((state) => state.addUploadProgress)
  const updateUploadProgress = useAppStore((state) => state.updateUploadProgress)
  const removeUploadProgress = useAppStore((state) => state.removeUploadProgress)
  const setIsUploading = useAppStore((state) => state.setIsUploading)
  
  return { uploadProgress, isUploading, addUploadProgress, updateUploadProgress, removeUploadProgress, setIsUploading }
}

export const useUI = () => {
  const isLoading = useAppStore((state) => state.isLoading)
  const error = useAppStore((state) => state.error)
  const setLoading = useAppStore((state) => state.setLoading)
  const setError = useAppStore((state) => state.setError)
  const clearError = useAppStore((state) => state.clearError)
  
  return { isLoading, error, setLoading, setError, clearError }
}

// # Role-based permissions hook (eksik olan)
export const usePermissions = () => {
  const currentEvent = useAppStore((state) => state.currentEvent)
  const user = useAppStore((state) => state.user)
  const participants = useAppStore((state) => state.currentEventParticipants)
  
  // # Kullanıcının mevcut etkinlikteki rolünü bul
  const currentParticipant = participants.find(p => p.user_id === user?.id)
  const userRole = currentParticipant?.role || null
  
  const permissions = {
    canUpload: currentParticipant?.can_upload || false,
    canDownload: currentParticipant?.can_download || false,
    canModerate: currentParticipant?.can_moderate || false,
    canDeleteMedia: currentParticipant?.can_delete_media || false,
    canManageParticipants: currentParticipant?.can_manage_participants || false,
    canEditEvent: currentParticipant?.can_edit_event || false,
    canViewAnalytics: ['creator', 'organizer'].includes(userRole || ''),
    canInviteUsers: ['creator', 'organizer', 'moderator'].includes(userRole || ''),
    canApproveMedia: ['creator', 'organizer', 'moderator'].includes(userRole || ''),
    isOrganizer: ['creator', 'organizer'].includes(userRole || ''),
    isCreator: userRole === 'creator',
  }
  
  const hasPermission = (permission: keyof typeof permissions): boolean => {
    return permissions[permission] || false
  }
  
  const isRole = (role: string): boolean => {
    return userRole === role
  }
  
  return { permissions, hasPermission, isRole, userRole }
}
