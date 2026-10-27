package com.umai.backend.integration.google;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import com.umai.backend.restaurant.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GoogleCostControlTests {
    @Test
    void photoLookupRequestsOnlyPhotoMetadataAndAttribution() throws Exception {
        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        var mask = new AtomicReference<String>();
        server.createContext("/places/id", exchange -> {
            mask.set(exchange.getRequestHeaders().getFirst("X-Goog-FieldMask"));
            byte[] body = "{\"photos\":[{\"name\":\"places/id/photos/p\",\"authorAttributions\":[{\"displayName\":\"Owner\",\"uri\":\"https://example.org\"}]}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, body.length);
            exchange.getResponseBody().write(body); exchange.close();
        });
        server.start();
        try {
            var budget = mock(ExternalRequestBudget.class); when(budget.acquire()).thenReturn(true);
            var client = new GooglePlacesClient(RestClient.builder(), new GoogleProperties("test", "http://127.0.0.1:" + server.getAddress().getPort(), 120, 800, Duration.ofSeconds(2), false), budget);
            assertEquals("Owner", client.fetchPhoto("id").orElseThrow().authorAttributions().get(0).displayName());
            assertEquals("photos,attributions", mask.get());
        } finally { server.stop(0); }
    }

    @Test
    void exhaustedAllowancePreventsProviderCall() {
        var budget = mock(ExternalRequestBudget.class); when(budget.acquire()).thenReturn(false);
        var client = new GooglePlacesClient(RestClient.builder(), new GoogleProperties("test", "http://127.0.0.1:1", 120, 800, Duration.ofSeconds(1), false), budget);
        assertThrows(GoogleUnavailableException.class, () -> client.fetchPhoto("id"));
        verify(budget).acquire();
    }

    @Test
    void concurrentRequestsShareOnePhotoLookupAndResponsesCannotBeCached() throws Exception {
        var restaurants = mock(RestaurantRepository.class);
        Restaurant r = new Restaurant("Test", 35.7, 139.7, VegetarianType.VEGAN_ONLY, RestaurantSource.OPENSTREETMAP);
        r.setGooglePlaceId("id");
        when(restaurants.findByIdAndStatus(1L, RestaurantStatus.PUBLISHED)).thenReturn(Optional.of(r));
        var google = mock(GooglePlacesClient.class); when(google.isEnabled()).thenReturn(true);
        var entered = new CountDownLatch(1); var release = new CountDownLatch(1);
        when(google.fetchPhoto("id")).thenAnswer(call -> { entered.countDown(); assertTrue(release.await(3, TimeUnit.SECONDS)); return Optional.of(new GooglePlacesClient.PhotoReference("photo", List.of(), "https://maps.google.com")); });
        when(google.resolvePhotoUri("photo")).thenReturn(Optional.of("https://example.org/photo"));
        var controller = new RestaurantPhotoController(restaurants, google, new GoogleCostProperties(100,1000,true));
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var first = executor.submit(() -> controller.photo(1L));
            assertTrue(entered.await(3, TimeUnit.SECONDS));
            var secondStarted = new CountDownLatch(1);
            var second = executor.submit(() -> { secondStarted.countDown(); return controller.photo(1L); });
            assertTrue(secondStarted.await(3, TimeUnit.SECONDS));
            // Wait until the second caller is actually waiting on the shared future.
            Thread.sleep(50);
            release.countDown();
            assertEquals("no-store", first.get(3, TimeUnit.SECONDS).getHeaders().getCacheControl());
            assertEquals(200, second.get(3, TimeUnit.SECONDS).getStatusCode().value());
            verify(google, times(1)).fetchPhoto("id");
        } finally { release.countDown(); }
    }

    @Test
    void failedLookupBacksOffWithoutMarkingRestaurantEnriched() {
        var restaurants = mock(RestaurantRepository.class); var google = mock(GooglePlacesClient.class);
        var r = new Restaurant("Test", 35.7,139.7,VegetarianType.VEGAN_ONLY,RestaurantSource.OPENSTREETMAP);
        when(google.isEnabled()).thenReturn(true);
        when(restaurants.findGoogleTargets(any(), any())).thenReturn(List.of(r));
        when(google.findPlaceId(anyString(), anyDouble(), anyDouble())).thenThrow(new GoogleUnavailableException());
        new GoogleEnrichmentService(restaurants, google).enrich(10);
        assertFalse(r.isGoogleEnriched());
        assertTrue(r.getGoogleRetryAfter().isAfter(java.time.Instant.now()));
        assertEquals(1, r.getGoogleFailures());
        verify(restaurants).save(r);
    }

    @Test
    void failedPhotoLookupUsesOperationalCooldown() {
        var restaurants = mock(RestaurantRepository.class); var google = mock(GooglePlacesClient.class);
        when(google.isEnabled()).thenReturn(true);
        var r = new Restaurant("Test",35.7,139.7,VegetarianType.VEGAN_ONLY,RestaurantSource.OPENSTREETMAP);r.setGooglePlaceId("id");
        when(restaurants.findByIdAndStatus(1L, RestaurantStatus.PUBLISHED)).thenReturn(Optional.of(r));
        when(google.fetchPhoto("id")).thenReturn(Optional.empty());
        var controller = new RestaurantPhotoController(restaurants, google, new GoogleCostProperties(100,1000,true));
        assertEquals(404, controller.photo(1L).getStatusCode().value());
        assertEquals(404, controller.photo(1L).getStatusCode().value());
        verify(google, times(1)).fetchPhoto("id");
    }
}
