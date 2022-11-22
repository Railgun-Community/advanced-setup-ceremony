<template>
  <div class="ceremony">
    <h1 class="title is-size-1 is-size-2-mobile is-spaced">
      Contributors
    </h1>

    <Stats></Stats>

    <b-table
      :data="filteredContributors"
      :hoverable="true"
      :mobile-cards="false"
      :per-page="rowsPerPage"
      paginated
      pagination-position="both"
    >
      <template slot-scope="props">
        <b-table-column field="id" label="#" width="40" numeric>
          {{ props.row.id }}
        </b-table-column>

        <b-table-column label="Account" field="handle">
          <a
            v-if="props.row.handle"
            :href="`https://${props.row.socialType}.com/${props.row.handle}`"
            class="social-link"
            target="_blank"
          >
            <span :class="`icon-${props.row.socialType}`" class="icon"></span>
            @{{ props.row.handle }}
          </a>
          <div v-else class="social-link">
            <span :class="`icon-${props.row.socialType}`" class="icon"></span>
            Anonymous
          </div>
        </b-table-column>

        <b-table-column field="name" label="Name">
          {{ props.row.name }}
        </b-table-column>

        <b-table-column :centered="false" label="Circuits">
          {{ props.row.Contributions.length }} / {{ stats.circuits }}
        </b-table-column>

        <b-table-column label="View">
          <a :href="`/contributors/${props.row.id}`" class="button is-icon">
            <span class="icon icon-link"></span>
          </a>
        </b-table-column>

        <b-table-column label="Transcript">
          <a
            :href="`/api/download/contributors/${props.row.id}.json`"
            class="button is-icon"
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

      <template slot="top-left">
        <b-field class="table-search">
          <b-input
            v-model="contributionSearch"
            placeholder="Search..."
            type="search"
            icon="magnify"
          ></b-input>
        </b-field>
      </template>

      <template slot="bottom-left">
        <b-field horizontal label="Show">
          <b-dropdown v-model="rowsPerPage" expanded aria-role="list" position="is-top-right">
            <div slot="trigger" class="control">
              <div class="input">
                <span>{{ rowsPerPage }}</span>
              </div>
            </div>
            <b-dropdown-item
              v-for="(rows, index) in [10, 25, 50, 100, 1000]"
              :key="index"
              :value="rows"
              aria-role="listitem"
            >
              {{ rows }}
            </b-dropdown-item>
          </b-dropdown>
        </b-field>
      </template>
    </b-table>
  </div>
</template>

<script>
import Stats from '@/components/Stats'

export default {
  components: {
    Stats
  },
  data() {
    return {
      stats: {
        circuits: 0
      },
      contributors: [],
      contributions: [],
      rowsPerPage: 100,
      contributionSearch: '',
      downloadUrl: process.env.downloadUrl
    }
  },
  computed: {
    filteredContributors() {
      const search = this.contributionSearch.toLowerCase()
      const hasContributions = (contributor) => contributor.Contributions.length
      const matchesSearch = (contributor) =>
        contributor.name.toLowerCase().includes(search) ||
        contributor.handle.toLowerCase().includes(search)
      const contributors = this.contributors.filter(hasContributions).filter(matchesSearch)
      return contributors
    }
  },
  mounted() {
    this.getData()
  },
  methods: {
    async getData() {
      try {
        this.stats = await fetch('/api/stats').then((r) => r.json())
        this.contributors = await fetch('/api/contributors').then((r) => r.json())
      } catch (e) {
        /* eslint-disable-next-line no-console */
        console.error('e', e)
      }
    }
  }
}
</script>
