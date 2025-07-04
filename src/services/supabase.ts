import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// # URL polyfill for React Native
if (!global.URL) {
  global.URL = require('react-native-url-polyfill/auto').URL
}

// # Supabase bağlantı ayarları - Yeni proje
const supabaseUrl = 'https://gzerwprcilncitovrdwp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZXJ3cHJjaWxuY2l0b3ZyZHdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA4OTAzOTQsImV4cCI6MjA2NjQ2NjM5NH0.FuMaXd7uRevAn5Wxoqw06pgea0z9HlxehQirxktoBV8'

// # Supabase client'ı oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

// # Database Table Types - TypeScript için tip tanımları
export interface Event {
  id: string
  title: string // # Etkinlik adı (Düğün, Doğum günü vs.)
  description?: string // # Etkinlik açıklaması
  event_code: string // # Katılımcıların gireceği kod (6 haneli)
  event_type: 'wedding' | 'birthday' | 'corporate' | 'other' // # Etkinlik tipi
  creator_id: string // # Etkinliği oluşturan kişinin ID'si
  start_date: string // # Etkinlik başlangıç tarihi
  end_date: string // # Etkinlik bitiş tarihi
  is_active: boolean // # Etkinlik aktif mi?
  theme_color?: string // # Etkinlik tema rengi
  logo_url?: string // # Etkinlik logosu URL'i
  created_at: string
  updated_at: string
}

// # Medya dosyaları için tip tanımı
export interface Media {
  id: string
  event_id: string // # Hangi etkinliğe ait
  uploader_id: string // # Yükleyen kişinin ID'si
  uploader_name: string // # Yükleyen kişinin adı
  file_url: string // # Dosyanın Supabase storage URL'i
  file_type: 'image' | 'video' // # Dosya tipi
  file_size: number // # Dosya boyutu (bytes)
  thumbnail_url?: string // # Video için thumbnail URL'i
  uploaded_at: string
}

// # Kullanıcı profili için tip tanımı
export interface Profile {
  id: string // # Auth user ID ile aynı
  email: string
  display_name: string // # Kullanıcının görünür adı
  avatar_url?: string // # Profil fotoğrafı URL'i
  created_at: string
  updated_at: string
}

// # Etkinlik katılımcıları için tip tanımı
export interface EventParticipant {
  id: string
  event_id: string
  user_id: string
  joined_at: string
  is_organizer: boolean // # Organizatör mü?
}
