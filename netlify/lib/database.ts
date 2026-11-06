import postgres from "postgres";

let sqlClient: ReturnType<typeof postgres> | undefined;

function sql() {
  if (!sqlClient) {
    const connectionString =
      process.env.POSTGRES_URL_NON_POOLING ??
      process.env.POSTGRES_URL ??
      process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("Supabase Postgres connection is not configured.");
    }
    sqlClient = postgres(connectionString, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return sqlClient;
}

export function getDatabase() {
  return {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => sql()(strings, ...values),
    pool: {
      query: async (text: string, values: unknown[] = []) => ({
        rows: await sql().unsafe(text, values),
      }),
    },
  };
}
