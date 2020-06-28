<template>
  <div class="content">
    <banner></banner>
      <!-- START ARTICLE FEED -->
      <section class="articles">
        <div class="container">
          <div class="columns is-centered">
            <div class="column is-full">
              <card-slug 
                v-for="post of blogPosts" 
                :key="post.title" 
                :title="post.title" 
                :content="post.en_body" 
                :date="post.date" 
                author="kyungsong">
              </card-slug>
            </div>
          </div>
        </div>
      </section>
  </div>
</template>

<script>
import banner from "@/components/landing/banner"
import gnb from "@/components/global/gnb"
import cardSlug from "@/components/landing/cardSlug"

export default {
  data: function () {
    return {
      lang: "en"
    }
  },
  computed: {
    blogPosts() {
        return this.$store.state.blogPosts;
    },
  },
  head() {
    return {
      script: [{ src: 'https://identity.netlify.com/v1/netlify-identity-widget.js' }],
    };
  },
  components: {
    gnb,
    banner,
    cardSlug
  },
  methods: {}
}
</script>

<style scoped>
.container {
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  text-align: center;
}

.articles {
  margin: 5rem 0;
  margin-top: -200px;
}
</style>
