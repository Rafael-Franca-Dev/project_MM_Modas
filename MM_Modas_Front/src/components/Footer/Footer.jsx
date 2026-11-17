// =========================================================
// Footer — rodapé do site MM MODAS
// =========================================================
import { Link } from 'react-router-dom'
import Logo from '../Logo/Logo.jsx'
import { InstagramIcon, TiktokIcon, WhatsIcon } from '../Icons.jsx'
import { useCatalog } from '../../context/CatalogContext.jsx'
import { faq } from '../../data/faq.js'
import './Footer.css'

function Footer() {
  const { categories } = useCatalog()
  const year = new Date().getFullYear()

  return (
    <footer className="footer">
      <div className="container footer__grid">
        {/* Coluna 1: marca */}
        <div className="footer__brand">
          <Logo size={52} light />
          <p>
            Moda masculina e acessórios com personalidade pra quem não cabe em rótulo. T-shirts, moletons,
            calças, bermudas e cuecas feitas com conforto e atitude.
          </p>
          <div className="footer__social">
            <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              <InstagramIcon />
            </a>
            <a href="https://tiktok.com" target="_blank" rel="noreferrer" aria-label="TikTok">
              <TiktokIcon />
            </a>
            <a href="https://wa.me/558183008683" target="_blank" rel="noreferrer" aria-label="WhatsApp">
              <WhatsIcon />
            </a>
          </div>
        </div>

        {/* Coluna 2: categorias */}
        <div>
          <h4>Coleção</h4>
          <ul>
            {categories.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link to={`/loja?categoria=${c.id}`}>{c.name}</Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 3: institucional */}
        <div>
          <h4>MM MODAS</h4>
          <ul>
            <li><Link to="/sobre">Nossa história</Link></li>
            <li><Link to="/contato">Fale com a gente</Link></li>
            <li><Link to="/cadastro">Minha conta</Link></li>
            <li><Link to="/carrinho">Meu carrinho</Link></li>
          </ul>
        </div>

        {/* Coluna 4: Ajuda */}
        <div>
          <h4>Ajuda</h4>
          <ul>
            <li>
              <Link to="/contato#faq">Perguntas frequentes</Link>
            </li>
            {faq.map((item) => (
              <li key={item.id}>
                <Link to={`/contato#faq-${item.id}`}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer__bottom">
        <div className="container">
          <p>© {year} MM MODAS · Moda Masculina & Acessórios · Menino Mau aprova.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
