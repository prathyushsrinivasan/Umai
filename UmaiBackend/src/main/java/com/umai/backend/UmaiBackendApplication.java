package com.umai.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@ConfigurationPropertiesScan
// Imports run on a background thread; see ImportJobService.
@EnableAsync
public class UmaiBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(UmaiBackendApplication.class, args);
	}

}
