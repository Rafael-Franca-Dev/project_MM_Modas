// =========================================================
// About — "Nossa história" (/sobre) — MM MODAS
// =========================================================
import { Link } from 'react-router-dom'
import Mascot from '../../components/Logo/Mascot.jsx'
import './About.css'

const story = [
  {
    title: 'A conversa',
    text: 'Nossa marca nasceu de uma conversa entre amigos na faculdade. Entre uma aula e outra, percebemos como faltava uma marca de moda masculina que unisse estilo autêntico, caimento moderno e conforto de verdade.',
  },
  {
    title: 'A criatividade',
    text: 'Foi quando Daniel revelou que sempre teve vontade de exercer sua criatividade na moda masculina: desenhar t-shirts, moletons, calças e acessórios que expressassem personalidade e atitude em cada detalhe.',
  },
  {
    title: 'O empreendedorismo',
    text: 'Essa paixão pelo vestuário se juntou com o ímpeto empreendedor dos demais amigos — e assim nasceu a MM MODAS, pensada para o homem que se veste sem rótulos.',
  },
]

const values = [
  {
    title: 'Sem filtro',
    text: 'Moda masculina direta ao ponto: cortes que valorizam o corpo, preço justo, informação clara e zero enrolação.',
  },
  {
    title: 'Qualidade em cada costura',
    text: 'Do algodão penteado das camisetas à sarja estruturada das calças e jaquetas, escolhemos tecidos feitos para durar.',
  },
  {
    title: 'Conforto primeiro',
    text: 'Modelagens pensadas para a rotina real — da faculdade e do trabalho ao rolê de fim de semana.',
  },
]

function About() {
  return (
    <div className="about">
      <section className="container about__hero">
        <div>
          <span className="eyebrow">Nossa história · MM MODAS</span>
          <h1>
            Todo homem de estilo tem um lado <span className="about__accent">Menino Mau</span>.
          </h1>
          <p className="about__lead">
            A gente só resolveu vestir o nosso. A MM MODAS é uma marca de moda masculina feita por amigos, pra quem
            quer se expressar pela roupa com criatividade, conforto e atitude.
          </p>
        </div>
        <div className="about__portrait" aria-hidden="true">
          <Mascot size={260} title="" />
          <span className="about__caption">o Menino Mau, ícone oficial da MM MODAS</span>
        </div>
      </section>

      <section className="container section">
        <h2 className="section-title">Como tudo começou</h2>
        <ol className="timeline">
          {story.map((item, i) => (
            <li key={item.title} className="timeline__item">
              <span className="timeline__dot">{i + 1}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="values">
        <div className="container">
          <h2 className="section-title">No que a gente acredita</h2>
          <div className="values__grid">
            {values.map((v) => (
              <div key={v.title} className="value">
                <h3>{v.title}</h3>
                <p>{v.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container about__cta">
        <h2>Pronto pra mostrar o seu lado Menino Mau?</h2>
        <Link to="/loja" className="btn btn--primary">
          Ver a coleção
        </Link>
      </section>
    </div>
  )
}

export default About
