package com.code.acklet;

import com.code.acklet.config.properties.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.data.redis.repository.configuration.EnableRedisRepositories;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties(AppProperties.class)
@EnableJpaRepositories(basePackages = "com.code.acklet")
@EnableRedisRepositories(basePackages = {})
public class AckletApplication {

	public static void main(String[] args) {
		SpringApplication.run(AckletApplication.class, args);
	}

}
