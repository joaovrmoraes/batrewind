import type { SidebarsConfig } from '@docusaurus/plugin-content-docs'

const sidebars: SidebarsConfig = {
  docs: [
    'intro',
    {
      type: 'category',
      label: 'Getting Started',
      collapsed: false,
      items: [
        'getting-started/installation',
        'getting-started/first-session',
        'getting-started/dashboard',
      ],
    },
    {
      type: 'category',
      label: 'Browser SDK',
      items: [
        'sdk/browser',
        'sdk/privacy',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        'concepts/architecture',
        'concepts/capture-modes',
        'concepts/share-links',
        'concepts/copy-for-ai',
        'concepts/retention',
      ],
    },
    {
      type: 'category',
      label: 'API Reference',
      items: [
        'api-reference/authentication',
        'api-reference/ingest',
        'api-reference/sessions',
        'api-reference/public-share',
      ],
    },
    {
      type: 'category',
      label: 'Self-Hosting',
      items: [
        'self-hosting/configuration',
        'self-hosting/production',
        'self-hosting/postgresql',
        'self-hosting/sqlite',
      ],
    },
  ],
}

export default sidebars
