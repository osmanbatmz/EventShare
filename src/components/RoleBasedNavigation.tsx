// # src/components/RoleBasedNavigation.tsx
import React from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useNavigation } from '@react-navigation/native'
import { StackNavigationProp } from '@react-navigation/stack'

// # Types
import { RootStackParamList, UserRole } from '../types'

// # Store
import { usePermissions, useCurrentEvent, useAuth } from '../store'

// # Modern Color Palette
const COLORS = {
  primary: '#8B5A3C',
  primaryLight: '#A67C52',
  accent: '#F4E4BC',
  surface: '#FFFFFF',
  textDark: '#2D1810',
  textMedium: '#5D4037',
  textLight: '#8D6E63',
  success: '#6A9F58',
  warning: '#E8A317',
  error: '#C85450',
}

type NavigationProp = StackNavigationProp<RootStackParamList>

// # Permission-Based Action Button Component
interface ActionButtonProps {
  title: string
  subtitle?: string
  icon: string
  permission?: keyof import('../types').EventPermissions
  requiredRole?: UserRole
  onPress: () => void
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  disabled?: boolean
}

export const PermissionBasedButton: React.FC<ActionButtonProps> = ({
  title,
  subtitle,
  icon,
  permission,
  requiredRole,
  onPress,
  variant = 'primary',
  disabled = false,
}) => {
  const { hasPermission, isRole } = usePermissions()
  const { user } = useAuth()
  
  // # Check permissions
  const hasRequiredPermission = permission ? hasPermission(permission) : true
  const hasRequiredRole = requiredRole ? isRole(requiredRole) : true
  const canAccess = hasRequiredPermission && hasRequiredRole && !disabled
  
  // # Don't render if no permission
  if (!hasRequiredPermission || !hasRequiredRole) {
    return null
  }
  
  const getVariantColors = () => {
    switch (variant) {
      case 'success':
        return ['#6A9F58', '#5A8A48']
      case 'warning':
        return ['#E8A317', '#D89307']
      case 'danger':
        return ['#C85450', '#B84440']
      case 'secondary':
        return [COLORS.accent, '#E4D4AC']
      default:
        return [COLORS.primary, COLORS.primaryLight]
    }
  }
  
  const getTextColor = () => {
    return variant === 'secondary' ? COLORS.textDark : '#FFFFFF'
  }
  
  return (
    <TouchableOpacity
      style={[styles.actionButton, !canAccess && styles.disabledButton]}
      onPress={canAccess ? onPress : undefined}
      disabled={!canAccess}
    >
      <LinearGradient
        colors={canAccess ? getVariantColors() : [COLORS.textLight, COLORS.textLight]}
        style={styles.actionButtonGradient}
      >
        <View style={styles.actionButtonContent}>
          <View style={styles.actionButtonIcon}>
            <Text style={[styles.actionButtonEmoji, { opacity: canAccess ? 1 : 0.5 }]}>
              {icon}
            </Text>
          </View>
          <View style={styles.actionButtonText}>
            <Text style={[
              styles.actionButtonTitle,
              { color: canAccess ? getTextColor() : 'rgba(255,255,255,0.7)' }
            ]}>
              {title}
            </Text>
            {subtitle && (
              <Text style={[
                styles.actionButtonSubtitle,
                { color: canAccess ? `${getTextColor()}CC` : 'rgba(255,255,255,0.5)' }
              ]}>
                {subtitle}
              </Text>
            )}
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  )
}

