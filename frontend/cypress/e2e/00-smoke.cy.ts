/// <reference types="cypress" />

describe('Smoke Test', () => {
  it('lädt Frontend und Backend', () => {
    cy.request('/').its('status').should('eq', 200);
    cy.request('/api/games').its('status').should('eq', 200);
    cy.visit('/');
    cy.contains('.home-page__headline', 'Games Library').should('be.visible');
  });
});
