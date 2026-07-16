package com.code.acklet.shared.logging;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.io.IOException;
import java.util.UUID;

@Component
public class CorrelationIdFilter implements Filter {

    public static final String CORRELATION_HEADER_NAME = "X-Correlation-ID";
    public static final String CORRELATION_MDC_KEY = "correlationId";

    @Override
    public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
            throws IOException, ServletException {
        if (request instanceof HttpServletRequest httpRequest && response instanceof HttpServletResponse httpResponse) {
            String correlationId = httpRequest.getHeader(CORRELATION_HEADER_NAME);
            if (!StringUtils.hasText(correlationId)) {
                correlationId = UUID.randomUUID().toString();
            }
            MDC.put(CORRELATION_MDC_KEY, correlationId);
            httpResponse.setHeader(CORRELATION_HEADER_NAME, correlationId);
            try {
                chain.doFilter(request, response);
            } finally {
                MDC.remove(CORRELATION_MDC_KEY);
            }
        } else {
            chain.doFilter(request, response);
        }
    }
}
