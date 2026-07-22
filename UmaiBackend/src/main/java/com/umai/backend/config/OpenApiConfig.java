package com.umai.backend.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/** Describes the API for the OpenAPI document served at {@code /v3/api-docs}. */
@Configuration
public class OpenApiConfig {

	@Bean
	OpenAPI umaiOpenApi() {
		return new OpenAPI()
			// Lets Swagger UI send a bearer token for the protected endpoints.
			.components(new Components().addSecuritySchemes("bearerAuth",
				new SecurityScheme()
					.type(SecurityScheme.Type.HTTP)
					.scheme("bearer")
					.bearerFormat("JWT")
					.description("POST /api/v1/auth/login で取得したトークンを入力してください。")))
			.info(new Info()
				.title("Umai API")
				.version("v1")
				.description("""
						東京のベジタリアン・ヴィーガン対応レストランを検索するための API。

						Notes for clients:
						* Optional fields are null when the underlying data source does not
						  provide them. Render the absence rather than a placeholder value.
						* `averageRating` is derived from reviews and is null when a
						  restaurant has none; `reviewCount` is then 0.
						* Geographic data originates from OpenStreetMap contributors (ODbL).
						""")
				.license(new License().name("OpenStreetMap data: ODbL")))
			.servers(List.of(new Server().url("/").description("Current host")));
	}

}
