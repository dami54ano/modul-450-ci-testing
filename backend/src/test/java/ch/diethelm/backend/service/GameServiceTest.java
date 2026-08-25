package ch.diethelm.backend.service;

import ch.diethelm.backend.model.Game;
import ch.diethelm.backend.repository.GameRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GameServiceTest {

    @Mock
    private GameRepository gameRepository;

    @InjectMocks
    private GameService gameService;

    @Test
    void getAllGamesReturnsGamesFromRepository() {
        List<Game> games = List.of(
                game(1L, "Minecraft", "Sandbox", "minecraft.jpg", LocalDate.of(2011, 11, 18)),
                game(2L, "Portal 2", "Puzzle", "portal2.jpg", LocalDate.of(2011, 4, 19))
        );
        when(gameRepository.findAll()).thenReturn(games);

        List<Game> result = gameService.getAllGames();

        assertSame(games, result);
        verify(gameRepository).findAll();
    }

    @Test
    void getGameByIdReturnsGameWhenItExists() {
        Game existingGame = game(1L, "Minecraft", "Sandbox", "minecraft.jpg",
                LocalDate.of(2011, 11, 18));
        when(gameRepository.findById(1L)).thenReturn(Optional.of(existingGame));

        Game result = gameService.getGameById(1L);

        assertSame(existingGame, result);
        verify(gameRepository).findById(1L);
    }

    @Test
    void getGameByIdThrowsWhenIdDoesNotExist() {
        when(gameRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> gameService.getGameById(99L));

        verify(gameRepository).findById(99L);
    }

    @Test
    void createGameSavesAndReturnsSavedGame() {
        Game newGame = game(null, "Hades", "Roguelike", "hades.jpg", LocalDate.of(2020, 9, 17));
        Game savedGame = game(3L, "Hades", "Roguelike", "hades.jpg", LocalDate.of(2020, 9, 17));
        when(gameRepository.save(newGame)).thenReturn(savedGame);

        Game result = gameService.createGame(newGame);

        assertSame(savedGame, result);
        verify(gameRepository).save(newGame);
    }

    @Test
    void updateGameOverwritesAllFields() {
        Game existingGame = game(1L, "Old title", "Old description", "old.jpg",
                LocalDate.of(2000, 1, 1));
        Game updatedGame = game(999L, "New title", "New description", "new.jpg",
                LocalDate.of(2024, 6, 14));
        when(gameRepository.findById(1L)).thenReturn(Optional.of(existingGame));
        when(gameRepository.save(existingGame)).thenReturn(existingGame);

        Game result = gameService.updateGame(1L, updatedGame);

        assertSame(existingGame, result);
        assertEquals(1L, result.getId());
        assertEquals("New title", result.getTitle());
        assertEquals("New description", result.getDescription());
        assertEquals("new.jpg", result.getImageUrl());
        assertEquals(LocalDate.of(2024, 6, 14), result.getReleaseDate());
        verify(gameRepository).findById(1L);
        verify(gameRepository).save(existingGame);
    }

    @Test
    void updateGameThrowsWhenIdDoesNotExist() {
        Game updatedGame = game(null, "New title", "New description", "new.jpg",
                LocalDate.of(2024, 6, 14));
        when(gameRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(NoSuchElementException.class, () -> gameService.updateGame(99L, updatedGame));

        verify(gameRepository).findById(99L);
        verify(gameRepository, never()).save(updatedGame);
    }

    @Test
    void deleteGameDeletesWhenItExists() {
        when(gameRepository.existsById(1L)).thenReturn(true);

        gameService.deleteGame(1L);

        verify(gameRepository).existsById(1L);
        verify(gameRepository).deleteById(1L);
    }

    @Test
    void deleteGameThrowsWhenIdDoesNotExist() {
        when(gameRepository.existsById(99L)).thenReturn(false);

        assertThrows(NoSuchElementException.class, () -> gameService.deleteGame(99L));

        verify(gameRepository).existsById(99L);
        verify(gameRepository, never()).deleteById(99L);
    }

    @Test
    void searchByTitleDelegatesToRepository() {
        List<Game> games = List.of(
                game(1L, "Super Mario Odyssey", "Platformer", "mario.jpg",
                        LocalDate.of(2017, 10, 27))
        );
        when(gameRepository.findByTitleContainingIgnoreCase("mario")).thenReturn(games);

        List<Game> result = gameService.searchByTitle("mario");

        assertSame(games, result);
        verify(gameRepository).findByTitleContainingIgnoreCase("mario");
    }

    private Game game(Long id, String title, String description, String imageUrl, LocalDate releaseDate) {
        return Game.builder()
                .id(id)
                .title(title)
                .description(description)
                .imageUrl(imageUrl)
                .releaseDate(releaseDate)
                .build();
    }
}
