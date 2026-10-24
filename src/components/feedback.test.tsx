import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { FeedbackProvider, useFeedback } from './feedback';

/** Régression de l'audit QA : un dialogue remplacé ne reste jamais en attente. */
const results: (boolean | string)[] = [];

function Probe() {
  const { confirm } = useFeedback();
  useEffect(() => {
    void confirm({ title: 'Premier' }).then((v) => results.push(v));
    void confirm({ title: 'Second' }).then((v) => results.push(`second:${v}`));
  }, [confirm]);
  return null;
}

it('le premier dialogue est résolu « annulé » quand un second le remplace', async () => {
  await render(
    <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, left: 0, right: 0, bottom: 0 } }}>
      <FeedbackProvider>
        <Probe />
      </FeedbackProvider>
    </SafeAreaProvider>,
  );
  await act(async () => undefined);
  expect(results).toEqual([false]);
  expect(screen.getByText('Second')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('dialog-confirm'));
  await act(async () => undefined);
  expect(results).toEqual([false, 'second:true']);
});
