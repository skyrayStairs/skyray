<template>
    <!-- <div class="hero-body" :style="{'background-image': `url(${backgroundURL})`}"> -->
    <div class="hero-body">
        <div class="container has-text-centered">
            <h1 class="title banner">
                <client-only>
                    <div v-for="text of titleText.text" :key="text">
                        {{text}}
                    </div>
                    <div v-if="!!titleText.author" class="subtitle" style="text-align: right">
                        {{`- ${titleText.author}` }}
                    </div>
                </client-only>
            </h1>
        </div>
    </div>
</template>

<script>
import indexText from "@/assets/site_text/index.json"
import gnb from "@/components/global/gnb"

export default {
    data: function () {
        let random_index = Math.floor(Math.random() * indexText.site_header["en"].length);
        return {
            // titleText: indexText.site_header["en"][random_index],
        }
  },
  computed: {
      backgroundURL() {
        //   let images = Array.from(require.context('../../assets/img/index/', false, /\.jpeg$/).keys());
          return ""
        //   return require(`../../assets/img/index/${images[Math.floor(Math.random() * images.length)].substr(2)}`);
      },
      titleText() {
          let random_index = Math.floor(Math.random() * indexText.site_header[this.$store.state.curLang].length);
          return indexText.site_header[this.$store.state.curLang][random_index]
      }
  },
  components: {
    gnb
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

.hero-body { 
    background-position: center;
    background-size: cover;
    background-repeat: no-repeat;
    height: 500px;
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

/* .banner {
    color: #000;
    text-shadow: 0.05em 0 black,
                0 0.05em black,
                -0.05em 0 black,
                0 -0.05em black,
                -0.05em -0.05em black,
                -0.05em 0.05em black,
                0.05em -0.05em black,
                0.05em 0.05em black;
} */

.articles {
    margin: 5rem 0;
    margin-top: -200px;
}

.subtitle {
    font-weight: 500;
    font-size: 24px;
    color: #526488;
    word-spacing: 2px;
    padding-bottom: 15px;
}

.links {
    padding-top: 15px;
}
</style>