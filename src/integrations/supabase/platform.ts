import { supabase } from "../supabase/client";

export type AppUser = {
  id: string;
  email?: string | undefined;
  user_metadata: Record<string, any>;
};
const normalize = (user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
} | null): AppUser | null =>
  user ? { id: user.id, email: user.email, user_metadata: user.user_metadata || {} } : null;
async function result(action: () => Promise<unknown>) {
  try {
    return { data: await action(), error: null };
  } catch (cause) {
    return {
      data: null,
      error: cause instanceof Error ? cause : new Error("Huduma haipatikani. Jaribu tena."),
    };
  }
}
export async function api(body: Record<string, unknown>) {
  const { data: sessionData } = await supabase.auth.getSession();
  const response = await fetch("/api/gochati-data", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionData.session?.access_token
        ? { Authorization: `Bearer ${sessionData.session.access_token}` }
        : {}),
    },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || "Imeshindikana kuhifadhi taarifa.");
  return value.data;
}
async function authRequest(body: Record<string, unknown>) {
  await supabase.auth.signOut();
  const response = await fetch("/api/gochati-auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error("Huduma ya usajili haipatikani kwa sasa. Jaribu tena baadaye.");
  }
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || "Imeshindikana kuingia.");
  if (value.data?.session) {
    const { error } = await supabase.auth.setSession(value.data.session);
    if (error) throw error;
  }
  return (await supabase.auth.getUser()).data.user;
}
// A small query interface keeps the existing browser experience independent of storage.
class Query implements PromiseLike<any> {
  private operation = "select";
  private filters: Record<string, unknown> = {};
  private payload: unknown;
  private one = false;
  private sort: { column: string; ascending: boolean } | undefined;
  private count = 100;
  private searchTerm = "";
  constructor(private table: string) {}
  select(_columns?: string) {
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters[column] = value;
    return this;
  }
  order(column: string, options: { ascending: boolean }) {
    this.sort = { column, ...options };
    return this;
  }
  limit(count: number) {
    this.count = count;
    return this;
  }
  search(value: string) {
    this.searchTerm = value;
    return this;
  }
  maybeSingle() {
    this.one = true;
    return this;
  }
  single() {
    this.one = true;
    return this;
  }
  insert(payload: unknown) {
    this.operation = "insert";
    this.payload = payload;
    return this;
  }
  update(payload: unknown) {
    this.operation = "update";
    this.payload = payload;
    return this;
  }
  then<TResult1 = any, TResult2 = never>(
    onfulfilled?: ((value: any) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return result(() =>
      api({
        table: this.table,
        operation: this.operation,
        filters: this.filters,
        payload: this.payload,
        one: this.one,
        sort: this.sort,
        limit: this.count,
        search: this.searchTerm,
      }),
    ).then(onfulfilled, onrejected);
  }
}
export const platform = {
  auth: {
    getUser: async () => {
      const { data, error } = await supabase.auth.getUser();
      return { data: { user: normalize(data.user) }, error };
    },
    signInWithPassword: ({ email, password }: { email: string; password: string }) =>
      result(async () => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
      }),
    signInWithUsername: ({ username, password }: { username: string; password: string }) =>
      result(() => authRequest({ action: "login", username, password })),
    signUp: async ({
      email,
      password,
      options,
      agreeTerms,
    }: {
      email: string;
      password: string;
      options: { data: Record<string, unknown> };
      agreeTerms: boolean;
    }) => {
      try {
        const user = await authRequest({
          action: "register",
          email,
          password,
          username: options.data["username"],
          metadata: options.data,
          agree_terms: agreeTerms,
        });
        const { data: sessionData } = await supabase.auth.getSession();
        return { data: { user: normalize(user), session: sessionData.session }, error: null };
      } catch (cause) {
        return {
          data: { user: null, session: null },
          error: cause instanceof Error ? cause : new Error("Usajili umeshindwa."),
        };
      }
    },
    signOut: () =>
      result(async () => {
        // Stop this browser's admin notifications before discarding its authenticated session.
        if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          try {
            const registration = await navigator.serviceWorker.getRegistration("/");
            const subscription = await registration?.pushManager?.getSubscription();
            if (subscription) {
              try {
                await fetch("/api/gochati-support", {
                  method: "POST",
                  credentials: "same-origin",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    action: "unsubscribe",
                    subscription: subscription.toJSON(),
                  }),
                });
              } finally {
                await subscription.unsubscribe();
              }
            }
          } catch {
            /* Logout remains available if the push service is unreachable. */
          }
        }
        return supabase.auth.signOut();
      }),
    onAuthStateChange: (
      callback: (event: string, session: { user: AppUser | null } | null) => void,
    ) => ({
      data: {
        subscription: {
            unsubscribe: supabase.auth.onAuthStateChange((event, session) =>
            callback(event, session ? { user: normalize(session.user) } : null),
          ),
        },
      },
    }),
  },
  from: (table: string) => new Query(table),
  rpc: (name: string, args: Record<string, unknown>) => result(() => api({ rpc: name, args })),
};
