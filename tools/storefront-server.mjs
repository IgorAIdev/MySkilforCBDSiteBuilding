/*
 * Витрина скилла на сервере заказчика (Coolify) — И434.
 *
 * Это витрина скилла, не магазин: своё приложение в своём проекте Coolify
 * («skill»), к cbdin и cbdshop, их репозиторию и приложениям отношения не
 * имеет. Команда для сессии, у которой есть ключ сервера — облачной
 * (переменные окружения сессии COOLIFY_URL и COOLIFY_TOKEN); на машине
 * заказчика ключа нет.
 *
 *   1. нет COOLIFY_URL или COOLIFY_TOKEN — сказать, откуда их взять, и выйти;
 *   2. приложение витрины уже есть (по репозиторию набора) — выкатить заново;
 *   3. нет — завести проект «skill» (если его нет) и в нём приложение из
 *      репозитория набора: сборка deploy/storefront.Dockerfile, порт 3000,
 *      потолок памяти 1 ГБ и одно ядро, адрес skill.<ip>.sslip.io, ветка main;
 *   4. дождаться конца выката и напечатать адрес.
 *
 *   npm run storefront:server              завести или выкатить, дождаться
 *   npm run storefront:server -- --status  где стоит, без выката
 *   … --domain cbdin.ro                    витрина — на этом адресе (и www.): его
 *                                          снимают с приложения, где он стоит сейчас,
 *                                          то выкатывают заново, прочие его адреса
 *                                          остаются; www ведёт на адрес без www
 *
 * Адрес cbdin.ro заказчик отдал витрине скилла 26.09.2026: «то что сейчас там
 * стоит можно заменить» — там стояла заготовка третьей витрины магазина.
 *
 * Выкат по влитию: если GitHub-приложение Coolify видит репозиторий набора,
 * приложение заводится через него, и влитие в main, задевшее витрину
 * (WATCH ниже), выкатывает её само. Не видит — заводится как публичный
 * репозиторий, и выкатывает эта команда.
 */

import { lookup } from 'node:dns/promises'

const REPO = 'IgorAIdev/SiteBuildingSkill'
const PROJECT = 'skill'
const NAME = 'skill-storefront'
const WATCH = ['templates/storefront/**', 'showcase/**', 'styles/**', 'tools/**', 'install.mjs', 'deploy/storefront.Dockerfile']
const say = (line) => console.log(`[storefront:server] ${line}`)
const args = process.argv.slice(2)
const opt = (flag) => { const i = args.indexOf(flag); return i >= 0 ? args[i + 1] : undefined }

const BASE = process.env.COOLIFY_URL?.replace(/\/+$/, '')
const TOKEN = process.env.COOLIFY_TOKEN
if (!BASE || !TOKEN) {
  console.error('✗ Нет COOLIFY_URL или COOLIFY_TOKEN. Они заданы в окружении облачной сессии магазина')
  console.error('  (CBD_ecommerce_eu, OPERATIONS.md, «Операции на проде»): откройте витрину скилла в той же')
  console.error('  облачной среде или добавьте обе переменные в её настройки. Сам ключ в чат и в репозиторий не кладётся.')
  process.exit(2)
}

