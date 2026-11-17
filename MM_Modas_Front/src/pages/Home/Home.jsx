// =========================================================
// Home — página inicial (/) — MM MODAS
// =========================================================
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Mascot from '../../components/Logo/Mascot.jsx'
import ProductArt from '../../components/ProductArt/ProductArt.jsx'
import ProductCard from '../../components/ProductCard/ProductCard.jsx'
import { ArrowIcon, TruckIcon, RefreshIcon, LeafIcon } from '../../components/Icons.jsx'
import { useCatalog } from '../../context/CatalogContext.jsx'
import { isEmail } from '../../utils/validators.js'
import './Home.css'

// Mensagens aleatórias que aparecem no primeiro contato com o usuário (Hero / Carrossel)
const heroMessages = [
  {
    eyebrow: 'MM MODAS · Coleção Masculina 2026',
    titleBefore: 'Bonzinho demais?',
    highlight: 'Aqui não.',
    lead: 'Roupas masculinas confortáveis, cheias de detalhe e com aquele sorriso maroto de quem sabe exatamente quem é. T-shirts, moletons, calças e acessórios sem filtro.',
    stickerOne: '100% autêntico',
    stickerTwo: 'sem filtro ✦',
    floatLeft: 'oversized',
    floatRight: 'cap',
  },
  {
    eyebrow: 'MM MODAS · Streetwear & Essenciais',
    titleBefore: 'Básico sem graça?',
    highlight: 'Passa longe.',
    lead: 'Mais de 200 peças em 12 categorias: de T-shirts oversized e moletons pesados a bermudas, cuecas e jaquetas feitas para dominar qualquer rolê.',
    stickerOne: '12 categorias',
    stickerTwo: '+200 peças ✦',
    floatLeft: 'hoodie',
    floatRight: 'sunglasses',
  },
  {
    eyebrow: 'MM MODAS · Estilo Menino Mau',
    titleBefore: 'Seu guarda-roupa pede',
    highlight: 'mais atitude.',
    lead: 'Algodão penteado, modelagens que valorizam o corpo real e acabamento reforçado. Vista a MM MODAS do treino pesado ao encontro de fim de semana.',
    stickerOne: 'caimento brabo',
    stickerTwo: 'MM MODAS ✦',
    floatLeft: 'jacket',
    floatRight: 'shorts',
  },
  {
    eyebrow: 'MM MODAS · Conforto com Presença',
    titleBefore: 'Vista o seu lado',
    highlight: 'Menino Mau.',
    lead: 'Camisas de linho, polos piquet, calças cargo e acessórios urbanos pensados para o homem que não pede licença para mostrar sua personalidade.',
    stickerOne: 'estilo próprio',
    stickerTwo: 'zero rótulo ✦',
    floatLeft: 'shirt',
    floatRight: 'watch',
  },
  {
    eyebrow: 'MM MODAS · Temporada 2026',
    titleBefore: 'Conforto que impõe',
    highlight: 'respeito.',
    lead: 'Da cueca boxer de algodão ao casaco puffer e suéter de tricô: peças versáteis que acompanham o seu ritmo todos os dias.',
    stickerOne: 'toque macio',
    stickerTwo: 'alta duração ✦',
    floatLeft: 'sweater',
    floatRight: 'boxer',
  },
  {
    eyebrow: 'MM MODAS · Do Casual ao Urbano',
    titleBefore: 'Tendência copiada?',
    highlight: 'Nem pensar.',
    lead: 'Cada coleção da MM MODAS nasce com identidade própria. Monte seu visual completo com frete rápido e primeira troca grátis.',
    stickerOne: 'look completo',
    stickerTwo: 'Menino Mau ✦',
    floatLeft: 'polo',
    floatRight: 'backpack',
  },
]

// Frases que passam no carrossel / faixa animada da MM MODAS
const marqueeWords = [
  'MM MODAS',
  'Moda Masculina com Atitude',
  'T-Shirts & Moletons',
  'Caimento Impecável',
  'Menino Mau Aprova',
  'Calças, Bermudas & Jaquetas',
  'Conforto Sem Filtro',
  'Cuecas & Acessórios',
]

