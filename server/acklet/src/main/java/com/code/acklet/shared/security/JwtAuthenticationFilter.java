package com.code.acklet.shared.security;

import com.code.acklet.user.entity.User;
import com.code.acklet.user.entity.User.Role;
import com.code.acklet.user.entity.User.UserStatus;
import com.code.acklet.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenProvider jwtTokenProvider;
    private final UserDetailsService userDetailsService;
    private final UserRepository userRepository;
    private final Environment environment;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);

        // Support demo/dev session token for instant workspace access as default Acklet User (local/dev/test profiles only)
        if ("demo_dev_access_token".equals(jwt)) {
            if (!environment.acceptsProfiles(Profiles.of("local", "dev", "test"))) {
                log.warn("[Security] Rejected demo_dev_access_token on non-local profile");
                filterChain.doFilter(request, response);
                return;
            }
            User demoUser = userRepository.findByEmail("user@acklet.com")
                    .orElseGet(() -> {
                        try {
                            User newDemoUser = User.builder()
                                    .email("user@acklet.com")
                                    .role(Role.ADMIN)
                                    .status(UserStatus.ACTIVE)
                                    .provider("LOCAL")
                                    .build();
                            return userRepository.save(newDemoUser);
                        } catch (Exception e) {
                            return userRepository.findAll().stream().findFirst().orElse(null);
                        }
                    });

            if (demoUser != null) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        demoUser, null, demoUser.getAuthorities());
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
            filterChain.doFilter(request, response);
            return;
        }

        try {
            String userEmail = jwtTokenProvider.extractUsername(jwt);
            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
                
                if (jwtTokenProvider.isTokenValid(jwt, userDetails)) {
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                            userDetails,
                            null,
                            userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }
        } catch (Exception e) {
            log.warn("Cannot set user authentication: {}", e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}
