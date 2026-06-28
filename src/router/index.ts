import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/cockpit',
    },
    {
      path: '/cockpit',
      name: 'cockpit',
      component: () => import('../views/cockpit/CockpitView.vue'),
    },
    {
      path: '/subsystem/:id',
      name: 'subsystem',
      component: () => import('../views/subsystem/SubsystemFrameView.vue'),
    },
  ],
})

export default router
