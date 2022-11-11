<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      Hello, <span>@{{ userHandle }}</span>
      <button v-if="isLoggedIn" @click="logOut" class="button is-icon logout">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
          <path
            fill="#aa55ff"
            d="M14.08,15.59L16.67,13H7V11H16.67L14.08,8.41L15.5,7L20.5,12L15.5,17L14.08,15.59M19,3A2,2 0 0,1 21,5V9.67L19,7.67V5H5V19H19V16.33L21,14.33V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3H19Z"
          />
        </svg>
      </button>
    </h1>
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
        And now you can post your attestation to Twitter.
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
        power. We recommend running the contribution overnight.
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
const timeout = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
function buf2hex(buffer) {
  // buffer is an ArrayBuffer
  return Array.prototype.map
    .call(new Uint8Array(buffer), (x) => ('00' + x.toString(16)).slice(-2))
    .join('')
}

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

const CIRCUITS_COUNT = 54

export default {
  components: {
    Cloak,
    Form
  },
  data() {
    return {
      allowAnonymous: false,
      status: {
        type: '',
        msg: ''
      },
      contributionHash: null,
      authorizeLink: null
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
    async fetchMyContributions() {
      const contributionData = await fetch(`api/contributions/me`)
      if (contributionData.status === 401) {
        return this.logOut()
      }
      const contributions = await contributionData.json()
      console.log({ contributions })
      return contributions
    },

    async makeContribution({ userInput, retry = 0 }) {
      const contributor = await this.$contributor()
      this.status.msg = ''
      this.status.type = ''
      const entropyHex = generateEntropy(userInput)
      const { zKey } = window.snarkjs

      let done = false
      while (!done) {
        let contributions
        try {
          console.log(retry)
          if (retry > 3) {
            throw new Error('Unable to upload contribution')
          }
          this.$root.$emit('enableLoading', 'Downloading last contribution')
          let data
          try {
            data = await fetch('api/challenge')
            if (data.status === 204) {
              // server says no content, all done
              console.log('204 on challenge')
              done = true
              continue
            }
            data = new Uint8Array(await data.arrayBuffer())
            contributions = await this.fetchMyContributions()
          } catch (err) {
            console.log(err)
            throw err
          }

          this.$root.$emit(
            'enableLoading',
            `Generating contribution for ${contributions.length}/${CIRCUITS_COUNT} RAILGUN circuits. Your browser may appear unresponsive. It can take up to 60 minutes to complete, so we recommend leaving this window open overnight.`
          )
          await timeout(100) // allow UI to update before freezing in wasm
          console.log('Source params', data)

          await this.sleep(100) // so browser can render the messages
          const prevContribution = data
          const result = await contributor.contribute(
            zKey,
            prevContribution,
            this.userUrl,
            entropyHex
          )
          const hash = '0x' + buf2hex(result.hash.slice(0, 64))
          const { contribution } = result
          this.contributionHash = hash

          console.log('hash', hash)
          console.log('contribution', contribution)

          this.$root.$emit(
            'enableLoading',
            `Please keep your browser open! Uploading and verifying your contribution (${contributions.length}/${CIRCUITS_COUNT})`
          )
          const formData = new FormData()
          formData.append(
            'response',
            new Blob([contribution], { type: 'application/octet-stream' })
          )
          if (this.contributionType !== 'anonymous') {
            formData.append('name', this.userUrl)
          }
          const resp = await fetch('api/response', {
            method: 'POST',
            body: formData
          })
          if (resp.ok) {
            const responseData = await resp.json()
            this.$store.commit('user/SET_CONTRIBUTION_INDEX', responseData.contributionIndex)
            if (responseData.transcriptHash) {
              this.status.msg =
                'Your contributions to all circuits have been verified and recorded.'
              this.status.type = 'is-success'
              this.$store.commit('user/SET_TRANSCRIPT_HASH', responseData.transcriptHash)
              done = true
            } else {
              this.status.msg = 'Your contribution has been verified and recorded.'
              this.status.type = 'is-success'
            }
          } else if (resp.status === 422) {
            if (retry < 3) {
              console.log(`Looks like someone else uploaded contribution ahead of us, retrying`)
              const newRetry = retry + 1
              await this.makeContribution({ userInput, retry: newRetry })
            } else {
              this.status.msg = `Failed to upload your contribution after ${retry} attempts`
              this.status.type = 'is-danger'
            }
          } else {
            this.status.msg = 'Error uploading your contribution'
            this.status.type = 'is-danger'
          }
        } catch (e) {
          console.error(e)
          this.status.msg = e.message
          this.status.type = 'is-danger'
        } finally {
          this.$root.$emit('disableLoading')
        }
      }
      this.status.msg = 'Your contribution to all circuits is complete!'
      this.status.type = 'is-sucess'
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
