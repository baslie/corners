import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { initYandexSDK, gameReady } from './sdk/yandex.js';

initYandexSDK().then(() => {
  const root = createRoot(document.getElementById('root'));
  root.render(<App />);
  gameReady();
});
