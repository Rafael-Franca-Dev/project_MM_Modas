// =========================================================
// Cliente HTTP da API MM MODAS (com sincronização automática e fallback local)
// ---------------------------------------------------------
// Conecta o Front-end ao Back-end Spring Boot (http://localhost:8080/api).
// Sincroniza automaticamente contas e pedidos com o banco PostgreSQL (Neon),
// mantendo fallback local caso o servidor Java esteja desligado.
// =========================================================
import { products as localProducts, categories as localCategories } from '../data/products.js'
import { calcularFreteLocal, CUPONS, FRETE_GRATIS_A_PARTIR } from '../context/cartConfig.js'
import { onlyDigits } from '../utils/validators.js'

const API_BASE_URL = import.meta.env?.VITE_API_URL ?? 'http://localhost:8080/api'
const TOKEN_KEY = 'mm-modas:tokens'
const LOCAL_ACCOUNTS_KEY = 'mm-modas:contas-locais'
const LOCAL_ORDERS_KEY = 'mm-modas:pedidos-locais'
const STAFF_MATRICULAS_KEY = 'mm-modas:matriculas-equipe'
const CUSTOM_CATEGORIES_KEY = 'mm-modas:categorias-custom'
const PRODUCT_OVERRIDES_KEY = 'mm-modas:produtos-comercial'

export function getSavedTokens() {
  try {
    const raw = localStorage.getItem(TOKEN_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveTokens(tokens) {
  try {
    if (tokens) localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens))
    else localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* ignora se localStorage estiver bloqueado */
  }
}

async function rawFetch(path, options = {}, timeoutMs = 15000, accessTokenOverride = null) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const tokens = getSavedTokens()
  const bearer = accessTokenOverride ?? tokens?.accessToken

  const headers = {
    'Content-Type': 'application/json',
    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
    ...options.headers,
  }

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    const isJson = response.headers.get('content-type')?.includes('application/json')
    const data = isJson ? await response.json() : null

    if (!response.ok) {
      const error = new Error(data?.mensagem || `Erro HTTP ${response.status}`)
      error.status = response.status
      error.code = data?.codigo
      error.details = data?.detalhes
      error.isHttpError = true
      throw error
    }

    return data
  } finally {
    clearTimeout(timer)
  }
}

async function tryRefreshAccessToken() {
  const tokens = getSavedTokens()
  if (!tokens?.refreshToken) return null
  try {
    const res = await rawFetch(
      '/auth/refresh',
      {
        method: 'POST',
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      },
      10000,
    )
    if (res?.accessToken) {
      saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
      return res.accessToken
    }
    return null
  } catch {
    saveTokens(null)
    return null
  }
}

async function request(path, options = {}, timeoutMs = 15000) {
  try {
    return await rawFetch(path, options, timeoutMs)
  } catch (err) {
    if (err.status === 401 && !path.startsWith('/auth/')) {
      const newAccess = await tryRefreshAccessToken()
      if (newAccess) {
        return await rawFetch(path, options, timeoutMs, newAccess)
      }
    }
    throw err
  }
}

