// Node's own modules, declared here rather than pulling @types/node into the
// whole project: its globals would shadow React Native's in every other file.
declare const require: (id: string) => any;
declare const __dirname: string;
const fs = require("fs") as { readFileSync: (p: string, encoding: string) => string };
const path = require("path") as { join: (...parts: string[]) => string };
const vm = require("vm") as { createContext: (o: object) => void; runInContext: (code: string, ctx: object) => void };

// public/sw.js is what makes the installed web app open without a network, and
// nothing else in the test suite touches it: it runs in the browser's service
// worker, not in the app. So run it here in a sandbox with stand-ins for
// caches, fetch and self, and check the two strategies it promises.

const SRC = fs.readFileSync(path.join(__dirname, "../../public/sw.js"), "utf8");
const ORIGIN = "https://gymit.web.app";

type FakeResponse = { body: string; ok: boolean; clone: () => FakeResponse };
type Listener = (event: FakeEvent) => void;
type FakeEvent = {
  request?: { url: string; mode: string; method: string };
  waitUntil: (p: Promise<unknown>) => void;
  respondWith: (p: Promise<FakeResponse>) => void;
  responded?: Promise<FakeResponse>;
};

const res = (body: string, ok = true): FakeResponse => ({ body, ok, clone: () => res(body, ok) });

const waits: Promise<unknown>[] = [];
// Lets the worker's own then-chains (its cache writes) finish before we look.
const settle = async () => {
  await Promise.all(waits.splice(0));
  await new Promise((r) => setTimeout(r, 10));
};

function makeEnv({ offline = false, preCached = {} }: { offline?: boolean; preCached?: Record<string, Record<string, string>> } = {}) {
  const stores = new Map<string, Map<string, FakeResponse>>();
  const store = (name: string) => {
    if (!stores.has(name)) stores.set(name, new Map());
    return stores.get(name)!;
  };

  const caches = {
    open: async (name: string) => ({
      addAll: async (urls: string[]) => urls.forEach((u) => store(name).set(u, res("cached:" + u))),
      put: async (req: string | { url: string }, r: FakeResponse) => store(name).set(typeof req === "string" ? req : req.url, r),
    }),
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
    match: async (req: string | { url: string }) => {
      const key = typeof req === "string" ? req : req.url;
      for (const s of stores.values()) if (s.has(key)) return s.get(key);
      return undefined;
    },
  };
  for (const [name, entries] of Object.entries(preCached)) {
    store(name);
    for (const [k, v] of Object.entries(entries)) store(name).set(k, res(v));
  }

  const fetched: string[] = [];
  const listeners: Record<string, Listener> = {};
  const sandbox = {
    self: {
      addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
      skipWaiting: async () => {},
      clients: { claim: async () => {} },
      location: { origin: ORIGIN },
    },
    caches,
    fetch: async (req: string | { url: string }) => {
      const url = typeof req === "string" ? req : req.url;
      fetched.push(url);
      if (offline) throw new Error("offline");
      return res("network:" + url);
    },
    URL,
    Response: { error: () => res("error", false) },
    setTimeout,
    Promise,
  };
  vm.createContext(sandbox);
  vm.runInContext(SRC, sandbox);
  return { listeners, stores, fetched, caches };
}

// Stands in for the event the browser hands each listener.
const evt = (request?: FakeEvent["request"]): FakeEvent => {
  const e: FakeEvent = { request, waitUntil: (p) => waits.push(p), respondWith: () => {} };
  e.respondWith = (p) => (e.responded = p);
  return e;
};
const req = (url: string, { mode = "no-cors", method = "GET" } = {}) => ({ url, mode, method });

describe("service worker", () => {
  test("install puts the app shell in the cache", async () => {
    const env = makeEnv();
    env.listeners.install(evt());
    await settle();
    expect(await env.caches.match("/index.html")).toBeDefined();
    expect(await env.caches.match("/manifest.json")).toBeDefined();
  });

  test("activate clears out older versions and keeps this one", async () => {
    const env = makeEnv({ preCached: { "gymit-old": { "/stale.js": "x" }, "gymit-v1": {} } });
    env.listeners.activate(evt());
    await settle();
    expect([...env.stores.keys()]).toEqual(["gymit-v1"]);
  });

  test("a page load goes to the network and refreshes the cached shell", async () => {
    const env = makeEnv();
    const e = evt(req(`${ORIGIN}/history`, { mode: "navigate" }));
    env.listeners.fetch(e);
    expect((await e.responded!).body).toBe(`network:${ORIGIN}/history`);
    await settle();
    expect((await env.caches.match("/index.html"))!.body).toContain("network:");
  });

  test("with no network, a page load falls back to the cached shell", async () => {
    const env = makeEnv({ offline: true, preCached: { "gymit-v1": { "/index.html": "shell" } } });
    const e = evt(req(`${ORIGIN}/workout/abc`, { mode: "navigate" }));
    env.listeners.fetch(e);
    expect((await e.responded!).body).toBe("shell");
  });

  test("a hashed asset is served from the cache without touching the network", async () => {
    const url = `${ORIGIN}/_expo/static/js/web/entry-abc.js`;
    const env = makeEnv({ preCached: { "gymit-v1": { [url]: "bundle" } } });
    const e = evt(req(url));
    env.listeners.fetch(e);
    expect((await e.responded!).body).toBe("bundle");
    expect(env.fetched).toEqual([]);
  });

  test("a missing asset is fetched once and kept", async () => {
    const url = `${ORIGIN}/icons/icon-192.png`;
    const env = makeEnv();
    const e = evt(req(url));
    env.listeners.fetch(e);
    expect((await e.responded!).body).toContain("network:");
    await settle();
    expect(await env.caches.match(url)).toBeDefined();
  });

  test("leaves everything it has no business caching alone", async () => {
    const env = makeEnv();
    // Firestore and Auth have to reach the network, every time.
    const other = evt(req("https://firestore.googleapis.com/v1/projects/x", { mode: "cors" }));
    env.listeners.fetch(other);
    expect(other.responded).toBeUndefined();

    const post = evt(req(`${ORIGIN}/api`, { method: "POST" }));
    env.listeners.fetch(post);
    expect(post.responded).toBeUndefined();

    // Nothing under /_expo/, /assets/ or /icons/ is content-hashed, so it is
    // not safe to keep.
    const unhashed = evt(req(`${ORIGIN}/metadata.json`));
    env.listeners.fetch(unhashed);
    expect(unhashed.responded).toBeUndefined();
  });
});
