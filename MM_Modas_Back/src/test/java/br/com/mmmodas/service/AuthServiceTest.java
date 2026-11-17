package br.com.mmmodas.service;

import br.com.mmmodas.domain.Cliente;
import br.com.mmmodas.domain.enums.PerfilUsuario;
import br.com.mmmodas.exception.RegraDeNegocioException;
import br.com.mmmodas.repository.ClienteRepository;
import br.com.mmmodas.security.JwtService;
import br.com.mmmodas.web.dto.auth.AuthResponse;
import br.com.mmmodas.web.dto.auth.RegistroRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private ClienteRepository clienteRepository;
    @Mock
    private EnderecoService enderecoService;
    @Mock
    private PasswordEncoder passwordEncoder;
    @Mock
    private JwtService jwtService;

    @InjectMocks
    private AuthService authService;

    @Test
    @DisplayName("Deve bloquear senhas com sequencia de data de aniversario")
    void deveBloquearSenhaComDataDeAniversario() {
        RegistroRequest req = new RegistroRequest(
                "Rafael Silva",
                "rafael@mmmodas.com",
                "Menino@221206",
                "12345678909",
                "(81) 98300-8683",
                null,
                null
        );

        RegraDeNegocioException ex = assertThrows(RegraDeNegocioException.class, () -> authService.registrar(req));
        assertEquals("SENHA_SEQUENCIA_ANIVERSARIO", ex.getCodigo());
    }

    @Test
    @SuppressWarnings("null")
    @DisplayName("Deve registrar funcionario com perfil ADMIN quando matricula valida de 8 caracteres for informada")
    void deveRegistrarFuncionarioComoAdmin() {
        when(clienteRepository.existsByEmailIgnoreCase("equipe@mmmodas.com")).thenReturn(false);
        when(clienteRepository.existsByCpf("52998224725")).thenReturn(false);
        when(passwordEncoder.encode(any())).thenReturn("hash_seguro");
        when(jwtService.gerarAccessToken(any())).thenReturn("jwt-access");
        when(jwtService.gerarRefreshToken(any())).thenReturn("jwt-refresh");
        when(jwtService.accessTokenSegundos()).thenReturn(1800L);
        when(clienteRepository.save(any(Cliente.class))).thenAnswer(inv -> {
            Cliente c = inv.getArgument(0);
            c.setId(UUID.randomUUID());
            return c;
        });

        RegistroRequest req = new RegistroRequest(
                "Daniel Criativo",
                "equipe@mmmodas.com",
                "ModaForte#98",
                "52998224725",
                "(81) 98300-8683",
                "MM2026A1",
                null
        );

        AuthResponse resp = authService.registrar(req);

        assertNotNull(resp);
        assertEquals("jwt-access", resp.accessToken());
        assertEquals(PerfilUsuario.ADMIN, resp.usuario().perfil());
    }
}
