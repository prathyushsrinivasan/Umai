package com.umai.backend.integration.overpass;

import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Locale;
import java.util.concurrent.atomic.AtomicReference;
import com.sun.net.httpserver.HttpServer;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;
import com.umai.backend.restaurant.MapBounds;
import static org.junit.jupiter.api.Assertions.*;

class OverpassRequestTests {
    @Test
    void requestIsFormEncodedAndRawTruncationSurvivesSkippedRecords() throws Exception {
        var query = new AtomicReference<String>();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/", exchange -> {
            query.set(java.net.URLDecoder.decode(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8), StandardCharsets.UTF_8));
            byte[] body = "{\"elements\":[{\"type\":\"node\",\"id\":1,\"lat\":35.7,\"lon\":139.7,\"tags\":{\"name\":\"Test\",\"diet:vegan\":\"only\"}},{\"type\":\"node\",\"id\":2}]}".getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type","application/json");
            exchange.sendResponseHeaders(200,body.length);exchange.getResponseBody().write(body);exchange.close();
        });
        server.start();
        Locale previous = Locale.getDefault();
        try {
            Locale.setDefault(Locale.GERMANY);
            var provider = new OverpassRestaurantProvider(RestClient.builder(), new OverpassProperties("http://127.0.0.1:" + server.getAddress().getPort(), Duration.ofSeconds(2), "Umai test", 2), new OsmTagMapper());
            var batch = provider.fetchBatch(new MapBounds(35.6,139.6,35.8,139.8),2);
            assertEquals(1,batch.restaurants().size());
            assertTrue(batch.truncated());
            assertTrue(query.get().contains("35.600000,139.600000"));
            assertTrue(query.get().contains("[\"diet:vegan\"]"));
        } finally { Locale.setDefault(previous); server.stop(0); }
    }
}