// ---------- Contas locais (Backup e sincronização com a API) ----------
function loadLocalAccounts() {
  try {
    const saved = localStorage.getItem(LOCAL_ACCOUNTS_KEY)
    const parsed = saved ? JSON.parse(saved) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLocalAccounts(accounts) {
  try {
    localStorage.setItem(LOCAL_ACCOUNTS_KEY, JSON.stringify(accounts))
  } catch {
    /* sem armazenamento */
  }
}

function upsertLocalAccount(record) {
  if (!record?.email) return
  const emailLower = record.email.trim().toLowerCase()
  const accounts = loadLocalAccounts()
  const existingIdx = accounts.findIndex((a) => a.email?.toLowerCase() === emailLower)
  if (existingIdx >= 0) {
    accounts[existingIdx] = { ...accounts[existingIdx], ...record, email: emailLower }
    saveLocalAccounts(accounts)
  } else {
    saveLocalAccounts([...accounts, { ...record, email: emailLower }])
  }
}

function loadStaffMatriculas() {
  try {
    const raw = localStorage.getItem(STAFF_MATRICULAS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function saveStaffMatricula(email, matricula) {
  if (!email || !matricula) return
  try {
    const map = loadStaffMatriculas()
    map[email.trim().toLowerCase()] = matricula
    localStorage.setItem(STAFF_MATRICULAS_KEY, JSON.stringify(map))
  } catch {
    /* sem armazenamento */
  }
}

function normalizeBackendUser(usuario, extra = {}) {
  const end = usuario.enderecoPrincipal
  const savedMatricula = loadStaffMatriculas()[usuario.email?.toLowerCase()]
  const matricula = extra.matricula ?? savedMatricula
  return {
    id: usuario.id,
    tipo: extra.tipo ?? (usuario.perfil === 'ADMIN' || matricula ? 'funcionario' : 'cliente'),
    nome: usuario.nome,
    email: usuario.email,
    cpf: usuario.cpf ?? extra.cpf ?? '',
    telefone: usuario.telefone ?? extra.telefone ?? '',
    matricula,
    enderecoId: end?.id ?? extra.enderecoId ?? null,
    cep: end?.cep ?? extra.cep ?? '',
    endereco: end?.logradouro ?? extra.endereco ?? '',
    numero: end?.numero ?? extra.numero ?? '',
    complemento: end?.complemento ?? extra.complemento ?? '',
    bairro: end?.bairro ?? extra.bairro ?? '',
    cidade: end?.cidade ?? extra.cidade ?? '',
    uf: end?.uf ?? extra.uf ?? '',
    criadoEm: usuario.criadoEm ?? new Date().toISOString(),
    origem: 'api',
  }
}

function buildRegisterPayload(source, deliveryFallback = null) {
  const cpfDigits = onlyDigits(source.cpf || '')
  const cepDigits = onlyDigits(source.cep || deliveryFallback?.cep || '')
  const isStaff = source.tipo === 'funcionario'
  const logradouro = (source.endereco || deliveryFallback?.endereco || '').trim()
  const numero = (source.numero || deliveryFallback?.numero || '').trim()
  const bairro = (source.bairro || deliveryFallback?.bairro || '').trim()
  const cidade = (source.cidade || deliveryFallback?.cidade || '').trim()
  const uf = (source.uf || deliveryFallback?.uf || '').trim().toUpperCase()
  const hasValidAddress = cepDigits.length === 8 && logradouro && numero && bairro && cidade && uf.length === 2

  return {
    nome: (source.nome || deliveryFallback?.nome || 'Cliente MM Modas').trim(),
    email: source.email.trim().toLowerCase(),
    senha:
      source.senha && source.senha.length >= 9
        ? source.senha
        : 'MmModas#Forte9',
    cpf: cpfDigits.length === 11 ? cpfDigits : null,
    telefone: source.telefone || '(81) 99999-9999',
    matricula: isStaff && source.matricula ? source.matricula.trim() : null,
    endereco: hasValidAddress
      ? {
          apelido: 'Principal',
          destinatario: (source.nome || deliveryFallback?.nome || 'Cliente MM Modas').trim(),
          cep: cepDigits,
          logradouro,
          numero,
          complemento: (source.complemento ?? deliveryFallback?.complemento)?.trim() || null,
          bairro,
          cidade,
          uf,
          principal: true,
        }
      : null,
  }
}

// ---------- Autenticação e Sincronização ----------
export async function apiRegister(formData) {
  const isStaff = formData.tipo === 'funcionario'
  if (isStaff && formData.matricula) {
    saveStaffMatricula(formData.email, formData.matricula)
  }

  const { confirmarSenha: _confirmarSenha, ...localRecord } = formData
  const payload = buildRegisterPayload(formData)

  try {
    const res = await request('/auth/registrar', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    const apiUser = normalizeBackendUser(res.usuario, formData)
    upsertLocalAccount({ ...localRecord, ...apiUser, senha: formData.senha, origem: 'api' })
    return apiUser
  } catch (err) {
    // Se já existe no banco com a mesma senha, faz login transparente
    if (err.status === 409 && formData.senha) {
      try {
        const loginRes = await request('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: payload.email, senha: formData.senha }),
        })
        saveTokens({ accessToken: loginRes.accessToken, refreshToken: loginRes.refreshToken })
        const apiUser = normalizeBackendUser(loginRes.usuario, formData)
        upsertLocalAccount({ ...localRecord, ...apiUser, senha: formData.senha, origem: 'api' })
        return apiUser
      } catch {
        throw err
      }
    }

    if (err.isHttpError) throw err

    // Fallback local apenas se o servidor Spring Boot estiver realmente desligado
    const accounts = loadLocalAccounts()
    const emailLower = formData.email.trim().toLowerCase()
    if (accounts.some((a) => a.email.toLowerCase() === emailLower)) {
      throw new Error('Já existe uma conta cadastrada com este e-mail.')
    }

    const newAccount = {
      ...localRecord,
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      email: emailLower,
      criadoEm: new Date().toISOString(),
      origem: 'local',
    }
    saveLocalAccounts([...accounts, newAccount])
    const { senha: _senha, ...safeUser } = newAccount
    return safeUser
  }
}

export async function apiLogin(email, senha) {
  const emailLower = email.trim().toLowerCase()
  const accounts = loadLocalAccounts()
  const localFound = accounts.find((a) => a.email.toLowerCase() === emailLower && a.senha === senha)

  try {
    const res = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailLower, senha }),
    })
    saveTokens({ accessToken: res.accessToken, refreshToken: res.refreshToken })
    const apiUser = normalizeBackendUser(res.usuario, localFound || {})
    upsertLocalAccount({ ...(localFound || {}), ...apiUser, senha, origem: 'api' })
    return apiUser
  } catch (err) {
    // Se a conta foi criada em modo offline no localStorage e ainda não existe no banco,
    // sincroniza automaticamente registrando-a no PostgreSQL agora:
    if (err.status === 401 && localFound) {
      try {
        const payload = buildRegisterPayload(localFound)
        const regRes = await request('/auth/registrar', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveTokens({ accessToken: regRes.accessToken, refreshToken: regRes.refreshToken })
        const apiUser = normalizeBackendUser(regRes.usuario, localFound)
        upsertLocalAccount({ ...localFound, ...apiUser, senha, origem: 'api' })
        return apiUser
      } catch (regErr) {
        if (regErr.isHttpError) throw err
      }
    }

    if (err.isHttpError) throw err

    // Fallback local quando servidor está desligado
    if (!localFound) {
      throw new Error('E-mail ou senha inválidos.')
    }
    const { senha: _senha, ...safeUser } = localFound
    return safeUser
  }
}

/**
 * Garante que um usuário logado (mesmo que tenha sido criado antes em modo local)
 * esteja salvo e autenticado no banco PostgreSQL quando o Back-end estiver ativo.
 */
export async function apiSyncUserSession(user, deliveryFallback = null) {
  if (!user?.email) return null

  const emailLower = user.email.trim().toLowerCase()
  const localAcc = loadLocalAccounts().find((a) => a.email?.toLowerCase() === emailLower)
  const mergedSource = { ...(localAcc || {}), ...user }

  // 1. Se já temos tokens salvos, verifica se a sessão na API continua válida
  const tokens = getSavedTokens()
  if (tokens?.accessToken) {
    try {
      const me = await request('/auth/me', { method: 'GET' })
      if (me?.email?.toLowerCase() === emailLower) {
        const synced = normalizeBackendUser(me, mergedSource)
        upsertLocalAccount({ ...mergedSource, ...synced, origem: 'api' })
        return synced
      }
    } catch {
      /* token expirado ou de outro banco: segue para login/registro */
    }
  }

  // 2. Tenta autenticar com a senha salva localmente
  const candidatePassword = mergedSource.senha || 'MmModas#Forte9'
  try {
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: emailLower, senha: candidatePassword }),
    })
    saveTokens({ accessToken: loginRes.accessToken, refreshToken: loginRes.refreshToken })
    const synced = normalizeBackendUser(loginRes.usuario, mergedSource)
    upsertLocalAccount({ ...mergedSource, ...synced, senha: candidatePassword, origem: 'api' })
    return synced
  } catch (loginErr) {
    // 3. Se não existe no banco (401), registra automaticamente no PostgreSQL
    if (loginErr.status === 401) {
      try {
        const payload = buildRegisterPayload({ ...mergedSource, senha: candidatePassword }, deliveryFallback)
        const regRes = await request('/auth/registrar', {
          method: 'POST',
          body: JSON.stringify(payload),
        })
        saveTokens({ accessToken: regRes.accessToken, refreshToken: regRes.refreshToken })
        const synced = normalizeBackendUser(regRes.usuario, mergedSource)
        upsertLocalAccount({ ...mergedSource, ...synced, senha: candidatePassword, origem: 'api' })
        return synced
      } catch {
        return user
      }
    }
    return user
  }
}

