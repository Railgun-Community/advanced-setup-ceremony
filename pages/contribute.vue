<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      Hello, <span>@{{ userHandle == 'Anonymous' ? 'you' : userHandle }}</span>
      <button v-if="isLoggedIn" @click="logOut" class="button is-icon logout">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="#aa55ff"
            d="M14.08,15.59L16.67,13H7V11H16.67L14.08,8.41L15.5,7L20.5,12L15.5,17L14.08,15.59M19,3A2,2 0 0,1 21,5V9.67L19,7.67V5H5V19H19V16.33L21,14.33V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19Z"
          />
        </svg>
      </button>
    </h1>
    <Stats></Stats>
    <div v-show="ceremonyClosed" class="title is-size-2 is-spaced">
      The Ceremony is closed.
    </div>

    <!-- show if not logged in -->
    <div v-show="!isLoggedIn">
      <h2 class="subtitle" style="margin-bottom: 36px">
        How would you like to contribute to the RAILGUN Advanced Setup Ceremony?
      </h2>
      <fieldset :disabled="status.type === 'is-success'">
        <div class="columns is-centered">
          <div v-if="allowAnonymous" class="column is-one-third">
            <button
              :class="{ 'is-hovered': contributionType === 'anonymous' }"
              @click="onAnonymousHandler"
              class="box box-anonymous"
            >
              <div class="title is-5">Anonymously</div>
              <Cloak />
            </button>
          </div>
          <div class="column is-one-third">
            <div :class="{ 'is-hovered': isLoggedIn }" class="box">
              <div class="title is-5">By using social account</div>
              <Form />
            </div>
          </div>
        </div>
      </fieldset>
    </div>

    <!-- show if complete -->
    <div v-show="transcriptHash" class="status">
      <h2 class="subtitle" style="margin-bottom: 36px">
        Thank you for contributing to the RAILGUN Circuits Ceremony!
      </h2>
      <div class="label">Your transcript hash (SHA256)</div>
      <b-field position="is-centered" class="has-addons contribution-hash">
        <b-input
          @click.native="copyContributionHash"
          :value="transcriptHash"
          icon="copy"
          readonly
        ></b-input>
      </b-field>
      <div class="status-message is-success">
        You should tweet your transcript hash to confirm that your contribution is authentic. Feel
        free to delete it later if you like. Please tweet to complete!"
        <div class="buttons is-centered">
          <b-button @click="makeTweet" type="is-primary" tag="a" target="_blank" outlined>
            Post attestation
          </b-button>
        </div>
      </div>
    </div>
    <div v-show="status.type !== ''" class="status">
      <div :class="status.type" class="status-message">{{ status.msg }}</div>
    </div>

    <div v-if="isLoggedIn && !transcriptHash">
      <p class="p">
        This contribution will generate entropy for more than 50 new RAILGUN circuits. This is a
        fairly intense cryptographic operation, and may take 60 minutes depending on your processing
        power. We recommend running the contribution overnight, although you may stop and resume
        where you left off at any time.
      </p>
      <p class="p">
        When your contribution is complete, you will see a hash of your transcript and a button to
        tweet it. Doing so from your primary, well-known account will prove that your contribution
        is authentic.
      </p>
      <div class="buttons is-centered">
        <div class="buttons">
          <b-button
            @click="getUserRandom"
            :disabled="isContributeBtnDisabled"
            type="is-primary"
            outlined
          >
            Run privacy contribution
          </b-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/* eslint-disable no-console */
import { mapGetters, mapActions } from 'vuex'
import Cloak from '@/components/Cloak'
import Form from '@/components/Form'
import Stats from '@/components/Stats'
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 *
 * @param {string} userInput
 * @returns {string} combined user and browser entropy as hex string
 */
const generateEntropy = async (userInput) => {
  const msgBuffer = new TextEncoder('utf-8').encode(userInput)
  let hashBuffer = []
  try {
    hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer)
  } catch (e) {
    console.warn('subtle unavailable in dev/non-https, faking')
  }
  const entropyFromUser = new Uint8Array(hashBuffer)
  const entropyFromBrowser = crypto.getRandomValues(new Uint8Array(32))

  // suffle the browser and user random
  const entropy = new Uint8Array(entropyFromBrowser.length)
  for (let i = 0; i < entropyFromBrowser.length; i++) {
    entropy[i] = entropyFromBrowser[i] + entropyFromUser[i]
  }

  return entropy.toString('hex')
}

