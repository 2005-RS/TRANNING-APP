import { buildPublicSystemPrompt } from '../chat-system-prompt';
import { publicAssistantKnowledgeFor } from '../public-assistant-knowledge';
import {
  classifyMockIntent,
  classifyMockIntentFromHistory,
  classifyMockTopic,
  MockAiProvider,
} from './mock-ai.provider';

describe('MockAiProvider', () => {
  const provider = new MockAiProvider();
  const knowledge = publicAssistantKnowledgeFor('es');

  async function reply(
    message: string,
    locale: 'es' | 'en' = 'es',
    publicAudience = false,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
  ) {
    const result = await provider.generateResponse({
      locale,
      messages: [
        {
          role: 'system',
          content: publicAudience
            ? buildPublicSystemPrompt(locale)
            : 'system prompt',
        },
        ...history,
        { role: 'user', content: message },
      ],
    });
    return result.content;
  }

  it('greets deterministically in Spanish', async () => {
    await expect(reply('Hola')).resolves.toBe(
      '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
    );
    await expect(reply('Hola')).resolves.toBe(await reply('hola'));
  });

  it('answers the training topic', async () => {
    await expect(reply('entrenamiento')).resolves.toBe(
      'Puedo ayudarte a entender cómo funciona tu entrenamiento dentro de la plataforma.',
    );
  });

  it('answers in English when the locale is en', async () => {
    await expect(reply('hello', 'en')).resolves.toBe(
      'Hi! I’m Training Assistant. How can I help you?',
    );
  });

  it('routes health-sensitive questions to a conservative answer before other topics', () => {
    expect(
      classifyMockTopic('Me duele la rodilla, tengo dolor al entrenar'),
    ).toBe('HEALTH');
    expect(classifyMockTopic('I have an injury')).toBe('HEALTH');
  });

  it('classifies accented and quick-prompt text', () => {
    expect(classifyMockTopic('¿Cómo funciona?')).toBe('HOW_IT_WORKS');
    expect(classifyMockTopic('Nutrición')).toBe('NUTRITION');
    expect(classifyMockTopic('Progreso')).toBe('PROGRESS');
    expect(classifyMockTopic('Necesito ayuda')).toBe('SUPPORT');
    expect(classifyMockTopic('zzz')).toBe('UNKNOWN');
  });

  it.each([
    ['como contrato la app', 'CONTRACT_SERVICE'],
    ['¿Cómo contrato el servicio?', 'CONTRACT_SERVICE'],
    ['quiero contratar', 'CONTRACT_SERVICE'],
    ['donde solicito los planes', 'PLANS'],
    ['¿Dónde veo los planes?', 'PLANS'],
    ['¿Tienen planes?', 'PLANS'],
    ['planes???', 'PLANS'],
    ['¿CUÁNTO CUESTA?', 'PRICING'],
    ['cuanto cuesta', 'PRICING'],
    ['Cómo empiezo?', 'START'],
    ['quiero empezar', 'START'],
    ['¿Cómo comienzo?', 'START'],
    ['¿Qué necesito para comenzar?', 'START'],
    ['como obtengo una cuenta', 'START'],
    ['como consigo entrenador', 'TRAINER'],
    ['¿Cómo consigo un entrenador?', 'TRAINER'],
    ['ya tengo cuenta', 'LOGIN'],
    ['¿Cómo entro?', 'LOGIN'],
    ['¿Dónde inicio sesión?', 'LOGIN'],
    ['quiero hablar con alguien', 'SUPPORT'],
    ['¿Cómo me comunico con alguien?', 'SUPPORT'],
    ['Necesito más información', 'SUPPORT'],
    ['como funciona el entrenamiento', 'TRAINING'],
    ['como funciona la nutricion', 'NUTRITION'],
    ['como veo mi progreso', 'PROGRESS'],
    ['como funciona el servicio', 'HOW_IT_WORKS'],
    ['Training', 'TRAINING'],
  ] as const)('classifies "%s" as %s', (message, intent) => {
    expect(classifyMockIntent(message)).toBe(intent);
  });

  it('reuses the previous user intent for a short public follow-up', () => {
    expect(
      classifyMockIntentFromHistory([
        { role: 'system', content: 'PUBLIC_ASSISTANT_CONTEXT' },
        { role: 'user', content: '¿Cómo contrato la app?' },
        { role: 'assistant', content: knowledge.contractServiceExplanation },
        { role: 'user', content: '¿y dónde los solicito?' },
      ]),
    ).toBe('PLANS');
    expect(
      classifyMockIntentFromHistory([
        { role: 'user', content: '¿Cómo contrato la app?' },
        { role: 'assistant', content: knowledge.contractServiceExplanation },
        { role: 'user', content: 'y eso?' },
      ]),
    ).toBe('CONTRACT_SERVICE');
  });

  it('returns useful public onboarding and pre-sales responses', async () => {
    await expect(reply('como contrato la app', 'es', true)).resolves.toBe(
      knowledge.contractServiceExplanation,
    );
    await expect(reply('donde solicito los planes?', 'es', true)).resolves.toBe(
      knowledge.planRequestExplanation,
    );
    await expect(reply('cuanto cuesta', 'es', true)).resolves.toBe(
      knowledge.pricingExplanation,
    );
    await expect(reply('quiero empezar', 'es', true)).resolves.toBe(
      knowledge.onboardingExplanation,
    );
    await expect(reply('como consigo entrenador', 'es', true)).resolves.toBe(
      knowledge.trainerExplanation,
    );
    await expect(reply('ya tengo cuenta', 'es', true)).resolves.toBe(
      knowledge.loginExplanation,
    );
    await expect(reply('quiero hablar con alguien', 'es', true)).resolves.toBe(
      knowledge.supportExplanation,
    );
    await expect(
      reply('como obtengo una cuenta', 'es', true),
    ).resolves.toContain('No hay registro público');
  });

  it('returns useful public product responses', async () => {
    await expect(
      reply('como funciona el entrenamiento', 'es', true),
    ).resolves.toBe(knowledge.trainingCapabilities);
    await expect(reply('como funciona la nutricion', 'es', true)).resolves.toBe(
      knowledge.nutritionCapabilities,
    );
    await expect(reply('como veo mi progreso', 'es', true)).resolves.toBe(
      knowledge.progressCapabilities,
    );
    await expect(reply('como funciona', 'es', true)).resolves.toBe(
      knowledge.howItWorks,
    );
  });

  it('answers public questions in English without inventing prices', async () => {
    await expect(reply('How much does it cost?', 'en', true)).resolves.toBe(
      publicAssistantKnowledgeFor('en').pricingExplanation,
    );
    await expect(reply('How do I get started?', 'en', true)).resolves.toContain(
      'There is no public sign-up',
    );
  });

  it('never invents a price, email or phone in public answers', async () => {
    const answers = await Promise.all(
      [
        'cuanto cuesta',
        'donde solicito los planes',
        'quiero hablar con alguien',
        'como contrato la app',
      ].map((message) => reply(message, 'es', true)),
    );
    for (const answer of answers) {
      expect(answer).not.toMatch(/\$\d|€\d|@|\+\d{2}/);
    }
  });

  it('uses the helpful public fallback', async () => {
    await expect(reply('xyzzy', 'es', true)).resolves.toBe(
      knowledge.unknownExplanation,
    );
  });

  it('uses the latest user message only', async () => {
    const result = await provider.generateResponse({
      locale: 'es',
      messages: [
        { role: 'system', content: 'hola entrenamiento' },
        { role: 'user', content: 'entrenamiento' },
        { role: 'assistant', content: 'nutrición' },
        { role: 'user', content: 'Hola' },
      ],
    });
    expect(result).toEqual({
      content: '¡Hola! Soy Training Assistant. ¿En qué puedo ayudarte?',
      model: 'mock',
      truncated: false,
    });
  });

  it('continues a public onboarding thread on a follow-up', async () => {
    await expect(
      reply('¿y dónde los solicito?', 'es', true, [
        { role: 'user', content: '¿Cómo contrato la app?' },
        { role: 'assistant', content: knowledge.contractServiceExplanation },
      ]),
    ).resolves.toBe(knowledge.planRequestExplanation);
  });
});
