<template>
  <div class="content is-vcentered">
      <section class="hero is-fullheight-with-navbar">
        <banner></banner>
      </section>
      <section class="hero is-fullheight-with-navbar">
          <div class="hero-body">
            <h1 class="title banner container has-text-centered">
            </h1>
        </div>
      </section>
  </div>
</template>

<script>
import banner from "@/components/landing/banner"

export default {
  data: function () {
    return {}
  },
  computed: {},
  head() {
    return {
      script: [{ src: 'https://identity.netlify.com/v1/netlify-identity-widget.js' }],
    };
  },
  components: {
    banner
  },
  methods: {},
  created() {
  }
}
</script>

<style scoped>
</style>
