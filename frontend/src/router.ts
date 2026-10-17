import { createRouter, createWebHistory } from "vue-router";
import { getSession } from "./types";
import LoginView from "./views/LoginView.vue";
import RequestsView from "./views/RequestsView.vue";
import ReviewView from "./views/ReviewView.vue";
import TeamView from "./views/TeamView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginView, meta: { public: true } },
    { path: "/requests", name: "requests", component: RequestsView, meta: { role: "Requester" } },
    { path: "/review", name: "review", component: ReviewView, meta: { role: "Validator" } },
    { path: "/team", name: "team", component: TeamView },
    { path: "/", redirect: () => getSession()?.user.role === "Validator" ? "/review" : "/requests" },
    { path: "/:pathMatch(.*)*", redirect: "/" },
  ],
});

router.beforeEach((to) => {
  const session = getSession();
  if (!to.meta.public && !session) return { name: "login" };
  if (to.meta.public && session) return session.user.role === "Validator" ? "/review" : "/requests";
  if (typeof to.meta.role === "string" && session?.user.role !== to.meta.role) {
    return session?.user.role === "Validator" ? "/review" : "/requests";
  }
  return true;
});

export default router;
