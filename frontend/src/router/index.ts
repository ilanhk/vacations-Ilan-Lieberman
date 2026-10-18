import { createRouter, createWebHistory } from 'vue-router'
import type { UserRole } from '@/api/auth'
import { authState, homeRouteFor, loadSession } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    // Roles allowed to open the route; routes without it are public.
    roles?: UserRole[]
  }
}

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
    },
    {
      path: '/sorry',
      name: 'sorry',
      component: () => import('@/views/SorryView.vue'),
    },
    {
      path: '/vacation-requests',
      name: 'vacation-requests',
      component: () => import('@/views/VacationRequestView.vue'),
      meta: { roles: ['Requester', 'Validator'] },
    },
    {
      path: '/validator',
      name: 'validator',
      component: () => import('@/views/ValidatorView.vue'),
      meta: { roles: ['Validator'] },
    },
  ],
})

// Global guard: not logged in -> /login; wrong role -> that user's own page;
// already logged in on /login -> straight to their page.
router.beforeEach(async (to) => {
  await loadSession()
  const user = authState.user

  if (to.meta.roles) {
    if (!user) return '/login'
    if (!to.meta.roles.includes(user.role)) return homeRouteFor(user.role)
  } else if ((to.name === 'login' || to.name === 'register') && user) {
    return homeRouteFor(user.role)
  }
})

export default router
