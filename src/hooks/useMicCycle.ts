// src/hooks/useMicCycle.ts
// State machine for mic: idle → listening → processing → responding → idle
import { useCallback, useEffect, useRef, useState } from 'react';

export type MicState = 'idle' | 'listening' | 'processing' | 'responding';

export type MicSample = { transcript: string; response: string };

export const SAMPLE_CYCLE: MicSample[] = [
  {
    transcript: 'Remind me to call Priya at 6 pm about the launch deck.',
    response: 'Got it. Reminder set for today, 6:00 pm — "Call Priya re: launch deck."',
  },
  {
    transcript: "What's the weather in Bangalore tomorrow?",
    response: 'Tomorrow in Bangalore: 31° / 22°, partly cloudy. Light rain after 4 pm.',
  },
  {
    transcript: 'Translate "let\'s ship it" to Japanese.',
    response: '出荷しよう (shukka shiyou) — casual; "リリースしよう" works for software.',
  },
];

export function useMicCycle() {
  const [state, setState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const idxRef = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const reset = useCallback(() => {
    clearTimers();
    setState('idle');
    setTranscript('');
    setResponse('');
  }, [clearTimers]);

  const runSample = useCallback(
    (sample: MicSample) => {
      clearTimers();
      setTranscript('');
      setResponse('');
      setState('listening');

      const words = sample.transcript.split(' ');
      words.forEach((_, i) => {
        timers.current.push(
          setTimeout(() => {
            setTranscript(words.slice(0, i + 1).join(' '));
          }, 110 * (i + 1)),
        );
      });
      const totalMs = 110 * words.length;
      timers.current.push(setTimeout(() => setState('processing'), totalMs + 350));
      timers.current.push(
        setTimeout(() => {
          setState('responding');
          setResponse(sample.response);
        }, totalMs + 1200),
      );
      timers.current.push(setTimeout(() => setState('idle'), totalMs + 5500));
    },
    [clearTimers],
  );

  const tap = useCallback(() => {
    if (state === 'idle') {
      const sample = SAMPLE_CYCLE[idxRef.current];
      idxRef.current = (idxRef.current + 1) % SAMPLE_CYCLE.length;
      runSample(sample);
    } else {
      reset();
    }
  }, [state, runSample, reset]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  return { state, transcript, response, tap, runSample, reset };
}
