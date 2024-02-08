import 'reflect-metadata';

import { createApp } from 'vue';

import '@fontsource/roboto/500.css';

import App from './App.vue';
import './registerServiceWorker';
import router from './router';
import store from './store';

async function Main(): Promise<void> {
    // Explicitly load the font otherwise it not be visible for the background canvas that used for generating a bitmap font
    const roboto = new FontFace('Roboto', `url(${process.env.BASE_URL}fonts/roboto-latin-500-normal.3170fd9a.woff2)`);
    await roboto.load();

    createApp(App).use(store).use(router).mount('#app');
}

Main();
