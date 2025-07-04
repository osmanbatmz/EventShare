// # src/utils/deepLinkHandler.ts - Deep Link Handling System
import { Platform } from 'react-native'
import { supabase } from '../services/supabase'

// # Deep Link Types
export interface DeepLinkData {
  type: 'event_join' | 'event_view' | 'media_view' | 'auth'
  eventId?: string
  eventCode?: string
  mediaId?: string
  invitationCode?: string
  userId?: string
}

// # QR Code URL Patterns
const QR_PATTERNS = {
  // # Web QR codes
  WEB_JOIN: /^https?:\/\/(?:www\.)?eventshare\.app\/join\/([A-Z0-9]{6})/i,
  WEB_EVENT: /^https?:\/\/(?:www\.)?eventshare\.app\/event\/([a-f0-9-]+)/i,
  
  // # Mobile deep links
  MOBILE_JOIN: /^eventshare:\/\/join\/([A-Z0-9]{6})/i,
  MOBILE_EVENT: /^eventshare:\/\/event\/([a-f0-9-]+)/i,
  
  // # Direct codes
  DIRECT_CODE: /^([A-Z0-9]{6})$/i,
}

// # Parse deep link URL
export const parseDeepLink = (url: string): DeepLinkData | null => {
  try {
    // # Remove whitespace and decode
    const cleanUrl = url.trim()
    
    // # Check web join pattern
    const webJoinMatch = cleanUrl.match(QR_PATTERNS.WEB_JOIN)
    if (webJoinMatch) {
      return {
        type: 'event_join',
        eventCode: webJoinMatch[1].toUpperCase(),
      }
    }
    
    // # Check web event pattern
    const webEventMatch = cleanUrl.match(QR_PATTERNS.WEB_EVENT)
    if (webEventMatch) {
      return {
        type: 'event_view',
        eventId: webEventMatch[1],
      }
    }
    
    // # Check mobile join pattern
    const mobileJoinMatch = cleanUrl.match(QR_PATTERNS.MOBILE_JOIN)
    if (mobileJoinMatch) {
      return {
        type: 'event_join',
        eventCode: mobileJoinMatch[1].toUpperCase(),
      }
    }
    
    // # Check mobile event pattern
    const mobileEventMatch = cleanUrl.match(QR_PATTERNS.MOBILE_EVENT)
    if (mobileEventMatch) {
      return {
        type: 'event_view',
        eventId: mobileEventMatch[1],
      }
    }
    
    // # Check direct code pattern
    const directCodeMatch = cleanUrl.match(QR_PATTERNS.DIRECT_CODE)
    if (directCodeMatch) {
      return {
        type: 'event_join',
        eventCode: directCodeMatch[1].toUpperCase(),
      }
    }
    
    return null
  } catch (error) {
    console.error('Deep link parsing error:', error)
    return null
  }
}

// # Generate QR code URL for events
export const generateEventQRUrl = (eventCode: string, eventId?: string): string => {
  const baseUrl = Platform.OS === 'web' 
    ? 'https://eventshare.app' 
    : 'eventshare://'
  
  if (eventId) {
    return `${baseUrl}/event/${eventId}`
  }
  
  return `${baseUrl}/join/${eventCode}`
}

// # Handle deep link navigation
export const handleDeepLink = async (
  url: string,
  navigation: any,
  setCurrentEvent?: (event: any) => void
): Promise<boolean> => {
  try {
    const deepLinkData = parseDeepLink(url)
    
    if (!deepLinkData) {
      console.log('Invalid deep link URL:', url)
      return false
    }
    
    console.log('Processing deep link:', deepLinkData)
    
    switch (deepLinkData.type) {
      case 'event_join':
        if (deepLinkData.eventCode) {
          // # Navigate to join event screen
          navigation.navigate('JoinEvent', { eventCode: deepLinkData.eventCode })
          return true
        }
        break
        
      case 'event_view':
        if (deepLinkData.eventId) {
          // # Load event and navigate to detail
          const { data: event, error } = await supabase
            .from('events')
            .select('*')
            .eq('id', deepLinkData.eventId)
            .single()
            
          if (event && !error) {
            if (setCurrentEvent) {
              setCurrentEvent(event)
            }
            navigation.navigate('EventDetail', { eventId: deepLinkData.eventId })
            return true
          }
        }
        break
        
      default:
        console.log('Unsupported deep link type:', deepLinkData.type)
        return false
    }
    
    return false
  } catch (error) {
    console.error('Deep link handling error:', error)
    return false
  }
}

// # Web-specific URL handling
export const handleWebURL = (): DeepLinkData | null => {
  if (Platform.OS !== 'web') return null
  
  try {
    const url = window.location.href
    const path = window.location.pathname
    
    // # Handle /join/{code} pattern
    const joinMatch = path.match(/^\/join\/([A-Z0-9]{6})/i)
    if (joinMatch) {
      return {
        type: 'event_join',
        eventCode: joinMatch[1].toUpperCase(),
      }
    }
    
    // # Handle /event/{id} pattern
    const eventMatch = path.match(/^\/event\/([a-f0-9-]+)/i)
    if (eventMatch) {
      return {
        type: 'event_view',
        eventId: eventMatch[1],
      }
    }
    
    return null
  } catch (error) {
    console.error('Web URL handling error:', error)
    return null
  }
}

// # Update web URL without navigation
export const updateWebURL = (path: string, replace: boolean = false) => {
  if (Platform.OS !== 'web') return
  
  try {
    const url = `${window.location.origin}${path}`
    
    if (replace) {
      window.history.replaceState({}, '', url)
    } else {
      window.history.pushState({}, '', url)
    }
  } catch (error) {
    console.error('Web URL update error:', error)
  }
}

// # Get current web path
export const getCurrentWebPath = (): string => {
  if (Platform.OS !== 'web') return ''
  
  return window.location.pathname
}

// # Check if running on web
export const isWebPlatform = (): boolean => {
  return Platform.OS === 'web'
}

// # Check if running on mobile
export const isMobilePlatform = (): boolean => {
  return Platform.OS === 'ios' || Platform.OS === 'android'
} 