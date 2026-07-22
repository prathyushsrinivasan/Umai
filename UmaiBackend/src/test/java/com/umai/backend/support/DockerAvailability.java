package com.umai.backend.support;

import org.testcontainers.DockerClientFactory;

/**
 * Detects whether a usable Docker environment exists, so container-backed tests can
 * be skipped instead of failing on machines without Docker.
 */
public final class DockerAvailability {

	/**
	 * Cached because Testcontainers refuses to retry after a failed probe, and the
	 * result cannot change during a build.
	 */
	private static final boolean AVAILABLE = probe();

	private DockerAvailability() {
	}

	public static boolean isAvailable() {
		return AVAILABLE;
	}

	private static boolean probe() {
		try {
			return DockerClientFactory.instance().isDockerAvailable();
		}
		catch (RuntimeException | LinkageError ex) {
			return false;
		}
	}

}
