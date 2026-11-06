// =========================================================
// Máscaras e validações usadas nos formulários
// (cadastro, checkout e contato)
// =========================================================

// Remove tudo que não for número: "123.456-7" -> "1234567"
export const onlyDigits = (value) => value.replace(/\D/g, '')

// CEP: aceita só números e no máximo 8 dígitos
export const maskCep = (value) => onlyDigits(value).slice(0, 8)

// CPF: 000.000.000-00 (máximo 11 dígitos)
export function maskCpf(value) {
  const d = onlyDigits(value).slice(0, 11)
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
}

// Telefone: (00) 00000-0000
export function maskPhone(value) {
  const d = onlyDigits(value).slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// Matrícula de funcionário: letras e números, maiúsculas, até 8 caracteres
export const maskMatricula = (value) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 8)

// ---------- Validações ----------

export const isEmail = (value) => /^\S+@\S+\.\S+$/.test(value)

// CEP válido = exatamente 8 dígitos
export const isCep = (value) => /^\d{8}$/.test(value)

// Matrícula válida = exatamente 8 caracteres alfanuméricos
export const isMatricula = (value) => /^[A-Z0-9]{8}$/.test(value)

// Verifica se um trio (dia, mês, ano) forma uma data calendário válida
function isValidCalendarDayMonth(day, month) {
  if (month < 1 || month > 12 || day < 1 || day > 31) return false
  const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return day <= maxDays[month - 1]
}

// Detecta sequências numéricas de data/aniversário na senha
// Ex.: "Aa221206@" -> detecta "22/12/06" (22/12/2006)
// Ex.: "Aa22122006@" -> detecta "22/12/2006"
export function detectBirthdaySequence(password) {
  if (!password) return null

  // 1) Datas com separadores (ex.: 22/12/06, 22-12-2006, 22.12.06)
  const sepMatch = password.match(
    /(0[1-9]|[12]\d|3[01])[/.\-_](0[1-9]|1[0-2])[/.\-_]((19|20)\d{2}|\d{2})/,
  )
  if (sepMatch) {
    const d = Number(sepMatch[1])
    const m = Number(sepMatch[2])
    if (isValidCalendarDayMonth(d, m)) {
      return `${sepMatch[1]}/${sepMatch[2]}/${sepMatch[3]}`
    }
  }

  // 2) Sequências contínuas de dígitos dentro da senha (6 ou 8 dígitos)
  const digitBlocks = password.match(/\d{6,}/g) || []
  for (const block of digitBlocks) {
    // Janela de 8 dígitos: DDMMAAAA ou AAAAMMDD
    for (let i = 0; i <= block.length - 8; i++) {
      const sub8 = block.slice(i, i + 8)
      const dd1 = Number(sub8.slice(0, 2))
      const mm1 = Number(sub8.slice(2, 4))
      const yyyy1 = Number(sub8.slice(4, 8))
      if (yyyy1 >= 1900 && yyyy1 <= 2099 && isValidCalendarDayMonth(dd1, mm1)) {
        return `${sub8.slice(0, 2)}/${sub8.slice(2, 4)}/${sub8.slice(4, 8)}`
      }

      const yyyy2 = Number(sub8.slice(0, 4))
      const mm2 = Number(sub8.slice(4, 6))
      const dd2 = Number(sub8.slice(6, 8))
      if (yyyy2 >= 1900 && yyyy2 <= 2099 && isValidCalendarDayMonth(dd2, mm2)) {
        return `${sub8.slice(6, 8)}/${sub8.slice(4, 6)}/${sub8.slice(0, 4)}`
      }
    }

    // Janela de 6 dígitos: DDMMAA ou AAMMDD
    for (let i = 0; i <= block.length - 6; i++) {
      const sub6 = block.slice(i, i + 6)
      const dd1 = Number(sub6.slice(0, 2))
      const mm1 = Number(sub6.slice(2, 4))
      const yy1 = sub6.slice(4, 6)
      if (isValidCalendarDayMonth(dd1, mm1)) {
        return `${sub6.slice(0, 2)}/${sub6.slice(2, 4)}/${yy1}`
      }

      const yy2 = sub6.slice(0, 2)
      const mm2 = Number(sub6.slice(2, 4))
      const dd2 = Number(sub6.slice(4, 6))
      if (isValidCalendarDayMonth(dd2, mm2)) {
        return `${sub6.slice(4, 6)}/${sub6.slice(2, 4)}/${yy2}`
      }
    }
  }

  return null
}

// Avalia todos os requisitos de segurança da senha
export function analyzePassword(password = '') {
  const birthdayMatch = detectBirthdaySequence(password)
  const rules = {
    minLength: password.length > 8,
    hasUpper: /[A-Z]/.test(password),
    hasLower: /[a-z]/.test(password),
    hasSpecial: /[^A-Za-z0-9\s]/.test(password),
    noBirthday: !birthdayMatch,
  }

  const valid =
    rules.minLength &&
    rules.hasUpper &&
    rules.hasLower &&
    rules.hasSpecial &&
    rules.noBirthday

  let errorMessage = ''
  if (!rules.minLength) {
    errorMessage = 'A senha deve ter mais de 8 caracteres (mínimo de 9).'
  } else if (!rules.hasUpper) {
    errorMessage = 'A senha deve conter pelo menos 1 letra maiúscula.'
  } else if (!rules.hasLower) {
    errorMessage = 'A senha deve conter pelo menos 1 letra minúscula.'
  } else if (!rules.hasSpecial) {
    errorMessage = 'A senha deve conter pelo menos 1 caractere especial (ex.: @, #, !, $).'
  } else if (!rules.noBirthday) {
    errorMessage = `A senha não pode conter sequências de data/aniversário (${birthdayMatch}).`
  }

  return {
    valid,
    rules,
    birthdayMatch,
    errorMessage,
  }
}

// Telefone com DDD: 10 ou 11 dígitos
export const isPhone = (value) => [10, 11].includes(onlyDigits(value).length)

// Valida o CPF pelos dígitos verificadores (algoritmo oficial da Receita)
export function isCpf(value) {
  const cpf = onlyDigits(value)
  // Precisa ter 11 dígitos e não pode ser tudo igual (111.111.111-11)
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false

  // Calcula um dígito verificador a partir dos "n" primeiros dígitos
  const calcDigit = (n) => {
    let sum = 0
    for (let i = 0; i < n; i++) sum += Number(cpf[i]) * (n + 1 - i)
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return calcDigit(9) === Number(cpf[9]) && calcDigit(10) === Number(cpf[10])
}

// Siglas dos estados brasileiros (select de UF)
export const UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
  'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

// Busca o endereço pelo CEP na API pública ViaCEP.
// Retorna null se o CEP não existir ou se não houver internet.
export async function fetchAddressByCep(cep) {
  try {
    const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
    const data = await res.json()
    if (data.erro) return null
    return { endereco: data.logradouro, bairro: data.bairro, cidade: data.localidade, uf: data.uf }
  } catch {
    return null
  }
}
