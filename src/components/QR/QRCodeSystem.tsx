// src/components/QR/QRCodeSystem.tsx
import React, { useState, useEffect, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  Dimensions,
  Linking,
  Share,
  ScrollView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Camera, CameraView } from 'expo-camera'
import QRCode from 'react-native-qrcode-svg'
import ViewShot from 'react-native-view-shot'
import * as MediaLibrary from 'expo-media-library'

// # Types
import { Event } from '../../types'

// # Store
import { useAuth } from '../../store'

const { width, height } = Dimensions.get('window')

// # Modern Color Palette
const COLORS = {
  primary: '#8B5A3C',
  primaryLight: '#A67C52',
  accent: '#F4E4BC',
  surface: '#FFFFFF',
  textDark: '#2D1810',
  textMedium: '#5D4037',
  textLight: '#8D6E63',
  overlay: 'rgba(45, 24, 16, 0.8)',
}

interface QRCodeSystemProps {
  visible: boolean
  mode: 'scanner' | 'generator'
  event?: Event
  onScan?: (eventCode: string) => void
  onClose: () => void
}

// # QR Scanner Component - expo-camera versiyonu
const QRScanner: React.FC<{
  onScan: (data: string) => void
  onClose: () => void
}> = ({ onScan, onClose }) => {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanned, setScanned] = useState(false)

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync()
      setHasPermission(status === 'granted')
    })()
  }, [])

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScanned(true)
    
    // # Check if it's an EventShare QR code or 6-digit code
    let eventCode = ''
    
    if (data.includes('eventshare://') || data.includes('eventshare.app')) {
      // # Extract from deep link
      const match = data.match(/(?:eventshare:\/\/|eventshare\.app\/)join\/([A-Z0-9]{6})/)
      eventCode = match ? match[1] : ''
    } else if (/^[A-Z0-9]{6}$/.test(data)) {
      // # Direct 6-digit code
      eventCode = data
    }
    
    // # Handle web URLs
    if (data.includes('https://eventshare.app/join/')) {
      const webMatch = data.match(/https:\/\/eventshare\.app\/join\/([A-Z0-9]{6})/i)
      eventCode = webMatch ? webMatch[1].toUpperCase() : ''
    }
    
    if (eventCode) {
      onScan(eventCode)
    } else {
      Alert.alert('Geçersiz QR Kod', 'Bu bir EventShare etkinlik kodu değil', [
        { text: 'Tekrar Dene', onPress: () => setScanned(false) }
      ])
    }
  }

  if (hasPermission === null) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>Kamera izni bekleniyor...</Text>
      </View>
    )
  }

  if (hasPermission === false) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.permissionText}>📷 Kamera İzni Gerekli</Text>
        <Text style={styles.permissionSubtext}>
          QR kod taramak için kamera erişimine izin verin
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>Ayarlara Git</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.scannerContainer}>
      {/* # Header */}
      <View style={styles.scannerHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.scannerTitle}>QR Kod Tarat</Text>
        <View style={styles.placeholder} />
      </View>

      {/* # Camera */}
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{
            barcodeTypes: ["qr"],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
        
        {/* # Scan Frame */}
        <View style={styles.scanFrame}>
          <View style={styles.scanCorner} />
        </View>
        
        {/* # Instructions */}
        <View style={styles.instructionsContainer}>
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.instructionsGradient}
          >
            <Text style={styles.instructionsText}>
              📱 QR kodu çerçeve içine hizalayın
            </Text>
            <Text style={styles.instructionsSubtext}>
              EventShare etkinlik QR kodunu tarayın
            </Text>
          </LinearGradient>
        </View>
      </View>

      {/* # Rescan Button */}
      {scanned && (
        <TouchableOpacity
          style={styles.rescanButton}
          onPress={() => setScanned(false)}
        >
          <Text style={styles.rescanButtonText}>🔄 Tekrar Tarat</Text>
        </TouchableOpacity>
      )}
    </View>
  )
}

