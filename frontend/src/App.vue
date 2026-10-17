<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getSession, saveSession } from "./types";

const route = useRoute();
const router = useRouter();
const session = ref(getSession());
const loggedIn = computed(() => Boolean(session.value) && route.name !== "login");

watch(route, () => {
  session.value = getSession();
});

function signOut(): void {
  saveSession(null);
  session.value = null;
  void router.push("/login");
}
</script>

<template>
  <div class="min-h-screen">
    <header v-if="loggedIn" class="border-b border-slate-200 bg-white">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <RouterLink to="/" class="flex items-center gap-3 font-bold tracking-tight text-slate-900">
          <span class="brand-mark">d</span>
          <span>daybreak</span>
        </RouterLink>
        <nav class="flex items-center gap-2 sm:gap-5">
          <RouterLink
            v-if="session?.user.role === 'Requester'"
            to="/requests"
            class="nav-link"
          >My requests</RouterLink>
          <RouterLink v-else to="/review" class="nav-link">Review requests</RouterLink>
          <RouterLink to="/team" class="nav-link">Team calendar</RouterLink>
          <span class="hidden text-sm text-slate-500 sm:inline">{{ session?.user.name }}</span>
          <button class="button button-quiet !px-3 !py-2" @click="signOut">Sign out</button>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-5 py-8 sm:py-12">
      <RouterView />
    </main>
    <footer v-if="loggedIn" class="mx-auto max-w-6xl px-5 pb-8 text-xs text-slate-400">
      Vacation planning, made a little brighter.
    </footer>
  </div>
</template>
