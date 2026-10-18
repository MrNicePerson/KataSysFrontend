import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from '../App.jsx'
import './styles/global.css'
import { installGlobalKeyboardNavigation } from './keyboard/navigation.js'
import { installKeyboardListNavigation } from './keyboard/listNavigation.js'
import { installActionRepeatGuard } from './keyboard/actionRepeatGuard.js'

installGlobalKeyboardNavigation(document)
installKeyboardListNavigation(document)
installActionRepeatGuard(document)

createRoot(document.querySelector('#app')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
