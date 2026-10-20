import {
  PUBLIC_ASSISTANT_KNOWLEDGE,
  publicAssistantKnowledgeFor,
} from './public-assistant-knowledge';

describe('PUBLIC_ASSISTANT_KNOWLEDGE', () => {
  it('keeps commercial unknowns explicit', () => {
    expect(PUBLIC_ASSISTANT_KNOWLEDGE.productName).toBe('Training');
    expect(PUBLIC_ASSISTANT_KNOWLEDGE.publicRegistrationAvailable).toBe(true);
    expect(PUBLIC_ASSISTANT_KNOWLEDGE.pricingPublished).toBe(false);
    expect(PUBLIC_ASSISTANT_KNOWLEDGE.contactChannel).toBeNull();
  });

  it.each(['es', 'en'] as const)(
    'does not invent prices or contact details in %s copy',
    (locale) => {
      const knowledge = publicAssistantKnowledgeFor(locale);
      const blob = Object.values(knowledge).join('\n');
      expect(blob).not.toMatch(/\$\d|€\d|@training|whatsapp|\+\d{2}/i);
      expect(knowledge.pricingExplanation).toContain('/register');
    },
  );
});
