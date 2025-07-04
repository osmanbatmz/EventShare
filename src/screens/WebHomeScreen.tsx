// # src/screens/WebHomeScreen.tsx - Web Home Screen
import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// # Types
import { Event } from '../types'

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

const WebHomeScreen: React.FC = () => {
  // # State
  const { user, isAuthenticated } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadEvents()
  }, [])

  const loadEvents = async () => {
    try {
      setLoading(true)
      
      // # Tüm aktif etkinlikleri yükle
      const { data: eventsData, error } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_creator_id_fkey(display_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) {
        console.error('Supabase error:', error)
        // # Hata durumunda boş array kullan
        setEvents([])
        return
      }

      setEvents(eventsData as Event[] || [])

    } catch (error) {
      console.error('Load events error:', error)
      // # Hata durumunda boş array kullan
      setEvents([])
    } finally {
      setLoading(false)
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadEvents()
    setRefreshing(false)
  }

  const handleJoinEvent = (eventCode: string) => {
    if (isWebPlatform()) {
      updateWebURL(`/join/${eventCode}`)
    }
  }

  const EventCard: React.FC<{ event: Event }> = ({ event }) => {
    return (
      <View style={styles.eventCard}>
        <LinearGradient
          colors={[COLORS.surface, COLORS.accent]}
          style={styles.eventGradient}
        >
          <View style={styles.eventHeader}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <Text style={styles.eventType}>
              {getEventTypeEmoji(event.event_type)} {event.event_type}
            </Text>
          </View>

          <View style={styles.eventDetails}>
            <Text style={styles.eventDate}>
              📅 {formatDateRange(event.start_date, event.end_date)}
            </Text>
            <Text style={styles.eventCreator}>
              👤 {(event as any).profiles?.display_name || 'Bilinmeyen'}
            </Text>
            <Text style={styles.eventStats}>
              👥 {event.participant_count || 0} katılımcı • 📸 {event.media_count || 0} medya
            </Text>
          </View>

          <View style={styles.eventActions}>
            <TouchableOpacity
              style={styles.joinButton}
              onPress={() => handleJoinEvent(event.event_code)}
            >
              <Text style={styles.joinButtonText}>🎉 Katıl</Text>
            </TouchableOpacity>

            <View style={styles.eventCodeContainer}>
              <Text style={styles.eventCodeLabel}>Kod:</Text>
              <Text style={styles.eventCode}>{event.event_code}</Text>
            </View>
          </View>
        </LinearGradient>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[COLORS.gradientStart, COLORS.gradientEnd]}
          style={styles.loadingGradient}
        >
          <Text style={styles.loadingText}>Etkinlikler yükleniyor...</Text>
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
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primary]}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* # Header */}
          <View style={styles.header}>
            <Text style={styles.mainTitle}>🎉 EventShare</Text>
            <Text style={styles.subtitle}>
              Etkinliklerinizde çekilen anıları paylaşın
            </Text>
          </View>

          {/* # Stats */}
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>{events.length}</Text>
              <Text style={styles.statLabel}>Aktif Etkinlik</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {events.reduce((sum, event) => sum + (event.participant_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Toplam Katılımcı</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statNumber}>
                {events.reduce((sum, event) => sum + (event.media_count || 0), 0)}
              </Text>
              <Text style={styles.statLabel}>Toplam Medya</Text>
            </View>
          </View>

          {/* # Events List */}
          <View style={styles.eventsSection}>
            <Text style={styles.sectionTitle}>📅 Aktif Etkinlikler</Text>
            
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Henüz etkinlik yok</Text>
                <Text style={styles.emptySubtitle}>
                  İlk etkinliği oluşturmak için uygulamayı indirin
                </Text>
              </View>
            ) : (
              <View style={styles.eventsGrid}>
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </View>
            )}
          </View>

          {/* # How to Use */}
          <View style={styles.howToUseSection}>
            <Text style={styles.sectionTitle}>📱 Nasıl Kullanılır?</Text>
            
            <View style={styles.stepsContainer}>
              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>1</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>QR Kodu Tarayın</Text>
                  <Text style={styles.stepDescription}>
                    Telefonunuzun kamerasıyla etkinlik QR kodunu tarayın
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>2</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Etkinliğe Katılın</Text>
                  <Text style={styles.stepDescription}>
                    İsim girin ve etkinliğe anonim olarak katılın
                  </Text>
                </View>
              </View>

              <View style={styles.step}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>3</Text>
                </View>
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Anılarınızı Paylaşın</Text>
                  <Text style={styles.stepDescription}>
                    Fotoğraf ve videolarınızı yükleyin
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* # Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 EventShare - Anılarınızı paylaşın
            </Text>
            <Text style={styles.footerSubtext}>
              Etkinlik oluşturmak için uygulamayı indirin
            </Text>
            
            {/* # App Download Section */}
            <View style={styles.appDownloadSection}>
              <Text style={styles.appDownloadTitle}>📱 EventShare Uygulaması</Text>
              <Text style={styles.appDownloadText}>
                Etkinlik oluşturun, QR kodları yönetin ve daha fazlasını yapın!
              </Text>
              
              <View style={styles.appDownloadButtons}>
                <TouchableOpacity
                  style={styles.appStoreButton}
                  onPress={() => {
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
  
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  
  mainTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  
  subtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 30,
  },
  
  statCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  
  statLabel: {
    fontSize: 12,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  
  eventsSection: {
    marginBottom: 30,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 16,
  },
  
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 40,
    alignItems: 'center',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  
  eventsGrid: {
    gap: 16,
  },
  
  eventCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  eventGradient: {
    padding: 20,
  },
  
  eventHeader: {
    marginBottom: 12,
  },
  
  eventTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  
  eventType: {
    fontSize: 14,
    color: COLORS.textMedium,
    textTransform: 'capitalize',
  },
  
  eventDetails: {
    marginBottom: 16,
  },
  
  eventDate: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  
  eventCreator: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  
  eventStats: {
    fontSize: 14,
    color: COLORS.textMedium,
  },
  
  eventActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  joinButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  joinButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  
  eventCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  eventCodeLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    marginRight: 4,
  },
  
  eventCode: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.primary,
    fontFamily: 'monospace',
  },
  
  howToUseSection: {
    marginBottom: 30,
  },
  
  stepsContainer: {
    gap: 16,
  },
  
  step: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  
  stepNumberText: {
    color: COLORS.surface,
    fontSize: 16,
    fontWeight: '700',
  },
  
  stepContent: {
    flex: 1,
  },
  
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 4,
  },
  
  stepDescription: {
    fontSize: 14,
    color: COLORS.textMedium,
    lineHeight: 20,
  },
  
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  
  footerText: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  
  footerSubtext: {
    fontSize: 12,
    color: COLORS.textLight,
  },
  
  appDownloadSection: {
    marginTop: 20,
    padding: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    shadowColor: COLORS.textDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  appDownloadTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  
  appDownloadText: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 16,
  },
  
  appDownloadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  
  appStoreButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  appStoreButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
  
  playStoreButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  
  playStoreButtonText: {
    color: COLORS.surface,
    fontSize: 14,
    fontWeight: '600',
  },
})

export default WebHomeScreen 