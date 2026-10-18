<script setup lang="ts">
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { authState, signOut } from '@/stores/auth'

defineProps<{ title: string }>()

const router = useRouter()
const route = useRoute()

async function onLogout() {
  await signOut()
  await router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-slate-100">
    <header class="flex items-center justify-between bg-white px-6 py-3 shadow">
      <h1 class="text-lg font-semibold text-slate-800">{{ title }}</h1>
      <div class="flex items-center gap-4 text-sm text-slate-600">
        <span>{{ authState.user?.name }}</span>
        <button class="rounded border border-slate-300 px-3 py-1 hover:bg-slate-50" @click="onLogout">
          Log out
        </button>
      </div>
    </header>
    <main class="mx-auto max-w-5xl p-6">
      <!-- Validators switch between the dashboard and their own vacation requests. -->
      <nav v-if="authState.user?.role === 'Validator'" class="mb-4 text-sm">
        <RouterLink
          v-if="route.name === 'validator'"
          to="/vacation-requests"
          class="inline-block rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
        >
          Create Request
        </RouterLink>
        <RouterLink
          v-else
          to="/validator"
          class="inline-block rounded bg-blue-600 px-3 py-1.5 font-medium text-white hover:bg-blue-700"
        >
          Validator Dashboard
        </RouterLink>
      </nav>
      <slot />
    </main>
  </div>
</template>
