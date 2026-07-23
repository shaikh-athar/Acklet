package com.code.acklet;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.flyway.enabled=false",
		"spring.data.redis.repositories.enabled=false",
		"app.security.jwt.secret=Mzg1OTM4OTVhNzM5NDgzOTBhNzM5NDgzOTBhNzM5NDgzOTBhNzM9",
		"app.security.encryption.key=MTIzNDU2Nzg5MDEyMzQ1Njc4OTAxMjM0NTY3ODkwMTI="
})
class AckletApplicationTests {

	@Test
	void contextLoads() {
	}

}