// # QR Generator Component  
const QRGenerator: React.FC<{
  event: Event
  onClose: () => void
}> = ({ event, onClose }) => {
  const { user } = useAuth()
  const isOrganizer = event.creator_id === user?.id
  const qrRef = useRef<ViewShot>(null)
  const [saving, setSaving] = useState(false)

  // # Generate QR code data
  const qrData = `https://eventshare.app/join/${event.event_code}`

  const copyEventCode = () => {
    // # Generate web URL for sharing
    const webUrl = `https://eventshare.app/join/${event.event_code}`
    
    Alert.alert(
      '📋 Kod Kopyalandı!',
      `Etkinlik kodu: ${event.event_code}\n\nWeb linki: ${webUrl}\n\nBu kodu veya linki arkadaşlarınızla paylaşabilirsiniz.`,
      [{ text: 'Tamam' }]
    )
  }

  const saveQRCode = async () => {
    try {
      setSaving(true)
      
      // # Request permissions
      const { status } = await MediaLibrary.requestPermissionsAsync()
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'QR kodu kaydetmek için galeri izni gerekli')
        return
      }

      // # Capture QR code as image
      if (qrRef.current?.capture) {
        const uri = await qrRef.current.capture()
        
        // # Save to media library
        await MediaLibrary.saveToLibraryAsync(uri)
        
        Alert.alert(
          '✅ QR Kod Kaydedildi!', 
          'QR kod galerinize kaydedildi. Artık paylaşabilirsiniz!',
          [{ text: 'Tamam' }]
        )
      }
    } catch (error) {
      console.error('Save QR code error:', error)
      Alert.alert('Hata', 'QR kod kaydedilirken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const shareQRCode = async () => {
    try {
      setSaving(true)
      
      // # Capture QR code as image
      if (qrRef.current?.capture) {
        const uri = await qrRef.current.capture()
        
        // # Share the image
        await Share.share({
          url: uri,
          title: `${event.title} - QR Kod`,
          message: `${event.title} etkinliğine katılmak için QR kodu tarayın!`
        })
      }
    } catch (error) {
      console.error('Share QR code error:', error)
      Alert.alert('Hata', 'QR kod paylaşılırken bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  return (
    <View style={styles.generatorContainer}>
      {/* # Header */}
      <View style={styles.generatorHeader}>
        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.generatorTitle}>Etkinlik QR Kodu</Text>
        <View style={styles.placeholder} />
      </View>

      {/* # Scrollable Content */}
      <ScrollView 
        style={styles.generatorScrollView}
        contentContainerStyle={styles.generatorScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* # QR Code Display */}
        <View style={styles.qrCodeContainer}>
          <LinearGradient
            colors={['#FFFFFF', '#F8F8F8']}
            style={styles.qrCodeCard}
          >
            {/* # Real QR Code */}
            <ViewShot ref={qrRef} style={styles.qrCodePlaceholder}>
              <QRCode
                value={qrData}
                size={180}
                color={COLORS.textDark}
                backgroundColor="#FFFFFF"
                logoSize={30}
                logoBackgroundColor="#FFFFFF"
                logoBorderRadius={15}
              />
            </ViewShot>
            
            {/* # Event Code */}
            <TouchableOpacity style={styles.eventCodeContainer} onPress={copyEventCode}>
              <Text style={styles.eventCodeLabel}>Etkinlik Kodu</Text>
              <Text style={styles.eventCodeText}>{event.event_code}</Text>
              <Text style={styles.eventCodeHint}>Tıklayarak kopyala</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* # Action Buttons */}
        <View style={styles.actionButtonsContainer}>
          {/* # Galeriye Kaydet - Sadece organizatör için */}
          {isOrganizer && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={saveQRCode}
              disabled={saving}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryLight]}
                style={styles.actionButtonGradient}
              >
                <Text style={styles.actionButtonText}>
                  {saving ? 'Kaydediliyor...' : 'Galeriye Kaydet'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {/* # Paylaş - Herkes için */}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={shareQRCode}
            disabled={saving}
          >
            <LinearGradient
              colors={[COLORS.primary, COLORS.primaryLight]}
              style={styles.actionButtonGradient}
            >
              <Text style={styles.actionButtonText}>
                {saving ? 'Paylaşılıyor...' : 'Paylaş'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* # Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>Nasıl Kullanılır?</Text>
          {isOrganizer ? (
            <>
              <Text style={styles.instructionItem}>
                • QR kodu galeriye kaydedin veya paylaşın.
              </Text>
              <Text style={styles.instructionItem}>
                • Katılımcılar QR kodu tarayarak katılabilir.
              </Text>
              <Text style={styles.instructionItem}>
                • Etkinlik kodunu manuel olarak da girebilirler.
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.instructionItem}>
                • Bu QR kodu etkinlik sahibi tarafından oluşturuldu.
              </Text>
              <Text style={styles.instructionItem}>
                • Etkinlik kodunu kopyalayarak paylaşabilirsiniz.
              </Text>
              <Text style={styles.instructionItem}>
                • QR kodu tarayarak etkinliğe katılabilirsiniz.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

// # Main Component
const QRCodeSystem: React.FC<QRCodeSystemProps> = ({
  visible,
  mode,
  event,
  onScan,
  onClose
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={[COLORS.surface, '#F8F8F8']}
        style={styles.container}
      >
        {mode === 'scanner' ? (
          <QRScanner
            onScan={(eventCode) => {
              onScan?.(eventCode)
              onClose()
            }}
            onClose={onClose}
          />
        ) : mode === 'generator' && event ? (
          <QRGenerator
            event={event}
            onClose={onClose}
          />
        ) : null}
      </LinearGradient>
    </Modal>
  )
}

// # Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  
  // # Scanner
  scannerContainer: {
    flex: 1,
  },
  
  scannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  
  closeButton: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  closeButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  
  scannerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  
  placeholder: {
    width: 40,
  },
  
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  
  camera: {
    flex: 1,
  },
  
  scanFrame: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 250,
    height: 250,
    marginTop: -125,
    marginLeft: -125,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  
  scanCorner: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    borderWidth: 3,
    borderColor: '#00FF00',
    borderRadius: 25,
    backgroundColor: 'transparent',
  },
  
  instructionsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  
  instructionsGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  
  instructionsText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  
  instructionsSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
  },
  
  rescanButton: {
    position: 'absolute',
    bottom: 140,
    left: '50%',
    marginLeft: -60,
    backgroundColor: COLORS.primary,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  
  rescanButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  
  // # Generator
  generatorContainer: {
    flex: 1,
  },
  
  generatorScrollView: {
    flex: 1,
  },
  
  generatorScrollContent: {
    paddingBottom: 40,
  },
  
  generatorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 20,
  },
  
  generatorTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  
  eventInfoCard: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  eventInfoGradient: {
    padding: 20,
    alignItems: 'center',
  },
  
  eventTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 8,
  },
  
  eventDate: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  
  eventParticipants: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  
  qrCodeContainer: {
    marginHorizontal: 24,
    marginBottom: 32,
    borderRadius: 24,
    overflow: 'hidden',
  },
  
  qrCodeCard: {
    padding: 32,
    alignItems: 'center',
  },
  
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginBottom: 24,
    gap: 8,
    borderWidth: 2,
    borderColor: COLORS.accent,
  },
  
  qrCodePattern: {
    fontSize: 14,
    letterSpacing: 2,
    color: COLORS.textDark,
    fontWeight: '900',
  },
  
  eventCodeContainer: {
    alignItems: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  
  eventCodeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMedium,
    marginBottom: 4,
  },
  
  eventCodeText: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.textDark,
    letterSpacing: 4,
    marginBottom: 4,
  },
  
  eventCodeHint: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  
  instructionsCard: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(139, 90, 60, 0.1)',
    borderRadius: 16,
    padding: 20,
  },
  
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textDark,
    marginBottom: 12,
  },
  
  instructionItem: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textMedium,
    lineHeight: 20,
    marginBottom: 4,
  },
  
  // # Permission
  permissionText: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textDark,
    textAlign: 'center',
    marginBottom: 16,
  },
  
  permissionSubtext: {
    fontSize: 16,
    color: COLORS.textMedium,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  
  permissionButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingHorizontal: 32,
    paddingVertical: 16,
  },
  
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  
  // # Action Buttons
  actionButtonsContainer: {
    marginHorizontal: 24,
    marginBottom: 24,
    gap: 12,
  },
  
  actionButton: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  actionButtonGradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
})

export default QRCodeSystem
