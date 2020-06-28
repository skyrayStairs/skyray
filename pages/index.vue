<template>
  <div class="content">
    <banner></banner>
    <div class="container">
        <!-- START ARTICLE FEED -->
        <section class="articles">
            <div class="column is-8 is-offset-2">
                <!-- START ARTICLE -->
                <card-slug 
                v-for="post of blogPosts" 
                :key="post.title" :title="post.title" 
                :content="post.en_body" :date="post.date" 
                author="kyungsong"></card-slug>
                <!-- END ARTICLE -->
                <!-- START ARTICLE -->
                <div class="card article">
                    <div class="card-content">
                        <div class="media">
                            <div class="media-center">
                                <img src="http://www.radfaces.com/images/avatars/daria-morgendorffer.jpg" class="author-image" alt="Placeholder image">
                            </div>
                            <div class="media-content has-text-centered">
                                <p class="title article-title">Sapien eget mi proin sed 🔱</p>
                                <p class="subtitle is-6 article-subtitle">
                                    <a href="#">@daria</a> on February 17, 2018
                                </p>
                            </div>
                        </div>
                        <div class="content article-body">
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Accumsan lacus vel facilisis volutpat est velit egestas. Sapien eget mi proin sed. Sit amet mattis vulputate enim.
                            </p>
                            <p>
                                Commodo ullamcorper a lacus vestibulum sed arcu. Fermentum leo vel orci porta non. Proin fermentum leo vel orci porta non pulvinar. Imperdiet proin fermentum leo vel. Tortor posuere ac ut consequat semper viverra. Vestibulum lectus mauris ultrices eros.
                            </p>
                            <h3 class="has-text-centered">Lectus vestibulum mattis ullamcorper velit sed ullamcorper morbi. Cras tincidunt lobortis feugiat vivamus.</h3>
                            <p>
                                In eu mi bibendum neque egestas congue quisque egestas diam. Enim nec dui nunc mattis enim ut tellus. Ut morbi tincidunt augue interdum velit euismod in. At in tellus integer feugiat scelerisque varius morbi enim nunc. Vitae suscipit tellus mauris a diam.
                                Arcu non sodales neque sodales ut etiam sit amet.
                            </p>
                        </div>
                    </div>
                </div>
                <!-- END ARTICLE -->
                <!-- START PROMO BLOCK -->
                <section class="hero is-info is-bold is-small promo-block">
                    <div class="hero-body">
                        <div class="container">
                            <h1 class="title">
                                <i class="fa fa-bell-o"></i> Nemo enim ipsam voluptatem quia.</h1>
                            <span class="tag is-black is-medium is-rounded">
                                    Natus error sit voluptatem
                                </span>
                        </div>
                    </div>
                </section>
                <!-- END PROMO BLOCK -->
                <!-- START ARTICLE -->
                <div class="card article">
                    <div class="card-content">
                        <div class="media">
                            <div class="media-center">
                                <img src="http://www.radfaces.com/images/avatars/angela-chase.jpg" class="author-image" alt="Placeholder image">
                            </div>
                            <div class="media-content has-text-centered">
                                <p class="title article-title">Cras tincidunt lobortis feugiat vivamus.</p>
                                <p class="subtitle is-6 article-subtitle">
                                    <a href="#">@angela</a> on October 7, 2017
                                </p>
                            </div>
                        </div>
                        <div class="content article-body">
                            <p>
                                Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Accumsan lacus vel facilisis volutpat est velit egestas. Sapien eget mi proin sed. Sit amet mattis vulputate enim.
                            </p>
                            <p>
                                Commodo ullamcorper a lacus vestibulum sed arcu. Fermentum leo vel orci porta non. Proin fermentum leo vel orci porta non pulvinar. Imperdiet proin fermentum leo vel. Tortor posuere ac ut consequat semper viverra. Vestibulum lectus mauris ultrices eros.
                            </p>
                            <h3 class="has-text-centered">“Everyone should be able to do one card trick, tell two jokes, and recite three poems, in case they are ever trapped in an elevator.”</h3>
                            <p>
                                In eu mi bibendum neque egestas congue quisque egestas diam. Enim nec dui nunc mattis enim ut tellus. Ut morbi tincidunt augue interdum velit euismod in. At in tellus integer feugiat scelerisque varius morbi enim nunc. Vitae suscipit tellus mauris a diam.
                                Arcu non sodales neque sodales ut etiam sit amet.
                            </p>
                        </div>
                    </div>
                </div>
                <!-- END ARTICLE -->
          </div>
        </section>
        <!-- END ARTICLE FEED -->
      </div>
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

.title {
  font-family:
    'Quicksand',
    'Source Sans Pro',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    'Helvetica Neue',
    Arial,
    sans-serif;
  display: block;
  font-weight: 600;
  font-size: 2rem;
  line-height: 1.125;
  letter-spacing: 1px;
}

.articles {
  margin: 5rem 0;
  margin-top: -200px;
}

.subtitle {
  font-weight: 300;
  font-size: 20px;
  color: #526488;
  word-spacing: 2px;
  padding-bottom: 15px;
}

.links {
  padding-top: 15px;
}

.author-image {
  position: absolute;
    top: -30px;
    left: 50%;
    width: 60px;
    height: 60px;
    margin-left: -30px;
    border: 3px solid #ccc;
    border-radius: 50%;
}
</style>
