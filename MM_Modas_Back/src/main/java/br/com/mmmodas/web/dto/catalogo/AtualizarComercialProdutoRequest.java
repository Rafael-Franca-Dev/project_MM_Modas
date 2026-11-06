package br.com.mmmodas.web.dto.catalogo;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public record AtualizarComercialProdutoRequest(
        @NotNull(message = "O preco base e obrigatorio")
        @Positive(message = "O preco base deve ser maior que zero")
        BigDecimal precoBase,

        @PositiveOrZero(message = "O preco promocional nao pode ser negativo")
        BigDecimal precoPromocional,

        @PositiveOrZero(message = "O estoque nao pode ser negativo")
        Integer estoque
) {
}

