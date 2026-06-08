package com.bcits.works;

import java.util.TimeZone;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableAsync
@EnableScheduling
public class WorksApplication {

	public static void main(String[] args) {
		// Run the JVM in UTC before Spring (and the JDBC driver) start: the PostgreSQL driver
		// sends the JVM's default zone as the connection TimeZone, and Postgres 16 rejects the
		// legacy "Asia/Calcutta" alias that India-locale hosts often resolve to (FATAL on connect).
		// UTC is also the canonical processing zone for the backend — timestamps are stored/sent in UTC.
		TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
		SpringApplication.run(WorksApplication.class, args);
	}

}
