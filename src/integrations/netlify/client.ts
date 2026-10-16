import { getUser, login, logout, signup, onAuthChange } from "@netlify/identity";

export type AppUser = {
  id: string;
  email?: string | undefined;
  user_metadata: Record<string, any>;
};
const normalize = (user: Awaited<ReturnType<typeof getUser>>): AppUser | null =>
  user ? { id: user.id, email: user.email, user_metadata: user.userMetadata || {} } : null;
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
  const response = await fetch("/api/gochati-data", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const value = await response.json();
  if (!response.ok) throw new Error(value.message || "Imeshindikana kuhifadhi taarifa.");
  return value.data;
}
// A small query interface keeps the existing browser experience independent of storage.
class Query implements PromiseLike<any> {
  private operation = "select";
  private filters: Record<string, unknown> = {};
  private payload: unknown;
  private one = false;
  private sort: { column: string; ascending: boolean } | undefined;
  private count = 100;
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
      }),
    ).then(onfulfilled, onrejected);
  }
}
export const platform = {
  auth: {
    getUser: async () => ({ data: { user: normalize(await getUser()) }, error: null }),
    signInWithPassword: ({ email, password }: { email: string; password: string }) =>
      result(() => login(email, password)),
    signUp: async ({
      email,
      password,
      options,
    }: {
      email: string;
      password: string;
      options: { data: Record<string, unknown> };
    }) => {
      try {
        const user = await signup(email, password, options.data);
        return { data: { user: normalize(user), session: await getUser() }, error: null };
      } catch (cause) {
        return {
          data: { user: null, session: null },
          error: cause instanceof Error ? cause : new Error("Usajili umeshindwa."),
        };
      }
    },
    signOut: () => result(logout),
    onAuthStateChange: (
      callback: (event: string, session: { user: AppUser | null } | null) => void,
    ) => ({
      data: {
        subscription: {
          unsubscribe: onAuthChange((event, user) =>
            callback(event, user ? { user: normalize(user) } : null),
          ),
        },
      },
    }),
  },
  from: (table: string) => new Query(table),
  rpc: (name: string, args: Record<string, unknown>) => result(() => api({ rpc: name, args })),
};
