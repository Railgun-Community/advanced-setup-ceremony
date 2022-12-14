const state = () => {
  return {
    name: null,
    url: null,
    handle: 'Anonymous',
    transcriptHash: null,
    company: '',
    contributionType: null,
    contributionIndex: null
  }
}

const mutations = {
  SET_NAME(state, name) {
    state.name = name
  },
  SET_HANDLE(state, handle) {
    state.handle = handle
  },
  SET_URL(state, url) {
    state.url = url
  },
  SET_COMPANY(state, company) {
    state.company = company
  },
  SET_CONTRIBUTION_TYPE(state, contributionType) {
    state.contributionType = contributionType
  },
  SET_CONTRIBUTION_INDEX(state, contributionIndex) {
    state.contributionIndex = contributionIndex
  },
  SET_TRANSCRIPT_HASH(state, transcriptHash) {
    state.transcriptHash = transcriptHash
  }
}

const getters = {
  isLoggedIn: (state) => {
    return state.name !== null && state.name !== 'Anonymous'
  },
  hasErrorName: (state) => {
    const name = state.name
    if (name === null) {
      return { invalid: false, msg: '' }
    }
    if (name === '') {
      return { invalid: true, msg: 'Name is empty' }
    }
    if (name.length < 4) {
      return { invalid: true, msg: 'Name is too short' }
    }
    if (name.length > 35) {
      return { invalid: true, msg: 'Name is too long' }
    }
    return { invalid: false, msg: '' }
  }
}

const actions = {
  logInVia({ state }, provider) {
    window.location.replace(`/api/connect/${provider}`)
  },
  makeTweet({ state }) {
    // @todo direct contributor url
    const tweetText = `I just made a contribution to the @railgun_project %23AdvancedSetupCeremony!
 Let's make %23privacy the default.
 The hash of my contribution transcript is ${state.transcriptHash}
 https://ceremony.railgun.org`
    const popUpWindowWidth = 600
    const popUpWindowHeight = 250
    const dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX
    const dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY

    const width = window.innerWidth
      ? window.innerWidth
      : document.documentElement.clientWidth
      ? document.documentElement.clientWidth
      : screen.width
    const height = window.innerHeight
      ? window.innerHeight
      : document.documentElement.clientHeight
      ? document.documentElement.clientHeight
      : screen.height

    const systemZoom = width / window.screen.availWidth
    const left = (width - popUpWindowWidth) / 2 / systemZoom + dualScreenLeft
    const top = (height - popUpWindowHeight) / 2 / systemZoom + dualScreenTop
    window.open(
      `https://twitter.com/intent/tweet?text=${tweetText}`,
      '',
      `menubar=no,toolbar=no,resizable=yes,scrollbars=no,height=${popUpWindowHeight},width=${popUpWindowWidth},top=${top},left=${left}`
    )
  },
  async logOut({ commit }) {
    commit('SET_HANDLE', 'Anonymous')
    commit('SET_CONTRIBUTION_TYPE', null)
    commit('SET_NAME', null)
    commit('SET_COMPANY', '')
    await fetch('/api/logout')
    window.location.replace('/contribute')
  },
  async getUserData({ commit }) {
    try {
      const response = await fetch('/api/user_data')
      const data = await response.json()
      /* eslint-disable-next-line no-console */
      console.log('data', data)
      if (data.name !== 'Anonymous') {
        commit('SET_HANDLE', data.handle)
        commit('SET_NAME', data.name)
        commit('SET_URL', data.url)
        commit('SET_CONTRIBUTION_TYPE', data.socialType)
        commit('SET_TRANSCRIPT_HASH', data.attestation)
      }
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('user_data fail', e)
    }
  }
}

export default {
  namespaced: true,
  state,
  getters,
  mutations,
  actions
}
