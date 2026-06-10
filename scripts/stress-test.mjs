#!/usr/bin/env node

const config = {
  baseUrl: env('STRESS_API_URL', 'http://localhost:3001/api').replace(/\/$/, ''),
  durationSeconds: numberEnv('STRESS_DURATION_SECONDS', 60),
  concurrency: numberEnv('STRESS_CONCURRENCY', 10),
  rampUpSeconds: numberEnv('STRESS_RAMP_UP_SECONDS', 10),
  requestTimeoutMs: numberEnv('STRESS_REQUEST_TIMEOUT_MS', 8000),
  userEmail: env('STRESS_USER_EMAIL', 'usuario@example.com'),
  userPassword: env('STRESS_USER_PASSWORD', 'Usuario12345'),
  adminEmail: env('STRESS_ADMIN_EMAIL', 'admin@example.com'),
  adminPassword: env('STRESS_ADMIN_PASSWORD', 'Admin12345'),
  includeWrites: boolEnv('STRESS_INCLUDE_WRITES', false),
  includeAdminRecalculate: boolEnv('STRESS_INCLUDE_ADMIN_RECALCULATE', false),
  predictionRatio: numberEnv('STRESS_PREDICTION_RATIO', 0.05),
  recalculateRatio: numberEnv('STRESS_RECALCULATE_RATIO', 0.01),
};

const metrics = {
  startedAt: new Date(),
  requests: [],
  byScenario: new Map(),
};

const state = {
  userSession: null,
  adminSession: null,
  matches: [],
  rooms: [],
};

async function main() {
  console.log(`Stress target: ${config.baseUrl}`);
  console.log(
    `Duration: ${config.durationSeconds}s | concurrency: ${config.concurrency} | ramp-up: ${config.rampUpSeconds}s`,
  );
  console.log(
    `Writes: ${config.includeWrites ? 'enabled' : 'disabled'} | admin recalculation: ${
      config.includeAdminRecalculate ? 'enabled' : 'disabled'
    }`,
  );

  await bootstrap();

  const deadline = Date.now() + config.durationSeconds * 1000;
  const workers = Array.from({ length: config.concurrency }, (_, index) =>
    worker(index, deadline),
  );

  await Promise.all(workers);
  printReport();
}

async function bootstrap() {
  state.userSession = await login(
    'login:user:bootstrap',
    config.userEmail,
    config.userPassword,
  );
  state.matches = (await request('matches:bootstrap', 'GET', '/matches')).data;

  try {
    state.rooms = (
      await request('rooms:bootstrap', 'GET', '/rooms/my', {
        session: state.userSession,
      })
    ).data;
  } catch {
    state.rooms = [];
  }

  if (config.includeAdminRecalculate) {
    state.adminSession = await login(
      'login:admin:bootstrap',
      config.adminEmail,
      config.adminPassword,
    );
  }
}

async function worker(index, deadline) {
  const rampDelay = Math.round(
    (index / Math.max(config.concurrency, 1)) * config.rampUpSeconds * 1000,
  );
  await sleep(rampDelay);

  while (Date.now() < deadline) {
    const scenario = chooseScenario();

    try {
      await scenario();
    } catch {
      // Each request records its own failure. Keep the worker alive.
    }
  }
}

function chooseScenario() {
  const roll = Math.random();

  if (
    config.includeAdminRecalculate &&
    state.adminSession &&
    roll < config.recalculateRatio
  ) {
    return recalculateScores;
  }

  if (
    config.includeWrites &&
    state.userSession &&
    state.matches.length > 0 &&
    roll < config.recalculateRatio + config.predictionRatio
  ) {
    return createPrediction;
  }

  const readScenarios = [
    listMatches,
    listGlobalRanking,
    listRoomPodium,
    listMyRooms,
    refreshMe,
  ];

  return readScenarios[Math.floor(Math.random() * readScenarios.length)];
}

async function login(label, email, password) {
  const response = await request(label, 'POST', '/auth/login', {
    body: { email, password },
  });

  return response.session;
}

async function listMatches() {
  await request('matches:list', 'GET', '/matches');
}

async function listGlobalRanking() {
  await request('rankings:global', 'GET', '/rankings/global');
}

async function listRoomPodium() {
  if (state.rooms.length === 0) {
    await listGlobalRanking();
    return;
  }

  const room = state.rooms[Math.floor(Math.random() * state.rooms.length)];
  await request('rankings:room-podium', 'GET', `/rankings/rooms/${room.id}/podium`, {
    session: state.userSession,
  });
}

async function listMyRooms() {
  await request('rooms:my', 'GET', '/rooms/my', {
    session: state.userSession,
  });
}

async function refreshMe() {
  await request('auth:me', 'GET', '/auth/me', {
    session: state.userSession,
  });
}

async function createPrediction() {
  const candidates = state.matches.filter((match) => match.status === 'SCHEDULED');

  if (candidates.length === 0) {
    await listMatches();
    return;
  }

  const match = candidates[Math.floor(Math.random() * candidates.length)];
  await request('predictions:create', 'POST', '/predictions', {
    session: state.userSession,
    expectedStatuses: [201, 409, 422],
    body: {
      matchId: match.id,
      predictionType: 'WINNER',
      predictedWinner: Math.random() > 0.5 ? 'HOME' : 'AWAY',
    },
  });
}

