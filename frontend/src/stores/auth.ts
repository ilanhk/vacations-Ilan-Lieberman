import { reactive, readonly } from 'vue'
import * as authApi from '@/api/auth'
import type { AuthUser, UserRole } from '@/api/auth'

// Tiny shared auth state; no Pinia needed for a single user object.
const state = reactive<{ user: AuthUser | null; loaded: boolean }>({
  user: null,
  loaded: false,
})

export const authState = readonly(state)

// Where each role lands after login.
export function homeRouteFor(role: UserRole): string {
  return role === 'Validator' ? '/validator' : '/vacation-requests'
}

// Asks the backend who is logged in (once per page load) so refreshing keeps the session.
export async function loadSession(): Promise<void> {
  if (state.loaded) return
  state.user = await authApi.fetchCurrentUser()
  state.loaded = true
}

export async function signIn(email: string, password: string): Promise<AuthUser> {
  const user = await authApi.login(email, password)
  state.user = user
  state.loaded = true
  return user
}

// The backend logs the new user in (sets the cookie), so registering lands straight on their page.
export async function signUp(name: string, email: string, password: string): Promise<AuthUser> {
  const user = await authApi.register(name, email, password)
  state.user = user
  state.loaded = true
  return user
}

// [Step 4] Forget the logged-in user locally. Called when the server says the session has expired,
// so the router guard no longer treats the user as logged in.
export function clearSession(): void {
  state.user = null
  state.loaded = true
}

export async function signOut(): Promise<void> {
  await authApi.logout()
  state.user = null
}