// ---------- Frete e Cupom ----------
export async function apiSimulateShipping(subtotal, uf) {
  if (!subtotal || subtotal <= 0) {
    return { valorFrete: 0, limiteFreteGratis: FRETE_GRATIS_A_PARTIR, freteGratis: true }
  }
  if (!uf || uf.trim().length !== 2) {
    const valor = calcularFreteLocal(subtotal, uf)
    return { valorFrete: valor, limiteFreteGratis: FRETE_GRATIS_A_PARTIR, freteGratis: valor === 0 }
  }

  try {
    return await request('/frete/simular', {
      method: 'POST',
      body: JSON.stringify({ subtotal, uf: uf.trim().toUpperCase() }),
    })
  } catch {
    const valor = calcularFreteLocal(subtotal, uf)
    return { valorFrete: valor, limiteFreteGratis: FRETE_GRATIS_A_PARTIR, freteGratis: valor === 0 }
  }
}

export async function apiValidateCoupon(code) {
  const normalized = code.trim().toUpperCase()
  if (!normalized) return null

  try {
    const data = await request(`/cupons/validar/${encodeURIComponent(normalized)}`, { method: 'GET' })
    const rate = data.tipo === 'PERCENTUAL' ? Number(data.valor) / 100 : 0
    return {
      code: data.codigo,
      rate,
      fixedDiscount: data.tipo === 'VALOR_FIXO' ? Number(data.valor) : 0,
      freeShipping: Boolean(data.freteGratis),
    }
  } catch (err) {
    if (err.isHttpError) return null
    if (CUPONS[normalized]) {
      return { code: normalized, rate: CUPONS[normalized], fixedDiscount: 0, freeShipping: false }
    }
    return null
  }
}