// # Role-Based Quick Actions Component
export const RoleBasedQuickActions: React.FC = () => {
  const navigation = useNavigation<NavigationProp>()
  const { currentEvent } = useCurrentEvent()
  const { permissions, isRole } = usePermissions()
  
  if (!currentEvent || !permissions) return null
  
  const handleModerationPanel = () => {
    Alert.alert('Moderasyon Paneli', 'Onay bekleyen medyaları yönetebilirsiniz', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Aç', onPress: () => {/* Navigate to moderation */} }
    ])
  }
  
  const handleAnalytics = () => {
    Alert.alert('İstatistikler', 'Etkinlik analitikleri yakında eklenecek')
  }
  
  const handleParticipantManagement = () => {
    Alert.alert('Katılımcı Yönetimi', 'Katılımcı rolleri ve izinleri yönetimi yakında')
  }
  
  const handleInviteUsers = () => {
    Alert.alert('Kullanıcı Davet Et', 'Davet sistemi yakında eklenecek')
  }
  
  return (
    <View style={styles.quickActionsContainer}>
      <Text style={styles.quickActionsTitle}>
        {isRole('creator') ? '👑 Organizatör Paneli' :
         isRole('organizer') ? '🎯 Organizatör Araçları' :
         isRole('moderator') ? '⚡ Moderatör Araçları' :
         '🎉 Katılımcı Araçları'
        }
      </Text>
      
      <View style={styles.quickActionsGrid}>
        {/* # Media Upload - Everyone with permission */}
        <PermissionBasedButton
          title="Anı Yükle"
          subtitle="Fotoğraf veya video"
          icon="📸"
          permission="canUpload"
          onPress={() => Alert.alert('Upload', 'Media upload feature')}
          variant="primary"
        />
        
        {/* # Moderation Panel - Moderators+ */}
        <PermissionBasedButton
          title="Moderasyon"
          subtitle="Medya onayları"
          icon="✅"
          permission="canModerate"
          onPress={handleModerationPanel}
          variant="warning"
        />
        
        {/* # Analytics - Organizers+ */}
        <PermissionBasedButton
          title="İstatistikler"
          subtitle="Etkinlik verileri"
          icon="📊"
          permission="canViewAnalytics"
          onPress={handleAnalytics}
          variant="success"
        />
        
        {/* # Participant Management - Organizers+ */}
        <PermissionBasedButton
          title="Katılımcılar"
          subtitle="Üye ve rol yönetimi"
          icon="👥"
          permission="canManageParticipants"
          onPress={handleParticipantManagement}
          variant="secondary"
        />
        
        {/* # Invite Users - Moderators+ */}
        <PermissionBasedButton
          title="Davet Et"
          subtitle="Yeni katılımcı"
          icon="➕"
          permission="canInviteUsers"
          onPress={handleInviteUsers}
          variant="primary"
        />
        
        {/* # Event Settings - Organizers+ */}
        <PermissionBasedButton
          title="Ayarlar"
          subtitle="Etkinlik düzenle"
          icon="⚙️"
          permission="canEditEvent"
          onPress={() => Alert.alert('Settings', 'Event settings')}
          variant="secondary"
        />
      </View>
    </View>
  )
}

// # Role Badge Component
interface RoleBadgeProps {
  role: UserRole
  size?: 'small' | 'medium' | 'large'
  showIcon?: boolean
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ 
  role, 
  size = 'medium',
  showIcon = true 
}) => {
  const getRoleConfig = (role: UserRole) => {
    switch (role) {
      case 'creator':
        return {
          label: 'Kurucu',
          icon: '👑',
          colors: ['#FFD700', '#FFA500'],
          textColor: '#8B4513'
        }
      case 'organizer':
        return {
          label: 'Organizatör',
          icon: '🎯',
          colors: ['#FF6B6B', '#FF8E53'],
          textColor: '#FFFFFF'
        }
      case 'moderator':
        return {
          label: 'Moderatör',
          icon: '⚡',
          colors: ['#4ECDC4', '#44A08D'],
          textColor: '#FFFFFF'
        }
      case 'participant':
        return {
          label: 'Katılımcı',
          icon: '🎉',
          colors: ['#A8E6CF', '#7FCDCD'],
          textColor: '#2D5016'
        }
      case 'viewer':
        return {
          label: 'İzleyici',
          icon: '👁️',
          colors: ['#D3D3D3', '#B0B0B0'],
          textColor: '#505050'
        }
      default:
        return {
          label: 'Bilinmiyor',
          icon: '❓',
          colors: ['#F0F0F0', '#E0E0E0'],
          textColor: '#808080'
        }
    }
  }
  
  const config = getRoleConfig(role)
  const sizeStyles = {
    small: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 12 },
    medium: { paddingHorizontal: 12, paddingVertical: 6, fontSize: 14 },
    large: { paddingHorizontal: 16, paddingVertical: 8, fontSize: 16 }
  }
  
  return (
    <View style={styles.roleBadgeContainer}>
      <LinearGradient
        colors={config.colors}
        style={[styles.roleBadge, sizeStyles[size]]}
      >
        {showIcon && (
          <Text style={[styles.roleBadgeIcon, { fontSize: sizeStyles[size].fontSize }]}>
            {config.icon}
          </Text>
        )}
        <Text style={[
          styles.roleBadgeText,
          { 
            color: config.textColor,
            fontSize: sizeStyles[size].fontSize,
            marginLeft: showIcon ? 4 : 0
          }
        ]}>
          {config.label}
        </Text>
      </LinearGradient>
    </View>
  )
}

