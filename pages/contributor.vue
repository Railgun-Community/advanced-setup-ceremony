<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      Contributions by
      <a
        :href="`https://${contributor.socialType}.com/${contributor.handle}`"
        class="social-link"
        target="_blank"
      >
        <span :class="`icon-${contributor.socialType}`" class="icon"></span>
        @{{ contributor.handle }}
      </a>
    </h1>

    <div class="currently">
      {{ contributor?.handle }} contributed to
      <span>{{ contributions.length }}</span> circuits.<br />
      The hash of their transcript is:<br />
      <pre>{{ contributor?.attestation }}</pre>
      <a :href="`/api/download/contributors/${contributor.id}.json`">
        <span class="icon icon-save"></span>&nbsp;&nbsp; transcript json
      </a>
    </div>

    <b-table
      :data="contributions"
      :hoverable="true"
      :mobile-cards="false"
      :per-page="rowsPerPage"
      :scrollable="true"
    >
      <template slot-scope="props">
        <b-table-column :centered="false" label="Circuit">
          {{ props.row.Circuit.name }}
        </b-table-column>

        <b-table-column label="Round" numeric>
          {{ props.row.round }}
        </b-table-column>

        <b-table-column label="Hash (Blake2)">
          {{ props.row.hash }}
        </b-table-column>
      </template>
    </b-table>
  </div>
</template>

<script>
export default {
  filters: {
    truncate(value, length) {
      return value.length > length ? value.substr(0, length) + '...' : value
    }
  },
  data() {
    return {
      contributor: {},
      contributions: [],
      rowsPerPage: 100
    }
  },
  computed: {},
  async mounted() {
    try {
      const contributorId = this.$route.params.id
      const response = await fetch(`/api/contributors/${contributorId}`)
      const data = await response.json()
      this.contributor = data
      this.contributions = data.Contributions
    } catch (e) {
      /* eslint-disable-next-line no-console */
      console.error('e', e)
    }
  }
}
</script>
