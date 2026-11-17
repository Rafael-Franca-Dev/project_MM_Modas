// =========================================================
// Suíte de Testes Unitários e de Serviço — MM MODAS (Front-end)
// =========================================================
import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { categories, products, getProductBySlug, getCategoryName } from '../data/products.js'
import { faq } from '../data/faq.js'
import { calcularFreteLocal, CUPONS, FRETE_GRATIS_A_PARTIR } from '../context/cartConfig.js'
import { formatPrice, installments } from '../utils/format.js'
import {
  isEmail,
  isCep,
  isCpf,
  isPhone,
  isMatricula,
  analyzePassword,
} from '../utils/validators.js'
import {
  slugifyCategory,
  buildMergedCategories,
  buildMergedProducts,
  apiSimulateShipping,
} from '../services/api.js'

describe('Catálogo MM MODAS (data/products.js)', () => {
  it('deve possuir exatamente 12 categorias e as 8 primeiras voltadas para roupas na Home', () => {
    assert.equal(categories.length, 12)
    const homeIds = categories.slice(0, 8).map((c) => c.id)
    assert.deepEqual(homeIds, [
      'tshirts',
      'camisetas',
      'camisas',
      'moletons',
      'jaquetas',
      'calcas',
      'bermudas',
      'cuecas',
    ])
  })

  it('deve possuir no mínimo 200 produtos válidos distribuídos nas 12 categorias', () => {
    assert.ok(products.length >= 200, `Esperado >= 200 produtos, encontrado ${products.length}`)

    const ids = new Set()
    const slugs = new Set()
    const validCatIds = new Set(categories.map((c) => c.id))

    for (const p of products) {
      assert.ok(!ids.has(p.id), `ID duplicado: ${p.id}`)
      assert.ok(!slugs.has(p.slug), `Slug duplicado: ${p.slug}`)
      ids.add(p.id)
      slugs.add(p.slug)

      assert.ok(validCatIds.has(p.category), `Categoria inválida no produto ${p.slug}: ${p.category}`)
      assert.ok(p.price > 0, `Preço inválido em ${p.slug}`)
      if (p.oldPrice) {
        assert.ok(p.oldPrice > p.price, `Preço antigo deve ser maior que preço atual em ${p.slug}`)
      }
      assert.ok(Array.isArray(p.colors) && p.colors.length >= 1, `Sem cores em ${p.slug}`)
      assert.ok(Array.isArray(p.sizes) && p.sizes.length >= 1, `Sem tamanhos em ${p.slug}`)
    }
  })

  it('deve buscar produto por slug e converter id de categoria corretamente', () => {
    const prod = getProductBySlug('camiseta-sorriso-maroto')
    assert.ok(prod)
    assert.equal(prod.name, 'T-Shirt Sorriso Maroto')
    assert.equal(getCategoryName('tshirts'), 'T-Shirts & Oversized')
  })
})

describe('FAQ de Moda Masculina (data/faq.js)', () => {
  it('deve conter perguntas frequentes sobre roupas, tamanhos e trocas, sem referências a jogos', () => {
    assert.ok(faq.length >= 5)
    const ids = faq.map((f) => f.id)
    assert.ok(ids.includes('tamanhos'))
    assert.ok(ids.includes('trocas'))
    for (const item of faq) {
      assert.ok(!/rpg|tabuleiro|meeple|dado/i.test(item.q + ' ' + item.a))
    }
  })
})

describe('Regras de Frete, Cupom e Formatação', () => {
  it('deve calcular frete grátis a partir de R$ 299 e taxas por UF abaixo disso', () => {
    assert.equal(calcularFreteLocal(FRETE_GRATIS_A_PARTIR, 'PE'), 0)
    assert.equal(calcularFreteLocal(150, 'SP'), 24.9)
    assert.equal(calcularFreteLocal(150, 'RJ'), 29.9)
    assert.equal(calcularFreteLocal(150, 'PE'), 39.9)
    assert.equal(CUPONS.MENINOMAU10, 0.1)
  })

  it('deve formatar valores em Real e parcelamento em até 3x', () => {
    assert.match(formatPrice(99.9), /99,90/)
    assert.match(installments(99.9, 3), /3x/)
  })
})

describe('Validadores e Segurança de Senha (utils/validators.js)', () => {
  it('deve validar e-mail, CEP, CPF, telefone e matrícula de 8 caracteres', () => {
    assert.equal(isEmail('cliente@mmmodas.com'), true)
    assert.equal(isCep('50000000'), true)
    assert.equal(isCpf('52998224725'), true)
    assert.equal(isCpf('11111111111'), false)
    assert.equal(isPhone('(81) 98300-8683'), true)
    assert.equal(isMatricula('MM2026A1'), true)
  })

  it('deve bloquear senhas com data de aniversário e aprovar senhas fortes', () => {
    const fracaData = analyzePassword('Moda@221206')
    assert.equal(fracaData.valid, false)
    assert.equal(fracaData.rules.noBirthday, false)

    const forte = analyzePassword('ModaForte#98')
    assert.equal(forte.valid, true)
  })
})

describe('Serviço de Integração e Fallback Local (services/api.js)', () => {
  it('deve filtrar categorias legadas de jogos e mesclar catálogo corretamente', async () => {
    assert.equal(slugifyCategory('Suéteres & Tricô'), 'sueteres-trico')

    const mergedCats = buildMergedCategories([
      { nome: 'RPG de Mesa', slug: 'rpg' },
      { nome: 'Alfaiataria', slug: 'alfaiataria' },
    ])
    assert.equal(mergedCats.some((c) => c.id === 'rpg'), false)
    assert.equal(mergedCats.some((c) => c.id === 'alfaiataria'), true)

    const mergedProds = buildMergedProducts([
      {
        slug: 'camiseta-sorriso-maroto',
        precoBase: 149.9,
        precoPromocional: 109.9,
        precoEfetivo: 109.9,
        variacoes: [{ id: '44444444-4444-4444-4444-444444444001', disponivel: 42 }],
      },
    ])
    const updated = mergedProds.find((p) => p.slug === 'camiseta-sorriso-maroto')
    assert.equal(updated.price, 109.9)
    assert.equal(updated.oldPrice, 149.9)
    assert.equal(updated.stock, 42)

    const freteSim = await apiSimulateShipping(120, 'PE')
    assert.equal(freteSim.valorFrete, 39.9)
    assert.equal(freteSim.freteGratis, false)
  })
})
