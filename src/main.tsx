import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'framer-motion';
import '@fontsource/cormorant-garamond/500.css';
import '@fontsource/cormorant-garamond/500-italic.css';
import '@fontsource/cormorant-garamond/600.css';
import '@fontsource-variable/manrope';
import '@fontsource-variable/jetbrains-mono';
import './styles/theme.css';
import './styles/animations.css';
import App from './App';
import { SoundProvider } from './audio/SoundContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionConfig reducedMotion="user">
      <SoundProvider>
        <App />
      </SoundProvider>
    </MotionConfig>
  </React.StrictMode>,
);
