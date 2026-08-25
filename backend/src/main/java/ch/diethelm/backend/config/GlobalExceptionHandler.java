package ch.diethelm.backend.config;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.NoSuchElementException;

/**
 * Zentraler Fehlerbehandler für alle REST-Controller der Anwendung.
 *
 * <p>Diese Klasse fängt Exceptions ab, die in einem beliebigen Controller geworfen werden,
 * und wandelt sie in strukturierte JSON-Fehlerantworten um. Damit müssen Controller
 * selbst keine Try-Catch-Blöcke enthalten.</p>
 *
 * <p>Behandelte Fehlerfälle:</p>
 * <ul>
 *   <li>{@link java.util.NoSuchElementException}       → HTTP 404 Not Found
 *       (z. B. Spiel mit gesuchter ID existiert nicht)</li>
 *   <li>{@link org.springframework.web.bind.MethodArgumentNotValidException}
 *                                                       → HTTP 400 Bad Request mit
 *       feldgenauer Fehlerbeschreibung (ausgelöst durch {@code @Valid})</li>
 *   <li>{@link jakarta.validation.ConstraintViolationException}
 *                                                       → HTTP 400 Bad Request
 *       (ausgelöst durch Constraint-Annotationen auf Service-Ebene)</li>
 *   <li>{@link Exception} (alle anderen)                → HTTP 500 Internal Server Error</li>
 * </ul>
 *
 * <p>Jede Fehlerantwort enthält die Felder {@code timestamp}, {@code status},
 * {@code error} und {@code message} (bzw. {@code details} bei Validierungsfehlern).</p>
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

    // 404 – Spiel nicht gefunden
    @ExceptionHandler(NoSuchElementException.class)
    public ResponseEntity<Map<String, Object>> handleNotFound(NoSuchElementException ex) {
        return buildResponse(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    // 400 – Validierungsfehler (@Valid auf @RequestBody)
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> fieldErrors = new HashMap<>();
        ex.getBindingResult().getFieldErrors()
                .forEach(err -> fieldErrors.put(err.getField(), err.getDefaultMessage()));

        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("error", "Validierungsfehler");
        body.put("details", fieldErrors);
        return ResponseEntity.badRequest().body(body);
    }

    // 400 – Constraint-Verletzungen
    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraint(ConstraintViolationException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    // 400 – Ungültiges oder nicht lesbares JSON
    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidJson(HttpMessageNotReadableException ex) {
        return buildResponse(HttpStatus.BAD_REQUEST, "Die Anfrage enthält ungültiges JSON");
    }

    // 500 – Allgemeiner Fehler
    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneral(Exception ex) {
        return buildResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Ein interner Fehler ist aufgetreten");
    }

    private ResponseEntity<Map<String, Object>> buildResponse(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}
