<script setup lang="ts">
import { onMounted, ref } from "vue";
import { errorMessage, fetchTeamPlan } from "../api";
import type { VacationRequest } from "../types";

const items = ref<VacationRequest[]>([]);
const error = ref("");

onMounted(async () => {
  try {
    items.value = await fetchTeamPlan();
  } catch (cause) {
    error.value = errorMessage(cause);
  }
});
</script>

<template>
  <div>
    <div class="mb-8">
      <p class="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">TEAM VIEW</p>
      <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Team calendar</h1>
      <p class="mt-2 text-slate-500">Approved time away, shared so everyone can plan ahead.</p>
    </div>
    <p v-if="error" class="alert-error">{{ error }}</p>
    <section v-else-if="items.length" class="card overflow-hidden">
      <article v-for="item in items" :key="item.id" class="table-row flex flex-wrap items-center justify-between gap-3 px-6 py-5">
        <div>
          <p class="font-semibold text-slate-900">{{ item.user?.name ?? "Team member" }}</p>
          <p class="mt-1 text-sm text-slate-500">{{ item.startDate }} <span class="text-slate-300">to</span> {{ item.endDate }}</p>
        </div>
        <span class="status-pill status-approved">Approved</span>
      </article>
    </section>
    <section v-else class="card px-6 py-14 text-center">
      <div class="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-xl text-emerald-700">☼</div>
      <p class="mt-4 font-semibold text-slate-700">A clear calendar—for now</p>
      <p class="mt-1 text-sm text-slate-400">Approved team vacations will show up here.</p>
    </section>
  </div>
</template>
