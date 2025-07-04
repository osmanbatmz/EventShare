import React, { useEffect, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  RefreshControl,
  Dimensions,
  StatusBar,
  Platform,
  Modal,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker'

// # QR System
import QRCodeSystem from '../components/QR/QRCodeSystem'

// # Types
import { RootStackParamList, Event, Media } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Store
import { useAuth, useCurrentEvent, useAppStore } from '../store'

// # Utils
import { formatDateRange, getEventTypeEmoji, formatFileSize } from '../utils'

const { width } = Dimensions.get('window')

type EventDetailScreenNavigationProp = StackNavigationProp<RootStackParamList, 'EventDetail'>
type EventDetailScreenRouteProp = {
  key: string
  name: 'EventDetail'
  params: { eventId: string }
}

const EventDetailScreen: React.FC = () => {
  const navigation = useNavigation<EventDetailScreenNavigationProp>()
  const route = useRoute<EventDetailScreenRouteProp>()
  const { eventId } = route.params
  
  // # State
  const { user } = useAuth()
  const { currentEvent, media, setCurrentEvent, setEventMedia, addMediaToEvent } = useCurrentEvent()
  const { updateEvent, removeEvent } = useAppStore()
  
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadingFiles, setUploadingFiles] = useState<string[]>([])
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)
  const [selectedStartDate, setSelectedStartDate] = useState<Date>(new Date())
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date())

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
    loadEventDetails()
  }, [eventId])

  useEffect(() => {
    if (currentEvent) {
      navigation.setOptions({
        title: currentEvent.title,
        headerStyle: {
          backgroundColor: COLORS.gradientStart,
        },
        headerTintColor: COLORS.textDark,
      })
    }
  }, [currentEvent, navigation])

  const loadEventDetails = async () => {
    try {
      const { data: event, error: eventError } = await supabase
        .from('events')
        .select(`
          *,
          profiles!events_creator_id_fkey(display_name)
        `)
        .eq('id', eventId)
        .single()

      if (eventError) throw eventError

      setCurrentEvent(event as Event)

      // Sadece media tablosundan veri çek
      const { data: eventMedia, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_approved', true)
        .order('uploaded_at', { ascending: false });

      if (mediaError) throw mediaError;

      setEventMedia(eventMedia as Media[])
      
      // Event media count'u güncelle
      if (currentEvent && eventMedia.length !== currentEvent.media_count) {
        await supabase
          .from('events')
          .update({ media_count: eventMedia.length })
          .eq('id', eventId);
      }

    } catch (error) {
      console.error('Load event details error:', error)
      Alert.alert('Hata', 'Etkinlik detayları yüklenirken bir hata oluştu')
    }
  }

  const onRefresh = async () => {
    setRefreshing(true)
    await loadEventDetails()
    setRefreshing(false)
  }

  const handleMediaUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekli')
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false, // Çoklu seçim için false
        quality: 0.8,
        allowsMultipleSelection: true, // Çoklu seçim aktif
        selectionLimit: 10, // Maksimum 10 dosya
      })

      if (result.canceled || !result.assets.length) return

      const assets = result.assets
      setUploading(true)
      setUploadProgress(0)
      setUploadingFiles(assets.map(asset => asset.fileName || 'Bilinmeyen dosya'))

      let successCount = 0
      let errorCount = 0

      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i]
        
        try {
          // Dosya boyutu kontrolü (50MB limit)
          if (asset.fileSize && asset.fileSize > 50 * 1024 * 1024) {
            Alert.alert('Dosya Çok Büyük', `${asset.fileName || 'Dosya'} 50MB'dan büyük olamaz`)
            errorCount++
            continue
          }

          const fileExtension = asset.uri.split('.').pop() || 'jpg'
          const fileName = `${Date.now()}_${i}_${user!.id}.${fileExtension}`
          const filePath = `events/${eventId}/media/${fileName}`

          const response = await fetch(asset.uri)
          const blob = await response.blob()

          const { error: uploadError } = await supabase.storage
            .from('event-media')
            .upload(filePath, blob, {
              contentType: asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
            })

          if (uploadError) throw uploadError

          const { data: urlData } = supabase.storage
            .from('event-media')
            .getPublicUrl(filePath)

          // Media tablosuna insert
          const { data: mediaData, error: mediaError } = await supabase
            .from('media')
            .insert({
              event_id: eventId,
              uploader_id: user!.id,
              uploader_name: user!.display_name,
              file_url: urlData.publicUrl,
              file_name: fileName,
              file_type: asset.type === 'video' ? 'video' : 'image',
              file_size: asset.fileSize || 0,
              width: asset.width,
              height: asset.height,
              is_approved: true,
              is_featured: false,
            })
            .select()
            .single()

          if (mediaError) throw mediaError

          successCount++

          // Progress güncelle
          setUploadProgress(((i + 1) / assets.length) * 100)

        } catch (error) {
          console.error(`Upload error for ${asset.fileName}:`, error)
          errorCount++
        }
      }

                // Event media count güncelle
          if (successCount > 0 && currentEvent) {
            await supabase
              .from('events')
              .update({ 
                media_count: (currentEvent.media_count || 0) + successCount 
              })
              .eq('id', eventId)
          }

      // Medya listesini yeniden yükle
      if (successCount > 0) {
        await loadEventDetails();
      }

      // Sonuç bildirimi
      if (successCount > 0 && errorCount === 0) {
        Alert.alert('Başarılı! 🎉', `${successCount} dosya yüklendi!`)
      } else if (successCount > 0 && errorCount > 0) {
        Alert.alert('Kısmi Başarı', `${successCount} dosya yüklendi, ${errorCount} dosya başarısız`)
      } else if (successCount === 0) {
        Alert.alert('Hata', 'Hiçbir dosya yüklenemedi')
      }

    } catch (error) {
      console.error('Media upload error:', error)
      Alert.alert('Hata', 'Medya yüklenirken bir hata oluştu')
    } finally {
      setUploading(false)
      setUploadProgress(0)
      setUploadingFiles([])
    }
  }

  const shareEventCode = () => {
    // QRCodeSystem generator'ını aç
    setShowQRGenerator(true)
  }

  // # Etkinlik düzenleme fonksiyonları
  const handleEditTitle = async () => {
    Alert.prompt(
      'Etkinlik Adını Düzenle',
      'Yeni etkinlik adını girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (newTitle) => {
            if (!newTitle || newTitle.trim() === '') return
            
            try {
              const { error } = await supabase
                .from('events')
                .update({ title: newTitle.trim() })
                .eq('id', eventId)
              
              if (error) throw error
              
              if (currentEvent) {
                const updatedEvent = { ...currentEvent, title: newTitle.trim() }
                setCurrentEvent(updatedEvent)
                updateEvent(eventId, { title: newTitle.trim() })
                Alert.alert('Başarılı', 'Etkinlik adı güncellendi!')
              }
            } catch (error) {
              console.error('Update title error:', error)
              Alert.alert('Hata', 'Etkinlik adı güncellenirken bir hata oluştu')
            }
          }
        }
      ],
      'plain-text',
      currentEvent?.title || ''
    )
  }

  const handleEditDescription = async () => {
    Alert.prompt(
      'Açıklamayı Düzenle',
      'Yeni açıklamayı girin:',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (newDescription) => {
            try {
              const { error } = await supabase
                .from('events')
                .update({ description: newDescription?.trim() || null })
                .eq('id', eventId)
              
              if (error) throw error
              
              if (currentEvent) {
                const updatedEvent = { ...currentEvent, description: newDescription?.trim() || undefined }
                setCurrentEvent(updatedEvent)
                updateEvent(eventId, { description: newDescription?.trim() || undefined })
                Alert.alert('Başarılı', 'Açıklama güncellendi!')
              }
            } catch (error) {
              console.error('Update description error:', error)
              Alert.alert('Hata', 'Açıklama güncellenirken bir hata oluştu')
            }
          }
        }
      ],
      'plain-text',
      currentEvent?.description || ''
    )
  }

  const handleEditStartDate = async () => {
    if (!currentEvent) return
    
    // Mevcut başlangıç tarihini set et
    setSelectedStartDate(new Date(currentEvent.start_date))
    setShowStartDatePicker(true)
  }

  const handleEditEndDate = async () => {
    if (!currentEvent) return
    
    // Mevcut bitiş tarihini set et
    setSelectedEndDate(new Date(currentEvent.end_date))
    setShowEndDatePicker(true)
  }

  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false)
    }
    
    if (selectedDate) {
      setSelectedStartDate(selectedDate)
      // Eğer bitiş tarihi başlangıçtan önce ise, bitiş tarihini de güncelle
      if (selectedEndDate < selectedDate) {
        setSelectedEndDate(selectedDate)
      }
    }
  }

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false)
    }
    
    if (selectedDate) {
      setSelectedEndDate(selectedDate)
    }
  }

  const confirmStartDate = async () => {
    setShowStartDatePicker(false)
    
    if (selectedStartDate >= selectedEndDate) {
      Alert.alert('Hata', 'Başlangıç tarihi bitiş tarihinden önce olmalıdır!')
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          start_date: selectedStartDate.toISOString()
        })
        .eq('id', eventId)
      
      if (error) throw error
      
      if (currentEvent) {
        const updatedEvent = { 
          ...currentEvent, 
          start_date: selectedStartDate.toISOString()
        }
        setCurrentEvent(updatedEvent)
        updateEvent(eventId, { 
          start_date: selectedStartDate.toISOString()
        })
        Alert.alert('Başarılı', 'Başlangıç tarihi güncellendi!')
      }
    } catch (error) {
      console.error('Update start date error:', error)
      Alert.alert('Hata', 'Başlangıç tarihi güncellenirken bir hata oluştu')
    }
  }

  const confirmEndDate = async () => {
    setShowEndDatePicker(false)
    
    if (selectedEndDate <= selectedStartDate) {
      Alert.alert('Hata', 'Bitiş tarihi başlangıç tarihinden sonra olmalıdır!')
      return
    }

    try {
      const { error } = await supabase
        .from('events')
        .update({ 
          end_date: selectedEndDate.toISOString()
        })
        .eq('id', eventId)
      
      if (error) throw error
      
      if (currentEvent) {
        const updatedEvent = { 
          ...currentEvent, 
          end_date: selectedEndDate.toISOString()
        }
        setCurrentEvent(updatedEvent)
        updateEvent(eventId, { 
          end_date: selectedEndDate.toISOString()
        })
        Alert.alert('Başarılı', 'Bitiş tarihi güncellendi!')
      }
    } catch (error) {
      console.error('Update end date error:', error)
      Alert.alert('Hata', 'Bitiş tarihi güncellenirken bir hata oluştu')
    }
  }

  const handleToggleDownload = async () => {
    try {
      const newValue = !(currentEvent?.allow_download || false)
      const { error } = await supabase
        .from('events')
        .update({ allow_download: newValue })
        .eq('id', eventId)
      
      if (error) throw error
      
      if (currentEvent) {
        const updatedEvent = { ...currentEvent, allow_download: newValue }
        setCurrentEvent(updatedEvent)
        updateEvent(eventId, { allow_download: newValue })
      }
    } catch (error) {
      console.error('Toggle download error:', error)
      Alert.alert('Hata', 'Ayar güncellenirken bir hata oluştu')
    }
  }

  const handleToggleApproval = async () => {
    try {
      const newValue = !(currentEvent?.require_approval || false)
      const { error } = await supabase
        .from('events')
        .update({ require_approval: newValue })
        .eq('id', eventId)
      
      if (error) throw error
      
      if (currentEvent) {
        const updatedEvent = { ...currentEvent, require_approval: newValue }
        setCurrentEvent(updatedEvent)
        updateEvent(eventId, { require_approval: newValue })
      }
    } catch (error) {
      console.error('Toggle approval error:', error)
      Alert.alert('Hata', 'Ayar güncellenirken bir hata oluştu')
    }
  }

  const handleDeleteEvent = async () => {
    Alert.alert(
      '⚠️ Etkinliği Sil',
      'Bu etkinliği silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('events')
                .delete()
                .eq('id', eventId)
              
              if (error) throw error
              
              removeEvent(eventId)
              Alert.alert('Başarılı', 'Etkinlik silindi!')
              navigation.goBack()
            } catch (error) {
              console.error('Delete event error:', error)
              Alert.alert('Hata', 'Etkinlik silinirken bir hata oluştu')
            }
          }
        }
      ]
    )
  }

  // # Modern Media Item Component
  const MediaItem: React.FC<{ item: Media; index: number }> = ({ item, index }) => {
    const itemWidth = (width - 72) / 2 // # 2 columns with gaps

    return (
      <TouchableOpacity
        style={[styles.mediaItem, { width: itemWidth }]}
        onPress={() => setSelectedImageIndex(index)}
      >
        <View style={styles.mediaContainer}>
          {item.file_type === 'image' ? (
            <Image source={{ uri: item.file_url }} style={styles.mediaImage} />
          ) : (
            <View style={styles.videoContainer}>
              <Image 
                source={{ uri: item.thumbnail_url || item.file_url }} 
                style={styles.mediaImage} 
              />
              <View style={styles.playIconContainer}>
                <LinearGradient
                  colors={['rgba(0,0,0,0.6)', 'rgba(0,0,0,0.8)']}
                  style={styles.playIcon}
                >
                  <Text style={styles.playIconText}>▶</Text>
                </LinearGradient>
              </View>
            </View>
          )}
          
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.mediaOverlay}
          >
            <Text style={styles.uploaderName} numberOfLines={1}>
              {item.uploader_name}
            </Text>
            <Text style={styles.fileSize}>
              {formatFileSize(item.file_size)}
            </Text>
          </LinearGradient>
        </View>
      </TouchableOpacity>
    )
  }

  if (!currentEvent) {
    return (
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.container}
      >
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingEmoji}>⏳</Text>
            <Text style={styles.loadingText}>Yükleniyor...</Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    )
  }

  const emoji = getEventTypeEmoji(currentEvent.event_type)

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.safeArea}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor={COLORS.primary}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {/* # MODERN HERO SECTION - HomeScreen tarzı tasarım */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceWarm]}
                style={styles.heroCard}
              >
                {/* # Event Header - Settings butonu pozisyonu düzeltildi */}
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfoContainer}>
                    <View style={styles.emojiContainer}>
                      <Text style={styles.eventEmoji}>{emoji}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.eventTitle}>{currentEvent.title}</Text>
                        {/* # Settings Button - Title yanında */}
                        <TouchableOpacity 
                          style={styles.headerSettingsButton}
                          onPress={() => setShowSettingsModal(true)}
                        >
                          <Text style={styles.headerSettingsIcon}>⚙️</Text>
                        </TouchableOpacity>
                      </View>
                      <Text style={styles.eventDate}>
                        📅 {formatDateRange(currentEvent.start_date, currentEvent.end_date)}
                      </Text>
                      {currentEvent.description && (
                        <Text style={styles.eventDescription}>
                          {currentEvent.description}
                        </Text>
                      )}
                    </View>
                  </View>
                </View>

                {/* # MODERN STATS ROW - Daha şık */}
                <View style={styles.modernStatsRow}>
                  <View style={styles.modernStatItem}>
                    <Text style={styles.statIcon}>👥</Text>
                    <Text style={styles.statNumber}>{currentEvent.participant_count}</Text>
                    <Text style={styles.statLabel}>Katılımcı</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.modernStatItem}>
                    <Text style={styles.statIcon}>📸</Text>
                    <Text style={styles.statNumber}>{currentEvent.media_count}</Text>
                    <Text style={styles.statLabel}>Medya</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.modernStatItem}>
                    <Text style={styles.statIcon}>⏰</Text>
                    <Text style={styles.statNumber}>Aktif</Text>
                    <Text style={styles.statLabel}>Durum</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* # MODERN ACTION CARDS - QR kod odaklı, ayarlar gizli */}
            <View style={styles.modernActionSection}>
              {/* # Ana Upload Button - Büyük ve çarpıcı */}
              <TouchableOpacity
                style={styles.primaryUploadCard}
                onPress={handleMediaUpload}
                disabled={uploading}
              >
                <LinearGradient
                  colors={uploading 
                    ? ['#A67C52', '#8B5A3C'] 
                    : ['#FF6B6B', '#FF8E53']
                  }
                  style={styles.primaryUploadGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.uploadCardContent}>
                    <View style={styles.uploadCardIcon}>
                      <Text style={styles.uploadCardEmoji}>
                        {uploading ? '⏳' : '📸'}
                      </Text>
                    </View>
                    <View style={styles.uploadCardText}>
                      <Text style={styles.uploadCardTitle}>
                        {uploading ? 'Yükleniyor...' : 'Anı Ekle'}
                      </Text>
                      <Text style={styles.uploadCardSubtitle}>
                        {uploading 
                          ? `${uploadingFiles.length} dosya yükleniyor (${Math.round(uploadProgress)}%)`
                          : 'Fotoğraf veya video yükle (Çoklu seçim)'
                        }
                      </Text>
                    </View>
                  </View>
                  
                  {/* Progress Bar */}
                  {uploading && (
                    <View style={styles.uploadProgressContainer}>
                      <View style={styles.uploadProgressBar}>
                        <View 
                          style={[
                            styles.uploadProgressFill, 
                            { width: `${uploadProgress}%` }
                          ]} 
                        />
                      </View>
                      <Text style={styles.uploadProgressText}>
                        {Math.round(uploadProgress)}%
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              {/* # QR Share Card - Tek büyük kart */}
              <TouchableOpacity
                style={styles.qrShareCard}
                onPress={shareEventCode}
              >
                <LinearGradient
                  colors={['#6366f1', '#8b5cf6']}
                  style={styles.qrShareGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <View style={styles.qrShareContent}>
                    <View style={styles.qrShareLeft}>
                      <View style={styles.qrIconContainer}>
                        <Text style={styles.qrIcon}>⬛</Text>
                      </View>
                      <View style={styles.qrTextContainer}>
                        <Text style={styles.qrTitle}>QR Kod ile Davet Et</Text>
                        <Text style={styles.qrSubtitle}>Arkadaşların kolayca katılsın</Text>
                      </View>
                    </View>
                    <View style={styles.qrCodePreview}>
                      <View style={styles.qrCodeBox}>
                        <Text style={styles.qrCodeIcon}>⬜</Text>
                        <Text style={styles.eventCodeInQr}>{currentEvent.event_code}</Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* # Media Section */}
            <View style={styles.mediaSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  📸 Fotoğraflar ve Videolar
                </Text>
                <Text style={styles.sectionCount}>
                  {media.length} medya
                </Text>
              </View>

              {media.length === 0 ? (
                <View style={styles.emptyMedia}>
                  <LinearGradient
                    colors={[COLORS.surface, COLORS.surfaceWarm]}
                    style={styles.emptyCard}
                  >
                    <Text style={styles.emptyIcon}>📸</Text>
                    <Text style={styles.emptyTitle}>Henüz medya yok</Text>
                    <Text style={styles.emptyText}>
                      İlk fotoğraf veya videoyu siz ekleyin!
                    </Text>
                    <TouchableOpacity
                      style={styles.emptyActionButton}
                      onPress={handleMediaUpload}
                      disabled={uploading}
                    >
                      <LinearGradient
                        colors={['#FF6B6B', '#FF8E53']}
                        style={styles.emptyActionGradient}
                      >
                        <Text style={styles.emptyActionText}>
                          📸 İlk Anıyı Ekle
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ) : (
                <View style={styles.mediaGrid}>
                  {media.map((item, index) => (
                    <MediaItem key={item.id} item={item} index={index} />
                  ))}
                </View>
              )}
            </View>
          </ScrollView>

          {/* # QR CODE SYSTEM */}
          <QRCodeSystem
            visible={showQRGenerator}
            mode="generator"
            event={currentEvent}
            onClose={() => setShowQRGenerator(false)}
          />

          {/* # MEDIA VIEWER MODAL - Yeni eklenen! */}
          {selectedImageIndex !== null && media[selectedImageIndex] && (
            <View style={styles.mediaViewerOverlay}>
              <TouchableOpacity
                style={styles.mediaViewerClose}
                onPress={() => setSelectedImageIndex(null)}
              >
                <Text style={styles.mediaViewerCloseIcon}>✕</Text>
              </TouchableOpacity>
              
              <View style={styles.mediaViewerContainer}>
                {media[selectedImageIndex].file_type === 'image' ? (
                  <Image 
                    source={{ uri: media[selectedImageIndex].file_url }} 
                    style={styles.mediaViewerImage}
                    resizeMode="contain"
                  />
                ) : (
                  <View style={styles.mediaViewerVideoContainer}>
                    <Image 
                      source={{ uri: media[selectedImageIndex].file_url }} 
                      style={styles.mediaViewerImage}
                      resizeMode="contain"
                    />
                    <View style={styles.mediaViewerPlayIcon}>
                      <Text style={styles.mediaViewerPlayText}>▶</Text>
                    </View>
                  </View>
                )}
                
                <View style={styles.mediaViewerInfo}>
                  <Text style={styles.mediaViewerTitle}>
                    {media[selectedImageIndex].uploader_name}
                  </Text>
                  <Text style={styles.mediaViewerSubtitle}>
                    {formatFileSize(media[selectedImageIndex].file_size)} • {media[selectedImageIndex].file_type}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {/* # SETTINGS MODAL - Etkinlik ayarlarını düzenleme */}
          {showSettingsModal && (
            <View style={styles.settingsModalOverlay}>
              <View style={styles.settingsModalContainer}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.settingsModalContent}
                >
                  {/* # Close Button */}
                  <TouchableOpacity
                    style={styles.settingsModalClose}
                    onPress={() => setShowSettingsModal(false)}
                  >
                    <Text style={styles.settingsModalCloseIcon}>✕</Text>
                  </TouchableOpacity>

                  {/* # Scrollable Content */}
                  <ScrollView
                    style={styles.settingsScrollView}
                    contentContainerStyle={styles.settingsScrollContent}
                    showsVerticalScrollIndicator={false}
                  >
                    {/* # Settings Header */}
                    <View style={styles.settingsModalHeader}>
                      <Text style={styles.settingsModalTitle}>Etkinlik Ayarları</Text>
                      <Text style={styles.settingsModalSubtitle}>
                        Etkinlik bilgilerini ve ayarlarını düzenleyin
                      </Text>
                    </View>

                    {/* # Event Info Section - Katılım kodu kaldırıldı */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>📝 Etkinlik Bilgileri</Text>
                      
                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleEditTitle}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>🎯</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Etkinlik Adı</Text>
                          <Text style={styles.settingsItemValue}>{currentEvent.title}</Text>
                        </View>
                        <Text style={styles.settingsItemArrow}>›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleEditDescription}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>💭</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Açıklama</Text>
                          <Text style={styles.settingsItemValue} numberOfLines={2}>
                            {currentEvent.description || 'Açıklama eklenmemiş'}
                          </Text>
                        </View>
                        <Text style={styles.settingsItemArrow}>›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleEditStartDate}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>📅</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Başlangıç Tarihi</Text>
                          <Text style={styles.settingsItemValue}>
                            {new Date(currentEvent.start_date).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                        <Text style={styles.settingsItemArrow}>›</Text>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleEditEndDate}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>📅</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Bitiş Tarihi</Text>
                          <Text style={styles.settingsItemValue}>
                            {new Date(currentEvent.end_date).toLocaleDateString('tr-TR')}
                          </Text>
                        </View>
                        <Text style={styles.settingsItemArrow}>›</Text>
                      </TouchableOpacity>
                    </View>

                    {/* # Permissions Section */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>🔐 İzinler ve Güvenlik</Text>
                      
                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleToggleDownload}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>📥</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Medya İndirme</Text>
                          <Text style={styles.settingsItemValue}>
                            {currentEvent.allow_download ? 'İzin veriliyor' : 'İzin verilmiyor'}
                          </Text>
                        </View>
                        <View style={styles.settingsToggle}>
                          <View style={[
                            styles.toggleSwitch, 
                            currentEvent.allow_download && styles.toggleSwitchActive
                          ]}>
                            <View style={[
                              styles.toggleKnob,
                              currentEvent.allow_download && styles.toggleKnobActive
                            ]} />
                          </View>
                        </View>
                      </TouchableOpacity>

                      <TouchableOpacity 
                        style={styles.settingsItem}
                        onPress={handleToggleApproval}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>✅</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsItemTitle}>Medya Onayı</Text>
                          <Text style={styles.settingsItemValue}>
                            {currentEvent.require_approval ? 'Gerekli' : 'Gerekli değil'}
                          </Text>
                        </View>
                        <View style={styles.settingsToggle}>
                          <View style={[
                            styles.toggleSwitch, 
                            currentEvent.require_approval && styles.toggleSwitchActive
                          ]}>
                            <View style={[
                              styles.toggleKnob,
                              currentEvent.require_approval && styles.toggleKnobActive
                            ]} />
                          </View>
                        </View>
                      </TouchableOpacity>
                    </View>

                    {/* # Danger Zone */}
                    <View style={styles.settingsSection}>
                      <Text style={styles.settingsSectionTitle}>⚠️ Tehlikeli Alan</Text>
                      
                      <TouchableOpacity 
                        style={styles.settingsDangerItem}
                        onPress={handleDeleteEvent}
                      >
                        <View style={styles.settingsItemIcon}>
                          <Text style={styles.settingsItemEmoji}>🗑️</Text>
                        </View>
                        <View style={styles.settingsItemContent}>
                          <Text style={styles.settingsDangerTitle}>Etkinliği Sil</Text>
                          <Text style={styles.settingsDangerSubtitle}>Kalıcı olarak sil</Text>
                        </View>
                        <Text style={styles.settingsItemArrow}>›</Text>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                </LinearGradient>
              </View>
            </View>
          )}

          {/* Date Pickers */}
          {showStartDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerModal}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.datePickerContent}
                >
                  <Text style={styles.datePickerTitle}>Başlangıç Tarihi Seç</Text>
                  <DateTimePicker
                    value={selectedStartDate}
                    mode="date"
                    display="spinner"
                    onChange={onStartDateChange}
                    minimumDate={new Date()}
                    locale="tr-TR"
                    style={styles.datePicker}
                  />
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={styles.datePickerCancelButton}
                      onPress={() => setShowStartDatePicker(false)}
                    >
                      <Text style={styles.datePickerCancelText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={confirmStartDate}
                    >
                      <Text style={styles.datePickerConfirmText}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}

          {showEndDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerModal}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.datePickerContent}
                >
                  <Text style={styles.datePickerTitle}>Bitiş Tarihi Seç</Text>
                  <DateTimePicker
                    value={selectedEndDate}
                    mode="date"
                    display="spinner"
                    onChange={onEndDateChange}
                    minimumDate={selectedStartDate}
                    locale="tr-TR"
                    style={styles.datePicker}
                  />
                  <View style={styles.datePickerButtons}>
                    <TouchableOpacity
                      style={styles.datePickerCancelButton}
                      onPress={() => setShowEndDatePicker(false)}
                    >
                      <Text style={styles.datePickerCancelText}>İptal</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.datePickerConfirmButton}
                      onPress={confirmEndDate}
                    >
                      <Text style={styles.datePickerConfirmText}>Tamam</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
        </View>
      </LinearGradient>
    </>
  )
}

