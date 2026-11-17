package br.com.mmmodas.service;

import br.com.mmmodas.exception.RegraDeNegocioException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

class FreteServiceTest {

    private FreteService freteService;

    @BeforeEach
    void setUp() {
        freteService = new FreteService();
    }

    @Test
    @DisplayName("Deve conceder frete gratis para compras a partir de R$ 299,00")
    void deveConcederFreteGratisAcimaDoLimite() {
        assertEquals(new BigDecimal("0.00"), freteService.calcular(new BigDecimal("299.00"), "PE"));
        assertEquals(new BigDecimal("0.00"), freteService.calcular(new BigDecimal("450.50"), "SP"));
    }

    @Test
    @DisplayName("Deve calcular frete regional corretamente abaixo de R$ 299,00")
    void deveCalcularFretePorRegiao() {
        // SP: 24.90 + 0.00 = 24.90
        assertEquals(new BigDecimal("24.90"), freteService.calcular(new BigDecimal("150.00"), "SP"));
        // RJ / MG: 24.90 + 5.00 = 29.90
        assertEquals(new BigDecimal("29.90"), freteService.calcular(new BigDecimal("150.00"), "RJ"));
        // PE (adicional padrao 15.00): 24.90 + 15.00 = 39.90
        assertEquals(new BigDecimal("39.90"), freteService.calcular(new BigDecimal("150.00"), "pe"));
    }

    @Test
    @DisplayName("Deve rejeitar UF invalida ou vazia e subtotal nulo")
    void deveRejeitarParametrosInvalidos() {
        assertThrows(RegraDeNegocioException.class, () -> freteService.calcular(null, "SP"));
        assertThrows(RegraDeNegocioException.class, () -> freteService.calcular(new BigDecimal("100.00"), ""));
        assertThrows(RegraDeNegocioException.class, () -> freteService.calcular(new BigDecimal("100.00"), "XX"));
    }
}
