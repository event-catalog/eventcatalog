module.exports = {
  title: 'EventCatalog',
  tagline: 'Discover, Explore and Document your Event Driven Architectures',
  organizationName: 'Your Company',
  editUrl: 'https://github.com/boyney123/eventcatalog-demo/edit/master',
  trailingSlash: true,
  logo: {
    alt: 'EventCatalog Logo',
    src: 'logo.svg'
  },
  primaryCTA: {
    label: 'Explore Events',
    href: '/events'
  },
  secondaryCTA: {
    label: 'Getting Started',
    href:"https://www.eventcatalog.dev/"
  },
  headerLinks: [
    { label: 'Events', href: '/events'},
    { label: 'Services', href: '/services' },
    { label: 'Domains', href: '/domains'},
    { label: 'Visualiser', href: '/visualiser' },
    { label: '3D Node Graph', href: '/overview' },
  ],
  footerLinks: [
    { label: 'Events', href: '/events' },
    { label: 'Services', href: '/services' },
    { label: 'Visualiser', href: '/visualiser' },
    { label: '3D Node Graph', href: '/overview' },
    { label: 'GitHub', href: 'https://github.com/boyney123/eventcatalog-demo/edit/master' }
  ],
  generators: [
    [
      '@eventcatalog/plugin-doc-generator-asyncapi',
      {
        file: './asyncapi.yml',
      },
    ]
  ],
  users: [
    {
      id: 'dboyne',
      name: 'David Boyne',
      avatarUrl: 'https://pbs.twimg.com/profile_images/1262283153563140096/DYRDqKg6_400x400.png',
      role: 'Developer',
      summary: 'Currently building tools for Event Architectures.'
    },
    {
      id: 'mSmith',
      name: 'Matthew Smith',
      avatarUrl: 'https://randomuser.me/api/portraits/lego/3.jpg',
      role: 'Developer',
      summary: 'About Fugiat ipsum ipsum deserunt culpa aute sint do nostrud anim incididunt cillum culpa consequat.'
    },
  ],
}
