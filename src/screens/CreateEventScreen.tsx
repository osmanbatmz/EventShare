import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Dimensions,
} from 'react-native'
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'

// # Types
import { RootStackParamList, EventType } from '../types'

// # Services
import { supabase } from '../services/supabase'

// # Store
import { useAuth, useAppStore } from '../store'

// # Constants
import { EVENT_TYPE_LABELS, EVENT_THEME_COLORS } from '../constants'

// # Utils
import { generateEventCode, validateEventTitle, getEventTypeEmoji } from '../utils'

const { width } = Dimensions.get('window')

type CreateEventScreenNavigationProp = StackNavigationProp<RootStackParamList, 'CreateEvent'>

const CreateEventScreen: React.FC = () => {
  const navigation = useNavigation<CreateEventScreenNavigationProp>()
  const { user } = useAuth()
  const { addEvent } = useAppStore()

  // # Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [eventType, setEventType] = useState<EventType>('other')
  const [startDate, setStartDate] = useState(new Date())
  const [endDate, setEndDate] = useState(new Date())
  const [isCreating, setIsCreating] = useState(false)
  const [showEventTypes, setShowEventTypes] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [showEndDatePicker, setShowEndDatePicker] = useState(false)

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

  const validateForm = (): string | null => {
    const titleError = validateEventTitle(title)
    if (titleError) return titleError

    if (endDate < startDate) return 'Bitiş tarihi başlangıçtan sonra olmalı'

    return null
  }

  const handleCreateEvent = async () => {
    try {
      const validationError = validateForm()
      if (validationError) {
        Alert.alert('Doğrulama Hatası', validationError)
        return
      }

      setIsCreating(true)

      let eventCode = generateEventCode()
      
      let codeExists = true
      let attempts = 0
      
      while (codeExists && attempts < 10) {
        const { data: existingEvent } = await supabase
          .from('events')
          .select('id')
          .eq('event_code', eventCode)
          .single()
        
        if (!existingEvent) {
          codeExists = false
        } else {
          eventCode = generateEventCode()
          attempts++
        }
      }

      if (attempts >= 10) {
        throw new Error('Unique event code oluşturulamadı')
      }

      const { data: newEvent, error: createError } = await supabase
        .from('events')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          event_code: eventCode,
          event_type: eventType,
          creator_id: user!.id,
          start_date: startDate.toISOString().split('T')[0], // # YYYY-MM-DD format
          end_date: endDate.toISOString().split('T')[0],
          status: 'active',
          theme_color: EVENT_THEME_COLORS[eventType],
          participant_count: 1,
          media_count: 0,
          allow_download: true,
          require_approval: false,
          max_file_size_mb: 50,
        })
        .select()
        .single()

      if (createError) throw createError

      const { error: participantError } = await supabase
        .from('event_participants')
        .insert({
          event_id: newEvent.id,
          user_id: user!.id,
          user_name: user!.display_name,
          role: 'creator',
          can_upload: true,
          can_download: true,
          notification_enabled: true,
        })

      if (participantError) throw participantError

      await supabase
        .from('profiles')
        .update({ 
          total_events_created: (user!.total_events_created || 0) + 1 
        })
        .eq('id', user!.id)

      console.log('🎉 Event created:', newEvent)
      addEvent(newEvent as any)

      Alert.alert(
        '🎉 Başarılı!',
        `Etkinlik oluşturuldu!\n\n🎫 Etkinlik kodu: ${eventCode}\n\nBu kodu arkadaşlarınızla paylaşın.`,
        [
          {
            text: 'Etkinliği Gör',
            onPress: () => {
              console.log('🚀 Navigating to event:', newEvent.id)
              navigation.goBack()
              // HomeScreen'e döndükten sonra event listesini yenile
              setTimeout(() => {
                navigation.navigate('EventDetail', { eventId: newEvent.id })
              }, 100)
            }
          }
        ]
      )

    } catch (error) {
      console.error('Create event error:', error)
      Alert.alert('Hata', 'Etkinlik oluşturulurken bir hata oluştu')
    } finally {
      setIsCreating(false)
    }
  }

  // # Tarih seçici handler'ları
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowStartDatePicker(false)
    }
    
    if (selectedDate) {
      setStartDate(selectedDate)
      // # Eğer bitiş tarihi başlangıçtan önce ise, bitiş tarihini de güncelle
      if (endDate < selectedDate) {
        setEndDate(selectedDate)
      }
    }
  }

  const onEndDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowEndDatePicker(false)
    }
    
    if (selectedDate) {
      setEndDate(selectedDate)
    }
  }

  const confirmStartDate = () => {
    setShowStartDatePicker(false)
  }

  const confirmEndDate = () => {
    setShowEndDatePicker(false)
  }

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  // # Event Type Selector Component
  const EventTypeSelector: React.FC = () => (
    <View style={styles.eventTypeContainer}>
      <Text style={styles.fieldLabel}>Etkinlik Türü</Text>
      
      <TouchableOpacity
        style={styles.eventTypeButton}
        onPress={() => setShowEventTypes(!showEventTypes)}
      >
        <View style={styles.eventTypeButtonContent}>
          <Text style={styles.eventTypeEmoji}>
            {getEventTypeEmoji(eventType)}
          </Text>
          <Text style={styles.eventTypeText}>
            {EVENT_TYPE_LABELS[eventType]}
          </Text>
          <Text style={styles.dropdownArrow}>
            {showEventTypes ? '🔼' : '🔽'}
          </Text>
        </View>
      </TouchableOpacity>

      {showEventTypes && (
        <View style={styles.eventTypeDropdown}>
          {(Object.keys(EVENT_TYPE_LABELS) as EventType[]).map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.eventTypeOption,
                type === eventType && styles.selectedEventType
              ]}
              onPress={() => {
                setEventType(type)
                setShowEventTypes(false)
              }}
            >
              <Text style={styles.eventTypeEmoji}>
                {getEventTypeEmoji(type)}
              </Text>
              <Text style={[
                styles.eventTypeOptionText,
                type === eventType && styles.selectedEventTypeText
              ]}>
                {EVENT_TYPE_LABELS[type]}
              </Text>
              {type === eventType && (
                <Text style={styles.checkIcon}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  )

  return (
    <>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={styles.container}
      >
        <View style={styles.safeArea}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <ScrollView 
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* # Header */}
              <View style={styles.header}>
                <View style={styles.headerIcon}>
                  <Text style={styles.headerEmoji}>✨</Text>
                </View>
                <Text style={styles.title}>Yeni Etkinlik Oluştur</Text>
                <Text style={styles.subtitle}>
                  Arkadaşlarınızla anılarınızı paylaşmaya hazır mısınız?
                </Text>
              </View>

              {/* # Form Card */}
              <View style={styles.formCard}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.formContent}
                >
                  {/* # Event Title */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Etkinlik Adı</Text>
                    <View style={styles.inputContainer}>
                      <Text style={styles.inputIcon}>🎯</Text>
                      <TextInput
                        style={styles.input}
                        value={title}
                        onChangeText={setTitle}
                        placeholder="Örn: Ahmet & Ayşe'nin Düğünü"
                        placeholderTextColor={COLORS.textLight}
                        maxLength={100}
                        autoCapitalize="words"
                        autoCorrect={false}
                      />
                    </View>
                    <Text style={styles.characterCount}>
                      {title.length}/100
                    </Text>
                  </View>

                  {/* # Event Type */}
                  <EventTypeSelector />

                  {/* # Description */}
                  <View style={styles.fieldContainer}>
                    <Text style={styles.fieldLabel}>Açıklama (İsteğe bağlı)</Text>
                    <View style={[styles.inputContainer, styles.textAreaContainer]}>
                      <Text style={styles.inputIcon}>💭</Text>
                      <TextInput
                        style={[styles.input, styles.textArea]}
                        value={description}
                        onChangeText={setDescription}
                        placeholder="Etkinlik hakkında kısa bilgi..."
                        placeholderTextColor={COLORS.textLight}
                        multiline
                        numberOfLines={3}
                        maxLength={500}
                        textAlignVertical="top"
                      />
                    </View>
                    <Text style={styles.characterCount}>
                      {description.length}/500
                    </Text>
                  </View>

                  {/* # Date Fields */}
                  <View style={styles.dateRow}>
                    <View style={styles.dateField}>
                      <Text style={styles.fieldLabel}>Başlangıç</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Text style={styles.inputIcon}>📅</Text>
                        <Text style={styles.dateButtonText}>
                          {formatDateDisplay(startDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.dateField}>
                      <Text style={styles.fieldLabel}>Bitiş</Text>
                      <TouchableOpacity
                        style={styles.dateButton}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Text style={styles.inputIcon}>🏁</Text>
                        <Text style={styles.dateButtonText}>
                          {formatDateDisplay(endDate)}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* # Info Box */}
                  <View style={styles.infoBox}>
                    <LinearGradient
                      colors={[COLORS.accent, '#F9F1E0']}
                      style={styles.infoContent}
                    >
                      <Text style={styles.infoIcon}>💡</Text>
                      <View style={styles.infoText}>
                        <Text style={styles.infoTitle}>Bilmeniz Gerekenler</Text>
                        <Text style={styles.infoItem}>
                          • Etkinlik oluşturduktan sonra 6 haneli bir kod alacaksınız
                        </Text>
                        <Text style={styles.infoItem}>
                          • Bu kodu arkadaşlarınızla paylaşarak onları davet edebilirsiniz
                        </Text>
                        <Text style={styles.infoItem}>
                          • Herkes fotoğraf/video yükleyebilir ve indirebilir
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>

                  {/* # Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[styles.createButton, (isCreating || !title.trim()) && styles.createButtonDisabled]}
                      onPress={handleCreateEvent}
                      disabled={isCreating || !title.trim()}
                    >
                      <LinearGradient
                        colors={(isCreating || !title.trim())
                          ? [COLORS.textLight, COLORS.textLight]
                          : [COLORS.primary, COLORS.primaryLight]
                        }
                        style={styles.createButtonGradient}
                      >
                        <Text style={styles.createButtonIcon}>
                          {isCreating ? '⏳' : '🚀'}
                        </Text>
                        <Text style={styles.createButtonText}>
                          {isCreating ? 'Oluşturuluyor...' : 'Etkinlik Oluştur'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => navigation.goBack()}
                    >
                      <Text style={styles.cancelButtonText}>❌ İptal</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>

          {/* # Date Pickers */}
          {showStartDatePicker && (
            <View style={styles.datePickerContainer}>
              <View style={styles.datePickerModal}>
                <LinearGradient
                  colors={[COLORS.surface, COLORS.surfaceWarm]}
                  style={styles.datePickerContent}
                >
                  <Text style={styles.datePickerTitle}>Başlangıç Tarihi Seç</Text>
                  <DateTimePicker
                    value={startDate}
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
                    value={endDate}
                    mode="date"
                    display="spinner"
                    onChange={onEndDateChange}
                    minimumDate={startDate}
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

// # Modern Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  safeArea: {
    flex: 1,
  },
  
  keyboardView: {
    flex: 1,
  },
  
  scrollView: {
    flex: 1,
  },
  
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16, // # Navigation header'dan sonra az boşluk
    paddingBottom: 40,
  },
  
  // # Header
  header: {
    alignItems: 'center',
    paddingTop: 8, // # Sayfanın en tepesinden sadece 8px
    paddingBottom: 16,
    marginBottom: 8, // # Form ile minimal boşluk
  },
  
  headerIcon: {
    width: 48, // # Daha da küçük
    height: 48,
    backgroundColor: '#F4E4BC',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8, // # Minimal margin
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  
  headerEmoji: {
    fontSize: 24, // # Küçük emoji
  },
  
  title: {
    fontSize: 22, // # Compact title
    fontWeight: '800',
    color: '#2D1810',
    marginBottom: 2, // # Minimal margin
    textAlign: 'center',
  },
  
  subtitle: {
    fontSize: 13, // # Küçük subtitle
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: 20,
    fontWeight: '500',
  },
  
  // # Form Card
  formCard: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  
  formContent: {
    padding: 32,
    gap: 24,
  },
  
  // # Form Fields
  fieldContainer: {
    gap: 8,
  },
  
  fieldLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginLeft: 4,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4E4BC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingVertical: 16,
  },
  
  inputIcon: {
    fontSize: 20,
  },
  
  input: {
    flex: 1,
    fontSize: 16,
    color: '#2D1810',
    fontWeight: '600',
  },
  
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  
  characterCount: {
    fontSize: 12,
    color: '#8D6E63',
    textAlign: 'right',
    fontWeight: '500',
  },
  
  // # Date Fields
  dateRow: {
    flexDirection: 'row',
    gap: 16,
  },
  
  dateField: {
    flex: 1,
    gap: 8,
  },
  
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4E4BC',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  
  // # Event Type Selector
  eventTypeContainer: {
    gap: 8,
  },
  
  eventTypeButton: {
    backgroundColor: '#F4E4BC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  
  eventTypeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    gap: 12,
  },
  
  eventTypeEmoji: {
    fontSize: 20,
  },
  
  eventTypeText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  
  dropdownArrow: {
    fontSize: 16,
  },
  
  eventTypeDropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5A3C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  eventTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F4E4BC',
  },
  
  selectedEventType: {
    backgroundColor: '#F4E4BC',
  },
  
  eventTypeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D1810',
  },
  
  selectedEventTypeText: {
    fontWeight: '700',
  },
  
  checkIcon: {
    fontSize: 16,
    color: '#6A9F58',
    fontWeight: '700',
  },
  
  // # Info Box
  infoBox: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  infoContent: {
    flexDirection: 'row',
    padding: 20,
    gap: 16,
  },
  
  infoIcon: {
    fontSize: 24,
  },
  
  infoText: {
    flex: 1,
    gap: 8,
  },
  
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1810',
    marginBottom: 4,
  },
  
  infoItem: {
    fontSize: 14,
    color: '#5D4037',
    lineHeight: 20,
    fontWeight: '500',
  },
  
  // # Action Buttons
  actionButtons: {
    gap: 16,
    marginTop: 8,
  },
  
  createButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  
  createButtonDisabled: {
    opacity: 0.5,
  },
  
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  
  createButtonIcon: {
    fontSize: 24,
  },
  
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  
  cancelButton: {
    backgroundColor: '#E8DDD4',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  
  cancelButtonText: {
    color: '#5D4037',
    fontSize: 16,
    fontWeight: '600',
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
})

export default CreateEventScreen