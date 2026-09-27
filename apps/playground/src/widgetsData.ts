import type { VidoraWidgetPackage, VidoraWidgetProp } from '@web-react-player/remotion';

/**
 * Встроенный каталог виджетов для студии.
 *
 * Каждая запись — это автономный «widget bundle»: метаданные, схема пропсов,
 * готовые `default_props` и сырой `tsx_code`, который компилируется
 * BrowserTsxCompiler'ом ровно один раз и кэшируется в WidgetRegistry.
 *
 * Каждая анимация описана дважды (16:9 и 9:16) через один и тот же `tsx_code`:
 * раскладка переключается пропсом `vertical`, а разрешение композиции
 * выводится WidgetPropsEngine из `9x16` в идентификаторе.
 */

const WORD_BY_WORD_TSX = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Zap } from 'lucide-react';

export const WordByWordText = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const raw = Array.isArray(props.texts) ? props.texts : [];
  const words = raw
    .map((item) => (typeof item === 'string' ? item : item && item.text ? String(item.text) : ''))
    .filter(Boolean);

  const vertical = props.vertical === true;
  const fontSize = Math.round((props.fontSize || 120) * (vertical ? 0.62 : 1));
  const stagger = props.staggerFrames == null ? 8 : props.staggerFrames;
  const distance = props.translateDistance == null ? 80 : props.translateDistance;
  const mode = props.displayMode || 'centered';
  const uppercase = props.uppercase !== false;
  const textColor = props.textColor || '#f8fafc';
  const accentColor = props.accentColor || '#6366f1';

  const flexDirection = mode === 'stacked' ? 'column' : vertical ? 'column' : 'row';
  const gap = mode === 'centered' ? fontSize * 0.4 : fontSize * 0.18;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020617',
        display: 'flex',
        flexDirection: flexDirection,
        alignItems: 'center',
        justifyContent: 'center',
        flexWrap: mode === 'centered' ? 'wrap' : 'nowrap',
        gap: gap,
        padding: vertical ? 80 : 120,
        boxSizing: 'border-box',
      }}
    >
      {words.map((word, index) => {
        const local = frame - index * stagger;
        const progress = spring({ frame: local, fps, config: { damping: 200 } });
        const opacity = interpolate(progress, [0, 1], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const offsetY = interpolate(progress, [0, 1], [distance, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
        const isLast = index === words.length - 1;

        return (
          <span
            key={index}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: fontSize * 0.12,
              fontSize: fontSize,
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: -fontSize * 0.03,
              textTransform: uppercase ? 'uppercase' : 'none',
              color: isLast ? accentColor : textColor,
              opacity: opacity,
              transform: 'translateY(' + offsetY + 'px)',
              willChange: 'transform, opacity',
            }}
          >
            {isLast ? <Zap size={fontSize * 0.8} color={accentColor} /> : null}
            {word}
          </span>
        );
      })}
    </AbsoluteFill>
  );
};
`;

const NEON_TITLE_TSX = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export const FlickerNeonTitle = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = props.title || 'NEON';
  const neonColor = props.neonColor || '#22d3ee';
  const glow = props.glowIntensity == null ? 40 : props.glowIntensity;
  const flickerAmount = props.flickerAmount == null ? 0.25 : props.flickerAmount;
  const letterSpacing = props.letterSpacing == null ? 8 : props.letterSpacing;
  const vertical = props.vertical === true;
  const fontSize = Math.round((props.fontSize || 140) * (vertical ? 0.55 : 1));
  const duration = props.durationFrames || 240;

  // Детерминированное «мерцание»: только синусы, без Math.random,
  // иначе картинка менялась бы при каждом скрабе по таймлайну.
  const wave =
    (Math.sin(frame * 3.7) + Math.sin(frame * 1.31) + Math.sin(frame * 7.13)) / 3;
  const flicker = 1 - flickerAmount * (0.5 + 0.5 * wave);

  const intro = interpolate(frame, [0, Math.max(1, fps * 0.4)], [0.85, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const outro = interpolate(frame, [duration - fps * 0.5, duration], [1, 0.92], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const glowPx = glow * flicker;
  const textShadow =
    '0 0 ' + glowPx + 'px ' + neonColor + ', 0 0 ' + glowPx * 2 + 'px ' + neonColor + ', 0 0 ' + glowPx * 3 + 'px ' + neonColor;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#01030a',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: fontSize * 0.4,
        padding: vertical ? 70 : 120,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          width: vertical ? '86%' : '70%',
          height: 2,
          backgroundColor: neonColor,
          opacity: 0.5 * flicker,
          boxShadow: '0 0 18px ' + neonColor,
        }}
      />
      <div
        style={{
          fontSize: fontSize,
          fontWeight: 900,
          lineHeight: 1,
          letterSpacing: letterSpacing,
          textTransform: 'uppercase',
          textAlign: 'center',
          color: neonColor,
          textShadow: textShadow,
          opacity: intro * outro * flicker,
          transform: 'scale(' + intro + ')',
        }}
      >
        {title}
      </div>
      <div
        style={{
          width: vertical ? '86%' : '70%',
          height: 2,
          backgroundColor: neonColor,
          opacity: 0.5 * flicker,
          boxShadow: '0 0 18px ' + neonColor,
        }}
      />
    </AbsoluteFill>
  );
};
`;