const pillars = [
  {
    title: 'Autenticidade',
    text: 'Nada de copiar tendência. Cada peça da MM MODAS nasce de uma ideia nossa, com a nossa cara — e a sua.',
    color: 'var(--laranja-200)',
  },
  {
    title: 'Conforto',
    text: 'Tecidos macios, algodão penteado, modelagens bem pensadas e acabamento caprichado. Estilo que não aperta.',
    color: 'var(--roxo-200)',
  },
  {
    title: 'Atitude',
    text: 'Um sorrisinho de canto, um passo a mais. Roupa pra quem não pede licença pra ser quem é.',
    color: 'var(--laranja-300)',
  },
]

function Home() {
  const { categories, products } = useCatalog()
  const novidades = products.filter((p) => p.tags.includes('novo')).slice(0, 8)

  // Escolhe uma mensagem aleatória logo no primeiro contato e permite alternar no carrossel
  const [msgIndex, setMsgIndex] = useState(() => Math.floor(Math.random() * heroMessages.length))

  useEffect(() => {
    const timer = setInterval(() => {
      setMsgIndex((prev) => {
        if (heroMessages.length <= 1) return prev
        let next = Math.floor(Math.random() * heroMessages.length)
        if (next === prev) next = (prev + 1) % heroMessages.length
        return next
      })
    }, 6500)
    return () => clearInterval(timer)
  }, [])

  const pickRandomMessage = () => {
    setMsgIndex((prev) => {
      let next = Math.floor(Math.random() * heroMessages.length)
      if (next === prev) next = (prev + 1) % heroMessages.length
      return next
    })
  }

  const currentHero = heroMessages[msgIndex] ?? heroMessages[0]

  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (!isEmail(email.trim())) {
      setEmailError('Informe um e-mail válido.')
      return
    }
    setEmailError('')
    setSubscribed(true)
  }

  return (
    <>
      {/* ---------- 1. HERO (MM MODAS + Mensagens Aleatórias) ---------- */}
      <section className="hero">
        <div className="container hero__inner">
          <div className="hero__text">
            <span className="eyebrow">{currentHero.eyebrow}</span>
            <h1 className="hero__title">
              {currentHero.titleBefore} <span className="hero__highlight">{currentHero.highlight}</span>
            </h1>
            <p className="hero__lead">{currentHero.lead}</p>

            <div className="hero__carousel-bar" aria-label="Mensagens da MM MODAS">
              <div className="hero__dots" role="tablist">
                {heroMessages.map((m, idx) => (
                  <button
                    key={m.highlight}
                    type="button"
                    role="tab"
                    aria-selected={idx === msgIndex}
                    aria-label={`Mensagem ${idx + 1}`}
                    className={`hero__dot ${idx === msgIndex ? 'hero__dot--active' : ''}`}
                    onClick={() => setMsgIndex(idx)}
                  />
                ))}
              </div>
              <button type="button" className="hero__shuffle" onClick={pickRandomMessage}>
                ↻ Outra frase
              </button>
            </div>

            <div className="hero__cta">
              <Link to="/loja" className="btn btn--primary">
                Ver a coleção <ArrowIcon size={18} />
              </Link>
              <Link to="/sobre" className="btn btn--ghost">
                Nossa história
              </Link>
            </div>
          </div>

          <div className="hero__visual" aria-hidden="true">
            <div className="hero__blob" />
            <div className="hero__mascot">
              <Mascot size={300} title="" />
            </div>
            <span className="sticker sticker--one">{currentHero.stickerOne}</span>
            <span className="sticker sticker--two">{currentHero.stickerTwo}</span>
            <div className="hero__float hero__float--tee">
              <ProductArt type={currentHero.floatLeft} color="#ffc596" bg="var(--surface)" />
            </div>
            <div className="hero__float hero__float--cap">
              <ProductArt type={currentHero.floatRight} color="#c8b3f0" bg="var(--surface)" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------- 2. FAIXA ANIMADA (CARROSSEL DE FRASES MM MODAS) ---------- */}
      <div className="marquee" aria-hidden="true">
        <div className="marquee__track">
          {[...marqueeWords, ...marqueeWords, ...marqueeWords].map((w, i) => (
            <span key={i}>
              {w} <em>✦</em>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- 3. CATEGORIAS ---------- */}
      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Escolha sua vibe · {categories.length} Categorias</span>
              <h2 className="section-title">Categorias MM MODAS</h2>
            </div>
            <Link to="/loja" className="link-arrow">
              Ver todas as {products.length} peças <ArrowIcon size={18} />
            </Link>
          </div>

          <div className="categories">
            {categories.map((c) => (
              <Link key={c.id} to={`/loja?categoria=${c.id}`} className="category" style={{ background: c.bg }}>
                <ProductArt type={c.art} color="#fff" bg="transparent" className="category__art" />
                <span className="category__name">{c.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 4. NOVIDADES ---------- */}
      <section className="section section--tinted">
        <div className="container">
          <div className="section-head">
            <div>
              <span className="eyebrow">Acabou de chegar na MM MODAS</span>
              <h2 className="section-title">Destaques & Lançamentos</h2>
            </div>
            <Link to="/loja" className="link-arrow">
              Ir pra loja <ArrowIcon size={18} />
            </Link>
          </div>
          <div className="product-grid">
            {novidades.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 5. MANIFESTO ---------- */}
      <section className="section">
        <div className="container manifesto">
          <div className="manifesto__intro">
            <span className="eyebrow">Manifesto MM MODAS</span>
            <h2 className="section-title">Ser Menino Mau é se vestir de verdade.</h2>
            <p className="muted">
              A MM MODAS nasceu de uma conversa entre amigos na faculdade e virou referência em estilo masculino:
              criatividade, conforto e atitude em cada peça.
            </p>
            <Link to="/sobre" className="btn btn--accent">
              Conheça a história
            </Link>
          </div>
          <div className="pillars">
            {pillars.map((p, i) => (
              <div key={p.title} className="pillar" style={{ background: p.color }}>
                <span className="pillar__num">0{i + 1}</span>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- 6. BENEFÍCIOS ---------- */}
      <section className="container benefits">
        <div className="benefit">
          <TruckIcon />
          <div>
            <strong>Frete grátis</strong>
            <span>em compras acima de R$ 299</span>
          </div>
        </div>
        <div className="benefit">
          <RefreshIcon />
          <div>
            <strong>Primeira troca grátis</strong>
            <span>até 30 dias depois de receber</span>
          </div>
        </div>
        <div className="benefit">
          <LeafIcon />
          <div>
            <strong>Qualidade premium</strong>
            <span>algodão penteado e costura reforçada</span>
          </div>
        </div>
      </section>

      {/* ---------- 7. NEWSLETTER ---------- */}
      <section className="section">
        <div className="container">
          <div className="newsletter">
            <div className="newsletter__mascot" aria-hidden="true">
              <Mascot size={120} title="" />
            </div>
            <div className="newsletter__content">
              <h2>Entra pra turma da MM MODAS</h2>
              <p>Receba avisos de novas coleções e ganhe 10% de desconto na primeira compra.</p>
              {subscribed ? (
                <p className="newsletter__ok">
                  Prontinho! Use o cupom <strong>MENINOMAU10</strong> no carrinho.
                </p>
              ) : (
                <form className="newsletter__form" onSubmit={handleSubscribe} noValidate>
                  <label htmlFor="newsletter-email" className="sr-only">
                    Seu e-mail
                  </label>
                  <input
                    id="newsletter-email"
                    type="email"
                    className={`input ${emailError ? 'input--error' : ''}`}
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value)
                      setEmailError('')
                    }}
                    required
                  />
                  <button type="submit" className="btn btn--primary">
                    Quero entrar
                  </button>
                </form>
              )}
              {emailError && <p className="field-error">{emailError}</p>}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}

export default Home
