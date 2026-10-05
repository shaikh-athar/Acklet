package com.code.acklet.shared.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final RateLimitingFilter rateLimitingFilter;
    private final com.code.acklet.airvault.security.AirVaultSecurityFilter airVaultSecurityFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CsrfTokenRequestAttributeHandler requestHandler = new CsrfTokenRequestAttributeHandler();
        requestHandler.setCsrfRequestAttributeName(null);

        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf
                .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                .csrfTokenRequestHandler(requestHandler)
                .ignoringRequestMatchers("/api/v1/auth/**", "/api/v1/github/webhooks", "/.well-known/**", "/api/v1/publish/**", "/api/v1/airvault/**", "/ws/airvault/**")
            )
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth
                // OpenAPI & JWKS documentation
                .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html", "/.well-known/**").permitAll()
                // Public auth endpoints
                .requestMatchers("/api/v1/auth/**").permitAll()
                // Public airvault clipboard endpoints & WebSocket gateway
                .requestMatchers("/api/v1/airvault/**", "/ws/airvault/**").permitAll()
                // Public tools retrieval
                .requestMatchers(HttpMethod.GET, "/api/v1/tools/**").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/categories/**").permitAll()
                // Public community discussions
                .requestMatchers(HttpMethod.GET, "/api/v1/community/**").permitAll()
                // Public blog posts
                .requestMatchers(HttpMethod.GET, "/api/v1/blog/**").permitAll()
                // Public reviews
                .requestMatchers(HttpMethod.GET, "/api/v1/tools/*/reviews").permitAll()
                // Unified Feedback submission
                .requestMatchers(HttpMethod.POST, "/api/v1/feedback").permitAll()
                .requestMatchers(HttpMethod.GET, "/api/v1/feedback/**").permitAll()
                .requestMatchers(HttpMethod.PATCH, "/api/v1/feedback/**").permitAll()
                .requestMatchers(HttpMethod.PUT, "/api/v1/feedback/**").permitAll()
                // Public GitHub webhooks
                .requestMatchers("/api/v1/github/webhooks").permitAll()
                // Fallback: any other request requires authentication
                .anyRequest().authenticated()
            )
            .headers(headers -> headers
                .frameOptions(frame -> frame.deny())
                .contentTypeOptions(contentType -> {})
                .referrerPolicy(referrer -> referrer.policy(org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN))
                .httpStrictTransportSecurity(hsts -> hsts.includeSubDomains(true).maxAgeInSeconds(31536000))
                .contentSecurityPolicy(csp -> csp.policyDirectives("default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com https://challenges.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self' http://localhost:8080 ws://localhost:8080 ws: wss: https://accounts.google.com https://challenges.cloudflare.com"))
                .permissionsPolicy(permissions -> permissions.policy("camera=(), microphone=(), geolocation=()"))
            )
            .addFilterBefore(rateLimitingFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(airVaultSecurityFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @org.springframework.beans.factory.annotation.Value("${cors.allowed-origins:http://localhost:4200,http://localhost:3000,https://*.acklet.com,https://acklet.com}")
    private String allowedOriginsConfig;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        
        List<String> origins = List.of(allowedOriginsConfig.split(","));
        for (String origin : origins) {
            String trimmed = origin.trim();
            if (trimmed.contains("*")) {
                configuration.addAllowedOriginPattern(trimmed);
            } else {
                configuration.addAllowedOrigin(trimmed);
            }
        }

        // Allow localhost and local subdomains in development
        configuration.addAllowedOriginPattern("http://*.localhost:*");
        configuration.addAllowedOriginPattern("http://localhost:*");
        configuration.addAllowedOriginPattern("https://*.acklet.*");
        configuration.addAllowedOriginPattern("https://acklet.*");

        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH", "HEAD"));
        // Allow all headers including custom telemetry (X-Operation-Id), device IDs, and caching headers
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Authorization", "X-Correlation-ID", "X-XSRF-TOKEN", "Retry-After", "X-Operation-Id", "X-Device-Id"));
        configuration.setAllowCredentials(true);
        configuration.setMaxAge(3600L); // 1-hour preflight cache — stops OPTIONS spam on every poll

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public org.springframework.security.crypto.password.PasswordEncoder passwordEncoder() {
        return new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder();
    }
}