const SHINE_LOGO_TSX = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Film } from 'lucide-react';

export const PremiereShineLogo = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoText = props.logoText || 'PREMIERE';
  const shineColor = props.shineColor || '#f8fafc';
  const shineSpeed = props.shineSpeed == null ? 2 : props.shineSpeed;
  const ringEnabled = props.ringEnabled !== false;
  const ringColor = props.ringColor || '#eab308';
  const vertical = props.vertical === true;
  const fontSize = Math.round((props.fontSize || 110) * (vertical ? 0.55 : 1));

  const appear = spring({ frame, fps, config: { damping: 200 } });
  const size = Math.round(520 * (vertical ? 0.72 : 1) * appear);

  // Блик бесконечно ходит по кругу через модуль — детерминированно и без рывков
  const shinePos = (frame * shineSpeed * 4) % 200 - 50;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#09090b',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {ringEnabled ? (
        <div
          style={{
            position: 'absolute',
            width: size,
            height: size,
            borderRadius: '50%',
            border: '3px solid ' + ringColor,
            boxShadow: '0 0 60px ' + ringColor + '55, inset 0 0 60px ' + ringColor + '22',
          }}
        />
      ) : null}

      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: fontSize * 0.3,
          zIndex: 2,
        }}
      >
        <Film size={fontSize * 0.9} color={ringColor} />
        <div
          style={{
            fontSize: fontSize,
            fontWeight: 800,
            letterSpacing: fontSize * 0.08,
            textTransform: 'uppercase',
            color: '#fafafa',
            opacity: appear,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {logoText}
        </div>
        <div
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: shinePos + '%',
            width: '22%',
            background:
              'linear-gradient(100deg, transparent 0%, ' + shineColor + ' 50%, transparent 100%)',
            mixBlendMode: 'screen',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />
      </div>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(circle at 50% 45%, rgba(234,179,8,0.16) 0%, rgba(0,0,0,0) 62%)',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: vertical ? 90 : 70,
          fontSize: Math.round(22 * (vertical ? 1.3 : 1)),
          letterSpacing: 6,
          color: '#71717a',
          textTransform: 'uppercase',
          opacity: interpolate(frame, [0, fps], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        Shine Sequence
      </div>
    </AbsoluteFill>
  );
};
`;

const LEADERBOARD_TSX = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';
import { Trophy, Crown, Medal } from 'lucide-react';

export const VIPLeaderboard = (props) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const raw = Array.isArray(props.members) ? props.members : [];
  const members = raw
    .map((item, index) => ({
      rank: item && item.rank != null ? item.rank : index + 1,
      name: item && item.name ? String(item.name) : 'PLAYER ' + (index + 1),
      score: item && item.score != null ? Number(item.score) : 0,
    }))
    .slice(0, 5);

  const title = props.title || 'TOP PLAYERS';
  const rowHeight = Math.round((props.rowHeight || 84) * (props.vertical === true ? 1.25 : 1));
  const rankColor = props.rankColor || '#facc15';
  const textColor = props.textColor || '#e2e8f0';
  const panelColor = props.panelColor || '#0f172a';
  const highlightTop = props.highlightTop !== false;
  const vertical = props.vertical === true;

  const medalColors = ['#facc15', '#cbd5e1', '#d97706'];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#020617',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rowHeight * 0.35,
        padding: vertical ? 60 : 100,
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          fontSize: Math.round(rowHeight * 0.5),
          fontWeight: 800,
          letterSpacing: 4,
          textTransform: 'uppercase',
          color: rankColor,
        }}
      >
        <Trophy size={rowHeight * 0.5} color={rankColor} />
        {title}
      </div>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: rowHeight * 0.18,
          width: vertical ? '100%' : '78%',
        }}
      >
        {members.map((member, index) => {
          const local = frame - (index + 1) * 5;
          const progress = spring({ frame: local, fps, config: { damping: 200 } });
          const slideX = interpolate(progress, [0, 1], [rowHeight, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          const isTop = index === 0;

          return (
            <div
              key={member.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: rowHeight * 0.28,
                height: rowHeight,
                padding: '0 ' + rowHeight * 0.35,
                borderRadius: rowHeight * 0.22,
                backgroundColor: panelColor,
                border: '1px solid ' + (highlightTop && isTop ? rankColor : '#1e293b'),
                boxShadow:
                  highlightTop && isTop ? '0 0 30px ' + rankColor + '44' : '0 10px 20px rgba(0,0,0,0.35)',
                opacity: progress,
                transform: 'translateX(' + slideX + 'px)',
                boxSizing: 'border-box',
              }}
            >
              <div
                style={{
                  width: rowHeight * 0.6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: medalColors[index] || '#64748b',
                }}
              >
                {isTop ? (
                  <Crown size={rowHeight * 0.55} color={rankColor} />
                ) : index < 3 ? (
                  <Medal size={rowHeight * 0.55} color={medalColors[index]} />
                ) : (
                  <span style={{ fontWeight: 800, fontSize: rowHeight * 0.42 }}>{member.rank}</span>
                )}
              </div>
              <div
                style={{
                  flex: 1,
                  fontSize: rowHeight * 0.42,
                  fontWeight: 700,
                  color: textColor,
                  letterSpacing: 1,
                }}
              >
                {member.name}
              </div>
              <div
                style={{
                  fontSize: rowHeight * 0.42,
                  fontWeight: 800,
                  color: isTop ? rankColor : '#94a3b8',
                  fontFamily: 'monospace',
                }}
              >
                {member.score}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
`;

const TEXTS_SCHEMA: Record<string, VidoraWidgetProp> = {
  texts: {
    name: 'texts',
    type: 'object',
    description: 'Массив объектов { text: string } — вылетающие слова',
    default: [{ text: 'Слово' }, { text: 'за' }, { text: 'словом' }],
  },
  fontSize: {
    name: 'fontSize',
    type: 'number',
    description: 'Размер шрифта в px',
    default: 120,
  },
  textColor: {
    name: 'textColor',
    type: 'string',
    description: 'Цвет основного текста',
    default: '#f8fafc',
  },
  accentColor: {
    name: 'accentColor',
    type: 'string',
    description: 'Цвет акцентного слова',
    default: '#6366f1',
  },
  displayMode: {
    name: 'displayMode',
    type: 'enum',
    description: 'Раскладка слов',
    enum_values: ['centered', 'stacked'],
    default: 'centered',
  },
  translateDistance: {
    name: 'translateDistance',
    type: 'number',
    description: 'Путь появления в px',
    default: 80,
  },
  staggerFrames: {
    name: 'staggerFrames',
    type: 'number',
    description: 'Задержка между словами в кадрах',
    default: 8,
  },
  uppercase: {
    name: 'uppercase',
    type: 'boolean',
    description: 'Перевести в верхний регистр',
    default: true,
  },
  vertical: {
    name: 'vertical',
    type: 'boolean',
    description: 'Вертикальная раскладка (9:16)',
    default: false,
  },
  durationFrames: {
    name: 'durationFrames',
    type: 'number',
    description: 'Длительность композиции в кадрах',
    default: 240,
  },
};

export const SAMPLE_WIDGETS_PACKAGES: VidoraWidgetPackage[] = [
  {
    vidora_schema_version: '1.0',
    exported_at: '2026-09-27T00:00:00.000Z',
    generator: 'vidora-widget-studio',
    widgets: [
      {
        id: 'WordByWordText16x9',
        name: 'Кинетический текст 16:9',
        category: 'narrative',
        description: 'Пословное появление текста с пружинным easing и акцентным словом',
        is_custom: true,
        tags: ['16:9', 'text', 'kinetic'],
        props: Object.values(TEXTS_SCHEMA).map((p) => ({ ...p })),
        default_props: {
          texts: [{ text: 'Слово' }, { text: 'за' }, { text: 'словом' }],
          fontSize: 120,
          textColor: '#f8fafc',
          accentColor: '#6366f1',
          displayMode: 'centered',
          translateDistance: 80,
          staggerFrames: 8,
          uppercase: true,
          vertical: false,
          durationFrames: 240,
        },
        tsx_code: WORD_BY_WORD_TSX,
      },
      {
        id: 'WordByWordText9x16',
        name: 'Кинетический текст 9:16',
        category: 'social',
        description: 'Вертикальный кинетический текст для Shorts / Reels / TikTok',
        is_custom: true,
        tags: ['9:16', 'shorts', 'reels', 'tiktok', 'text'],
        props: Object.values(TEXTS_SCHEMA).map((p) => ({ ...p })),
        default_props: {
          texts: [{ text: 'Shorts' }, { text: 'вертикально' }],
          fontSize: 120,
          textColor: '#ffffff',
          accentColor: '#ec4899',
          displayMode: 'stacked',
          translateDistance: 100,
          staggerFrames: 6,
          uppercase: true,
          vertical: true,
          durationFrames: 180,
        },
        tsx_code: WORD_BY_WORD_TSX,
      },
      {
        id: 'FlickerNeonTitle16x9',
        name: 'Неоновый заголовок 16:9',
        category: 'social',
        description: 'Мерцающий неоновый тайтл с детерминированным дрожанием свечения',
        is_custom: true,
        tags: ['16:9', 'neon', 'title'],
        props: [
          {
            name: 'title',
            type: 'string',
            description: 'Текст заголовка',
            default: 'NEON NIGHT',
          },
          {
            name: 'neonColor',
            type: 'string',
            description: 'Цвет неона',
            default: '#22d3ee',
          },
          {
            name: 'glowIntensity',
            type: 'number',
            description: 'Сила свечения (размытие тени)',
            default: 40,
          },
          {
            name: 'flickerAmount',
            type: 'number',
            description: 'Глубина мерцания 0..1',
            default: 0.25,
          },
          {
            name: 'fontSize',
            type: 'number',
            description: 'Размер шрифта в px',
            default: 140,
          },
          {
            name: 'letterSpacing',
            type: 'number',
            description: 'Межбуквенный интервал',
            default: 8,
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: false,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 240,
          },
        ],
        default_props: {
          title: 'NEON NIGHT',
          neonColor: '#22d3ee',
          glowIntensity: 40,
          flickerAmount: 0.25,
          fontSize: 140,
          letterSpacing: 8,
          vertical: false,
          durationFrames: 240,
        },
        tsx_code: NEON_TITLE_TSX,
      },
      {
        id: 'FlickerNeonTitle9x16',
        name: 'Неоновый заголовок 9:16',
        category: 'social',
        description: 'Вертикальный неоновый тайтл для коротких вертикальных роликов',
        is_custom: true,
        tags: ['9:16', 'shorts', 'reels', 'neon', 'title'],
        props: [
          {
            name: 'title',
            type: 'string',
            description: 'Текст заголовка',
            default: 'VERTICAL',
          },
          {
            name: 'neonColor',
            type: 'string',
            description: 'Цвет неона',
            default: '#f472b6',
          },
          {
            name: 'glowIntensity',
            type: 'number',
            description: 'Сила свечения (размытие тени)',
            default: 50,
          },
          {
            name: 'flickerAmount',
            type: 'number',
            description: 'Глубина мерцания 0..1',
            default: 0.35,
          },
          {
            name: 'fontSize',
            type: 'number',
            description: 'Размер шрифта в px',
            default: 140,
          },
          {
            name: 'letterSpacing',
            type: 'number',
            description: 'Межбуквенный интервал',
            default: 4,
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: true,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 180,
          },
        ],
        default_props: {
          title: 'VERTICAL',
          neonColor: '#f472b6',
          glowIntensity: 50,
          flickerAmount: 0.35,
          fontSize: 140,
          letterSpacing: 4,
          vertical: true,
          durationFrames: 180,
        },
        tsx_code: NEON_TITLE_TSX,
      },
      {
        id: 'PremiereShineLogo16x9',
        name: 'Premiere Shine Logo 16:9',
        category: 'brand',
        description: 'Логотип с бесконечным проходом блика и опциональным кольцом',
        is_custom: true,
        tags: ['16:9', 'logo', 'brand'],
        props: [
          {
            name: 'logoText',
            type: 'string',
            description: 'Текст логотипа',
            default: 'PREMIERE',
          },
          {
            name: 'shineColor',
            type: 'string',
            description: 'Цвет блика',
            default: '#f8fafc',
          },
          {
            name: 'shineSpeed',
            type: 'number',
            description: 'Скорость прохода блика',
            default: 2,
          },
          {
            name: 'fontSize',
            type: 'number',
            description: 'Размер шрифта в px',
            default: 110,
          },
          {
            name: 'ringEnabled',
            type: 'boolean',
            description: 'Показывать кольцо',
            default: true,
          },
          {
            name: 'ringColor',
            type: 'string',
            description: 'Цвет кольца',
            default: '#eab308',
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: false,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 240,
          },
        ],
        default_props: {
          logoText: 'PREMIERE',
          shineColor: '#f8fafc',
          shineSpeed: 2,
          fontSize: 110,
          ringEnabled: true,
          ringColor: '#eab308',
          vertical: false,
          durationFrames: 240,
        },
        tsx_code: SHINE_LOGO_TSX,
      },
      {
        id: 'PremiereShineLogo9x16',
        name: 'Premiere Shine Logo 9:16',
        category: 'brand',
        description: 'Вертикальный логотип с бликом для Reels',
        is_custom: true,
        tags: ['9:16', 'shorts', 'logo', 'brand'],
        props: [
          {
            name: 'logoText',
            type: 'string',
            description: 'Текст логотипа',
            default: 'REELS',
          },
          {
            name: 'shineColor',
            type: 'string',
            description: 'Цвет блика',
            default: '#e0e7ff',
          },
          {
            name: 'shineSpeed',
            type: 'number',
            description: 'Скорость прохода блика',
            default: 3,
          },
          {
            name: 'fontSize',
            type: 'number',
            description: 'Размер шрифта в px',
            default: 110,
          },
          {
            name: 'ringEnabled',
            type: 'boolean',
            description: 'Показывать кольцо',
            default: true,
          },
          {
            name: 'ringColor',
            type: 'string',
            description: 'Цвет кольца',
            default: '#a78bfa',
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: true,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 180,
          },
        ],
        default_props: {
          logoText: 'REELS',
          shineColor: '#e0e7ff',
          shineSpeed: 3,
          fontSize: 110,
          ringEnabled: true,
          ringColor: '#a78bfa',
          vertical: true,
          durationFrames: 180,
        },
        tsx_code: SHINE_LOGO_TSX,
      },
      {
        id: 'VIPLeaderboard16x9',
        name: 'VIP Leaderboard 16:9',
        category: 'social',
        description: 'Таблица лидеров с пружинным въездом строк и золотой подсветкой топа',
        is_custom: true,
        tags: ['16:9', 'leaderboard', 'rating'],
        props: [
          {
            name: 'members',
            type: 'object',
            description: 'Массив объектов { rank, name, score }',
            default: [
              { rank: 1, name: 'NOVA', score: 9840 },
              { rank: 2, name: 'ORION', score: 8210 },
              { rank: 3, name: 'LYRA', score: 7745 },
            ],
          },
          {
            name: 'title',
            type: 'string',
            description: 'Заголовок таблицы',
            default: 'TOP PLAYERS',
          },
          {
            name: 'rowHeight',
            type: 'number',
            description: 'Высота строки в px',
            default: 84,
          },
          {
            name: 'rankColor',
            type: 'string',
            description: 'Цвет первой строчки',
            default: '#facc15',
          },
          {
            name: 'textColor',
            type: 'string',
            description: 'Цвет текста',
            default: '#e2e8f0',
          },
          {
            name: 'panelColor',
            type: 'string',
            description: 'Цвет панелей строк',
            default: '#0f172a',
          },
          {
            name: 'highlightTop',
            type: 'boolean',
            description: 'Подсвечивать лидера',
            default: true,
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: false,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 240,
          },
        ],
        default_props: {
          members: [
            { rank: 1, name: 'NOVA', score: 9840 },
            { rank: 2, name: 'ORION', score: 8210 },
            { rank: 3, name: 'LYRA', score: 7745 },
          ],
          title: 'TOP PLAYERS',
          rowHeight: 84,
          rankColor: '#facc15',
          textColor: '#e2e8f0',
          panelColor: '#0f172a',
          highlightTop: true,
          vertical: false,
          durationFrames: 240,
        },
        tsx_code: LEADERBOARD_TSX,
      },
      {
        id: 'VIPLeaderboard9x16',
        name: 'VIP Leaderboard 9:16',
        category: 'social',
        description: 'Вертикальная таблица лидеров для Stories и Reels',
        is_custom: true,
        tags: ['9:16', 'shorts', 'reels', 'leaderboard'],
        props: [
          {
            name: 'members',
            type: 'object',
            description: 'Массив объектов { rank, name, score }',
            default: [
              { rank: 1, name: 'NOVA', score: 9840 },
              { rank: 2, name: 'ORION', score: 8210 },
            ],
          },
          {
            name: 'title',
            type: 'string',
            description: 'Заголовок таблицы',
            default: 'STORY RANK',
          },
          {
            name: 'rowHeight',
            type: 'number',
            description: 'Высота строки в px',
            default: 84,
          },
          {
            name: 'rankColor',
            type: 'string',
            description: 'Цвет первой строчки',
            default: '#4ade80',
          },
          {
            name: 'textColor',
            type: 'string',
            description: 'Цвет текста',
            default: '#f1f5f9',
          },
          {
            name: 'panelColor',
            type: 'string',
            description: 'Цвет панелей строк',
            default: '#111827',
          },
          {
            name: 'highlightTop',
            type: 'boolean',
            description: 'Подсвечивать лидера',
            default: true,
          },
          {
            name: 'vertical',
            type: 'boolean',
            description: 'Вертикальная раскладка',
            default: true,
          },
          {
            name: 'durationFrames',
            type: 'number',
            description: 'Длительность композиции в кадрах',
            default: 180,
          },
        ],
        default_props: {
          members: [
            { rank: 1, name: 'NOVA', score: 9840 },
            { rank: 2, name: 'ORION', score: 8210 },
          ],
          title: 'STORY RANK',
          rowHeight: 84,
          rankColor: '#4ade80',
          textColor: '#f1f5f9',
          panelColor: '#111827',
          highlightTop: true,
          vertical: true,
          durationFrames: 180,
        },
        tsx_code: LEADERBOARD_TSX,
      },
    ],
  },
];
