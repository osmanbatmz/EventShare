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
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useRoute, useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import * as ImagePicker from 'expo-image-picker'
import * as FileSystem from 'expo-file-system'

// # QR System
import QRCodeSystem from '../components/QR/QRCodeSystem'

// # Typesr
import { RootStackParamList, Event, Media } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Store
import { useAuth, useCurrentEvent } from '../store'

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
  const { currentEvent, setCurrentEvent, addMediaToEvent } = useCurrentEvent()
  const [media, setEventMedia] = useState<Media[]>([])
  
  const [refreshing, setRefreshing] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)
  const [showQRModal, setShowQRModal] = useState(false)
  const [showQRGenerator, setShowQRGenerator] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

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

  useEffect(() => {
    console.log('🟢 EventDetailScreen component rendered!');
  }, []);

  const loadEventDetails = async () => {
    console.log('🔄 loadEventDetails started for eventId:', eventId);
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

      console.log('✅ Event loaded:', event?.title);
      setCurrentEvent(event as Event)

      // Sadece media tablosundan veri çek
      console.log('🔄 Loading media for eventId:', eventId);
      const { data: eventMedia, error: mediaError } = await supabase
        .from('media')
        .select('*')
        .eq('event_id', eventId)
        .eq('is_approved', true)
        .order('uploaded_at', { ascending: false });

      if (mediaError) throw mediaError;

      console.log('✅ Media loaded:', eventMedia?.length, 'items');
      console.log('📋 Media items:', eventMedia?.map(m => ({ id: m.id, file_name: m.file_name, file_url: m.file_url })));
      
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
    console.log('🟢 handleMediaUpload called');
    try {
      // Debug: Check authentication status
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      console.log('🔐 Current session:', currentSession);
      console.log('👤 Current user from store:', user);
      
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🟢 Permission check result:', status);
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Fotoğraf seçmek için galeri izni gerekli');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsEditing: false,
        quality: 1.0,
        allowsMultipleSelection: false,
      });
      console.log('🟢 Image picker result:', result);

      if (result.canceled || !result.assets[0]) {
        console.log('🟡 Image picker canceled or no asset selected');
        return;
      }

      const asset = result.assets[0];
      setUploading(true);
      console.log('🟢 Asset selected:', asset);
      console.log('📏 Asset size:', asset.fileSize, 'bytes');
      console.log('🖼️ Asset dimensions:', asset.width, 'x', asset.height);

      const fileExtension = asset.uri.split('.').pop();
      const fileName = `${Date.now()}_${user!.id}.${fileExtension}`;
      const filePath = `events/${eventId}/media/${fileName}`;
      console.log('🟢 fileName:', fileName, 'filePath:', filePath);

      // Debug: Check if URI is accessible
      console.log('🔗 Asset URI:', asset.uri);
      
      // Method: Use fetch with base64 data directly
      console.log('📤 Using fetch with base64 data...');
      
      // Read file as base64
      const base64Data = await FileSystem.readAsStringAsync(asset.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('📏 Base64 data length:', base64Data.length);
      
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      console.log('🔐 Upload session check:', !!session);
      
      if (!session) {
        throw new Error('Oturum bulunamadı');
      }

      // Create upload URL
      const uploadUrl = `https://gzerwprcilncitovrdwp.supabase.co/storage/v1/object/event-media/${filePath}`;
      
      // Convert base64 to binary data
      const binaryString = atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // Upload using fetch with binary data
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZXJ3cHJjaWxuY2l0b3ZyZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTAzOTQsImV4cCI6MjA2NjQ2NjM5NH0.FuMaXd7uRevAn5Wxoqw06pgea0z9HlxehQirxktoBV8',
          'Content-Type': asset.type === 'video' ? 'video/mp4' : 'image/jpeg',
          'Content-Length': bytes.length.toString()
        },
        body: bytes
      });

      console.log('📤 Fetch upload result:', {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${response.status} - ${errorText}`);
      }

      // Test: Immediately check if file was uploaded correctly
      const { data: testDownload, error: testError } = await supabase.storage
        .from('event-media')
        .download(filePath);
      
      console.log('🧪 Post-upload test:', {
        success: !!testDownload,
        size: testDownload?.size || 0,
        error: testError
      });

      const { data: urlData } = supabase.storage
        .from('event-media')
        .getPublicUrl(filePath);
      console.log('🟢 Public URL:', urlData);

      const mediaInsertData = {
        event_id: eventId,
        uploader_id: user!.id,
        uploader_name: user!.display_name,
        file_url: urlData.publicUrl,
        file_name: fileName,
        file_type: asset.type === 'video' ? 'video' : 'image',
        file_size: asset.fileSize || bytes.length,
        width: asset.width,
        height: asset.height,
        is_approved: true,
        is_featured: false,
      };
      console.log('🔍 Media insert data:', JSON.stringify(mediaInsertData, null, 2));

      const { data: mediaData, error: mediaError } = await supabase
        .from('media')
        .insert(mediaInsertData)
        .select()
        .single();
      console.log('📤 Supabase insert response:', mediaData, mediaError);

      if (mediaError) {
        console.error('❌ Media insert error:', mediaError);
        Alert.alert('Hata', JSON.stringify(mediaError));
        throw mediaError;
      }

      console.log('✅ Media inserted successfully:', mediaData);
      console.log('🔄 Starting loadEventDetails...');

      // Medya listesini yeniden yükle
      await loadEventDetails();
      
      console.log('✅ loadEventDetails completed');
      console.log('📊 Current media count:', media.length);
      
      Alert.alert('Başarılı! 🎉', 'Medya başarıyla yüklendi!');
    } catch (error) {
      console.error('❌ handleMediaUpload error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
      Alert.alert('Hata', 'Medya yüklenirken bir hata oluştu: ' + errorMessage);
    } finally {
      setUploading(false);
    }
  };





  // # YENİ: QR kod işlemleri
  const shareEventCode = () => {
    // # Organizatör ise QR Generator göster, değilse manuel kod
    if (currentEvent?.creator_id === user?.id) {
      setShowQRGenerator(true)
    } else {
      setShowQRModal(true)
    }
  }

  // # Modern Media Item Component
  const MediaItem: React.FC<{ item: Media; index: number }> = ({ item, index }) => {
    const itemWidth = (width - 72) / 2 // # 2 columns with gaps

    return (
      <TouchableOpacity
        style={[styles.mediaItem, { width: itemWidth }]}
        onPress={() => {
          console.log('🖱️ Media item pressed:', { index, item: { id: item.id, file_name: item.file_name, file_url: item.file_url } });
          console.log('🎬 Setting selectedImageIndex to:', index);
          setSelectedImageIndex(index);
        }}
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
  const isOrganizer = currentEvent.creator_id === user?.id

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      
      {/* # QR GENERATOR MODAL - YENİ EKLENEN! */}
      <QRCodeSystem
        visible={showQRGenerator}
        mode="generator"
        event={currentEvent}
        onClose={() => setShowQRGenerator(false)}
      />

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
            {/* # MODERN HERO SECTION */}
            <View style={styles.heroSection}>
              <LinearGradient
                colors={[COLORS.surface, COLORS.surfaceWarm]}
                style={styles.heroCard}
              >
                {/* # Event Header */}
                <View style={styles.eventHeader}>
                  <View style={styles.eventInfoContainer}>
                    <View style={styles.emojiContainer}>
                      <Text style={styles.eventEmoji}>{emoji}</Text>
                    </View>
                    <View style={styles.eventInfo}>
                      <View style={styles.titleRow}>
                        <Text style={styles.eventTitle}>{currentEvent.title}</Text>
                        {/* # Settings Button - Sadece organizatör için */}
                        {isOrganizer && (
                          <TouchableOpacity 
                            style={styles.headerSettingsButton}
                            onPress={() => setShowSettingsModal(true)}
                          >
                            <Text style={styles.headerSettingsIcon}>⚙️</Text>
                          </TouchableOpacity>
                        )}
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

                {/* # MODERN STATS ROW */}
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

            {/* # MODERN ACTION CARDS */}
            <View style={styles.modernActionSection}>
              {/* # Ana Upload Button */}
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
                        {uploading ? 'Lütfen bekleyin' : 'Fotoğraf veya video yükle'}
                      </Text>
                    </View>
                  </View>
                </LinearGradient>
              </TouchableOpacity>



              {/* # QR Share Card - Artık gerçek QR generator */}
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
                        <Text style={styles.qrTitle}>
                          {isOrganizer ? 'QR Kod Oluştur' : 'Etkinlik Kodu'}
                        </Text>
                        <Text style={styles.qrSubtitle}>
                          {isOrganizer ? 'Paylaş ve davet et' : 'Kodu görüntüle'}
                        </Text>
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

          {/* # MANUEL QR CODE MODAL - Katılımcılar için */}
          {showQRModal && (
            <View style={styles.qrModalOverlay}>
              <View style={styles.qrModalContainer}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.qrModalContent}
                >
                  {/* # Close Button */}
                  <TouchableOpacity
                    style={styles.qrModalClose}
                    onPress={() => setShowQRModal(false)}
                  >
                    <Text style={styles.qrModalCloseIcon}>✕</Text>
                  </TouchableOpacity>

                  {/* # QR Header */}
                  <View style={styles.qrModalHeader}>
                    <Text style={styles.qrModalTitle}>Etkinlik Kodu</Text>
                    <Text style={styles.qrModalSubtitle}>
                      Bu kodu arkadaşlarınızla paylaşabilirsiniz
                    </Text>
                  </View>

                  {/* # Event Code Display */}
                  <View style={styles.qrCodeDisplay}>
                    {/* # Event Code */}
                    <View style={styles.qrCodeInfo}>
                      <Text style={styles.qrCodeLabel}>Etkinlik Kodu</Text>
                      <TouchableOpacity
                        style={styles.qrCodeBadge}
                        onPress={() => {
                          Alert.alert('✅ Kopyalandı!', 'Etkinlik kodu panoya kopyalandı')
                        }}
                      >
                        <Text style={styles.qrCodeText}>{currentEvent.event_code}</Text>
                        <Text style={styles.qrCodeCopyHint}>Tıklayarak kopyala</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </View>
          )}
          
          {/* # MEDIA VIEWER MODAL */}
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
                    source={{ 
                      uri: media[selectedImageIndex].file_url,
                      headers: {
                        'Cache-Control': 'no-cache',
                        'Pragma': 'no-cache'
                      }
                    }} 
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
          
          {/* # SETTINGS MODAL - Organizatör için */}
          {showSettingsModal && isOrganizer && (
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

                  {/* # Settings Header */}
                  <View style={styles.settingsModalHeader}>
                    <Text style={styles.settingsModalTitle}>Etkinlik Ayarları</Text>
                    <Text style={styles.settingsModalSubtitle}>
                      Etkinlik bilgilerini ve ayarlarını düzenleyin
                    </Text>
                  </View>

                  {/* # Quick Actions for Organizer */}
                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>🎯 Hızlı İşlemler</Text>
                    
                    <TouchableOpacity 
                      style={styles.settingsItem}
                      onPress={() => {
                        setShowSettingsModal(false)
                        setShowQRGenerator(true)
                      }}
                    >
                      <View style={styles.settingsItemIcon}>
                        <Text style={styles.settingsItemEmoji}>📱</Text>
                      </View>
                      <View style={styles.settingsItemContent}>
                        <Text style={styles.settingsItemTitle}>QR Kod Oluştur</Text>
                        <Text style={styles.settingsItemValue}>Davetiye için QR kod</Text>
                      </View>
                      <Text style={styles.settingsItemArrow}>›</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.settingsItem}
                      onPress={() => Alert.alert('Yakında', 'Katılımcı yönetimi yakında')}
                    >
                      <View style={styles.settingsItemIcon}>
                        <Text style={styles.settingsItemEmoji}>👥</Text>
                      </View>
                      <View style={styles.settingsItemContent}>
                        <Text style={styles.settingsItemTitle}>Katılımcı Yönetimi</Text>
                        <Text style={styles.settingsItemValue}>{currentEvent.participant_count} aktif üye</Text>
                      </View>
                      <Text style={styles.settingsItemArrow}>›</Text>
                    </TouchableOpacity>
                  </View>

                  {/* # Event Info Section */}
                  <View style={styles.settingsSection}>
                    <Text style={styles.settingsSectionTitle}>📝 Etkinlik Bilgileri</Text>
                    
                    <TouchableOpacity 
                      style={styles.settingsItem}
                      onPress={() => Alert.alert('Yakında', 'Etkinlik adı düzenleme yakında')}
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
                      onPress={() => Alert.alert('Yakında', 'Tarih düzenleme yakında')}
                    >
                      <View style={styles.settingsItemIcon}>
                        <Text style={styles.settingsItemEmoji}>📅</Text>
                      </View>
                      <View style={styles.settingsItemContent}>
                        <Text style={styles.settingsItemTitle}>Tarih</Text>
                        <Text style={styles.settingsItemValue}>
                          {formatDateRange(currentEvent.start_date, currentEvent.end_date)}
                        </Text>
                      </View>
                      <Text style={styles.settingsItemArrow}>›</Text>
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

// # Styles (aynı kalıyor, sadece yeni modal stilleri eklendi)
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
    borderRadius: 28,
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
    flex: 1,
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
  
  // # MODERN ACTION SECTION
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
  
  // # QR Share Card
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
  
  // # QR MODAL STYLES
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
  
  // # SETTINGS MODAL STYLES
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
    height: '80%',
  },
  
  settingsModalContent: {
    flex: 1,
    position: 'relative',
    padding: 24,
    paddingTop: 64,
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