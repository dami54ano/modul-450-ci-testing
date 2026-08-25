package ch.diethelm.backend.controller;

import ch.diethelm.backend.model.Game;
import ch.diethelm.backend.repository.GameRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.hamcrest.Matchers.containsStringIgnoringCase;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class GameControllerIT {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private GameRepository gameRepository;

    @BeforeEach
    void clearDatabase() {
        gameRepository.deleteAll();
    }

    @Test
    void createGameReturnsCreatedGameWithGeneratedId() throws Exception {
        mockMvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gameJson("Integration Test", "Testbeschreibung", "2020-01-10")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id", notNullValue()))
                .andExpect(jsonPath("$.title").value("Integration Test"));
    }

    @Test
    void createGameWithoutTitleReturnsValidationDetails() throws Exception {
        mockMvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gameJson("", "Testbeschreibung", "2020-01-10")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validierungsfehler"))
                .andExpect(jsonPath("$.details.title", notNullValue()));
    }

    @Test
    void createGameWithFutureReleaseDateReturnsBadRequest() throws Exception {
        String futureDate = LocalDate.now().plusDays(1).toString();

        mockMvc.perform(post("/api/games")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gameJson("Spiel aus der Zukunft", "Test", futureDate)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Validierungsfehler"))
                .andExpect(jsonPath("$.details.releaseDate", notNullValue()));
    }

    @Test
    void getUnknownGameReturnsNotFoundResponse() throws Exception {
        mockMvc.perform(get("/api/games/{id}", 99999L))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.timestamp", notNullValue()))
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.error").value("Not Found"))
                .andExpect(jsonPath("$.message").value(containsStringIgnoringCase("99999")));
    }

    @Test
    void searchByTitleIgnoresCase() throws Exception {
        gameRepository.save(game("Super Mario Odyssey", "Platformer", LocalDate.of(2017, 10, 27)));
        gameRepository.save(game("Portal 2", "Puzzle", LocalDate.of(2011, 4, 19)));

        mockMvc.perform(get("/api/games/search").param("title", "mArIo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Super Mario Odyssey"));
    }

    @Test
    void updateGamePersistsAllChanges() throws Exception {
        Game existing = gameRepository.save(game("Alter Titel", "Alt", LocalDate.of(2001, 1, 1)));

        mockMvc.perform(put("/api/games/{id}", existing.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(gameJson("Neuer Titel", "Neue Beschreibung", "2022-02-22")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Neuer Titel"))
                .andExpect(jsonPath("$.description").value("Neue Beschreibung"))
                .andExpect(jsonPath("$.imageUrl").value("https://example.com/image.jpg"))
                .andExpect(jsonPath("$.releaseDate").value("2022-02-22"));

        mockMvc.perform(get("/api/games/{id}", existing.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Neuer Titel"))
                .andExpect(jsonPath("$.description").value("Neue Beschreibung"));
    }

    @Test
    void deleteGameRemovesItAndSecondDeleteReturnsNotFound() throws Exception {
        Game existing = gameRepository.save(game("Zu löschen", "Test", LocalDate.of(2019, 5, 10)));

        mockMvc.perform(delete("/api/games/{id}", existing.getId()))
                .andExpect(status().isNoContent());

        mockMvc.perform(delete("/api/games/{id}", existing.getId()))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message", containsStringIgnoringCase(existing.getId().toString())));
    }

    private Game game(String title, String description, LocalDate releaseDate) {
        return Game.builder()
                .title(title)
                .description(description)
                .imageUrl("https://example.com/old.jpg")
                .releaseDate(releaseDate)
                .build();
    }

    private String gameJson(String title, String description, String releaseDate) {
        return """
                {
                  "title": "%s",
                  "description": "%s",
                  "imageUrl": "https://example.com/image.jpg",
                  "releaseDate": "%s"
                }
                """.formatted(title, description, releaseDate);
    }
}
