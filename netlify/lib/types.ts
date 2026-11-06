export interface Context {
  ip?: string;
  waitUntil?: (promise: Promise<unknown>) => void;
}

export interface Config {
  path?: string;
  method?: string | string[];
  schedule?: string;
}
