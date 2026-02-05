import { createApp } from 'vue'
import App from './App.vue'
import './style.css'

// Ensure we wait for the element to exist
const mountApp = () => {
    const el = document.getElementById('nxc-gantt-root');
    if (el) {
        createApp(App).mount(el)
    } else {
        console.error('Target element #nxc-gantt-root not found');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountApp);
} else {
    mountApp();
}
