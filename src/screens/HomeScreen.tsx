// src/screens/HomeScreen.tsx - QR entegrasyonu ile
import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  TextInput,
  Alert,
  Modal,
  Dimensions,
  StatusBar,
  Platform,
  Animated,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation, useFocusEffect } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import { isAfter, isBefore, parseISO } from 'date-fns'
import { Ionicons } from '@expo/vector-icons'

// # QR System
import QRCodeSystem from '../components/QR/QRCodeSystem'

// # Components
import RegisterModal from '../components/RegisterModal'

// # Types
import { RootStackParamList, Event } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Enhanced Store
import { useAuth, useAppStore } from '../store'

// # Utils
import { 
  formatDate, 
  validateEventCode, 
  generateAvatarColor, 
  getEventTypeEmoji 
} from '../utils'

const { width } = Dimensions.get('window')

type HomeScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Home'>

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>()
  
  // # State
  const { user, logout, isGuestMode, guestName } = useAuth()
  const { 
    events, 
    myEvents, 
    joinedEvents, 
    setEvents, 
    setMyEvents, 
    setJoinedEvents 
  } = useAppStore()
  
  // # Local state
  const [refreshing, setRefreshing] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [selectedTab, setSelectedTab] = useState<'ongoing' | 'completed'>('ongoing')
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showRegisterModal, setShowRegisterModal] = useState(false)
  const [showCodeInput, setShowCodeInput] = useState(false)

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
    overlay: 'rgba(45, 24, 16, 0.1)',
    overlayDark: 'rgba(45, 24, 16, 0.6)',
  }

  useEffect(() => {
    loadEvents()
  }, [user, isGuestMode])

  // Sayfa her odaklandığında etkinlikleri yeniden yükle
  useFocusEffect(
    React.useCallback(() => {
      loadEvents()
    }, [user, isGuestMode])
  )

  const loadEvents = async () => {
    try {
      console.log('🔄 Loading events for user:', user?.id)
      
      // Misafir modunda hiçbir etkinlik yükleme
      if (isGuestMode) {
        setEvents([])
        setMyEvents([])
        setJoinedEvents([])
        return
      }

      // Normal kullanıcı için tüm etkinlikleri yükle
      if (!user) return

      const { data: allEvents, error: allError } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_creator_id_fkey(display_name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(20)

      if (allError) throw allError

      const { data: createdEvents, error: createdError } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false })

      if (createdError) throw createdError

      const { data: participantData, error: participantError } = await supabase
        .from('event_participants')
        .select(`
          event_id,
          events(*)
        `)
        .eq('user_id', user.id)
        .eq('events.status', 'active')

      if (participantError) throw participantError

      const joinedEventsList = (participantData
        ?.map(p => p.events)
        .filter(Boolean) || []) as unknown as Event[]

      setEvents(allEvents as Event[])
      setMyEvents(createdEvents as Event[])
      setJoinedEvents(joinedEventsList)

    } catch (error) {
      console.error('Load events error:', error)
      Alert.alert('Hata', 'Etkinlikler yüklenirken bir hata oluştu')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadEvents()
    setRefreshing(false)
  }

  const handleJoinEvent = async () => {
    try {
      if (!validateEventCode(joinCode)) {
        Alert.alert('Hata', 'Geçerli bir etkinlik kodu girin (6 karakter)')
        return
      }

      setIsJoining(true)

      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', joinCode.toUpperCase())
        .eq('status', 'active')
        .single()

      if (eventError || !event) {
        Alert.alert('Hata', 'Etkinlik bulunamadı veya sona ermiş')
        return
      }

      // # Guest mode için sadece görüntüleme
      if (isGuestMode) {
        Alert.alert(
          'Misafir Modu',
          'Misafir olarak etkinliği görüntüleyebilir ve içerik yükleyebilirsiniz. Katılım kaydı tutulmaz.',
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Görüntüle', 
              onPress: () => {
                setShowJoinModal(false)
                setJoinCode('')
                navigation.navigate('EventDetail', { eventId: event.id })
              }
            }
          ]
        )
        return
      }

      // # Authenticated user için normal katılım
      const { data: existingParticipant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user!.id)
        .single()

      if (existingParticipant) {
        Alert.alert('Bilgi', 'Bu etkinliğe zaten katıldınız', [
          {
            text: 'Tamam',
            onPress: () => {
              setShowJoinModal(false)
              setJoinCode('')
              navigation.navigate('EventDetail', { eventId: event.id })
            }
          }
        ])
        return
      }

      const { error: joinError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user!.id,
          user_name: user!.display_name,
          role: 'participant',
          can_upload: true,
          can_download: true,
          notification_enabled: true,
        })

      if (joinError) throw joinError

      const { error: updateError } = await supabase
        .from('events')
        .update({ 
          participant_count: event.participant_count + 1 
        })
        .eq('id', event.id)

      if (updateError) throw updateError

      Alert.alert('Başarılı! 🎉', 'Etkinliğe katıldınız!', [
        {
          text: 'Tamam',
          onPress: () => {
            setShowJoinModal(false)
            setJoinCode('')
            navigation.navigate('EventDetail', { eventId: event.id })
          }
        }
      ])

      await loadEvents()

    } catch (error) {
      console.error('Join event error:', error)
      Alert.alert('Hata', 'Etkinliğe katılırken bir hata oluştu')
    } finally {
      setIsJoining(false)
    }
  }

  // # YENİ QR SCAN FONKSİYONU - İŞTE BURAYA EKLEDİK!
  const handleQRScan = async (eventCode: string) => {
    try {
      setIsJoining(true)
      
      // # Etkinliği bul
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select('*')
        .eq('event_code', eventCode)
        .eq('status', 'active')
        .single()

      if (eventError || !event) {
        Alert.alert('Hata', 'Etkinlik bulunamadı veya sona ermiş')
        return
      }

      // # Guest mode için sadece görüntüleme
      if (isGuestMode) {
        Alert.alert(
          'Misafir Modu',
          'QR kod ile misafir olarak etkinliği görüntüleyebilirsiniz. Katılım kaydı tutulmaz.',
          [
            { text: 'İptal', style: 'cancel' },
            { 
              text: 'Görüntüle', 
              onPress: () => navigation.navigate('EventDetail', { eventId: event.id })
            }
          ]
        )
        return
      }

      // # Zaten katılmış mı kontrol et
      const { data: existingParticipant } = await supabase
        .from('event_participants')
        .select('id')
        .eq('event_id', event.id)
        .eq('user_id', user!.id)
        .single()

      if (existingParticipant) {
        Alert.alert('Bilgi', 'Bu etkinliğe zaten katıldınız', [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('EventDetail', { eventId: event.id })
          }
        ])
        return
      }

      // # Etkinliğe katıl
      const { error: joinError } = await supabase
        .from('event_participants')
        .insert({
          event_id: event.id,
          user_id: user!.id,
          user_name: user!.display_name,
          role: 'participant',
          can_upload: true,
          can_download: true,
          notification_enabled: true,
        })

      if (joinError) throw joinError

      // # Katılımcı sayısını artır
      await supabase
        .from('events')
        .update({ 
          participant_count: event.participant_count + 1 
        })
        .eq('id', event.id)

      Alert.alert('🎉 Başarılı!', 'QR kod ile etkinliğe katıldınız!', [
        {
          text: 'Etkinliği Gör',
          onPress: () => navigation.navigate('EventDetail', { eventId: event.id })
        }
      ])

      await loadEvents()

    } catch (error) {
      console.error('QR join error:', error)
      Alert.alert('Hata', 'QR kod ile katılım sırasında hata oluştu')
    } finally {
      setIsJoining(false)
    }
  }

  // # Homojen ve Rol/Detay İkonlu Event Card Component
  const EventCard: React.FC<{ event: Event; index: number }> = ({ event, index }) => {
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const isStarted = parseISO(event.start_date) <= new Date();
    const isCompleted = parseISO(event.end_date) <= new Date();
    
    useEffect(() => {
      if (isStarted && !isCompleted) {
        const pulseAnimation = Animated.loop(
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.02,
              duration: 2000,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            }),
          ])
        );
        
        pulseAnimation.start();
        
        return () => {
          pulseAnimation.stop();
        };
      }
    }, [isStarted, isCompleted]);

    return (
      <View style={styles.eventCardContainer}>
        <TouchableOpacity
          onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
          activeOpacity={0.7}
        >
          <Animated.View 
            style={[
              styles.eventCard,
              isStarted && !isCompleted && {
                transform: [{ scale: pulseAnim }],
              }
            ]}
          >
            <View style={styles.emojiContainer}>
              <Text style={styles.emoji}>{getEventTypeEmoji(event.event_type)}</Text>
            </View>
            
            <View style={styles.infoBlock}>
              <Text style={styles.title} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                📅 {formatDate(event.start_date)}
              </Text>
              <Text style={styles.meta} numberOfLines={1}>
                👥 {event.participant_count || 0} katılımcı • {event.creator_id === user?.id ? 'Sahip' : 'Katılımcı'}
              </Text>
            </View>
            
            {/* Devam eden etkinlikler için özel ikon */}
            {isStarted && !isCompleted && (
              <Text style={[styles.activeIcon, { color: '#8B5A3C' }]}>⚡</Text>
            )}
            
            {/* Rol ikonu - Sahip mi katılımcı mı */}
            <Text style={styles.roleIcon}>
              {event.creator_id === user?.id ? '👑' : '🎉'}
            </Text>
            
            <TouchableOpacity
              style={styles.detailIcon}
              onPress={() => navigation.navigate('EventDetail', { eventId: event.id })}
            >
              <Ionicons name="chevron-forward" size={20} color="#8D6E63" />
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </View>
    );
  }

  const getDisplayEvents = () => {
    // Misafir modunda hiçbir etkinlik gösterme
    if (isGuestMode) {
      return []
    }
    
    const now = new Date();
    const allEvents = [...myEvents, ...joinedEvents].filter((event, index, self) => index === self.findIndex(e => e.id === event.id));
    
    console.log('📊 Display events - myEvents:', myEvents.length, 'joinedEvents:', joinedEvents.length, 'allEvents:', allEvents.length);
    
    // Aktif etkinlikler - başlamış olanlar üstte, henüz başlamamış olanlar altta
    const ongoingEvents = allEvents
      .filter(event => isAfter(parseISO(event.end_date), now))
      .sort((a, b) => {
        const now = new Date();
        const aStarted = parseISO(a.start_date) <= now;
        const bStarted = parseISO(b.start_date) <= now;
        
        // Başlamış olanlar üstte
        if (aStarted && !bStarted) return -1;
        if (!aStarted && bStarted) return 1;
        
        // İkisi de başlamışsa veya ikisi de başlamamışsa, başlangıç tarihine göre sırala
        return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
      });
    
    // Tamamlanan etkinlikler - bitiş tarihine göre sırala (yeni biten üstte)
    const completedEvents = allEvents
      .filter(event => !isAfter(parseISO(event.end_date), now))
      .sort((a, b) => parseISO(b.end_date).getTime() - parseISO(a.end_date).getTime());
    
    console.log('📊 Ongoing events:', ongoingEvents.length, 'Completed events:', completedEvents.length);
    
    switch (selectedTab) {
      case 'completed':
        return completedEvents;
      case 'ongoing':
      default:
        return ongoingEvents;
    }
  }

  const getGreeting = () => {
    return '👋 Merhaba'
  }

  const getUserDisplayName = () => {
    if (isGuestMode) {
      return guestName || 'Misafir'
    }
    return user?.display_name?.split(' ')[0] || 'Kullanıcı'
  }

  const getHeaderSubtitle = () => {
    if (isGuestMode) {
      return 'Etkinliklere katılmak için QR kod tarayın veya kod girin'
    }
    return 'Bugün hangi anıları keşfedelim? 🎉'
  }

  // HomeScreen component içinde etkinlikleri iki gruba ayır ve sırala
  const now = new Date();
  const allEvents = [...myEvents, ...joinedEvents].filter((event, index, self) => index === self.findIndex(e => e.id === event.id));
  
  // Aktif etkinlikler - başlamış olanlar üstte, henüz başlamamış olanlar altta
  const ongoingEvents = allEvents
    .filter(event => isAfter(parseISO(event.end_date), now))
    .sort((a, b) => {
      const now = new Date();
      const aStarted = parseISO(a.start_date) <= now;
      const bStarted = parseISO(b.start_date) <= now;
      
      // Başlamış olanlar üstte
      if (aStarted && !bStarted) return -1;
      if (!aStarted && bStarted) return 1;
      
      // İkisi de başlamışsa veya ikisi de başlamamışsa, başlangıç tarihine göre sırala
      return parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime();
    });
  
  // Tamamlanan etkinlikler - bitiş tarihine göre sırala (yeni biten üstte)
  const completedEvents = allEvents
    .filter(event => !isAfter(parseISO(event.end_date), now))
    .sort((a, b) => parseISO(b.end_date).getTime() - parseISO(a.end_date).getTime());
  
  const displayEvents = selectedTab === 'ongoing' ? ongoingEvents : completedEvents;

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* # Join Modal */}
      <Modal
        visible={showJoinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowJoinModal(false)
          setShowCodeInput(false)
          setJoinCode('')
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[COLORS.surface, COLORS.surfaceWarm]}
              style={styles.modalContent}
            >
              {/* Kapatma Butonu */}
              <TouchableOpacity
                style={{ position: 'absolute', top: 12, right: 12, zIndex: 10, padding: 8 }}
                onPress={() => {
                  setShowJoinModal(false)
                  setShowCodeInput(false)
                  setJoinCode('')
                }}
              >
                <Text style={{ fontSize: 22, color: COLORS.textLight }}>✕</Text>
              </TouchableOpacity>
              
              {/* Modal Başlığı */}
              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 }}>
                  Etkinliğe Katıl
                </Text>
                <Text style={{ fontSize: 16, color: COLORS.textMedium, textAlign: 'center' }}>
                  QR kod tarayın veya etkinlik kodunu girin
                </Text>
              </View>

              {/* QR Scanner Button */}
              <TouchableOpacity
                style={styles.qrScannerButton}
                onPress={() => {
                  setShowJoinModal(false)
                  setShowQRScanner(true)
                }}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.qrScannerGradient}
                >
                  <View style={styles.qrIconContainer}>
                    <Text style={{ fontSize: 30, color: 'white' }}>🔍</Text>
                  </View>
                  <View style={styles.scannerText}>
                    <Text style={styles.scannerTitle}>QR Kod Tarayın</Text>
                    <Text style={styles.scannerSubtitle}>
                      Kamerayı açarak QR kodu tarayın
                    </Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>

              {/* Divider */}
              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>veya</Text>
                <View style={styles.dividerLine} />
              </View>

              {/* Kod ile Katılım */}
              {!showCodeInput ? (
                <TouchableOpacity
                  style={[styles.manualEntry, { marginTop: 8 }]}
                  onPress={() => setShowCodeInput(true)}
                >
                  <Text style={[styles.manualEntryText, { fontSize: 16 }]}>📝 Kod ile Katıl</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: '100%' }}>
                  <TextInput
                    style={styles.codeInput}
                    placeholder="Etkinlik kodunu girin"
                    value={joinCode}
                    onChangeText={(text) => {
                      // Sadece harf ve rakamları kabul et, boşluk ve nokta gibi özel karakterleri filtrele
                      const filteredText = text.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
                      setJoinCode(filteredText);
                    }}
                    maxLength={6}
                    autoCapitalize="characters"
                    autoCorrect={false}
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setShowCodeInput(false)
                        setJoinCode('')
                      }}
                    >
                      <Text style={styles.cancelButtonText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.joinButton}
                      onPress={handleJoinEvent}
                      disabled={isJoining}
                    >
                      <LinearGradient
                        colors={['#6366f1', '#8b5cf6']}
                        style={styles.joinButtonGradient}
                      >
                        <Text style={{ color: 'white', textAlign: 'center', fontSize: 14, fontWeight: 'bold' }}>
                          {isJoining ? 'Katılıyor...' : 'Katıl'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* # QR CODE SYSTEM - YENİ EKLENEN! */}
      <QRCodeSystem
        visible={showQRScanner}
        mode="scanner"
        onScan={handleQRScan}
        onClose={() => setShowQRScanner(false)}
      />

      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          {/* # Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.greeting}>
                {getGreeting()}, {getUserDisplayName()}!
              </Text>
              <Text style={styles.headerSubtitle}>
                {getHeaderSubtitle()}
              </Text>
            </View>
            
            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>
                  {isGuestMode ? '👤' : user?.display_name?.charAt(0).toUpperCase()}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* # Content - ScrollView kaldırıldı */}
          {/* # Quick Actions */}
          <View style={styles.quickActions}>
            {/* # Create Event Button - Show for all users */}
            <TouchableOpacity
              style={styles.createEventButton}
              onPress={() => {
                if (isGuestMode) {
                  setShowRegisterModal(true)
                } else {
                  navigation.navigate('CreateEvent')
                }
              }}
            >
              <LinearGradient
                colors={['#FF6B6B', '#FF8E53']}
                style={styles.createEventGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.createButtonContent}>
                  <View style={styles.createButtonIcon}>
                    <Text style={styles.createButtonEmoji}>➕</Text>
                  </View>
                  <View style={styles.createButtonText}>
                    <Text style={styles.createButtonTitle}>Etkinlik Oluştur</Text>
                    <Text style={styles.createButtonSubtitle}>
                      {isGuestMode ? 'Kayıt olarak başlat' : 'Yeni bir anı başlat'}
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* # Join Event Button - QR modalındaki renkli buton stiliyle */}
            <TouchableOpacity
              style={styles.qrScannerButton}
              onPress={() => setShowJoinModal(true)}
            >
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.qrScannerGradient}
              >
                <View style={styles.qrIconContainer}>
                  <Text style={{ fontSize: 30, color: 'white' }}>🎉</Text>
                </View>
                <View style={styles.scannerText}>
                  <Text style={styles.scannerTitle}>
                    Etkinliğe Katıl
                  </Text>
                  <Text style={styles.scannerSubtitle}>
                    QR kod tarat veya kod gir
                  </Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* # Etkinlikler Paneli */}
          <View style={styles.eventsPanel}>
            <Text style={styles.sectionHeader}>Etkinlikler</Text>
            <View style={styles.sectionDivider} />
            <View style={styles.tabButtonRow}>
              <TouchableOpacity
                style={[styles.tabButton, selectedTab === 'ongoing' && styles.tabButtonActive]}
                onPress={() => setSelectedTab('ongoing')}
              >
                <Text style={[styles.tabButtonText, selectedTab === 'ongoing' && styles.tabButtonTextActive]}>Devam Edenler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabButton, selectedTab === 'completed' && styles.tabButtonActive]}
                onPress={() => setSelectedTab('completed')}
              >
                <Text style={[styles.tabButtonText, selectedTab === 'completed' && styles.tabButtonTextActive]}>Tamamlananlar</Text>
              </TouchableOpacity>
            </View>
            {/* Sadece kartlar için scroll */}
            <ScrollView 
              style={{maxHeight: 400}} 
              contentContainerStyle={{paddingBottom: 40}}
              showsVerticalScrollIndicator={false}
            >
              {displayEvents.length === 0 ? (
                <Text style={styles.emptyGroupText}>
                  {selectedTab === 'ongoing' ? 'Şu anda devam eden etkinlik yok.' : 'Henüz tamamlanan etkinlik yok.'}
                </Text>
              ) : (
                displayEvents.map((event, index) => (
                  <EventCard key={event.id} event={event} index={index} />
                ))
              )}
            </ScrollView>
          </View>


        </SafeAreaView>
      </LinearGradient>

      {/* # Register Modal */}
      <RegisterModal
        visible={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSuccess={() => {
          setShowRegisterModal(false)
          // Kayıt başarılı olduğunda CreateEvent'e yönlendir
          navigation.navigate('CreateEvent')
        }}
      />
    </>
  )
}

