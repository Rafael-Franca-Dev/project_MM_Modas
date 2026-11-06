package br.com.mmmodas.web.dto.catalogo;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CategoriaRequest(
        @NotBlank(message = "O nome da categoria e obrigatorio")
        @Size(min = 2, max = 80, message = "O nome da categoria deve ter entre 2 e 80 caracteres")
        String nome,

        @Size(max = 80)
        String slug,

        Integer ordem
) {
}

