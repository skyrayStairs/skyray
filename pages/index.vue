<template>
  <div class="content">
    <section class="hero is-info is-medium is-bold banner">
      <banner></banner>
    </section>
      <!-- START ARTICLE FEED -->
      <section class="articles">
        <div class="container">
          <div class="columns is-centered">
            <div class="column is-full">
              <client-only>
                <card-slug 
                  v-for="(post, i) of blogPosts" 
                  :key="i" 
                  :title="{'kr': post.kr_title, 'en': post.en_title}" 
                  :content="{'kr': post.kr_body, 'en': post.en_body}" 
                  :date="post.date"
                  :slug="post.slug"
                  author="kyungsong">
                </card-slug>
              </client-only>
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
    return {}
  },
  computed: {
    blogPosts() {
        return this.$store.getters.getAllPosts;
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
