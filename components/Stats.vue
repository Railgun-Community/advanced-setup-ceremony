<template>
  <div>
    <div class="currently">
      There are <span>{{ stats.contributions }}</span> contributions from
      <span>{{ stats.contributors }}</span> contributors
    </div>
    <div class="currently">
      Approximately <span>{{ stats.active }}</span> Contributors are currently contributing
    </div>
  </div>
</template>

<script>
export default {
  data() {
    return {
      timer: '',
      stats: {
        active: 0,
        contributors: 0,
        contributions: 0,
        circuits: 0
      }
    }
  },
  mounted() {
    this.getData()
    this.timer = setInterval(this.getData, 100000)
  },
  methods: {
    async getData() {
      this.stats = await fetch('/api/stats').then((r) => r.json())
    },
    cancelAutoUpdate() {
      clearInterval(this.timer)
    }
  },
  beforeUnmount() {
    this.cancelAutoUpdate()
  }
}
</script>
