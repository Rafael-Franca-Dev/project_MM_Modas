package br.com.mmmodas.web.dto.auth;

import br.com.mmmodas.web.dto.endereco.EnderecoRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record RegistroRequest(
        @NotBlank(message = "Nome e obrigatorio")
        @Size(min = 3, max = 160, message = "Informe seu nome completo")
        String nome,

        @NotBlank(message = "E-mail e obrigatorio")
        @Email(message = "E-mail invalido")
        String email,

        @NotBlank(message = "Senha e obrigatoria")
        @Size(min = 9, max = 100, message = "A senha deve ter mais de 8 caracteres")
        String senha,

        @Pattern(regexp = "^[0-9]{11}$", message = "CPF deve conter 11 digitos numericos")
        String cpf,

        @Size(max = 20)
        String telefone,

        @Pattern(regexp = "^[A-Za-z0-9]{8}$", message = "A matricula deve conter exatamente 8 caracteres alfanumericos")
        String matricula,

        @Valid
        EnderecoRequest endereco
) {
}

