<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { api, errorMessage, fetchVacationRequests } from "../api";
import type { VacationRequest } from "../types";

const today = new Date().toISOString().slice(0, 10);
const startDate = ref("");
const endDate = ref("");
const reason = ref("");
const items = ref<VacationRequest[]>([]);
const error = ref("");
const notice = ref("");
const busy = ref(false);
const dateMessage = computed(() => {
  if (!startDate.value || !endDate.value) return "";
  if (endDate.value <= startDate.value) return "End date must be after start date.";
  return "";
});

async function load(): Promise<void> {
  try {
    items.value = (await fetchVacationRequests({ page: 1, limit: 100 })).items;
  } catch (cause) {
    error.value = errorMessage(cause);
  }
}

async function submit(): Promise<void> {
  if (dateMessage.value) return;
  busy.value = true;
  error.value = "";
  notice.value = "";
  try {
    await api.post("/vacation-requests", {
      startDate: startDate.value,
      endDate: endDate.value,
      reason: reason.value,
    });
    startDate.value = "";
    endDate.value = "";
    reason.value = "";
    notice.value = "Your vacation request has been sent for approval.";
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">REQUESTER SPACE</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Your time off</h1>
        <p class="mt-2 text-slate-500">Put a little space on the calendar. Your manager will take it from here.</p>
      </div>
      <RouterLink to="/team" class="button button-quiet">See the team calendar <span aria-hidden="true">→</span></RouterLink>
    </div>

    <div class="grid items-start gap-6 lg:grid-cols-[.85fr_1.15fr]">
      <section class="card p-6 sm:p-7">
        <div class="mb-6">
          <p class="text-xs font-bold uppercase tracking-[.15em] text-emerald-700">NEW REQUEST</p>
          <h2 class="mt-2 text-xl font-semibold text-slate-900">Plan your break</h2>
        </div>
        <form class="space-y-5" @submit.prevent="submit">
          <div>
            <label class="field-label" for="start-date">Start date</label>
            <input id="start-date" v-model="startDate" class="field" type="date" :min="today" required />
          </div>
          <div>
            <label class="field-label" for="end-date">End date</label>
            <input id="end-date" v-model="endDate" class="field" type="date" :min="startDate || today" required />
            <p v-if="dateMessage" class="mt-1 text-sm text-red-600">{{ dateMessage }}</p>
          </div>
          <div>
            <label class="field-label" for="reason">Reason <span class="font-normal text-slate-400">(optional)</span></label>
            <textarea id="reason" v-model.trim="reason" class="field min-h-24 resize-y" maxlength="2000" placeholder="A little context for your manager…"></textarea>
          </div>
          <p v-if="error" class="alert-error">{{ error }}</p>
          <p v-if="notice" class="alert-success">{{ notice }}</p>
          <button class="button w-full" type="submit" :disabled="busy || !startDate || !endDate || Boolean(dateMessage)">
            {{ busy ? "Sending…" : "Send request" }}
          </button>
        </form>
      </section>

      <section class="card overflow-hidden">
        <div class="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <p class="text-xs font-bold uppercase tracking-[.15em] text-slate-400">YOUR HISTORY</p>
            <h2 class="mt-1 text-xl font-semibold text-slate-900">Submitted requests</h2>
          </div>
          <span class="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">{{ items.length }}</span>
        </div>
        <div v-if="items.length" class="px-6">
          <article v-for="item in items" :key="item.id" class="table-row py-5">
            <div class="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p class="font-semibold text-slate-800">{{ item.startDate }} <span class="font-normal text-slate-400">to</span> {{ item.endDate }}</p>
                <p v-if="item.reason" class="mt-1 text-sm text-slate-500">{{ item.reason }}</p>
                <p v-if="item.status === 'Rejected' && item.comments" class="mt-2 text-sm text-red-700">
                  Manager's note: {{ item.comments }}
                </p>
              </div>
              <span class="status-pill" :class="`status-${item.status.toLowerCase()}`">{{ item.status }}</span>
            </div>
          </article>
        </div>
        <div v-else class="px-6 py-12 text-center">
          <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-700">☼</div>
          <p class="mt-4 font-semibold text-slate-700">Nothing on your calendar yet</p>
          <p class="mt-1 text-sm text-slate-400">Your requests will appear here.</p>
        </div>
      </section>
    </div>
  </div>
</template>