// # Permission Guard Component
interface PermissionGuardProps {
  permission?: keyof import('../types').EventPermissions
  requiredRole?: UserRole
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const PermissionGuard: React.FC<PermissionGuardProps> = ({
  permission,
  requiredRole,
  fallback = null,
  children
}) => {
  const { hasPermission, isRole } = usePermissions()
  
  const hasRequiredPermission = permission ? hasPermission(permission) : true
  const hasRequiredRole = requiredRole ? isRole(requiredRole) : true
  
  if (!hasRequiredPermission || !hasRequiredRole) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}

// # Role-Based Menu Items
export const RoleBasedMenuItems: React.FC = () => {
  const { permissions, isRole } = usePermissions()
  const { currentEvent } = useCurrentEvent()
  
  if (!currentEvent || !permissions) return null
  
  const menuItems = [
    // # Basic actions for all users
    {
      id: 'view_media',
      title: 'Fotoğrafları Görüntüle',
      icon: '📸',
      permission: undefined, // # Everyone can view
      onPress: () => Alert.alert('Media', 'View media gallery')
    },
    
    // # Upload for participants+
    {
      id: 'upload_media',
      title: 'Medya Yükle',
      icon: '⬆️',
      permission: 'canUpload' as const,
      onPress: () => Alert.alert('Upload', 'Upload media')
    },
    
    // # Download for users with permission
    {
      id: 'download_media',
      title: 'Medyaları İndir',
      icon: '⬇️',
      permission: 'canDownload' as const,
      onPress: () => Alert.alert('Download', 'Download media')
    },
    
    // # Moderation for moderators+
    {
      id: 'moderate',
      title: 'İçerik Moderasyonu',
      icon: '⚖️',
      permission: 'canModerate' as const,
      onPress: () => Alert.alert('Moderation', 'Content moderation panel')
    },
    
    // # User management for organizers+
    {
      id: 'manage_users',
      title: 'Kullanıcı Yönetimi',
      icon: '👥',
      permission: 'canManageParticipants' as const,
      onPress: () => Alert.alert('Users', 'User management')
    },
    
    // # Analytics for organizers+
    {
      id: 'analytics',
      title: 'Analitik ve Raporlar',
      icon: '📈',
      permission: 'canViewAnalytics' as const,
      onPress: () => Alert.alert('Analytics', 'Event analytics')
    },
    
    // # Settings for organizers+
    {
      id: 'settings',
      title: 'Etkinlik Ayarları',
      icon: '⚙️',
      permission: 'canEditEvent' as const,
      onPress: () => Alert.alert('Settings', 'Event settings')
    },
  ]
  
  return (
    <View style={styles.menuContainer}>
      <View style={styles.menuHeader}>
        <Text style={styles.menuTitle}>📋 Mevcut İşlemler</Text>
        <RoleBadge role={permissions.isCreator ? 'creator' : 
                        permissions.isOrganizer ? 'organizer' : 'participant'} />
      </View>
      
      <View style={styles.menuItems}>
        {menuItems.map(item => (
          <PermissionGuard key={item.id} permission={item.permission}>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={item.onPress}
            >
              <Text style={styles.menuItemIcon}>{item.icon}</Text>
              <Text style={styles.menuItemTitle}>{item.title}</Text>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          </PermissionGuard>
        ))}
      </View>
    </View>
  )
}

// # Styles
const styles = StyleSheet.create({
  // # Quick Actions
  quickActionsContainer: {
    marginBottom: 24,
  },
  
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textDark,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  
  // # Action Buttons
  actionButton: {
    flex: 1,
    minWidth: '47%', // # 2 columns with gap
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  
  disabledButton: {
    opacity: 0.6,
  },
  
  actionButtonGradient: {
    padding: 16,
  },
  
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  
  actionButtonIcon: {
    width: 40,
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  actionButtonEmoji: {
    fontSize: 20,
  },
  
  actionButtonText: {
    flex: 1,
  },
  
  actionButtonTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  
  actionButtonSubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  
  // # Role Badge
  roleBadgeContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
  },
  
  roleBadgeIcon: {
    fontWeight: '600',
  },
  
  roleBadgeText: {
    fontWeight: '700',
  },
  
  // # Menu
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  
  menuTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textDark,
  },
  
  menuItems: {
    gap: 2,
  },
  
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 4,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
  },
  
  menuItemIcon: {
    fontSize: 20,
    width: 24,
    textAlign: 'center',
  },
  
  menuItemTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.textDark,
  },
  
  menuItemArrow: {
    fontSize: 20,
    color: COLORS.textLight,
  },
})

export default {
  PermissionBasedButton,
  RoleBasedQuickActions,
  RoleBadge,
  PermissionGuard,
  RoleBasedMenuItems,
}