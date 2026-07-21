package com.code.acklet;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class AckletApplication {

	public static void main(String[] args) {
		SpringApplication.run(AckletApplication.class, args);
	}

}