// ---------- Catálogo ----------
const DEFAULT_ARTS = ['oversized', 'tee', 'polo', 'shirt', 'hoodie', 'sweater', 'jacket', 'pants', 'shorts', 'boxer', 'dryfit', 'cap']
const DEFAULT_BGS = ['var(--laranja-200)', 'var(--roxo-200)', 'var(--laranja-100)', 'var(--roxo-100)']
const LEGACY_GAME_SLUGS = new Set(['rpg', 'familia', 'estrategia', 'cartas', 'party'])

export function slugifyCategory(text = '') {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function loadCustomCategories() {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveCustomCategories(list) {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(list))
  } catch {
    /* sem armazenamento */
  }
}

export function loadProductOverrides() {
  try {
    const raw = localStorage.getItem(PRODUCT_OVERRIDES_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function saveProductOverrides(map) {
  try {
    localStorage.setItem(PRODUCT_OVERRIDES_KEY, JSON.stringify(map))
  } catch {
    /* sem armazenamento */
  }
}

export function buildMergedCategories(apiCats = []) {
  const custom = loadCustomCategories()
  const merged = [...localCategories]
  const seen = new Set(merged.map((c) => c.id))

  for (const c of custom) {
    if (c?.id && !seen.has(c.id)) {
      merged.push(c)
      seen.add(c.id)
    }
  }

  if (Array.isArray(apiCats)) {
    apiCats.forEach((ac, idx) => {
      const slug = ac.slug || slugifyCategory(ac.nome)
      if (slug && !seen.has(slug) && !LEGACY_GAME_SLUGS.has(slug)) {
        merged.push({
          id: slug,
          name: ac.nome,
          art: DEFAULT_ARTS[idx % DEFAULT_ARTS.length],
          bg: DEFAULT_BGS[idx % DEFAULT_BGS.length],
        })
        seen.add(slug)
      }
    })
  }

  return merged
}

export function buildMergedProducts(apiProds = []) {
  const overrides = loadProductOverrides()

  return localProducts.map((lp) => {
    const match = Array.isArray(apiProds) ? apiProds.find((ap) => ap.slug === lp.slug) : null
    const firstVar = match?.variacoes?.[0]
    const ov = overrides[lp.slug]

    const apiPrice = match ? Number(match.precoEfetivo ?? lp.price) : lp.price
    const apiOldPrice = match
      ? match.precoPromocional
        ? Number(match.precoBase)
        : null
      : (lp.oldPrice ?? null)
    const apiStock =
      firstVar && typeof firstVar.disponivel === 'number'
        ? firstVar.disponivel
        : (lp.stock ?? 15)

    return {
      ...lp,
      backendId: match?.id ?? lp.backendId,
      variacaoId: firstVar?.id ?? lp.variacaoId,
      category: ov?.category ?? lp.category,
      price: ov?.price !== undefined ? Number(ov.price) : apiPrice,
      oldPrice: ov?.oldPrice !== undefined ? (ov.oldPrice ? Number(ov.oldPrice) : null) : apiOldPrice,
      stock: ov?.stock !== undefined ? Number(ov.stock) : apiStock,
      image: match?.imagemPrincipal || lp.image,
    }
  })
}

export async function apiFetchCatalog() {
  try {
    const [apiCats, apiProds] = await Promise.all([
      request('/categorias', { method: 'GET' }),
      request('/produtos', { method: 'GET' }),
    ])

    return {
      categories: buildMergedCategories(apiCats),
      products: buildMergedProducts(apiProds),
      source: 'api',
    }
  } catch {
    return {
      categories: buildMergedCategories([]),
      products: buildMergedProducts([]),
      source: 'local',
    }
  }
}

export async function apiCreateCategory({ name, art = 'tee', bg = 'var(--laranja-200)' }) {
  const cleanName = (name || '').trim()
  const slug = slugifyCategory(cleanName)
  if (!cleanName || !slug) {
    throw new Error('Informe um nome válido para a nova categoria.')
  }

  const currentCats = buildMergedCategories([])
  if (currentCats.some((c) => c.id === slug || c.name.toLowerCase() === cleanName.toLowerCase())) {
    throw new Error('Já existe uma categoria cadastrada com este nome.')
  }

  const newCat = { id: slug, name: cleanName, art, bg }

  // Tenta criar também no Back-end quando autenticado
  const tokens = getSavedTokens()
  if (tokens?.accessToken) {
    try {
      await request('/categorias', {
        method: 'POST',
        body: JSON.stringify({ nome: cleanName, slug }),
      })
    } catch (err) {
      if (err.status === 409) {
        throw new Error('Já existe uma categoria cadastrada com este identificador.')
      }
      /* Se o servidor estiver offline ou sem sessão API, salva localmente */
    }
  }

  const custom = loadCustomCategories()
  saveCustomCategories([...custom.filter((c) => c.id !== slug), newCat])
  return newCat
}

export async function apiUpdateProductCommercial(slug, { price, oldPrice, stock, category }) {
  const numericPrice = Number(price)
  const numericOldPrice = oldPrice ? Number(oldPrice) : null
  const numericStock = Math.max(0, Math.floor(Number(stock ?? 0)))

  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new Error('O valor do produto deve ser maior que zero.')
  }
  if (numericOldPrice !== null && (!Number.isFinite(numericOldPrice) || numericOldPrice <= numericPrice)) {
    throw new Error('O valor original (sem desconto) deve ser maior que o valor final com desconto.')
  }

  // No back-end: precoBase é o preço cheio e precoPromocional é o preço com desconto
  const precoBase = numericOldPrice ?? numericPrice
  const precoPromocional = numericOldPrice ? numericPrice : null

  const tokens = getSavedTokens()
  if (tokens?.accessToken) {
    try {
      await request(`/produtos/${encodeURIComponent(slug)}/comercial`, {
        method: 'PUT',
        body: JSON.stringify({
          precoBase,
          precoPromocional,
          estoque: numericStock,
        }),
      })
    } catch {
      /* Segue com persistência local se o produto for apenas do seed front ou API offline */
    }
  }

  const overrides = loadProductOverrides()
  overrides[slug] = {
    ...(overrides[slug] || {}),
    price: Number(numericPrice.toFixed(2)),
    oldPrice: numericOldPrice ? Number(numericOldPrice.toFixed(2)) : null,
    stock: numericStock,
    ...(category ? { category } : {}),
    updatedAt: new Date().toISOString(),
  }
  saveProductOverrides(overrides)
  return overrides[slug]
}

// ---------- Pedidos (Checkout e Histórico) ----------
async function createDeliveryAddressInApi(delivery) {
  const endRes = await request('/enderecos', {
    method: 'POST',
    body: JSON.stringify({
      apelido: 'Entrega',
      destinatario: delivery.nome.trim(),
      cep: onlyDigits(delivery.cep),
      logradouro: delivery.endereco.trim(),
      numero: delivery.numero.trim(),
      complemento: delivery.complemento?.trim() || null,
      bairro: delivery.bairro.trim(),
      cidade: delivery.cidade.trim(),
      uf: delivery.uf.trim().toUpperCase(),
      principal: true,
    }),
  })
  return endRes.id
}

export async function apiCreateOrder({ user, items, couponCode, delivery, idempotencyKey }) {
  // 1. Garante que o usuário esteja sincronizado e autenticado no Back-end
  let activeUser = user
  let tokens = getSavedTokens()
  if (!tokens?.accessToken || user?.origem !== 'api' || !user?.enderecoId) {
    activeUser = (await apiSyncUserSession(user, delivery)) || user
    tokens = getSavedTokens()
  }

  if (tokens?.accessToken) {
    try {
      let enderecoId = activeUser?.enderecoId
      const deliveryChanged =
        onlyDigits(delivery.cep) !== onlyDigits(activeUser?.cep || '') ||
        delivery.endereco.trim() !== (activeUser?.endereco || '').trim() ||
        delivery.numero.trim() !== (activeUser?.numero || '').trim()

      if (!enderecoId || deliveryChanged) {
        enderecoId = await createDeliveryAddressInApi(delivery)
      }

      const itensApi = items
        .map((i) => {
          const variacaoId =
            i.variacaoId ||
            localProducts.find((lp) => lp.id === i.id || lp.slug === i.slug)?.variacaoId
          return variacaoId ? { variacaoId, quantidade: i.qty } : null
        })
        .filter(Boolean)

      if (itensApi.length === items.length) {
        const orderPayload = {
          enderecoId,
          itens: itensApi,
          cupomCodigo: couponCode || null,
          idempotencyKey,
          observacoes: `Pagamento escolhido: ${delivery.pagamento}`,
        }

        let pedido
        try {
          pedido = await request('/pedidos', {
            method: 'POST',
            body: JSON.stringify(orderPayload),
          })
        } catch (orderErr) {
          // Se o enderecoId antigo não existir no banco, cria o endereço agora e repete
          if (orderErr.code === 'ENDERECO_INVALIDO' || orderErr.status === 404) {
            enderecoId = await createDeliveryAddressInApi(delivery)
            pedido = await request('/pedidos', {
              method: 'POST',
              body: JSON.stringify({ ...orderPayload, enderecoId }),
            })
          } else {
            throw orderErr
          }
        }

        return {
          numero: pedido.numero,
          id: pedido.id,
          enderecoId,
          syncedUser: { ...activeUser, enderecoId, origem: 'api' },
          origem: 'api',
        }
      }
    } catch (err) {
      if (err.isHttpError) throw err
    }
  }

  // Fallback local: grava pedido no localStorage apenas se o servidor estiver offline
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_ORDERS_KEY) || '[]')
    const existing = saved.find((o) => o.idempotencyKey === idempotencyKey)
    if (existing) return existing

    const novoPedido = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      numero: `MM-${Math.floor(100000 + Math.random() * 900000)}`,
      idempotencyKey,
      criadoEm: new Date().toISOString(),
      origem: 'local',
    }
    localStorage.setItem(LOCAL_ORDERS_KEY, JSON.stringify([novoPedido, ...saved]))
    return novoPedido
  } catch {
    return {
      numero: `MM-${Math.floor(100000 + Math.random() * 900000)}`,
      origem: 'local',
    }
  }
}

export async function apiFetchMyOrders() {
  const tokens = getSavedTokens()
  if (!tokens?.accessToken) return []
  try {
    const page = await request('/pedidos', { method: 'GET' })
    return Array.isArray(page?.content) ? page.content : []
  } catch {
    return []
  }
}
