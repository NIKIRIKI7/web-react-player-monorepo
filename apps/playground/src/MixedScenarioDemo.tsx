import {
  createDefaultRemotionSuite,
  RemotionProvider,
  type RemotionSource,
} from '@web-react-player/remotion';
import { DefaultStandardLayout, PlayerProvider, Root } from '@web-react-player/ui';
import { useEffect, useState } from 'react';
import { SAMPLE_WIDGETS_PACKAGES } from './widgetsData';

/**
 * Hybrid Scenario — смешивание JSON-библиотеки анимаций и TSX-оркестрации.
 *
 * Сами эффекты лежат в JSON (`SAMPLE_WIDGETS_PACKAGES`), компилируются
 * WidgetRegistry'ом ровно один раз и отдаются в основной сценарий как
 * виртуальный npm-модуль `@vidora/widgets`. Таймлайн и раскладка сцен
 * при этом остаются обычным TSX-кодом.
 */
const MAIN_SCENARIO_TSX = `
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';

// Импортируем анимации из нашего "виртуального" JSON-пакета
import { NeonTitle, KineticText } from '@vidora/widgets';

export const config = {
  durationInFrames: 300, // 10 секунд
  fps: 30,
  width: 1280,
  height: 720,
};

export const MixedComposition = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#020617' }}>
      {/* Сцена 1: используем виджет FlickerNeonTitle16x9 из JSON */}
      <Sequence from={0} durationInFrames={150}>
        <NeonTitle
          title="СЦЕНА 1"
          neonColor="#ff00ff"
          flickerAmount={0.5}
        />
      </Sequence>

      {/* Сцена 2: используем виджет WordByWordText16x9 из JSON */}
      <Sequence from={150} durationInFrames={150}>
        <KineticText
          texts={[{text: 'ГИБРИДНЫЙ'}, {text: 'ПОДХОД'}, {text: 'РАБОТАЕТ!'}]}
          accentColor="#10b981"
          displayMode="centered"
        />
      </Sequence>
    </AbsoluteFill>
  );
};
`;

export function MixedScenarioDemo() {
  const [suite] = useState(() => createDefaultRemotionSuite());
  const [source, setSource] = useState<RemotionSource | null>(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isActive = true;

    async function prepareHybridEnvironment() {
      try {
        // 1. Регистрируем JSON-библиотеку виджетов
        for (const pkg of SAMPLE_WIDGETS_PACKAGES) {
          suite.widgetRegistry.register(pkg);
        }

        // 2. Компилируем нужные виджеты. WidgetRegistry вернёт готовые
        //    React-компоненты, а повторные вызовы отдадут ссылку из кэша.
        const NeonTitleComponent = await suite.widgetRegistry.compile('FlickerNeonTitle16x9');
        const KineticTextComponent = await suite.widgetRegistry.compile('WordByWordText16x9');

        if (!isActive) return;

        // 3. Создаём источник кода, прокидывая скомпилированные JSON-виджеты
        //    в виртуальный npm-модуль '@vidora/widgets'
        setSource({
          type: 'code',
          code: MAIN_SCENARIO_TSX,
          virtualModules: {
            '@vidora/widgets': {
              NeonTitle: NeonTitleComponent,
              KineticText: KineticTextComponent,
            },
          },
        });
      } catch (err) {
        if (isActive) setError(err instanceof Error ? err : new Error(String(err)));
      }
    }

    prepareHybridEnvironment();

    return () => {
      isActive = false;
    };
  }, [suite]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 px-6 text-center font-mono text-sm text-red-400">
        <div>
          <div className="font-bold mb-2">Не удалось собрать JSON-библиотеку</div>
          <div className="text-red-300/70">{error.message}</div>
        </div>
      </div>
    );
  }

  if (!source) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400 font-mono text-sm animate-pulse">
        Компиляция JSON-библиотеки и сборка гибридной сцены...
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 840, margin: '40px auto', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ margin: '0 0 8px 0' }}>Hybrid JSON + TSX Scenario</h2>
        <p style={{ margin: 0, color: '#64748b' }}>
          Оркестрация сцен написана в TSX, но сами анимации (NeonTitle и KineticText) подгружены из
          JSON-базы и переданы в песочницу через <code>virtualModules</code> под алиасом{' '}
          <code>@vidora/widgets</code>.
        </p>
      </div>
      <PlayerProvider>
        <div
          style={{
            aspectRatio: '16 / 9',
            position: 'relative',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: '1px solid #1e293b',
          }}
        >
          <Root>
            <RemotionProvider
              source={source}
              pluginManager={suite.pluginManager}
              compiler={suite.compiler}
            />
            <DefaultStandardLayout debug={false} />
          </Root>
        </div>
      </PlayerProvider>
    </div>
  );
}
