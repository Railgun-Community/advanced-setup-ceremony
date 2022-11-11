/* eslint-disable no-console */
const crypto = require('crypto')
const express = require('express')
const router = express.Router()
const oauth = require('oauth')
const { Contributor } = require('../models')

const {
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  TWITTER_CALLBACK_URL,
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  GITHUB_CALLBACK_URL
} = process.env
const providers = ['github', 'twitter']
const signInPages = ['/contribute', '/authorize']

// twitter uses OAuth1
const twitter = new oauth.OAuth(
  'https://twitter.com/oauth/request_token',
  'https://twitter.com/oauth/access_token',
  TWITTER_CONSUMER_KEY,
  TWITTER_CONSUMER_SECRET,
  '1.0A',
  TWITTER_CALLBACK_URL,
  'HMAC-SHA1'
)

// github uses OAuth2
const github = new oauth.OAuth2(
  GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET,
  'https://github.com/',
  'login/oauth/authorize',
  'login/oauth/access_token'
)
github.useAuthorizationHeaderforGET(true)

function validateProvider(req, res, next) {
  const { provider } = req.params
  if (!providers.includes(provider)) {
    res.status(404).send('Wrong provider')
  } else {
    next()
  }
}

function validateReferrer(req, res, next) {
  let referrer
  try {
    referrer = new URL(req.get('Referrer'))
  } catch (e) {
    res.status(403).send('Access forbidden')
    return
  }

  if (!signInPages.includes(referrer.pathname)) {
    res.status(403).send('Access forbidden')
    return
  }

  next()
}

function restrictSymbols(value) {
  if (value) {
    const regExpression = new RegExp('[^0-9a-zA-Z\\x20]', 'g')
    return value.toString().replace(regExpression, '')
  } else {
    return ''
  }
}

router.get('/connect/:provider', validateProvider, validateReferrer, (req, res) => {
  const { provider } = req.params
  const referrer = new URL(req.get('Referrer'))

  req.session.pageToReturn = referrer.pathname // the page a user will be redirected after signIn
  if (referrer.pathname === '/authorize') {
    req.session.pageToReturn += referrer.search // to add `token` parameter for authorize page
  }

  if (provider === 'github') {
    const CSRFToken = crypto.randomBytes(32).toString('hex')
    const authorizeUrl = github.getAuthorizeUrl({
      redirect_uri: GITHUB_CALLBACK_URL,
      scope: [], // 'gist' - https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/
      state: CSRFToken
    })
    req.session.CSRFToken = CSRFToken
    res.redirect(authorizeUrl)
  } else if (provider === 'twitter') {
    twitter.getOAuthRequestToken(function(error, oauthToken, oauthTokenSecret) {
      if (error) {
        res.status(500).send(error)
      } else {
        req.session.oauthRequestToken = oauthToken
        req.session.oauthRequestTokenSecret = oauthTokenSecret
        res.redirect(
          'https://twitter.com/oauth/authorize?oauth_token=' + req.session.oauthRequestToken
        )
      }
    })
  }
})

router.get('/oauth_callback/:provider', validateProvider, (req, res) => {
  const { provider } = req.params

  if (provider === 'github') {
    const { code, state } = req.query
    if (state !== req.session.CSRFToken) {
      res.status(404).send('Malformed request')
      return
    }
    github.getOAuthAccessToken(code, {}, function(error, accessToken, refreshToken, results) {
      if (error || results.error) {
        console.error('getOAuthAccessToken error', error || results.error)
        res.status(500).send(error || results.error)
      } else {
        req.session.refreshToken = refreshToken
        req.session.accessToken = accessToken
        res.redirect(req.session.pageToReturn)
      }
    })
  } else if (provider === 'twitter') {
    twitter.getOAuthAccessToken(
      req.query.oauth_token,
      req.session.oauthRequestTokenSecret,
      req.query.oauth_verifier,
      (error, oauthAccessToken, oauthAccessTokenSecret) => {
        if (error) {
          console.error('getOAuthAccessToken error', error)
          res.status(500).send(error)
        } else {
          req.session.oauthAccessToken = oauthAccessToken
          req.session.oauthAccessTokenSecret = oauthAccessTokenSecret
          res.redirect(req.session.pageToReturn)
        }
      }
    )
  }
})

async function createContributorFromSocial(userData) {
  const [contributor] = await Contributor.findOrCreate({
    defaults: userData,
    where: {
      socialType: userData.socialType,
      handle: userData.handle
    }
  })
  return contributor
}

const urls = {
  twitter: 'https://twitter.com/',
  github: 'https://github.com/'
}

router.get('/user_data/', (req, res) => {
  const userData = { name: 'Anonymous', socialType: 'anonymous' }
  let contributor
  const sessionID = req.sessionID
  if (req.session.accessToken) {
    github.get('https://api.github.com/user', req.session.accessToken, async function(error, data) {
      if (!error) {
        data = JSON.parse(data)
        userData.handle = data.login
        userData.url = urls.github + userData.handle
        userData.name = restrictSymbols(data.name) || userData.handle
        userData.socialType = 'github'
        try {
          contributor = await createContributorFromSocial({ ...userData, sessionID })
          userData.id = contributor.id
          req.session.user = userData
          console.log(userData)
          return res.json(contributor.dataValues)
        } catch {
          console.log('bad username?', userData)
          return res.status(422).json()
        }
      }
      res.json(userData)
    })
  } else if (req.session.oauthAccessToken && req.session.oauthAccessTokenSecret) {
    twitter.get(
      'https://api.twitter.com/1.1/account/verify_credentials.json',
      req.session.oauthAccessToken,
      req.session.oauthAccessTokenSecret,
      async function(error, data) {
        if (!error) {
          data = JSON.parse(data)
          userData.handle = data.screen_name
          userData.name = restrictSymbols(data.name) || userData.handle
          userData.socialType = 'twitter'
          userData.url = urls.twitter + userData.handle
          try {
            contributor = await createContributorFromSocial({ ...userData, sessionID })
            userData.id = contributor.id
            req.session.user = userData
            console.log(userData)
            return res.json(contributor.dataValues)
          } catch {
            console.log('bad username?', userData)
            return res.status(422).json()
          }
        }
        res.json(userData)
      }
    )
  } else {
    res.json(userData)
  }
})

router.get('/logout', (req, res) => {
  req.session.destroy()
  res.send('OK')
})

module.exports = router
