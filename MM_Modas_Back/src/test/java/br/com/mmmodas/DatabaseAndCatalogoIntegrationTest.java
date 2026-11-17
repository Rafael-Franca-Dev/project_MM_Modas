package br.com.mmmodas;

import br.com.mmmodas.service.CatalogoService;
import br.com.mmmodas.web.dto.catalogo.CategoriaResponse;
import br.com.mmmodas.web.dto.catalogo.ProdutoResponse;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class DatabaseAndCatalogoIntegrationTest {

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CatalogoService catalogoService;

    @Test
    @DisplayName("Deve conectar ao banco PostgreSQL e confirmar catalogo MM MODAS com 12 categorias e >= 200 produtos")
    void deveConectarAoBancoEValidarCatalogoMmModas() {
        Integer ping = jdbcTemplate.queryForObject("SELECT 1", Integer.class);
        assertEquals(1, ping, "Conexao com PostgreSQL deve responder SELECT 1");

        List<CategoriaResponse> categorias = catalogoService.listarCategorias();
        assertTrue(categorias.size() >= 12, "Deve haver pelo menos 12 categorias ativas no banco: encontradas " + categorias.size());
        assertEquals("tshirts", categorias.get(0).slug());

        // Confirma que nenhuma categoria de jogos está ativa
        List<String> slugsAtivos = categorias.stream().map(CategoriaResponse::slug).toList();
        assertFalse(slugsAtivos.contains("rpg"));
        assertFalse(slugsAtivos.contains("estrategia"));

        List<ProdutoResponse> produtos = catalogoService.listarProdutos();
        assertTrue(produtos.size() >= 200, "Deve haver pelo menos 200 produtos ativos da MM MODAS no banco: encontrados " + produtos.size());

        ProdutoResponse primeiro = catalogoService.buscarPorSlug("camiseta-sorriso-maroto");
        assertNotNull(primeiro);
        assertEquals("T-Shirt Sorriso Maroto", primeiro.nome());
    }
}
