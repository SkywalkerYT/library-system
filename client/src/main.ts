import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { router } from './router';

// ★ 全局样式：CSS 变量 + 重置
import './styles/global.css';

const app = createApp(App);
app.use(createPinia());
app.use(router);
app.mount('#app');