async function api(method, path, body) {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    method,
    headers: { authorization: `Bearer ${TOKEN}`, accept: 'application/json', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  let data = text
  try { data = JSON.parse(text) } catch { /* ответ не JSON — отдаётся текстом */ }
  if (!res.ok) throw new Error(`${method} ${path} — ${res.status}: ${(typeof data === 'string' ? data : JSON.stringify(data)).slice(0, 400)}`)
  return data
}

/** Адреса списком: `https://a,https://b` → ['https://a', 'https://b']. */
const urls = (list) => String(list ?? '').split(',').map((u) => u.trim()).filter(Boolean)
const hostOf = (url) => url.replace(/^https?:\/\//, '').split(/[/:]/)[0]
/** Адреса служб приложения из docker compose: строка JSON или объект → [{ name, domain }]. */
function services(app) {
  let c = app.docker_compose_domains
  if (typeof c === 'string') { try { c = JSON.parse(c) } catch { c = null } }
  return c && typeof c === 'object' ? Object.entries(c).map(([name, v]) => ({ name, domain: v?.domain ?? '' })) : []
}
const holds = (app, hosts) => [app.fqdn, ...services(app).map((x) => x.domain)].some((list) => urls(list).some((u) => hosts.includes(hostOf(u))))

const mine = (apps) => apps.find((a) => (a.git_repository ?? '').toLowerCase().includes(REPO.toLowerCase()))

/** Адрес сервера для имени sslip.io: свой IP сервера, а если он внутренний — IP имени панели. */
async function publicIp(server) {
  if (/^\d+\.\d+\.\d+\.\d+$/.test(server.ip ?? '') && !/^(10|127|172\.(1[6-9]|2\d|3[01])|192\.168)\./.test(server.ip)) return server.ip
  return (await lookup(new URL(BASE).hostname, { family: 4 })).address
}

async function create(domains) {
  const servers = await api('GET', '/servers')
  if (!servers.length) throw new Error('у Coolify нет ни одного сервера')
  const server = servers.length === 1 ? servers[0] : servers.find((s) => s.uuid === process.env.COOLIFY_SERVER)
  if (!server) throw new Error(`серверов несколько (${servers.map((s) => `${s.name} ${s.uuid}`).join(', ')}) — назовите нужный: COOLIFY_SERVER=<uuid>`)
  const projects = await api('GET', '/projects')
  const project = projects.find((p) => p.name === PROJECT) ?? await api('POST', '/projects', { name: PROJECT, description: 'Витрина скилла SiteBuildingSkill — шаблон, не магазин' })
  const ip = await publicIp(server)
  const common = {
    project_uuid: project.uuid,
    server_uuid: server.uuid,
    environment_name: 'production',
    git_branch: 'main',
    build_pack: 'dockerfile',
    dockerfile_location: '/deploy/storefront.Dockerfile',
    ports_exposes: '3000',
    domains: domains ?? `https://skill.${ip.replaceAll('.', '-')}.sslip.io`,
    name: NAME,
    description: 'Витрина скилла из templates/storefront (npm run storefront:server)',
    watch_paths: WATCH.join('\n'),
    limits_memory: '1g',
    limits_cpus: '1',
    instant_deploy: false,
  }
  const apps = await api('GET', '/github-apps').catch(() => [])
  for (const gh of apps.filter((a) => !a.is_public)) {
    try {
      const made = await api('POST', '/applications/private-github-app', { ...common, github_app_uuid: gh.uuid, git_repository: REPO })
      say(`приложение заведено через GitHub-приложение «${gh.name}»: влитие в main выкатывает его само`)
      return made.uuid
    } catch (e) { say(`через GitHub-приложение «${gh.name}» не вышло (${e.message.slice(0, 160)})`) }
  }
  const made = await api('POST', '/applications/public', { ...common, git_repository: `https://github.com/${REPO}` })
  say('приложение заведено как публичный репозиторий: выкатывает npm run storefront:server')
  return made.uuid
}

async function waitFor(deployment) {
  const started = Date.now()
  let last = ''
  while (Date.now() - started < 30 * 60_000) {
    const d = await api('GET', `/deployments/${deployment}`)
    if (d.status !== last) say(`выкат: ${(last = d.status)}`)
    if (['finished', 'success'].includes(d.status)) return true
    if (/fail|cancel|error/.test(d.status ?? '')) return false
    await new Promise((done) => setTimeout(done, 10_000))
  }
  say('выкат идёт дольше 30 минут — смотрите его в панели Coolify')
  return false
}

async function deploy(uuid) {
  const queued = await api('GET', `/deploy?uuid=${uuid}`)
  const deployment = queued.deployments?.[0]?.deployment_uuid
  if (!deployment) throw new Error(`выкат не встал в очередь: ${JSON.stringify(queued).slice(0, 300)}`)
  say('выкат в очереди: сборки на сервере идут по одной — может подождать сборку магазина')
  return waitFor(deployment)
}

/** Снять адреса с чужого приложения: прочие его адреса остаются. Снялось ли —
 *  проверяется повторным чтением; нет — стоп, витрину не трогать. */
async function release(app, hosts) {
  const keep = (list) => urls(list).filter((u) => !hosts.includes(hostOf(u))).join(',')
  if (urls(app.fqdn).some((u) => hosts.includes(hostOf(u)))) await api('PATCH', `/applications/${app.uuid}`, { domains: keep(app.fqdn) })
  const svc = services(app)
  if (svc.some((x) => urls(x.domain).some((u) => hosts.includes(hostOf(u))))) {
    await api('PATCH', `/applications/${app.uuid}`, { docker_compose_domains: svc.map((x) => ({ name: x.name, domain: keep(x.domain) })) })
  }
  if (holds(await api('GET', `/applications/${app.uuid}`), hosts)) throw new Error(`адрес не снялся с «${app.name}» — снимите его в панели Coolify (${BASE}) и повторите`)
}

const domain = opt('--domain')?.replace(/^https?:\/\//, '').split('/')[0]
const hosts = domain ? (domain.startsWith('www.') ? [domain] : [domain, `www.${domain}`]) : []
/* Адреса служб docker compose список приложений может не отдавать — такие читаются целиком. */
const apps = await Promise.all((await api('GET', '/applications')).map((a) => (a.build_pack === 'dockercompose' && !('docker_compose_domains' in a) ? api('GET', `/applications/${a.uuid}`) : a)))
const found = mine(apps)
if (args.includes('--status')) {
  say(found ? `${found.name}: ${found.fqdn} — ${found.status}` : 'витрины скилла на сервере ещё нет')
} else {
  for (const app of apps.filter((a) => a.uuid !== found?.uuid && holds(a, hosts))) {
    say(`${hosts.join(', ')} стоит на «${app.name}» — снимаю и выкатываю его заново; прочие его адреса остаются`)
    await release(app, hosts)
    if (!(await deploy(app.uuid))) throw new Error(`«${app.name}» не выкатился после снятия адреса — смотрите в панели Coolify (${BASE})`)
  }
  const domains = hosts.length ? hosts.map((h) => `https://${h}`).join(',') : undefined
  const uuid = found?.uuid ?? await create(domains)
  if (domains && (found ? urls(found.fqdn).join(',') !== domains : true)) {
    await api('PATCH', `/applications/${uuid}`, { domains, redirect: 'non-www' })
    say(`адрес витрины: ${hosts[0]} (www ведёт туда же)`)
  }
  const ok = await deploy(uuid)
  const app = await api('GET', `/applications/${uuid}`)
  say(ok ? `готово: ${app.fqdn}` : `выкат не удался — журнал в панели Coolify: ${BASE}`)
  process.exitCode = ok ? 0 : 1
}
