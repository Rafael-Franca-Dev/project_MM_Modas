package br.com.mmmodas.service;

import br.com.mmmodas.domain.Categoria;
import br.com.mmmodas.domain.Produto;
import br.com.mmmodas.domain.Variacao;
import br.com.mmmodas.exception.ConflitoException;
import br.com.mmmodas.exception.RecursoNaoEncontradoException;
import br.com.mmmodas.exception.RegraDeNegocioException;
import br.com.mmmodas.repository.CategoriaRepository;
import br.com.mmmodas.repository.EstoqueRepository;
import br.com.mmmodas.repository.ProdutoRepository;
import br.com.mmmodas.repository.VariacaoRepository;
import br.com.mmmodas.web.dto.catalogo.AtualizarComercialProdutoRequest;
import br.com.mmmodas.web.dto.catalogo.CategoriaRequest;
import br.com.mmmodas.web.dto.catalogo.CategoriaResponse;
import br.com.mmmodas.web.dto.catalogo.ProdutoResponse;
import br.com.mmmodas.web.dto.catalogo.VariacaoResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.Normalizer;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CatalogoService {

    private final CategoriaRepository categoriaRepository;
    private final ProdutoRepository produtoRepository;
    private final VariacaoRepository variacaoRepository;
    private final EstoqueRepository estoqueRepository;
    private final EstoqueService estoqueService;

    @Transactional(readOnly = true)
    public List<CategoriaResponse> listarCategorias() {
        return categoriaRepository.findByAtivaTrueOrderByOrdemAscNomeAsc()
                .stream()
                .map(CategoriaResponse::de)
                .toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public List<ProdutoResponse> listarProdutos() {
        List<Produto> produtos = produtoRepository.listarAtivosComCategoriaEImagens();
        if (produtos.isEmpty()) {
            return List.of();
        }

        List<UUID> produtoIds = produtos.stream().map(p -> p.getId()).toList();
        List<Variacao> variacoes = variacaoRepository.buscarAtivasPorProdutos(produtoIds);

        List<UUID> variacaoIds = variacoes.stream().map(v -> v.getId()).toList();
        Map<UUID, Integer> saldoPorVariacao = estoqueRepository.findAllById(variacaoIds)
                .stream()
                .collect(Collectors.toMap(e -> e.getVariacaoId(), e -> e.disponivel()));

        Map<UUID, List<VariacaoResponse>> variacoesPorProduto = new HashMap<>();
        for (Variacao v : variacoes) {
            int disponivel = saldoPorVariacao.getOrDefault(v.getId(), 0);
            variacoesPorProduto
                    .computeIfAbsent(v.getProduto().getId(), k -> new ArrayList<>())
                    .add(VariacaoResponse.de(v, disponivel));
        }

        return produtos.stream()
                .map(p -> ProdutoResponse.de(p, variacoesPorProduto.getOrDefault(p.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public ProdutoResponse buscarPorSlug(String slug) {
        Produto produto = produtoRepository.buscarAtivoPorSlugComDetalhes(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto nao encontrado: " + slug));

        List<Variacao> variacoes = variacaoRepository.buscarAtivasPorProdutos(List.of(produto.getId()));
        List<UUID> variacaoIds = variacoes.stream().map(v -> v.getId()).toList();
        Map<UUID, Integer> saldoPorVariacao = estoqueRepository.findAllById(variacaoIds)
                .stream()
                .collect(Collectors.toMap(e -> e.getVariacaoId(), e -> e.disponivel()));

        List<VariacaoResponse> variacoesResp = variacoes.stream()
                .map(v -> VariacaoResponse.de(v, saldoPorVariacao.getOrDefault(v.getId(), 0)))
                .toList();

        return ProdutoResponse.de(produto, variacoesResp);
    }

    @Transactional
    public CategoriaResponse criarCategoria(CategoriaRequest req) {
        String nomeLimpo = req.nome().trim();
        String slugBase = (req.slug() != null && !req.slug().isBlank())
                ? req.slug().trim()
                : nomeLimpo;
        String slugNormalizado = gerarSlug(slugBase);

        if (slugNormalizado.isEmpty()) {
            throw new RegraDeNegocioException("SLUG_INVALIDO", "Nao foi possivel gerar um identificador valido para a categoria.");
        }
        if (categoriaRepository.existsBySlug(slugNormalizado)) {
            throw new ConflitoException("Ja existe uma categoria cadastrada com o identificador: " + slugNormalizado);
        }

        Categoria categoria = new Categoria();
        categoria.setNome(nomeLimpo);
        categoria.setSlug(slugNormalizado);
        categoria.setOrdem(req.ordem() != null ? req.ordem() : (int) categoriaRepository.count() + 1);
        categoria.setAtiva(true);

        return CategoriaResponse.de(categoriaRepository.save(categoria));
    }

    @Transactional
    public ProdutoResponse atualizarComercialPorSlug(String slug, AtualizarComercialProdutoRequest req) {
        Produto produto = produtoRepository.buscarAtivoPorSlugComDetalhes(slug)
                .orElseThrow(() -> new RecursoNaoEncontradoException("Produto nao encontrado: " + slug));

        BigDecimal precoBase = req.precoBase().setScale(2, RoundingMode.HALF_UP);
        BigDecimal precoPromocional = null;

        if (req.precoPromocional() != null && req.precoPromocional().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal promoCandidate = req.precoPromocional().setScale(2, RoundingMode.HALF_UP);
            if (promoCandidate.compareTo(precoBase) >= 0) {
                throw new RegraDeNegocioException("PRECO_PROMOCIONAL_INVALIDO",
                        "O valor promocional deve ser menor que o valor base.");
            }
            precoPromocional = promoCandidate;
        }

        produto.setPrecoBase(precoBase);
        produto.setPrecoPromocional(precoPromocional);
        produtoRepository.save(produto);

        List<Variacao> variacoes = variacaoRepository.buscarAtivasPorProdutos(List.of(produto.getId()));
        for (Variacao v : variacoes) {
            if (v.getPreco() != null) {
                v.setPreco(null);
                variacaoRepository.save(v);
            }
            if (req.estoque() != null) {
                estoqueService.ajustar(v.getId(), req.estoque(), "Ajuste comercial pela equipe");
            }
        }

        return buscarPorSlug(slug);
    }

    private String gerarSlug(String texto) {
        String semAcento = Normalizer.normalize(texto, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "");
        return semAcento.toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-|-$)", "");
    }
}

