import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import '@fontsource-variable/cairo';
import '@fontsource-variable/plus-jakarta-sans';
import '@fontsource/amiri/arabic-400.css';
import '@fontsource/amiri/arabic-700.css';
import '@fontsource/amiri/latin-400.css';
import './index.css';

createRoot(document.getElementById('root')!).render(<App />);
