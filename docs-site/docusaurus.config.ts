import { themes as prismThemes } from 'prism-react-renderer'
import type { Config } from '@docusaurus/types'
import type * as Preset from '@docusaurus/preset-classic'

const config: Config = {
  title: 'BatRewind Docs',
  tagline: 'Self-hosted session replay for the web',
  favicon: 'img/favicon.svg',

  url: 'https://docs.batrewind.com',
  baseUrl: '/',

  organizationName: 'joaovrmoraes',
  projectName: 'batrewind',

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/joaovrmoraes/batrewind/tree/main/docs-site/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      disableSwitch: false,
      respectPrefersColorScheme: true,
    },

    navbar: {
      title: 'BatRewind',
      logo: {
        alt: 'BatRewind logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docs',
          position: 'left',
          label: 'Documentation',
        },
        {
          href: 'https://github.com/joaovrmoraes/batrewind',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },

    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Installation', to: '/getting-started/installation' },
            { label: 'Browser SDK', to: '/sdk/browser' },
            { label: 'API Reference', to: '/api-reference/ingest' },
          ],
        },
        {
          title: 'Project',
          items: [
            { label: 'GitHub', href: 'https://github.com/joaovrmoraes/batrewind' },
            { label: 'Issues', href: 'https://github.com/joaovrmoraes/batrewind/issues' },
          ],
        },
      ],
      copyright: `MIT License — BatRewind`,
    },

    prism: {
      theme: prismThemes.oneDark,
      darkTheme: prismThemes.oneDark,
      additionalLanguages: ['bash', 'json', 'typescript', 'go', 'docker', 'yaml'],
    },

    algolia: undefined,
  } satisfies Preset.ThemeConfig,
}

export default config
