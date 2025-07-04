// # src/screens/WebEventJoinScreen.tsx - Web Event Join Screen
import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'

// # Types
import { Event, Media } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Utils
import { isWebPlatform, updateWebURL } from '../utils/deepLinkHandler'
import { formatDateRange, getEventTypeEmoji } from '../utils'

// # Store
import { useAuth } from '../store'

const { width } = Dimensions.get('window')

// # Modern Color Palette
const COLORS = {
  primary: '#8B5A3C',
  primaryLight: '#A67C52',
  accent: '#F4E4BC',
  gradientStart: '#FFF8F0',
  gradientEnd: '#F5E6D3',
  textDark: '#2D1810',
  textMedium: '#5D4037',
  textLight: '#8D6E63',
  surface: '#FFFFFF',
  surfaceWarm: '#FEFCFA',
  border: '#E8DDD4',
  success: '#6A9F58',
  warning: '#E8A317',
  error: '#E74C3C',
}

interface WebEventJoinScreenProps {
  eventCode?: string
  onJoinSuccess?: (event: Event) => void
}

const WebEventJoinScreen: React.FC<WebEventJoinScreenProps> = ({ 
  eventCode: initialEventCode,
  onJoinSuccess 
}) => {
  // # State
  const { user, isAuthenticated } = useAuth()
  const [eventCode, setEventCode] = useState(initialEventCode || '')
  const [event, setEvent] = useState<Event | null>(null)
  const [loading, setLoading] = useState(false)
  const [joining, setJoining] = useState(false)
  const [anonymousName, setAnonymousName] = useState('')
  const [showAnonymousForm, setShowAnonymousForm] = useState(false)

  useEffect(() => {
    if (initialEventCode) {
      loadEventByCode(initialEventCode)
    }
  }, [initialEventCode])

  const loadEventByCode = async (code: string) => {
    try {
      setLoading(true)
      
      const { data: eventData, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_creator_id_fkey(display_name)
        `)
        .eq('event_code', code.toUpperCase())
        .eq('is_active', true)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          Alert.alert('Etkinlik Bulunamadı', 'Bu etkinlik kodu geçersiz veya etkinlik aktif değil.')
        } else {
          throw error
        }
        return
      }

      setEvent(eventData as Event)
      
      // # Update web URL
      if (isWebPlatform()) {
        updateWebURL(`/join/${code.toUpperCase()}`, true)
      }

    } catch (error) {
      console.error('Load event error:', error)
      Alert.alert('Hata', 'Etkinlik yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  const handleJoinEvent = async () => {
    if (!event) return

    if (isAuthenticated && user) {
      // # Authenticated user join
      await joinAsAuthenticatedUser()
    } else {
      // # Show anonymous form
      setShowAnonymousForm(true)
    }
  }

  const joinAsAuthenticatedUser = async () => {
    if (!event || !user) return

    try {
      setJoining(true)

      // # Check if already joined
      const { data: existingParticipant } = await supabase
        .from('event_participants')
        .select('*')
        .eq('event_id', event.id)
        .eq('user_id', user.id)
        .single()

      if (existingParticipant) {
        Alert.alert('Zaten Katıldınız', 'Bu etkinliğe zaten katılmışsınız.')
        onJoinSuccess?.(event)
        return
      }

      // # Join event
      const { error: joinError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user.id,
          user_name: user.display_name,
          role: 'participant',
          can_upload: true,
          can_download: true,
          can_moderate: false,
          can_delete_media: false,
          can_manage_participants: false,
          can_edit_event: false,
          notification_enabled: true,
        })

      if (joinError) throw joinError

      // # Update event participant count
      await supabase
        .from('events')
        .update({ 
          participant_count: (event.participant_count || 0) + 1 
        })
        .eq('id', event.id)

      Alert.alert('Başarılı! 🎉', 'Etkinliğe katıldınız!')
      onJoinSuccess?.(event)

    } catch (error) {
      console.error('Join event error:', error)
      Alert.alert('Hata', 'Etkinliğe katılırken bir hata oluştu')
    } finally {
      setJoining(false)
    }
  }

  const joinAsAnonymousUser = async () => {
    if (!event || !anonymousName.trim()) {
      Alert.alert('Hata', 'Lütfen bir isim girin')
      return
    }

    try {
      setJoining(true)

      // # Create anonymous user session
      const tempToken = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      
      // # Store anonymous user info (you might want to use a separate table)
      const anonymousUser = {
        event_id: event.id,
        display_name: anonymousName.trim(),
        temp_token: tempToken,
        upload_count: 0,
        last_activity: new Date().toISOString(),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }

      // # Store in localStorage for web
      if (isWebPlatform()) {
        localStorage.setItem('eventshare_anonymous_user', JSON.stringify(anonymousUser))
      }

      Alert.alert('Başarılı! 🎉', 'Anonim olarak etkinliğe katıldınız!')
      onJoinSuccess?.(event)

    } catch (error) {
      console.error('Anonymous join error:', error)
      Alert.alert('Hata', 'Etkinliğe katılırken bir hata oluştu')
    } finally {
      setJoining(false)
    }
  }

  const handleUploadMedia = async () => {
    if (!event) return

    try {
      // # Request file input for web
      if (isWebPlatform()) {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = 'image/*,video/*'
        input.multiple = false
        
        input.onchange = async (e) => {
          const file = (e.target as HTMLInputElement).files?.[0]
          if (!file) return
          
          await uploadFile(file)
        }
        
        input.click()
      } else {
        // # Mobile image picker
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
        if (status !== 'granted') {
          Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekli')
          return
        }

        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.All,
          allowsEditing: true,
          quality: 0.8,
          allowsMultipleSelection: false,
        })

        if (result.canceled || !result.assets[0]) return

        const asset = result.assets[0]
        const response = await fetch(asset.uri)
        const blob = await response.blob()
        
        await uploadFile(blob, asset.fileName || 'media')
      }
    } catch (error) {
      console.error('Upload media error:', error)
      Alert.alert('Hata', 'Medya yüklenirken bir hata oluştu')
    }
  }

  const uploadFile = async (file: File | Blob, fileName?: string) => {
    if (!event) return

    try {
      const fileExtension = fileName?.split('.').pop() || 'jpg'
      const finalFileName = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExtension}`
      const filePath = `events/${event.id}/media/${finalFileName}`

      const { error: uploadError } = await supabase.storage
        .from('event-media')
        .upload(filePath, file, {
          contentType: file.type || 'image/jpeg',
        })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('event-media')
        .getPublicUrl(filePath)

      // # Get uploader info
      let uploaderId = 'anonymous'
      let uploaderName = anonymousName || 'Anonim Kullanıcı'

      if (isAuthenticated && user) {
        uploaderId = user.id
        uploaderName = user.display_name
      }

      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert({
          event_id: event.id,
          uploader_id: uploaderId,
          uploader_name: uploaderName,
          file_url: urlData.publicUrl,
          file_name: finalFileName,
          file_type: file.type?.startsWith('video/') ? 'video' : 'image',
          file_size: file.size || 0,
          is_approved: true,
          is_featured: false,
        })
        .select()
        .single()

      if (mediaError) throw mediaError

      Alert.alert('Başarılı! 🎉', 'Medya yüklendi!')

    } catch (error) {
      console.error('Upload file error:', error)
      Alert.alert('Hata', 'Dosya yüklenirken bir hata oluştu')
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>Etkinlik yükleniyor...</Text>
        </LinearGradient>
      </View>
    )
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.gradient}
        >
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <View style={styles.card}>
              <Text style={styles.title}>📱 Etkinliğe Katıl</Text>
              <Text style={styles.subtitle}>
                QR kodu tarayın veya etkinlik kodunu girin
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="6 haneli etkinlik kodu"
                  value={eventCode}
                  onChangeText={setEventCode}
                  maxLength={6}
                  autoCapitalize="characters"
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <TouchableOpacity
                style={styles.button}
                onPress={() => loadEventByCode(eventCode)}
                disabled={!eventCode.trim()}
              >
                <Text style={styles.buttonText}>Etkinliği Bul</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </LinearGradient>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* # Event Info Card */}
          <View style={styles.eventCard}>
            <LinearGradient
              colors={[COLORS.surface, COLORS.accent]}
              style={styles.eventGradient}
            >
              <Text style={styles.eventTitle}>{event.title}</Text>
              <Text style={styles.eventType}>
                {getEventTypeEmoji(event.event_type)} {event.event_type}
              </Text>
              <Text style={styles.eventDate}>
                📅 {formatDateRange(event.start_date, event.end_date)}
              </Text>
              <Text style={styles.eventParticipants}>
                👥 {event.participant_count || 0} katılımcı
              </Text>
              <Text style={styles.eventMedia}>
                📸 {event.media_count || 0} medya
              </Text>
            </LinearGradient>
          </View>

          {/* # Join Options */}
          {!showAnonymousForm ? (
            <View style={styles.optionsCard}>
              <Text style={styles.optionsTitle}>Etkinliğe Katıl</Text>
              
              <TouchableOpacity
                style={styles.joinButton}
                onPress={handleJoinEvent}
                disabled={joining}
              >
                <Text style={styles.joinButtonText}>
                  {joining ? 'Katılıyor...' : 'Etkinliğe Katıl'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.uploadButton}
                onPress={handleUploadMedia}
              >
                <Text style={styles.uploadButtonText}>📸 Anı Yükle</Text>
              </TouchableOpacity>

              {/* # App Download Suggestion */}
              <View style={styles.appSuggestionCard}>
                <Text style={styles.appSuggestionTitle}>📱 Daha İyi Deneyim İçin</Text>
                <Text style={styles.appSuggestionText}>
                  EventShare uygulamasını indirin ve tüm özellikleri keşfedin!
                </Text>
                
                <View style={styles.appButtons}>
                  <TouchableOpacity
                    style={styles.appStoreButton}
                    onPress={() => {
                      // # App Store link
                      if (Platform.OS === 'web') {
                        window.open('https://apps.apple.com/app/eventshare', '_blank')
                      }
                    }}
                  >
                    <Text style={styles.appStoreButtonText}>App Store</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.playStoreButton}
                    onPress={() => {
                      // # Google Play link
                      if (Platform.OS === 'web') {
                        window.open('https://play.google.com/store/apps/details?id=com.eventshare', '_blank')
                      }
                    }}
                  >
                    <Text style={styles.playStoreButtonText}>Google Play</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            /* # Anonymous Form */
            <View style={styles.anonymousCard}>
              <Text style={styles.anonymousTitle}>Anonim Katılım</Text>
              <Text style={styles.anonymousSubtitle}>
                İsim girin ve etkinliğe katılın
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  placeholder="Adınız"
                  value={anonymousName}
                  onChangeText={setAnonymousName}
                  placeholderTextColor={COLORS.textLight}
                />
              </View>

              <View style={styles.anonymousButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setShowAnonymousForm(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={joinAsAnonymousUser}
                  disabled={joining || !anonymousName.trim()}
                >
                  <Text style={styles.confirmButtonText}>
                    {joining ? 'Katılıyor...' : 'Katıl'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  gradient: {
    flex: 1,
  },
  
  scrollContent: {
    padding: 20,
    minHeight: '100%',
  },
  
  loadingContainer: {
    flex: 1,
  },
  
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingText: {
    fontSize: 18,
    color: COLORS.textDark,
    fontWeight: '500',
  },
  
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 24,
  },
  
  inputContainer: {
    marginBottom: 20,
  },
  
  input: {
    borderWidth: 2,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: COLORS.textDark,
    textAlign: 'center',
    backgroundColor: COLORS.surfaceWarm,
  },
  
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  buttonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  
  eventCard: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  eventGradient: {
    padding: 24,
  },
  
  eventTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 12,
  },
  
  eventType: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 8,
    textTransform: 'capitalize',
  },
  
  eventDate: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  eventParticipants: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 4,
  },
  
  eventMedia: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  
  optionsCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  optionsTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  
  joinButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  
  uploadButton: {
    backgroundColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  
  uploadButtonText: {
    color: COLORS.textDark,
    fontSize: 18,
    fontWeight: '600',
  },
  
  appSuggestionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  appSuggestionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  appSuggestionText: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  appButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  appStoreButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  appStoreButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  
  playStoreButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  playStoreButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
  
  anonymousCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 24,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  anonymousTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  anonymousSubtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    marginBottom: 20,
  },
  
  anonymousButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceWarm,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  
  cancelButtonText: {
    color: COLORS.textMedium,
    fontSize: 18,
    fontWeight: '600',
  },
  
  confirmButton: {
    flex: 1,
    backgroundColor: COLORS.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  
  confirmButtonText: {
    color: COLORS.surface,
    fontSize: 18,
    fontWeight: '600',
  },
})

export default WebEventJoinScreen 