export default {
  components: {
    Cloak,
    Form,
    Stats
  },
  data() {
    return {
      ceremonyClosed: this.$config.ceremonyClosed,
      stats: {
        active: 0,
        circuits: 0,
        contributors: 0,
        contributions: 0
      },
      allowAnonymous: false,
      status: {
        type: '',
        msg: ''
      }
    }
  },
  computed: {
    ...mapGetters('user', ['isLoggedIn', 'hasErrorName']),
    userName: {
      get() {
        return this.$store.state.user.name
      },
      set(value) {
        this.$store.commit('user/SET_NAME', value)
      }
    },
    userUrl: {
      get() {
        return this.$store.state.user.url
      }
    },
    userHandle: {
      get() {
        return this.$store.state.user.handle
      },
      set(value) {
        this.$store.commit('user/SET_HANDLE', value)
      }
    },
    contributionType: {
      get() {
        return this.$store.state.user.contributionType
      },
      set(value) {
        this.$store.commit('user/SET_CONTRIBUTION_TYPE', value)
      }
    },
    transcriptHash: {
      get() {
        return this.$store.state.user.transcriptHash
      },
      set(value) {
        this.$store.commit('user/SET_TRANSCRIPT_HASH', value)
      }
    },
    isContributeBtnDisabled() {
      return !this.isLoggedIn
    }
  },
  async mounted() {
    this.$root.$emit('enableLoading')
    console.log(this.$config)
    await this.getStats()
    await this.getUserData()
    setTimeout(() => {
      this.$root.$emit('disableLoading')
    }, 800)
  },
  methods: {
    ...mapActions('user', ['makeTweet', 'logOut', 'getUserData']),
    getUserRandom() {
      this.$buefy.dialog.prompt({
        title: 'Contribution',
        message: `Please provide your random input (any characters). This will be used as a source of entropy along with browser's secure random number generator.`,
        inputAttrs: {
          maxlength: 300
        },
        confirmText: 'Contribute',
        trapFocus: true,
        onConfirm: (userInput) => {
          this.makeContribution({ userInput })
        }
      })
    },
    async getStats() {
      this.stats = await fetch('api/stats').then((r) => r.json())
    },
    async fetchMyContributions() {
      const contributionData = await fetch(`api/contributions/me`)
      if (contributionData.status === 401) {
        return this.logOut()
      }
      const contributions = await contributionData.json()
      return contributions
    },
    // eslint-disable-next-line object-shorthand
    getChallenge: function(retry = 0) {
      const retries = 5
      return fetch('api/challenge')
        .then((res) => {
          if (res.ok) {
            return res.arrayBuffer()
          }
          if (retry < retries) {
            if (res.status === 204) {
              // server says no content, all done
              throw new Error('Complete', { cause: 'done' })
            } else if (res.status === 423) {
              // all remaining circuits are busy. wait and retry
              this.notify('Remaining circuits are busy; retrying')
              return timeout(10000).then(() => this.getChallenge(0))
            } else {
              this.notify('Unknown error, waiting to retry')
              return timeout(10000).then(() => this.getChallenge(retry + 1))
            }
          }
          throw new Error(res.status)
        })
        .then((buf) => new Uint8Array(buf))
        .catch((e) => {
          if (retry < retries) {
            return timeout(10000).then(() => this.getChallenge(retry + 1))
          }
          console.log('error on challenge')
          throw e
        })
    },
    getResponse(contribution, retry = 0) {
      const formData = new FormData()
      const type = 'application/octet-stream'
      formData.append('response', new Blob([contribution], { type }))
      const options = { method: 'POST', body: formData }
      return fetch('api/response', options).then((resp) => {
        if (resp.ok) {
          return resp.json()
        }
        if (retry < 3) {
          if (resp.status === 422) {
            // retries won't help, throw
            const msg = `Looks like someone else uploaded contribution ahead of us`
            this.notify(msg)
            throw new Error(msg)
          }
          return this.timeout(5000).then(() => this.getResponse(contribution, retry + 1))
        } else {
          const e = `Failed to upload your contribution after ${retry} attempts`
          this.error(e)
          throw new Error(e)
        }
      })
    },
    notify(msg) {
      this.$root.$emit('enableLoading', msg)
    },
    error(msg, append = false) {
      console.log(msg)
      this.status.type = 'is-danger'
      if (append) {
        this.status.msg = `${msg} (${this.status.msg})`
      } else {
        this.status.msg = msg
      }
    },
    async makeContribution({ userInput, retry = 0 }) {
      const { zKey } = window.snarkjs
      const { contribute } = this.$contributor()

      this.status.msg = ''
      this.status.type = ''
      const entropyHex = generateEntropy(userInput)
      let contributions = await this.fetchMyContributions()

      let done = false
      const retries = 10
      while (!done && retry < retries) {
        try {
          this.notify('Downloading last contribution')
          const challenge = await this.getChallenge()
          contributions = await this.fetchMyContributions()

          this.notify(
            `Generating contribution for ${contributions.length}/${this.stats.circuits} RAILGUN circuits. Your browser may appear unresponsive. It can take up to 60 minutes to complete, so we recommend leaving this window open overnight.`
          )
          await this.sleep(100) // so browser can render the messages
          const { contribution } = await contribute(zKey, challenge, this.userUrl, entropyHex)

          this.notify(
            `Please keep your browser open! Uploading and verifying your contribution (${contributions.length}/${this.stats.circuits})`
          )
          const response = await this.getResponse(contribution)
          console.log(response)
          this.$store.commit('user/SET_CONTRIBUTION_INDEX', response.contributionIndex)
          // reset retries on successful contribution
          retry = 0
          if (response.transcriptHash) {
            this.$store.commit('user/SET_TRANSCRIPT_HASH', response.transcriptHash)
            done = true
          }
        } catch (e) {
          this.error(e.message ?? 'Unknown error; try again?')
          await timeout(5000)
          retry = retry + 1
        } finally {
          this.$root.$emit('disableLoading')
        }
      }
      if (retry >= retries) {
        this.error('Failed to finish contributing to ceremony - try again later!', true)
      }
      if (done) {
        this.status.msg = 'Your contribution to all circuits is complete!'
        this.status.type = 'is-sucess'
      }
    },
    onAnonymousHandler() {
      this.logOut()
      this.contributionType = 'anonymous'
    },
    copyContributionHash() {
      try {
        navigator.clipboard.writeText(this.transcriptHash).then(() => {
          this.$buefy.toast.open({
            message: 'Copied!',
            type: 'is-primary'
          })
        })
      } catch (err) {
        this.$buefy.toast.open({
          message: "No access to clipboard; you'll have to copy it the old-fashioned way"
        })
      }
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms))
    }
  }
}
</script>
