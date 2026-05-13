import { translateRenderedText } from './i18n';

describe('rendered text translation bridge', () => {
  it('does not grow words when the target contains the source', () => {
    const once = translateRenderedText('Kafka-compatible', 'ca');
    const twice = translateRenderedText(once, 'ca');

    expect(once).toBe('Kafka-compatible');
    expect(twice).toBe('Kafka-compatible');
  });
});
