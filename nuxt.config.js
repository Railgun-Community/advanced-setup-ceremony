module.exports = {
  telemetry: false,
  /*
   ** Headers of the page
   */
  head: {
    title: 'RAILGUN Advanced Setup Ceremony',
    script: [{ vmid: 'snarkjs', hid: 'snarkjs', src: '/snarkjs.min.js', defer: false }],
    meta: [
      { charset: 'utf-8' },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, shrink-to-fit=no'
      },
      { name: 'theme-color', content: '#000403' },
      {
        hid: 'description',
        name: 'description',
        content: 'Privacy is a human right.'
      },
      {
        hid: 'og:title',
        property: 'og:title',
        content: 'RAILGUN Advanced Setup Ceremony'
      },
      {
        hid: 'og:description',
        property: 'og:description',
        content:
          'Contribute your own entropy to the RAILGUN snark set-up ceremony to ensure its security.'
      },
      {
        hid: 'og:url',
        property: 'og:url',
        content: 'https://ceremony.railgun.org'
      },
      {
        hid: 'og:type',
        property: 'og:type',
        content: 'website'
      },
      {
        hid: 'og:image',
        property: 'og:image',
        content: '/favicon/favicon.png'
      },
      {
        hid: 'twitter:image',
        property: 'twitter:image',
        content: 'https://ceremony.railgun.org/Logo.png'
      },
      {
        hid: 'description',
        name: 'description',
        content:
          'Contribute your own entropy to the RAILGUN snark set-up ceremony to ensure its security.'
      },
      {
        hid: 'keywords',
        name: 'keywords',
        content:
          'Ethereum, ERC20, dapp, smart contract, decentralized, metamask, zksnark, zero knowledge'
      }
    ],
    link: [
      { rel: 'manifest', href: 'manifest.json' },
      {
        rel: 'apple-touch-icon',
        href: '/favicon/apple-touch-icon.png'
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/favicon/favicon-32x32.png'
      },
      {
        rel: 'shortcut icon',
        type: 'image/x-icon',
        href: '/favicon/favicon.ico'
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css?family=Inconsolata&display=swap'
      }
    ]
  },

  /*
   ** Customize the progress-bar color
   */
  loading: { color: '#aa55ff', height: '5px', duration: 5000 },
  /*
   ** Global CSS
   */
  css: ['@/assets/styles/app.scss'],
  /*
   ** Plugins to load before mounting the App
   */
  plugins: [{ src: '~plugins/railgun-contribution.client.js', ssr: false }, '~plugins/highlight'],
  /*
   ** Nuxt.js dev-modules
   */
  buildModules: [
    // Doc: https://github.com/nuxt-community/eslint-module
    '@nuxtjs/eslint-module'
  ],

  eslint: {
    fix: true
  },

  /*
   ** Nuxt.js modules
   */
  modules: [
    // Doc: https://buefy.github.io/#/documentation
    [
      'nuxt-buefy',
      {
        css: false,
        materialDesignIcons: false
      }
    ]
  ],
  /*
   ** Axios module configuration
   ** See https://axios.nuxtjs.org/options
   */
  axios: {},
  /*
   ** Build configuration
   */
  build: {
    /*
     ** You can extend webpack config here
     */
    extend(config, ctx) {
      config.module.rules.push({
        test: /\.js$/,
        loader: require.resolve('@open-wc/webpack-import-meta-loader')
      })
    },
    html: {
      minify: {
        collapseWhitespace: true,
        removeComments: true
      }
    }
  },
  router: {
    extendRoutes(routes, resolve) {
      routes.push({
        name: 'contributor-id',
        path: '/contributors/:id',
        component: resolve(__dirname, 'pages/contributor.vue')
      })
      return routes
    }
  },
  server: {
    port: 3000, // default: 3000
    host: '0.0.0.0' // default: localhost
  },
  publicRuntimeConfig: {
    ceremonyClosed: process.env.CEREMONY_CLOSED
  },
  env: {
    hashtag: process.env.TWITTER_HASHTAG,
    downloadUrl: process.env.AWS_CONTRIBUTION_URL,
    url: process.env.URL,
    ceremonyClosed: process.env.CEREMONY_CLOSED
  }
}