// # Styles - Mevcut styles aynı kalıyor, sadece yeni QR buton stilleri eklendi
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
  },
  
  // # Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 10 : (StatusBar.currentHeight || 0) + 10,
    paddingBottom: 24,
  },
  
  headerLeft: {
    flex: 1,
  },
  
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 4,
  },
  
  headerSubtitle: {
    fontSize: 16,
    color: '#5D4037',
    fontWeight: '500',
  },
  
  profileButton: {
    marginLeft: 16,
  },
  
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  
  avatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  
  // # Quick Actions
  quickActions: {
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  
  createEventButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
    marginBottom: 12,
  },
  
  createEventGradient: {
    padding: 24,
  },
  
  createButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  
  createButtonIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  createButtonEmoji: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  
  createButtonText: {
    flex: 1,
  },
  
  createButtonTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  createButtonSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  joinEventButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    borderWidth: 3,
    borderColor: '#F4E4BC',
  },
  
  joinButtonContent: {
    alignItems: 'center',
    gap: 4,
  },
  
  joinButtonText: {
    color: 'white',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  joinButtonSubtext: {
    fontSize: 14,
    fontWeight: '500',
    color: '#8D6E63',
    textAlign: 'center',
  },
  
  // # User Events Section - Login kullanıcılar için
  userEventsSection: {
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  
  eventCategory: {
    marginBottom: 24,
  },
  
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  
  categoryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D1810',
  },
  
  categorySubtitle: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '500',
  },
  
  eventsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  
  cardWrapper: {
    width: '100%',
    alignItems: 'stretch',
    marginBottom: 10,
  },
  
  eventCardContainer: {
    position: 'relative',
    marginBottom: 12,
    overflow: 'visible',
  },
  borderContainer: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
    zIndex: 0,
  },
  rotatingBorder: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderStyle: 'solid',
  },
  eventCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  
  emojiContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F4E4BC',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  
  emoji: {
    fontSize: 30,
  },
  
  infoBlock: {
    flex: 1,
    justifyContent: 'center',
  },
  
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D1810',
    marginBottom: 6,
  },
  
  meta: {
    fontSize: 13,
    color: '#5D4037',
    marginBottom: 2,
  },
  
  roleIcon: {
    position: 'absolute',
    top: 10,
    right: 14,
    fontSize: 18,
    color: '#E0B973',
    zIndex: 2,
  },
  activeIcon: {
    position: 'absolute',
    top: 10,
    right: 50,
    fontSize: 18,
    zIndex: 2,
  },
  detailIcon: {
    position: 'absolute',
    bottom: 10,
    right: 14,
    fontSize: 18,
    color: '#8D6E63',
  },
  
  // # Scroll View
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    padding: 16,
    paddingBottom: 150,
  },
  
  // # Empty State
  emptyGroupText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    paddingVertical: 40,
    fontStyle: 'italic',
  },
  
  // # Empty State
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  emptyCard: {
    borderRadius: 24,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // # Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 24, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  modalContainer: {
    margin: 24,
    borderRadius: 32,
    overflow: 'hidden',
    width: '100%',
    maxWidth: 400,
  },
  
  modalContent: {
    padding: 30,
    alignItems: 'center',
  },
  
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 10,
    color: '#2D1810',
  },
  
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 30,
    color: '#5D4037',
  },
  
  // # QR Scanner Button
  qrScannerButton: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    width: '100%',
    marginBottom: 0,
  },
  
  qrScannerGradient: {
    padding: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  
  qrIconContainer: {
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  homeEmoji: {
    fontSize: 30,
    color: 'white',
  },
  
  scannerText: {
    flex: 1,
  },
  
  scannerTitle: {
    color: 'white',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  
  scannerSubtitle: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 14,
  },
  
  // # Manual Entry
  manualEntry: {
    paddingVertical: 8,
    marginBottom: 16,
  },
  
  manualEntryText: {
    color: '#6366f1',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  
  // # Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8DDD4',
  },
  
  dividerText: {
    paddingHorizontal: 12,
    color: '#8D6E63',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // # Code Input
  codeInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 3,
    marginBottom: 16,
    color: '#2D1810',
    borderWidth: 1,
    borderColor: '#E8DDD4',
    width: '100%',
  },
  
  // # Modal Actions
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  
  cancelButton: {
    flex: 1,
    backgroundColor: '#E8DDD4',
    padding: 12,
    borderRadius: 10,
  },
  
  cancelButtonText: {
    color: '#5D4037',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: 'bold',
  },
  
  joinButton: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  
  joinButtonGradient: {
    padding: 12,
  },
  
  // # Guest Mode Styles
  joinEventButtonFull: {
    flex: 1,
  },
  
  // # Etkinlikler Paneli
  eventsPanel: {
    backgroundColor: '#F8F5F0',
    borderRadius: 28,
    shadowColor: '#E0B973',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionHeader: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D1810',
    marginBottom: 4,
    textAlign: 'center',
  },
  sectionDivider: {
    width: 60,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F4E4BC',
    marginBottom: 12,
    alignSelf: 'center',
  },
  tabButtonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  tabButton: {
    flex: 1,
    backgroundColor: '#F4E4BC',
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#E0B973',
    shadowColor: '#E0B973',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  tabButtonText: {
    color: '#8D6E63',
    fontWeight: 'bold',
    fontSize: 15,
  },
  tabButtonTextActive: {
    color: '#2D1810',
    fontWeight: 'bold',
    fontSize: 16,
  },

});

export default HomeScreen;