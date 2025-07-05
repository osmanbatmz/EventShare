import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ScrollView,
  Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

// Services
import { supabase } from '../services/supabase'

// Types
import { Event } from '../types'

const COLORS = {
  primary: '#8B5A3C',
  primaryLight: '#A67C52',
  accent: '#F4E4BC',
  surface: '#FFFFFF',
  textDark: '#2D1810',
  textMedium: '#5D4037',
  textLight: '#8D6E63',
  gradientStart: '#FFF8F0',
  gradientEnd: '#F4E4BC',
}

const WebEventJoinScreen: React.FC = () => {
  const [eventCode, setEventCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null)

  // URL'den event code'u al
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const code = urlParams.get('code')
      if (code) {
        setEventCode(code.toUpperCase())
        handleJoinEvent(code.toUpperCase())
      }
    }
  }, [])

  const handleJoinEvent = async (code?: string) => {
    const eventCodeToUse = code || eventCode
    if (!eventCodeToUse || eventCodeToUse.length !== 6) {
      Alert.alert('Hata', 'Geçerli bir etkinlik kodu girin (6 karakter)')
      return
    }

    try {
      setIsJoining(true)

      // Etkinliği bul
      const { data: event, error } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCodeToUse)
        .single()

      if (error || !event) {
        Alert.alert('Hata', 'Etkinlik bulunamadı. Kodu kontrol edin.')
        return
      }

      setCurrentEvent(event)

      // Web'de misafir olarak katıl
      Alert.alert(
        '🎉 Etkinlik Bulundu!',
        `${event.title}\n\nBu etkinliğe web üzerinden katılıyorsunuz.`,
        [
          {
            text: 'Etkinliği Görüntüle',
            onPress: () => {
              // Etkinlik detayını göster
              if (typeof window !== 'undefined') {
                window.location.href = `/event/${event.id}`
              }
            }
          }
        ]
      )

    } catch (error) {
      console.error('Join event error:', error)
      Alert.alert('Hata', 'Etkinliğe katılırken bir hata oluştu')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <LinearGradient
      colors={[COLORS.gradientStart, COLORS.gradientEnd]}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>EventShare Web</Text>
          <Text style={styles.subtitle}>QR kod ile etkinliğe katılın</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Etkinlik Kodu</Text>
          <Text style={styles.cardSubtitle}>
            QR kod taradığınızda otomatik olarak doldurulacak
          </Text>

          <TextInput
            style={styles.input}
            placeholder="6 haneli etkinlik kodunu girin"
            value={eventCode}
            onChangeText={(text) => {
              const filteredText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
              setEventCode(filteredText)
            }}
            maxLength={6}
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={styles.joinButton}
            onPress={() => handleJoinEvent()}
            disabled={isJoining || eventCode.length !== 6}
          >
            <LinearGradient
              colors={['#6366f1', '#8b5cf6']}
              style={styles.joinButtonGradient}
            >
              <Text style={styles.joinButtonText}>
                {isJoining ? 'Katılıyor...' : 'Etkinliğe Katıl'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {currentEvent && (
          <View style={styles.eventCard}>
            <Text style={styles.eventTitle}>{currentEvent.title}</Text>
            <Text style={styles.eventDate}>
              📅 {new Date(currentEvent.start_date).toLocaleDateString('tr-TR')}
            </Text>
            <Text style={styles.eventDescription}>
              {currentEvent.description || 'Açıklama yok'}
            </Text>
          </View>
        )}

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>Web Versiyonu Avantajları</Text>
          <Text style={styles.infoItem}>• Uygulama indirmeye gerek yok</Text>
          <Text style={styles.infoItem}>• QR kod tarayarak direkt katılın</Text>
          <Text style={styles.infoItem}>• Tüm özellikler web'de mevcut</Text>
          <Text style={styles.infoItem}>• Hızlı ve kolay kullanım</Text>
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 20,
    lineHeight: 20,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 4,
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
  },
  joinButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  joinButtonGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  joinButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  eventCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  eventTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 8,
  },
  eventDate: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: COLORS.textLight,
    lineHeight: 20,
  },
  infoCard: {
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    padding: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  infoItem: {
    fontSize: 14,
    color: COLORS.textMedium,
    marginBottom: 4,
  },
})

export default WebEventJoinScreen 