<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      Circuits
    </h1>

    <div class="currently">
      Currently there are <span>{{ contributions.length }}</span> contributions from
      <span>{{ contributors.length }}</span> contributors
    </div>

    <b-table :data="circuits" :hoverable="true" :mobile-cards="false">
      <template slot-scope="props">
        <b-table-column field="id" label="#" width="40" numeric>
          {{ props.row.id }}
        </b-table-column>

        <b-table-column label="Circuit">
          <span>{{ props.row.name }}</span>
        </b-table-column>

        <b-table-column label="Round">
          <span>{{ props.row.contribution?.round ?? 0 }}</span>
        </b-table-column>

        <b-table-column label="Hash">
          <span
            >{{
              props.row.contribution?.hash && props.row.contribution.hash.substr(0, 32)
            }}
            ...</span
          >
        </b-table-column>

        <b-table-column label="Transcript">
          <a
            :href="`/api/download/circuits/${props.row.name}.json`"
            class="button is-icon"
            download
          >
            <span class="icon icon-link"></span>
          </a>
        </b-table-column>
        <b-table-column label="zKey">
          <a
            v-if="props.row.contribution"
            :href="`/api/contributions/${props.row.contribution?.id}/download`"
            download
          >
            <span class="icon icon-save"></span>
          </a>
        </b-table-column>
      </template>

      <template slot="empty">
        <section class="section">
          <div class="content has-text-centered">
            <p>Nothing here.</p>
          </div>
        </section>
      </template>

      <template slot="top-left"></template>

      <template slot="bottom-left"></template>
    </b-table>
  </div>
</template>

<script>
export default {
  data() {
    return {
      contributors: [],
      contributions: [],
      circuits: [],
      rowsPerPage: 100,
      contributionSearch: '',
      downloadUrl: process.env.downloadUrl
    }
  },
  computed: {},
  async mounted() {
    try {
      const response = await fetch('/api/circuits')
      const data = await response.json()

      this.contributions = data.flatMap((circuit) => circuit.Contributions)

      const contributorsResponse = await fetch('/api/contributors')
      this.contributors = await contributorsResponse.json()

      this.circuits = data.map((circuit) => {
        return {
          id: circuit.id,
          name: circuit.name,
          contribution: circuit.Contributions[circuit.Contributions.length - 1 ?? 0]
        }
      })
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('e', e)
    }
  }
}
</script>
