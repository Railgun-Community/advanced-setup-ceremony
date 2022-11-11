<template>
  <div class="wrapper">
    <Navbar />
    <section class="main-content section">
      <div class="container">
        <nuxt />
      </div>
      <footer id="footer">
        <p id="copyright" class="copyright">
          <a
            href="https://github.com/railgun-community/advanced-setup-ceremony"
            class="social-link"
            target="_blank"
          >
            <span class="icon icon-github is-medium"></span>
            github.com/railgun-community/advanced-setup-ceremony
          </a>
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
