// # src/styles/webStyles.ts - Web-specific Styles
import { StyleSheet, Dimensions, Platform } from 'react-native'

const { width, height } = Dimensions.get('window')

// # Breakpoints
export const BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1200,
}

// # Check if running on web
export const isWeb = Platform.OS === 'web'

// # Get screen size category
export const getScreenSize = () => {
  if (width < BREAKPOINTS.mobile) return 'mobile'
  if (width < BREAKPOINTS.tablet) return 'tablet'
  if (width < BREAKPOINTS.desktop) return 'desktop'
  return 'large'
}

// # Responsive padding
export const getResponsivePadding = () => {
  const screenSize = getScreenSize()
  switch (screenSize) {
    case 'mobile': return 20
    case 'tablet': return 40
    case 'desktop': return 60
    case 'large': return 80
    default: return 20
  }
}

// # Responsive font sizes
export const getResponsiveFontSize = (baseSize: number) => {
  const screenSize = getScreenSize()
  switch (screenSize) {
    case 'mobile': return baseSize
    case 'tablet': return baseSize * 1.1
    case 'desktop': return baseSize * 1.2
    case 'large': return baseSize * 1.3
    default: return baseSize
  }
}

// # Web-specific container styles
export const webContainerStyles = StyleSheet.create({
  // # Main container for web
  mainContainer: {
    flex: 1,
    maxWidth: isWeb ? 1200 : '100%',
    alignSelf: 'center',
    width: '100%',
  },
  
  // # Responsive card container
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: getResponsivePadding(),
    marginHorizontal: isWeb ? getResponsivePadding() / 2 : 0,
    marginVertical: 10,
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  
  // # Grid layout for web
  gridContainer: {
    flexDirection: isWeb ? 'row' : 'column',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 20,
  },
  
  // # Grid item
  gridItem: {
    flex: isWeb ? 1 : undefined,
    minWidth: isWeb ? 300 : undefined,
    maxWidth: isWeb ? 400 : undefined,
  },
  
  // # Responsive text
  responsiveTitle: {
    fontSize: getResponsiveFontSize(24),
    fontWeight: '700',
    textAlign: isWeb ? 'center' : 'left',
  },
  
  responsiveSubtitle: {
    fontSize: getResponsiveFontSize(16),
    textAlign: isWeb ? 'center' : 'left',
  },
  
  // # Web-specific button styles
  webButton: {
    paddingHorizontal: isWeb ? 32 : 24,
    paddingVertical: isWeb ? 16 : 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: isWeb ? 200 : undefined,
    cursor: isWeb ? 'pointer' : undefined,
  },
  
  // # Web-specific input styles
  webInput: {
    borderWidth: 2,
    borderColor: '#E8DDD4',
    borderRadius: 12,
    padding: isWeb ? 20 : 16,
    fontSize: getResponsiveFontSize(16),
    backgroundColor: '#FEFCFA',
    minHeight: isWeb ? 56 : 48,
  },
  
  // # Web-specific modal styles
  webModal: {
    backgroundColor: 'rgba(45, 24, 16, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: isWeb ? 40 : 20,
  },
  
  webModalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: getResponsivePadding(),
    maxWidth: isWeb ? 600 : '90%',
    maxHeight: isWeb ? '80%' : '90%',
    width: '100%',
  },
  
  // # Web-specific navigation styles
  webHeader: {
    height: isWeb ? 80 : 60,
    paddingHorizontal: getResponsivePadding(),
    borderBottomWidth: 1,
    borderBottomColor: '#E8DDD4',
  },
  
  webFooter: {
    height: isWeb ? 100 : 80,
    paddingHorizontal: getResponsivePadding(),
    borderTopWidth: 1,
    borderTopColor: '#E8DDD4',
  },
  
  // # Web-specific media grid
  mediaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: isWeb ? 16 : 8,
    justifyContent: isWeb ? 'flex-start' : 'center',
  },
  
  mediaItem: {
    width: isWeb ? 200 : 150,
    height: isWeb ? 200 : 150,
    borderRadius: 12,
    overflow: 'hidden',
  },
  
  // # Web-specific form styles
  webForm: {
    gap: isWeb ? 24 : 16,
    padding: getResponsivePadding(),
  },
  
  webFormRow: {
    flexDirection: isWeb ? 'row' : 'column',
    gap: isWeb ? 16 : 12,
  },
  
  webFormField: {
    flex: isWeb ? 1 : undefined,
  },
  
  // # Web-specific list styles
  webList: {
    gap: isWeb ? 16 : 12,
  },
  
  webListItem: {
    padding: isWeb ? 20 : 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    shadowColor: '#2D1810',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  
  // # Web-specific sidebar styles
  webSidebar: {
    width: isWeb ? 280 : '100%',
    backgroundColor: '#FEFCFA',
    borderRightWidth: isWeb ? 1 : 0,
    borderRightColor: '#E8DDD4',
  },
  
  // # Web-specific content area
  webContent: {
    flex: 1,
    padding: getResponsivePadding(),
  },
  
  // # Web-specific responsive utilities
  hideOnMobile: {
    display: isWeb ? 'flex' : 'none',
  },
  
  hideOnWeb: {
    display: isWeb ? 'none' : 'flex',
  },
  
  showOnTablet: {
    display: width >= BREAKPOINTS.tablet ? 'flex' : 'none',
  },
  
  showOnDesktop: {
    display: width >= BREAKPOINTS.desktop ? 'flex' : 'none',
  },
})

// # Web-specific color palette
export const WEB_COLORS = {
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
  overlay: 'rgba(45, 24, 16, 0.1)',
  overlayDark: 'rgba(45, 24, 16, 0.6)',
}

// # Web-specific animations
export const WEB_ANIMATIONS = {
  fadeIn: {
    opacity: [0, 1],
    duration: 300,
  },
  slideUp: {
    transform: [{ translateY: [50, 0] }],
    opacity: [0, 1],
    duration: 400,
  },
  scaleIn: {
    transform: [{ scale: [0.9, 1] }],
    opacity: [0, 1],
    duration: 300,
  },
}

// # Web-specific responsive hooks
export const useResponsive = () => {
  return {
    isWeb,
    screenSize: getScreenSize(),
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    padding: getResponsivePadding(),
    fontSize: getResponsiveFontSize,
  }
} 