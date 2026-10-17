<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { errorMessage, login, register } from "../api";
import { saveSession } from "../types";

const router = useRouter();
const mode = ref<"login" | "register">("login");
const name = ref("");
const email = ref("");
const password = ref("");
const error = ref("");
const busy = ref(false);

async function submit(): Promise<void> {
  error.value = "";
  busy.value = true;
  try {
    const session = mode.value === "login"
      ? await login(email.value, password.value)
      : await register(name.value, email.value, password.value);
    saveSession(session);
    await router.push(session.user.role === "Validator" ? "/review" : "/requests");
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    busy.value = false;
  }
}
</script>

<template>
  <section class="mx-auto grid max-w-4xl overflow-hidden rounded-3xl bg-white shadow-xl shadow-slate-900/5 md:grid-cols-2">
    <div class="flex flex-col justify-between bg-emerald-950 p-8 text-white sm:p-10">
      <div>
        <div class="mb-10 flex items-center gap-3 font-bold tracking-tight">
          <span class="brand-mark">d</span> daybreak
        </div>
        <p class="mb-3 text-sm font-bold uppercase tracking-[.18em] text-emerald-300">Time off, together</p>
        <h1 class="max-w-sm text-3xl font-semibold leading-tight sm:text-4xl">A clearer view of everyone's time away.</h1>
        <p class="mt-5 max-w-sm leading-7 text-emerald-100/75">
          Plan your next break, keep your team in sync, and make approvals feel effortless.
        </p>
      </div>
      <div class="mt-12 rounded-2xl border border-white/15 bg-white/5 p-4 text-sm leading-6 text-emerald-50">
        <p class="font-semibold">Demo accounts</p>
        <p>Requester: requester@vacation.local</p>
        <p>Validator: validator@vacation.local</p>
        <p>Password: Vacation123!</p>
      </div>
    </div>
    <div class="p-8 sm:p-10">
      <p class="text-sm font-semibold text-emerald-700">{{ mode === "login" ? "WELCOME BACK" : "GET STARTED" }}</p>
      <h2 class="mt-2 text-2xl font-semibold text-slate-900">{{ mode === "login" ? "Sign in to Daybreak" : "Create your account" }}</h2>
      <p class="mt-2 text-sm text-slate-500">
        {{ mode === "login" ? "Use your work account to continue." : "New accounts start with the requester role." }}
      </p>

      <form class="mt-7 space-y-5" @submit.prevent="submit">
        <div v-if="mode === 'register'">
          <label class="field-label" for="name">Full name</label>
          <input id="name" v-model.trim="name" class="field" autocomplete="name" required maxlength="120" />
        </div>
        <div>
          <label class="field-label" for="email">Email address</label>
          <input id="email" v-model.trim="email" class="field" type="email" autocomplete="email" required />
        </div>
        <div>
          <label class="field-label" for="password">Password</label>
          <input id="password" v-model="password" class="field" type="password" autocomplete="current-password" minlength="8" required />
          <p v-if="mode === 'register'" class="mt-1 text-xs text-slate-400">At least 8 characters.</p>
        </div>
        <p v-if="error" class="alert-error">{{ error }}</p>
        <button class="button w-full" type="submit" :disabled="busy">
          {{ busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account" }}
        </button>
      </form>
      <p class="mt-6 text-center text-sm text-slate-500">
        {{ mode === "login" ? "New to Daybreak?" : "Already have an account?" }}
        <button class="ml-1 font-semibold text-emerald-700 hover:text-emerald-900" @click="mode = mode === 'login' ? 'register' : 'login'; error = ''">
          {{ mode === "login" ? "Create an account" : "Sign in" }}
        </button>
      </p>
    </div>
  </section>
</template>
