import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';

import CodeEditor from '@/app/CodeEditor.vue';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    name: 'CodeEditor',
    props: true,
    component: CodeEditor
  },
  {
    path: '/share/:source_code/:settings?',
    name: 'Share',
    props: true,
    component: CodeEditor
  }
];

const router = createRouter({
  history: createWebHistory(process.env.BASE_URL),
  routes
});

export default router;
