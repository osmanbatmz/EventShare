// # Web Entry Point - EventShare Web App
import 'react-native-url-polyfill/auto'
import { AppRegistry } from 'react-native'
import App from './App'

// # Web-specific polyfills
if (typeof global.URL === 'undefined') {
  global.URL = require('react-native-url-polyfill/auto').URL
}

// # Register app for web
AppRegistry.registerComponent('EventShare', () => App)
AppRegistry.runApplication('EventShare', {
  rootTag: document.getElementById('root')
}) 