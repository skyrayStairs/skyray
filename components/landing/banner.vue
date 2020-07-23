<template>
    <div class="hero-body">
        <h1 class="banner container has-text-centered">
            <client-only>
                <div v-for="text of titleText.text" :key="text" :class="[`${$store.state.curLang}_title`]">
                    <p>{{text}}</p>
                </div>
                <div v-if="!!titleText.author" class="subtitle" style="text-align: right">
                    {{`- ${titleText.author}` }}
                </div>
            </client-only>
        </h1>
    </div>
</template>

<script>
import indexText from "@/assets/site_text/index.json"

export default {
    data: function () {
        return {}
  },
  computed: {
      titleText() {
          let random_index = Math.floor(Math.random() * indexText.site_header[this.$store.state.curLang].length);
          return indexText.site_header[this.$store.state.curLang][random_index]
      }
  },
  components: {},
  methods: {}
}
</script>

<style scoped>
.en_title {
    font-family: "en_monsori",sans-serif;
    display: block;
    font-weight: 600;
    font-size: 3rem;
    line-height: 1.125;
    letter-spacing: 1px;
    color: black;
}

.kr_title {
    font-family: "kr_monsori",sans-serif;
    display: block;
    font-weight: 600;
    font-size: 2.5rem;
    line-height: 1.125;
    letter-spacing: 1px;
    color: black;
}

.subtitle {
    font-weight: 500;
    font-size: 25px;
    color: black;
    word-spacing: 2px;
    margin-top: 30px;
    padding-right: 50px;
}

.hero-body {
  background-color: #ff624d;
}
</style>