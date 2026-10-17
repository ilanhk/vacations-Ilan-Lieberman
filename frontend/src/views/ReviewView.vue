<script setup lang="ts">
import { onMounted, ref, watch } from "vue";
import { api, errorMessage, fetchUsers, fetchVacationRequests } from "../api";
import type { User, VacationRequest, VacationStatus } from "../types";

const items = ref<VacationRequest[]>([]);
const users = ref<User[]>([]);
const status = ref<VacationStatus | "">("");
const userId = ref("");
const page = ref(1);
const pages = ref(1);
const total = ref(0);
const comments = ref<Record<string, string>>({});
const error = ref("");
const loading = ref(false);
const actionId = ref("");

async function load(): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const result = await fetchVacationRequests({ page: page.value, limit: 8, status: status.value, userId: userId.value || undefined });
    items.value = result.items;
    pages.value = Math.max(result.pagination.pages, 1);
    total.value = result.pagination.total;
    if (page.value > pages.value) page.value = pages.value;
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    loading.value = false;
  }
}

async function changeStatus(id: string, action: "approve" | "reject"): Promise<void> {
  if (action === "reject" && !comments.value[id]?.trim()) return;
  error.value = "";
  actionId.value = id;
  try {
    if (action === "approve") await api.post(`/vacation-requests/${id}/approve`);
    else await api.post(`/vacation-requests/${id}/reject`, { comment: comments.value[id] });
    await load();
  } catch (cause) {
    error.value = errorMessage(cause);
  } finally {
    actionId.value = "";
  }
}

watch([status, userId], () => {
  page.value = 1;
  void load();
});
onMounted(async () => {
  try {
    users.value = await fetchUsers();
  } catch (cause) {
    error.value = errorMessage(cause);
  }
  await load();
});
</script>

<template>
  <div>
    <div class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="text-sm font-bold uppercase tracking-[.16em] text-emerald-700">VALIDATOR SPACE</p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight text-slate-900">Request inbox</h1>
        <p class="mt-2 text-slate-500">Review time off with the full picture in view.</p>
      </div>
      <RouterLink to="/team" class="button button-quiet">Team calendar <span aria-hidden="true">→</span></RouterLink>
    </div>

    <section class="card overflow-hidden">
      <div class="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
        <div>
          <h2 class="text-lg font-semibold text-slate-900">All requests</h2>
          <p class="mt-1 text-sm text-slate-500">{{ total }} request{{ total === 1 ? "" : "s" }}</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <label>
            <span class="sr-only">Filter by status</span>
            <select v-model="status" class="field !w-auto !py-2.5 text-sm">
              <option value="">All statuses</option>
              <option>Pending</option><option>Approved</option><option>Rejected</option>
            </select>
          </label>
          <label>
            <span class="sr-only">Filter by employee</span>
            <select v-model="userId" class="field !w-auto !py-2.5 text-sm">
              <option value="">All employees</option>
              <option v-for="user in users" :key="user.id" :value="user.id">{{ user.name }}</option>
            </select>
          </label>
        </div>
      </div>

      <p v-if="error" class="mx-5 mt-5 alert-error sm:mx-6">{{ error }}</p>
      <div v-if="loading" class="p-12 text-center text-sm text-slate-400">Loading requests…</div>
      <div v-else-if="items.length">
        <article v-for="item in items" :key="item.id" class="table-row p-5 sm:px-6">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <h3 class="font-semibold text-slate-900">{{ item.user?.name ?? "Employee" }}</h3>
                <span class="status-pill" :class="`status-${item.status.toLowerCase()}`">{{ item.status }}</span>
              </div>
              <p class="mt-1 text-sm text-slate-500">{{ item.startDate }} <span class="text-slate-300">—</span> {{ item.endDate }}</p>
              <p v-if="item.reason" class="mt-2 text-sm leading-6 text-slate-600">{{ item.reason }}</p>
              <p v-if="item.status === 'Rejected' && item.comments" class="mt-2 text-sm text-red-700">Rejection note: {{ item.comments }}</p>
            </div>
            <div v-if="item.status === 'Pending'" class="flex w-full flex-col gap-2 sm:w-72">
              <textarea
                v-model="comments[item.id]"
                class="field min-h-16 resize-y text-sm"
                aria-label="Comment required to reject"
                placeholder="Reason for rejection (required)"
                maxlength="2000"
              ></textarea>
              <div class="flex justify-end gap-2">
                <button class="button button-danger !px-3 !py-2 text-sm" :disabled="Boolean(actionId) || !comments[item.id]?.trim()" @click="changeStatus(item.id, 'reject')">
                  {{ actionId === item.id ? "Saving…" : "Reject" }}
                </button>
                <button class="button !px-3 !py-2 text-sm" :disabled="Boolean(actionId)" @click="changeStatus(item.id, 'approve')">
                  {{ actionId === item.id ? "Saving…" : "Approve" }}
                </button>
              </div>
            </div>
          </div>
        </article>
      </div>
      <div v-else-if="!loading" class="px-6 py-14 text-center">
        <p class="font-semibold text-slate-700">No requests found</p>
        <p class="mt-1 text-sm text-slate-400">Try adjusting the filters or check back later.</p>
      </div>
      <div class="flex items-center justify-between border-t border-slate-100 px-5 py-4 sm:px-6">
        <span class="text-sm text-slate-500">Page {{ page }} of {{ pages }}</span>
        <div class="flex gap-2">
          <button class="button button-quiet !px-3 !py-2 text-sm" :disabled="page <= 1 || loading" @click="page--; load()">Previous</button>
          <button class="button button-quiet !px-3 !py-2 text-sm" :disabled="page >= pages || loading" @click="page++; load()">Next</button>
        </div>
      </div>
    </section>
  </div>
</template>
