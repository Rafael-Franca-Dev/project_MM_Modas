package br.com.mmmodas.service;

import br.com.mmmodas.domain.Cliente;
import br.com.mmmodas.domain.enums.PerfilUsuario;
import br.com.mmmodas.exception.ConflitoException;
import br.com.mmmodas.exception.NaoAutorizadoException;
import br.com.mmmodas.exception.RecursoNaoEncontradoException;
import br.com.mmmodas.exception.RegraDeNegocioException;
import br.com.mmmodas.repository.ClienteRepository;
import br.com.mmmodas.security.JwtService;
import br.com.mmmodas.web.dto.auth.*;
import br.com.mmmodas.web.dto.endereco.EnderecoResponse;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthService {

    private static final Pattern PADRAO_DATA_SEPARADA = Pattern.compile(
            "(0[1-9]|[12]\\d|3[01])[/.\\-_](0[1-9]|1[0-2])[/.\\-_]((19|20)\\d{2}|\\d{2})"
    );
    private static final Pattern PADRAO_BLOCO_DIGITOS = Pattern.compile("\\d{6,}");
    private static final int[] DIAS_POR_MES = {31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

    private final ClienteRepository clienteRepository;
    private final EnderecoService enderecoService;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public AuthResponse registrar(RegistroRequest req) {
        validarSenhaForte(req.senha());

        String emailNormalizado = req.email().trim().toLowerCase();
        if (clienteRepository.existsByEmailIgnoreCase(emailNormalizado)) {
            throw new ConflitoException("Ja existe uma conta cadastrada com este e-mail.");
        }

        String cpfLimpo = req.cpf() != null && !req.cpf().isBlank()
                ? req.cpf().replaceAll("\\D", "")
                : null;
        if (cpfLimpo != null && clienteRepository.existsByCpf(cpfLimpo)) {
            throw new ConflitoException("Ja existe uma conta cadastrada com este CPF.");
        }

        boolean isEquipe = req.matricula() != null && !req.matricula().isBlank();
        if (isEquipe && !req.matricula().trim().matches("^[A-Za-z0-9]{8}$")) {
            throw new RegraDeNegocioException("MATRICULA_INVALIDA",
                    "A matricula da equipe deve conter exatamente 8 caracteres alfanumericos.");
        }

        Cliente cliente = new Cliente();
        cliente.setNome(req.nome().trim());
        cliente.setEmail(emailNormalizado);
        cliente.setSenhaHash(passwordEncoder.encode(req.senha()));
        cliente.setCpf(cpfLimpo);
        cliente.setTelefone(req.telefone() != null ? req.telefone().trim() : null);
        cliente.setPerfil(isEquipe ? PerfilUsuario.ADMIN : PerfilUsuario.CLIENTE);
        cliente.setAtivo(true);

        cliente = clienteRepository.save(cliente);

        EnderecoResponse enderecoPrincipal = null;
        if (req.endereco() != null) {
            enderecoPrincipal = enderecoService.criar(cliente.getId(), req.endereco());
        }

        return emitirTokens(cliente, enderecoPrincipal);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest req) {
        String emailNormalizado = req.email().trim().toLowerCase();
        Cliente cliente = clienteRepository.findByEmailIgnoreCase(emailNormalizado)
                .orElseThrow(() -> new NaoAutorizadoException("E-mail ou senha invalidos."));

        if (!cliente.isAtivo() || !passwordEncoder.matches(req.senha(), cliente.getSenhaHash())) {
            throw new NaoAutorizadoException("E-mail ou senha invalidos.");
        }

        EnderecoResponse enderecoPrincipal = enderecoService.buscarPrincipalDoCliente(cliente.getId()).orElse(null);
        return emitirTokens(cliente, enderecoPrincipal);
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public AuthResponse refresh(RefreshRequest req) {
        try {
            Claims claims = jwtService.validarRefreshToken(req.refreshToken());
            UUID clienteId = UUID.fromString(claims.getSubject());
            Cliente cliente = clienteRepository.findById(clienteId)
                    .orElseThrow(() -> new NaoAutorizadoException("Usuario nao encontrado."));
            if (!cliente.isAtivo()) {
                throw new NaoAutorizadoException("Conta desativada.");
            }
            EnderecoResponse enderecoPrincipal = enderecoService.buscarPrincipalDoCliente(cliente.getId()).orElse(null);
            return emitirTokens(cliente, enderecoPrincipal);
        } catch (JwtException | IllegalArgumentException ex) {
            throw new NaoAutorizadoException("Refresh token invalido ou expirado.");
        }
    }

    @Transactional(readOnly = true)
    @SuppressWarnings("null")
    public UsuarioResponse buscarUsuarioAtual(UUID clienteId) {
        Cliente cliente = clienteRepository.findById(clienteId)
                .orElseThrow(() -> RecursoNaoEncontradoException.de("Cliente", clienteId));
        EnderecoResponse enderecoPrincipal = enderecoService.buscarPrincipalDoCliente(clienteId).orElse(null);
        return UsuarioResponse.de(cliente, enderecoPrincipal);
    }

    private AuthResponse emitirTokens(Cliente cliente, EnderecoResponse enderecoPrincipal) {
        String access = jwtService.gerarAccessToken(cliente);
        String refresh = jwtService.gerarRefreshToken(cliente);
        return new AuthResponse(
                access,
                refresh,
                jwtService.accessTokenSegundos(),
                UsuarioResponse.de(cliente, enderecoPrincipal)
        );
    }

    private void validarSenhaForte(String senha) {
        if (senha == null || senha.length() <= 8) {
            throw new RegraDeNegocioException("SENHA_FRACA",
                    "A senha deve ter mais de 8 caracteres (minimo de 9).");
        }
        if (!senha.chars().anyMatch(Character::isUpperCase)) {
            throw new RegraDeNegocioException("SENHA_FRACA",
                    "A senha deve conter pelo menos 1 letra maiuscula.");
        }
        if (!senha.chars().anyMatch(Character::isLowerCase)) {
            throw new RegraDeNegocioException("SENHA_FRACA",
                    "A senha deve conter pelo menos 1 letra minuscula.");
        }
        boolean temEspecial = senha.chars().anyMatch(c -> !Character.isLetterOrDigit(c) && !Character.isWhitespace(c));
        if (!temEspecial) {
            throw new RegraDeNegocioException("SENHA_FRACA",
                    "A senha deve conter pelo menos 1 caractere especial.");
        }
        String sequenciaData = detectarSequenciaAniversario(senha);
        if (sequenciaData != null) {
            throw new RegraDeNegocioException("SENHA_SEQUENCIA_ANIVERSARIO",
                    "A senha nao pode conter sequencias de data/aniversario (" + sequenciaData + ").");
        }
    }

    private String detectarSequenciaAniversario(String senha) {
        Matcher sep = PADRAO_DATA_SEPARADA.matcher(senha);
        if (sep.find()) {
            int d = Integer.parseInt(sep.group(1));
            int m = Integer.parseInt(sep.group(2));
            if (isDiaMesValido(d, m)) {
                return sep.group(1) + "/" + sep.group(2) + "/" + sep.group(3);
            }
        }

        Matcher blocos = PADRAO_BLOCO_DIGITOS.matcher(senha);
        while (blocos.find()) {
            String b = blocos.group();
            for (int i = 0; i <= b.length() - 8; i++) {
                String sub8 = b.substring(i, i + 8);
                int dd1 = Integer.parseInt(sub8.substring(0, 2));
                int mm1 = Integer.parseInt(sub8.substring(2, 4));
                int yyyy1 = Integer.parseInt(sub8.substring(4, 8));
                if (yyyy1 >= 1900 && yyyy1 <= 2099 && isDiaMesValido(dd1, mm1)) {
                    return sub8.substring(0, 2) + "/" + sub8.substring(2, 4) + "/" + sub8.substring(4, 8);
                }

                int yyyy2 = Integer.parseInt(sub8.substring(0, 4));
                int mm2 = Integer.parseInt(sub8.substring(4, 6));
                int dd2 = Integer.parseInt(sub8.substring(6, 8));
                if (yyyy2 >= 1900 && yyyy2 <= 2099 && isDiaMesValido(dd2, mm2)) {
                    return sub8.substring(6, 8) + "/" + sub8.substring(4, 6) + "/" + sub8.substring(0, 4);
                }
            }

            for (int i = 0; i <= b.length() - 6; i++) {
                String sub6 = b.substring(i, i + 6);
                int dd1 = Integer.parseInt(sub6.substring(0, 2));
                int mm1 = Integer.parseInt(sub6.substring(2, 4));
                if (isDiaMesValido(dd1, mm1)) {
                    return sub6.substring(0, 2) + "/" + sub6.substring(2, 4) + "/" + sub6.substring(4, 6);
                }

                int mm2 = Integer.parseInt(sub6.substring(2, 4));
                int dd2 = Integer.parseInt(sub6.substring(4, 6));
                if (isDiaMesValido(dd2, mm2)) {
                    return sub6.substring(4, 6) + "/" + sub6.substring(2, 4) + "/" + sub6.substring(0, 2);
                }
            }
        }
        return null;
    }

    private boolean isDiaMesValido(int dia, int mes) {
        if (mes < 1 || mes > 12 || dia < 1 || dia > 31) {
            return false;
        }
        return dia <= DIAS_POR_MES[mes - 1];
    }
}

