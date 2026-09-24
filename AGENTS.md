# Repository Guidelines

## Project Structure & Module Organization

This application uses Java 17, Spring Boot, PostgreSQL, and plain HTML/CSS/JavaScript. Backend code lives in `src/main/java/com/practica/gestionincidencias/`, organized into `controller`, `service`, `repository`, `entity`, `dto`, `security`, and `config` packages. Keep business logic in services and persistence access in repositories.

Frontend pages, scripts, and `style.css` live in `src/main/resources/static/`. Java tests mirror backend packages under `src/test/java/`; test configuration lives in `src/test/resources/`. Browser tests are in `e2e/`, SQL updates in `database/`, and runtime attachments in `uploads/`.

## Build, Test, and Development Commands

Run commands from the repository root. Configure PostgreSQL and environment variables using `.env.example` and `README-INICIO-RAPIDO.md`.

- `.\mvnw.cmd spring-boot:run`: start the application at `http://localhost:8081`.
- `.\run-local.ps1`: use the Windows startup helper.
- `.\mvnw.cmd clean package`: run Java tests and build the executable JAR in `target/`.
- `.\mvnw.cmd test`: run Java tests.
- `npm ci` followed by `npx playwright install chromium`: prepare browser tests.
- `npm run test:e2e`: run Playwright tests against the running application; the current configuration opens a visible browser.
- `npm run test:e2e:debug`: debug browser tests interactively.
- `.\verificar-proyecto.ps1`: check prerequisites, environment variables, JavaScript syntax, and Maven tests.

On Linux/macOS, use `./mvnw` instead of `.\mvnw.cmd`.

## Coding Style & Naming Conventions

Follow existing four-space indentation in Java and JavaScript. Use PascalCase Java classes, camelCase methods/fields, and UPPER_SNAKE_CASE constants. Preserve Spanish domain naming and suffixes such as `TicketController` and `TicketResponseDTO`. Use lowercase hyphenated frontend names, such as `ticket-detalle.js`. No dedicated formatter or linter is configured; match neighboring code and use `node --check` for JavaScript syntax checks.

## Testing Guidelines

Java tests use JUnit 5, Mockito, and Spring testing utilities; context tests use the H2-backed `test` profile. Name Java tests `*Test.java` or `*Tests.java` and browser tests `*.spec.js`. Add regression tests for changed behavior, especially permissions and ticket/resource transitions. No coverage percentage is enforced. Start the application before Playwright; its configuration does not launch a server.

Prefer targeted tests during development and run `.\mvnw clean test` before considering any important change complete. Use `node --check` for changed JavaScript files when applicable. This computer has limited development resources: never run Spring Boot and `mvnw clean test` simultaneously. Stop Spring Boot before the full suite and avoid unnecessary heavy processes.

## Ticket Workflow Rules

- New operational tickets follow `NUEVO -> EN_PROGRESO -> CERRADO`.
- Assigning an agent to a `NUEVO` ticket must automatically move it to `EN_PROGRESO`.
- Keep `ASIGNADO` and `RESUELTO` only for compatibility with old tickets; new tickets must never use these states.
- Closing a ticket requires a closure note and must record `fechaCierre`.
- The open-time counter stops only in `CERRADO`.
- `RECURSO_EXTERNO` has its own tracking and must not be automatically mixed with the normal operational workflow.

## Scope & Safe Changes

Before starting work, review `git status`; never overwrite local changes without authorization. Before modifying code, inspect the existing implementation. Make the minimum necessary change, touch only files within the requested task, and prefer small, safe changes that are easy to revert.

## Commit & Pull Request Guidelines

History uses short Spanish action summaries, such as `Mejora configuracion de seguridad y pruebas`, without mandatory prefixes. Follow that pattern and keep commits focused. In pull requests, describe behavior changes, link relevant issues, report validation performed, and include screenshots for UI changes. Document SQL or configuration changes.

## Security & Configuration

Never write, display, or save real credentials, JWT secrets, email passwords, or PostgreSQL passwords. Do not modify `.env` files containing real credentials. Never commit credentials, `.env`, real database dumps, or uploaded attachments. Keep secrets in environment variables and preserve role and project access checks.

Do not execute `DROP`, bulk `DELETE` operations, or destructive migrations. Before changing the database structure, explain the proposed change.
