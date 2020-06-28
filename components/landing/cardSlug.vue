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
            <div class="content article-body" style="min-width: 600px">
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