async function recalculateScores() {
  await request('admin:scoring-recalculate', 'POST', '/admin/scoring/recalculate', {
    session: state.adminSession,
    expectedStatuses: [201, 200],
  });
}

async function request(label, method, path, options = {}) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeoutMs);
  const expectedStatuses = options.expectedStatuses ?? [200, 201, 204];
  const headers = {
    Accept: 'application/json',
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...(options.session?.cookie ? { Cookie: options.session.cookie } : {}),
    ...(options.session?.csrf ? { 'X-CSRF-Token': options.session.csrf } : {}),
  };

  try {
    const response = await fetch(`${config.baseUrl}${path}`, {
      method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
    const durationMs = performance.now() - startedAt;
    const responseBody = await readBody(response);
    const session = buildSession(response, options.session);
    const ok = expectedStatuses.includes(response.status);

    record(label, durationMs, ok, response.status);

    if (!ok) {
      const error = new Error(
        `${label} returned ${response.status}: ${responseBody.text}`,
      );
      error.recorded = true;
      throw error;
    }

    return {
      data: responseBody.json,
      session,
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;
    if (!error.recorded) {
      record(
        label,
        durationMs,
        false,
        error.name === 'AbortError' ? 'timeout' : 'error',
      );
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function readBody(response) {
  const text = await response.text();

  if (!text) {
    return { text, json: null };
  }

  try {
    return { text, json: JSON.parse(text) };
  } catch {
    return { text, json: null };
  }
}

function buildSession(response, previousSession) {
  const setCookie = response.headers.getSetCookie
    ? response.headers.getSetCookie()
    : splitSetCookie(response.headers.get('set-cookie'));

  if (setCookie.length === 0) {
    return previousSession ?? null;
  }

  const cookies = new Map();

  for (const cookie of previousSession?.cookie?.split('; ') ?? []) {
    const [name, value] = cookie.split('=');
    if (name && value) {
      cookies.set(name, value);
    }
  }

  for (const cookie of setCookie) {
    const [pair] = cookie.split(';');
    const [name, value] = pair.split('=');
    if (name && value) {
      cookies.set(name, value);
    }
  }

  return {
    cookie: [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join('; '),
    csrf: cookies.get('wcpp_csrf') ?? previousSession?.csrf ?? null,
  };
}

function splitSetCookie(header) {
  if (!header) {
    return [];
  }

  return header.split(/,(?=\s*[^;,]+=)/);
}

function record(label, durationMs, ok, status) {
  const item = { label, durationMs, ok, status };
  metrics.requests.push(item);

  const bucket = metrics.byScenario.get(label) ?? {
    count: 0,
    errors: 0,
    statuses: new Map(),
    durations: [],
  };

  bucket.count += 1;
  bucket.errors += ok ? 0 : 1;
  bucket.statuses.set(status, (bucket.statuses.get(status) ?? 0) + 1);
  bucket.durations.push(durationMs);
  metrics.byScenario.set(label, bucket);
}

function printReport() {
  const finishedAt = new Date();
  const elapsedSeconds = (finishedAt.getTime() - metrics.startedAt.getTime()) / 1000;
  const total = metrics.requests.length;
  const errors = metrics.requests.filter((requestItem) => !requestItem.ok).length;
  const durations = metrics.requests.map((requestItem) => requestItem.durationMs);

  console.log('\nStress test report');
  console.log('==================');
  console.log(`Started: ${metrics.startedAt.toISOString()}`);
  console.log(`Finished: ${finishedAt.toISOString()}`);
  console.log(`Requests: ${total}`);
  console.log(`Errors: ${errors}`);
  console.log(`Throughput: ${(total / elapsedSeconds).toFixed(2)} req/s`);
  console.log(`Latency p50: ${percentile(durations, 50).toFixed(1)} ms`);
  console.log(`Latency p95: ${percentile(durations, 95).toFixed(1)} ms`);
  console.log(`Latency p99: ${percentile(durations, 99).toFixed(1)} ms`);

  console.log('\nBy scenario');
  for (const [label, bucket] of [...metrics.byScenario.entries()].sort()) {
    const statuses = [...bucket.statuses.entries()]
      .map(([status, count]) => `${status}:${count}`)
      .join(', ');
    console.log(
      `${label.padEnd(28)} count=${String(bucket.count).padStart(5)} errors=${String(
        bucket.errors,
      ).padStart(4)} p95=${percentile(bucket.durations, 95).toFixed(1).padStart(7)}ms statuses=[${statuses}]`,
    );
  }
}

function percentile(values, target) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((first, second) => first - second);
  const index = Math.ceil((target / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function env(name, fallback) {
  return process.env[name] ?? fallback;
}

function numberEnv(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function boolEnv(name, fallback) {
  const value = process.env[name];

  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((error) => {
  console.error(error.name, error.message);
  process.exitCode = 1;
});
