<template>
    <div class="card article" style="margin-bottom: 50px">
        <div class="card-content">
                <nuxt-link :to="`${post.target}/${post.slug}`" style="color: black">
                    <div class="media">
                        <div v-if="!!author_image" class="media-center">
                            <img :src="author_image" class="author-image" />
                        </div>
                        <br>
                        <div class="media-content has-text-centered">
                            <p class="title article-title">{{title}}</p>
                            <div class="tags has-addons level-item">
                                <span class="tag is-rounded is-info">@{{post.author ? post.author : "khs"}}</span>
                                <span class="tag is-rounded">{{ !!post.date ? $dayjs(post.date).format("YYYY-MMM-DD"): "2020 Jun 25"}}</span>
                            </div>
                        </div>
                    </div>
                    <div class="columns" style="min-width: 600px">
                        <div class="column">
                            <div class="content">
                                <p v-html="$md.render(this.description)"></p>
                            </div>
                        </div>
                    </div>
                </nuxt-link>
        </div>
    </div>
</template>

<script>
export default {
    data() {
        return {
            description: this.post[`${this.$store.state.curLang}_description`],
            title: this.post[`${this.$store.state.curLang}_title`]
        }
    },
    props: {
        post: {
            type: Object
        },
        author_image: {
            type: String,
            default: "img/author_default.jpg"
        }
    },
    computed: {},
    watch: {
        "$store.state.curLang": function(newVal, oldVal) {
            this.description = this.post[`${newVal}_description`],
            this.title = this.post[`${newVal}_title`]
        }
    },
    components: {},
    methods: {},
    created() {}
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

.card-content {
    background-color: #39B7CD;
}
</style>