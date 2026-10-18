<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getErrorMessage, isTimeoutError } from '@/api/http'
import {
  createVacationRequest,
  fetchMyBookedRequests,
  fetchMyVacationRequests,
  type MyVacationRequest,
} from '@/api/vacationRequests'
import BookingCalendar from '@/components/BookingCalendar.vue'
import MyRequestsList from '@/components/MyRequestsList.vue'
import PaginationBar from '@/components/PaginationBar.vue'
import { usePaginatedList } from '@/composables/usePaginatedList'

const PAGE_SIZE = 10

const router = useRouter()
// Parent can refresh its request list when a request has been created.
const emit = defineEmits<{ created: [] }>()

const startDate = ref('')
const endDate = ref('')
const reason = ref('')
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const bookedRequests = ref<MyVacationRequest[]>([])
const {
  rows: myRequests,
  pagination,
  loading: tableLoading,
  load: loadTable,
} = usePaginatedList<MyVacationRequest>(
  (page, signal) => fetchMyVacationRequests(page, PAGE_SIZE, signal),
  PAGE_SIZE,
  'Could not load your requests.',
)

// The calendar marks these days as booked so the user can see when the next free slot is.
async function loadBookedDays() {
  try {
    bookedRequests.value = await fetchMyBookedRequests()
  } catch {
    // Non-critical: without it the calendar just shows no booked days (the backend still blocks overlaps).
    bookedRequests.value = []
  }
}

onMounted(() => Promise.all([loadBookedDays(), loadTable(1)]))

async function onSubmit() {
  errorMessage.value = ''
  successMessage.value = ''

  if (!startDate.value || !endDate.value) {
    errorMessage.value = 'Please select a start date and an end date on the calendar.'
    return
  }

  submitting.value = true
  try {
    await createVacationRequest({
      startDate: startDate.value,
      endDate: endDate.value,
      // Reason is optional: don't send an empty string.
      ...(reason.value.trim() ? { reason: reason.value.trim() } : {}),
    })
    successMessage.value = 'Your vacation request has been successfully sent.'
    startDate.value = ''
    endDate.value = ''
    reason.value = ''
    await Promise.all([loadBookedDays(), loadTable()]) // the new request now shows as booked and in the table
    emit('created')
  } catch (e) {
    // No answer within 20s: show the "try again later" page instead of an inline error.
    if (isTimeoutError(e)) {
      await router.push({ name: 'sorry' })
      return
    }
    // Backend validation messages (past date, overlap, end before start...) shown as-is.
    errorMessage.value = getErrorMessage(e)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-4 rounded-lg bg-white p-6 shadow" @submit.prevent="onSubmit">
    <h2 class="text-lg font-semibold text-slate-800">New vacation request</h2>

    <div class="flex flex-col gap-6 sm:flex-row">
      <BookingCalendar v-model:start="startDate" v-model:end="endDate" :booked="bookedRequests" />

      <div class="flex-1 space-y-4">
        <p class="text-sm text-slate-600">
          <span class="font-medium text-slate-700">Start:</span> {{ startDate || '-' }}
          <span class="ml-3 font-medium text-slate-700">End:</span> {{ endDate || '-' }}
        </p>

        <label class="block text-sm font-medium text-slate-700">
          Reason <span class="font-normal text-slate-400">(optional)</span>
          <textarea
            v-model="reason"
            rows="3"
            maxlength="2000"
            class="mt-1 w-full rounded border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          :disabled="submitting"
          class="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-60"
        >
          <svg
            v-if="submitting"
            class="h-4 w-4 animate-spin"
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden="true"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {{ submitting ? 'Sending...' : 'Submit request' }}
        </button>
      </div>
    </div>

    <p
      v-if="errorMessage"
      class="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
      role="alert"
    >
      {{ errorMessage }}
    </p>
    <p
      v-if="successMessage"
      class="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700"
      role="status"
    >
      {{ successMessage }}
    </p>

    <MyRequestsList :requests="myRequests" />
    <PaginationBar :pagination="pagination" :disabled="tableLoading" @change="loadTable" />
  </form>
</template>