// # MODERN STYLES - HomeScreen ile tutarlı
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
  },
  
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  loadingEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5D4037',
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingBottom: 32,
  },
  
  // # MODERN HERO SECTION
  heroSection: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
  },
  
  heroCard: {
    borderRadius: 28, // # Daha büyük radius
    padding: 28,
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  
  eventHeader: {
    marginBottom: 24,
  },
  
  eventInfoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  
  emojiContainer: {
    width: 64,
    height: 64,
    backgroundColor: '#F4E4BC',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  
  eventEmoji: {
    fontSize: 32,
  },
  
  eventInfo: {
    flex: 1,
  },
  
  // # Title Row - Title ve Settings yan yana
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2D1810',
    lineHeight: 28,
    flex: 1, // # Settings button için yer bırak
    paddingRight: 8,
  },
  
  eventDate: {
    fontSize: 15,
    color: '#5D4037',
    fontWeight: '600',
    marginBottom: 8,
  },
  
  eventDescription: {
    fontSize: 14,
    color: '#8D6E63',
    lineHeight: 20,
    fontWeight: '500',
  },
  
  // # Header Settings Button - Title yanında
  headerSettingsButton: {
    width: 32,
    height: 32,
    backgroundColor: 'rgba(139, 90, 60, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 90, 60, 0.2)',
  },
  
  headerSettingsIcon: {
    fontSize: 16,
    opacity: 0.7,
  },
  
  // # MODERN STATS ROW
  modernStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4E4BC',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  
  modernStatItem: {
    flex: 1,
    alignItems: 'center',
  },
  
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#D4C4B0',
    opacity: 0.6,
  },
  
  statIcon: {
    fontSize: 20,
    marginBottom: 6,
  },
  
  statNumber: {
    fontSize: 18,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 2,
  },
  
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#5D4037',
    textAlign: 'center',
  },
  
  // # MODERN ACTION SECTION - HomeScreen tarzı
  modernActionSection: {
    paddingHorizontal: 24,
    marginBottom: 32,
    gap: 16,
  },
  
  // # Primary Upload Card
  primaryUploadCard: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 15,
  },
  
  primaryUploadGradient: {
    padding: 24,
  },
  
  uploadCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  
  uploadCardIcon: {
    width: 64,
    height: 64,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  uploadCardEmoji: {
    fontSize: 32,
    color: '#FFFFFF',
  },
  
  uploadCardText: {
    flex: 1,
  },
  
  uploadCardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  uploadCardSubtitle: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  // # QR Share Card - Yeni gradient renkler
  qrShareCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  
  qrShareGradient: {
    padding: 24,
  },
  
  qrShareContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  
  qrShareLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 16,
  },
  
  qrIconContainer: {
    width: 56,
    height: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  qrIcon: {
    fontSize: 28,
  },
  
  qrTextContainer: {
    flex: 1,
  },
  
  qrTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  
  qrSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  
  qrCodePreview: {
    alignItems: 'center',
  },
  
  qrCodeBox: {
    width: 64,
    height: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  qrCodeIcon: {
    fontSize: 32,
    marginBottom: 2,
  },
  
  eventCodeInQr: {
    fontSize: 8,
    fontWeight: '800',
    color: '#2D1810',
    letterSpacing: 0.5,
  },
  
  // # Media Section
  mediaSection: {
    paddingHorizontal: 24,
  },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1810',
  },
  
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D6E63',
    backgroundColor: '#F4E4BC',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  
  // # Empty State - Daha çarpıcı
  emptyMedia: {
    alignItems: 'center',
  },
  
  emptyCard: {
    borderRadius: 28,
    padding: 40,
    alignItems: 'center',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
    width: '100%',
  },
  
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 8,
  },
  
  emptyText: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  
  emptyActionButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  emptyActionGradient: {
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // # Media Grid - Aynı kalıyor
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  
  mediaItem: {
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
  },
  
  mediaContainer: {
    position: 'relative',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  
  mediaImage: {
    width: '100%',
    height: 140,
    borderRadius: 20,
  },
  
  videoContainer: {
    position: 'relative',
  },
  
  playIconContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -20 }, { translateY: -20 }],
  },
  
  playIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  playIconText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 2,
  },
  
  mediaOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  
  uploaderName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  
  fileSize: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.8,
  },
  
  // # QR MODAL STYLES - Yeni eklenen
  qrModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 24, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  qrModalContainer: {
    margin: 24,
    borderRadius: 32,
    overflow: 'hidden',
    width: width - 48,
    maxHeight: '80%',
  },
  
  qrModalContent: {
    padding: 32,
    alignItems: 'center',
    position: 'relative',
  },
  
  qrModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(139, 90, 60, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  qrModalCloseIcon: {
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: '600',
  },
  
  qrModalHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  
  qrModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  qrModalSubtitle: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  qrCodeDisplay: {
    alignItems: 'center',
    // marginBottom kaldırıldı - action buttons yok artık
  },
  
  qrCodeContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
    marginBottom: 24,
  },
  
  qrCodePlaceholder: {
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  
  qrCodePattern: {
    fontSize: 16,
    letterSpacing: 2,
    color: '#2D1810',
    fontWeight: '900',
  },
  
  qrCodeInfo: {
    alignItems: 'center',
  },
  
  qrCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8D6E63',
    marginBottom: 8,
  },
  
  qrCodeBadge: {
    backgroundColor: '#F4E4BC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: 'center',
    // Tıklanabilir görünüm için shadow eklendi
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  
  qrCodeText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D1810',
    letterSpacing: 4,
    marginBottom: 4,
  },
  
  qrCodeCopyHint: {
    fontSize: 12,
    color: '#8D6E63',
    fontWeight: '500',
    opacity: 0.8,
  },
  
  // # SETTINGS MODAL STYLES - Yeni eklenen
  settingsModalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 24, 16, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  settingsModalContainer: {
    margin: 24,
    borderRadius: 32,
    overflow: 'hidden',
    width: width - 48,
    height: '80%', // # maxHeight yerine height
  },
  
  settingsModalContent: {
    flex: 1,
    position: 'relative',
  },
  
  // # Scrollable Settings Content
  settingsScrollView: {
    flex: 1,
  },
  
  settingsScrollContent: {
    padding: 24,
    paddingTop: 64, // # Close button için daha fazla yer
    paddingBottom: 32, // # Alt boşluk
  },
  
  settingsModalClose: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    backgroundColor: 'rgba(139, 90, 60, 0.1)',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  settingsModalCloseIcon: {
    fontSize: 16,
    color: '#8D6E63',
    fontWeight: '600',
  },
  
  settingsModalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  
  settingsModalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 8,
    textAlign: 'center',
  },
  
  settingsModalSubtitle: {
    fontSize: 16,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 24,
  },
  
  // # Settings Sections
  settingsSection: {
    marginBottom: 24,
  },
  
  settingsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 16,
    marginLeft: 4,
  },
  
  // # Settings Items
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFCFA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F4E4BC',
  },
  
  settingsItemIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#F4E4BC',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  settingsItemEmoji: {
    fontSize: 20,
  },
  
  settingsItemContent: {
    flex: 1,
  },
  
  settingsItemTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  
  settingsItemValue: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '500',
  },
  
  settingsItemArrow: {
    fontSize: 20,
    color: '#D4C4B0',
  },
  
  // # Toggle Switches
  settingsToggle: {
    marginLeft: 8,
  },
  
  toggleSwitch: {
    width: 44,
    height: 24,
    backgroundColor: '#E8DDD4',
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  
  toggleSwitchActive: {
    backgroundColor: '#6A9F58',
  },
  
  toggleKnob: {
    width: 20,
    height: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  
  // # Danger Zone
  settingsDangerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  
  settingsDangerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#C53030',
    marginBottom: 4,
  },
  
  settingsDangerSubtitle: {
    fontSize: 14,
    color: '#E53E3E',
    fontWeight: '500',
  },
  
  // # Date Picker Styles
  datePickerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(45, 24, 16, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  datePickerModal: {
    margin: 24,
    borderRadius: 24,
    overflow: 'hidden',
    width: width - 48,
  },
  
  datePickerContent: {
    padding: 24,
    alignItems: 'center',
  },
  
  datePickerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 20,
  },
  
  datePicker: {
    width: '100%',
    height: 200,
  },
  
  datePickerButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
    width: '100%',
  },
  
  datePickerCancelButton: {
    flex: 1,
    backgroundColor: '#E8DDD4',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  datePickerConfirmButton: {
    flex: 1,
    backgroundColor: '#8B5A3C',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  datePickerCancelText: {
    color: '#5D4037',
    fontSize: 16,
    fontWeight: '600',
  },
  
  datePickerConfirmText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  
  // # Upload Progress Styles
  uploadProgressContainer: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  
  uploadProgressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  
  uploadProgressFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  
  uploadProgressText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  // # MEDIA VIEWER MODAL STYLES
  mediaViewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  
  mediaViewerClose: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  
  mediaViewerCloseIcon: {
    fontSize: 20,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  
  mediaViewerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 20,
  },
  
  mediaViewerImage: {
    width: '100%',
    height: '80%',
    borderRadius: 12,
  },
  
  mediaViewerVideoContainer: {
    position: 'relative',
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  mediaViewerPlayIcon: {
    position: 'absolute',
    width: 80,
    height: 80,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  mediaViewerPlayText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '600',
    marginLeft: 4,
  },
  
  mediaViewerInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 16,
  },
  
  mediaViewerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  
  mediaViewerSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.8,
  },
})

export default EventDetailScreen