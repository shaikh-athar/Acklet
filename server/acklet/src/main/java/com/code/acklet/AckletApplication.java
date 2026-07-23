package com.code.acklet;

import com.code.acklet.config.properties.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
@EnableConfigurationProperties(AppProperties.class)
public class AckletApplication {

	public static void main(String[] args) {
		SpringApplication.run(AckletApplication.class, args);
	}

}
