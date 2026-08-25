/// <reference types="cypress" />

describe('Eigene E2E-Tests', () => {
  it('bricht das Bearbeiten ab und behält die ursprünglichen Daten', () => {
    cy.visitApp();

    cy.get('.game-card').first().within(() => {
      cy.get('.game-card__title').invoke('text').as('originalTitle');
      cy.get('.game-card__btn--edit').click();
    });

    cy.get('.game-form input[name="title"]').clear().type('Nicht gespeicherter Titel');
    cy.get('.game-form__btn--cancel').click();

    cy.get('.game-form').should('not.exist');
    cy.contains('.game-card__title', 'Nicht gespeicherter Titel').should('not.exist');
    cy.get<string>('@originalTitle').then((title) => {
      cy.contains('.game-card__title', title.trim()).should('be.visible');
    });
  });

  it('zeigt eine Fehlermeldung bei einem Serverfehler', () => {
    cy.intercept('GET', '/api/games', {
      statusCode: 500,
      body: { message: 'Testfehler' },
    }).as('failedRequest');

    cy.visit('/');
    cy.wait('@failedRequest');

    cy.contains('.home-page__error', 'Fehler beim Laden der Spiele.').should('be.visible');
  });

  it('zeigt No Image, wenn eine Bild-URL ungültig ist', () => {
    cy.intercept('GET', '/api/games', {
      statusCode: 200,
      body: [{
        id: 987654,
        title: 'Spiel mit defektem Bild',
        description: 'Test für den Bild-Fallback',
        imageUrl: '/nicht-vorhandenes-bild.jpg',
        releaseDate: '2020-01-01',
      }],
    }).as('getGameWithBrokenImage');
    cy.intercept('GET', '/nicht-vorhandenes-bild.jpg', { statusCode: 404 });

    cy.visit('/');
    cy.wait('@getGameWithBrokenImage');

    cy.contains('.game-card', 'Spiel mit defektem Bild')
      .find('.game-card__no-image')
      .should('contain.text', 'No Image');
  });

  it('behandelt Sonderzeichen in der Suche korrekt', () => {
    cy.intercept('GET', '/api/games', {
      statusCode: 200,
      body: [],
    }).as('initialGames');
    cy.intercept('GET', '/api/games/search*', (request) => {
      expect(request.query.title).to.eq('C++ & C#');
      request.reply({ statusCode: 200, body: [] });
    }).as('specialSearch');

    cy.visit('/');
    cy.wait('@initialGames');
    cy.get('.search-bar__input').type('C++ & C#');
    cy.get('.search-bar__button').click();
    cy.wait('@specialSearch');

    cy.get('.game-list__status-title').should('contain.text', 'No Games Found');
  });
});
