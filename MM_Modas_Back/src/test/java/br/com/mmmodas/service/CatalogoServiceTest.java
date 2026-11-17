package br.com.mmmodas.service;

import br.com.mmmodas.domain.Categoria;
import br.com.mmmodas.domain.Produto;
import br.com.mmmodas.domain.Variacao;
import br.com.mmmodas.exception.ConflitoException;
import br.com.mmmodas.exception.RegraDeNegocioException;
import br.com.mmmodas.repository.CategoriaRepository;
import br.com.mmmodas.repository.EstoqueRepository;
import br.com.mmmodas.repository.ProdutoRepository;
import br.com.mmmodas.repository.VariacaoRepository;
import br.com.mmmodas.web.dto.catalogo.AtualizarComercialProdutoRequest;
import br.com.mmmodas.web.dto.catalogo.CategoriaRequest;
import br.com.mmmodas.web.dto.catalogo.CategoriaResponse;
import br.com.mmmodas.web.dto.catalogo.ProdutoResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CatalogoServiceTest {

    @Mock
    private CategoriaRepository categoriaRepository;
    @Mock
    private ProdutoRepository produtoRepository;
    @Mock
    private VariacaoRepository variacaoRepository;
    @Mock
    private EstoqueRepository estoqueRepository;
    @Mock
    private EstoqueService estoqueService;

    @InjectMocks
    private CatalogoService catalogoService;

    @Test
    @DisplayName("Deve criar nova categoria gerando slug normalizado sem acentos")
    void deveCriarCategoriaComSlugNormalizado() {
        when(categoriaRepository.existsBySlug("alfaiataria-blazers")).thenReturn(false);
        when(categoriaRepository.count()).thenReturn(12L);
        when(categoriaRepository.save(any(Categoria.class))).thenAnswer(inv -> {
            Categoria c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        CategoriaResponse resp = catalogoService.criarCategoria(new CategoriaRequest("Alfaiataria & Blazers", null, null));

        assertEquals("Alfaiataria & Blazers", resp.nome());
        assertEquals("alfaiataria-blazers", resp.slug());
        assertEquals(13, resp.ordem());
    }

    @Test
    @DisplayName("Deve impedir criacao de categoria com slug duplicado")
    void deveBloquearCategoriaDuplicada() {
        when(categoriaRepository.existsBySlug("tshirts")).thenReturn(true);

        assertThrows(ConflitoException.class,
                () -> catalogoService.criarCategoria(new CategoriaRequest("T-Shirts", "tshirts", 1)));
    }

    @Test
    @DisplayName("Deve atualizar preco promocional e estoque de um produto da MM MODAS")
    void deveAtualizarDadosComerciaisDoProduto() {
        UUID prodId = UUID.randomUUID();
        UUID varId = UUID.randomUUID();

        Categoria cat = new Categoria();
        cat.setId(UUID.randomUUID());
        cat.setNome("T-Shirts & Oversized");
        cat.setSlug("tshirts");

        Produto prod = new Produto();
        prod.setId(prodId);
        prod.setNome("T-Shirt Sorriso Maroto");
        prod.setSlug("camiseta-sorriso-maroto");
        prod.setCategoria(cat);
        prod.setPrecoBase(new BigDecimal("129.90"));
        prod.setAtivo(true);

        Variacao var = new Variacao();
        var.setId(varId);
        var.setProduto(prod);
        var.setSku("MM-MOD-001");
        var.setTamanho("M");
        var.setCor("Lavanda");
        var.setAtivo(true);

        when(produtoRepository.buscarAtivoPorSlugComDetalhes("camiseta-sorriso-maroto")).thenReturn(Optional.of(prod));
        when(variacaoRepository.buscarAtivasPorProdutos(List.of(prodId))).thenReturn(List.of(var));
        when(estoqueRepository.findAllById(List.of(varId))).thenReturn(List.of());

        AtualizarComercialProdutoRequest req = new AtualizarComercialProdutoRequest(
                new BigDecimal("139.90"),
                new BigDecimal("99.90"),
                30
        );

        ProdutoResponse atualizado = catalogoService.atualizarComercialPorSlug("camiseta-sorriso-maroto", req);

        assertEquals(new BigDecimal("139.90"), atualizado.precoBase());
        assertEquals(new BigDecimal("99.90"), atualizado.precoPromocional());
        verify(estoqueService).ajustar(varId, 30, "Ajuste comercial pela equipe");
    }

    @Test
    @DisplayName("Deve rejeitar preco promocional maior ou igual ao preco base")
    void deveRejeitarPrecoPromocionalInvalido() {
        Produto prod = new Produto();
        prod.setId(UUID.randomUUID());
        prod.setSlug("camiseta-sorriso-maroto");

        when(produtoRepository.buscarAtivoPorSlugComDetalhes("camiseta-sorriso-maroto")).thenReturn(Optional.of(prod));

        AtualizarComercialProdutoRequest req = new AtualizarComercialProdutoRequest(
                new BigDecimal("100.00"),
                new BigDecimal("120.00"),
                10
        );

        assertThrows(RegraDeNegocioException.class,
                () -> catalogoService.atualizarComercialPorSlug("camiseta-sorriso-maroto", req));
    }
}
