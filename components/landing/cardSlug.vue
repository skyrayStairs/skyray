<template>
    <div class="card article">
        <div class="card-content">
            <div class="media">
                <client-only>
                    <div v-if="!!author_image" class="media-center">
                        <img :src="author_image" class="author-image">
                    </div>
                </client-only>
                <div class="media-content has-text-centered">
                    <p class="title article-title">{{title}}</p>
                    <div class="tags has-addons level-item">
                        <span class="tag is-rounded is-info">@{{author}}</span>
                        <span class="tag is-rounded">{{ !!date ? $dayjs(date).format("YYYY-MMM-DD"): "2020 Jun 25"}}</span>
                    </div>
                </div>
            </div>
            <div class="content article-body">
                <p v-html="$md.render(content)"></p>
            </div>
        </div>
    </div>
</template>

<script>
export default {
  data: function () {
    return {
      lang: "en"
    }
  },
  props: {
      title: {
          type: String,
          default: ""
      },
      content: {
          type: String,
          default: ""
      },
      length: {
          type: Number,
          default: 100
      },
      date: {
          type: String,
          default: null
      },
      author: {
          type: String,
          default: "kyung"
      },
      author_image: {
          type: String,
          default: null
      }
  },
  components: {},
  methods: {}
}
</script>

<style scoped>
.articles {
  margin: 5rem 0;
  margin-top: -200px;
}
</style>