<template>
  <div class="wrapper">
    <Navbar />
    <section class="main-content section">
      <div class="container">
        <nuxt />
      </div>
      <footer id="footer">
        <p id="copyright" class="copyright">
          &copy; 2022. All rights reserved.
        </p>
      </footer>
    </section>
    <Loading />
  </div>
</template>

<script>
import Navbar from '@/components/Navbar'
import Loading from '@/components/Loading'

export default {
  components: {
    Navbar,
    Loading
  }
}
</script>
