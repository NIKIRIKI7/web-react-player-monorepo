/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'no-circular',
      severity: 'error',
      comment:
        'Циклические зависимости запрещены. Они ломают бандлеры и усложняют инициализацию модулей.',
      from: {},
      to: { circular: true },
    },
    {
      name: 'core-is-independent',
      severity: 'error',
      comment: '@web-react-player/core - это стейт-машина. Она не должна зависеть от UI или React!',
      from: { path: '^packages/core/src' },
      to: { path: '^packages/(ui|remotion)/src' },
    },
    {
      name: 'ui-independent-of-remotion',
      severity: 'error',
      comment:
        '@web-react-player/ui не должен зависеть от @remotion (он работает и с обычным <video>).',
      from: { path: '^packages/ui/src' },
      to: { path: '^packages/remotion/src' },
    },
    {
      name: 'packages-independent-of-apps',
      severity: 'error',
      comment: 'Пакеты никогда не должны импортировать код из приложений (apps/...).',
      from: { path: '^packages/' },
      to: { path: '^apps/' },
    },
  ],
  options: {
    doNotFollow: { path: 'node_modules' },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: 'tsconfig.base.json' },
    enhancedResolveOptions: {
      exportsFields: ['exports'],
      conditionNames: ['import', 'require', 'node', 'default'],
    },
  },
};
