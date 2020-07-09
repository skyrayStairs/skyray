<template>
    <div class="column post is-full">
        <article class="columns featured" style="align-items: center">
            <div class="column is-half" style="text-align: center">
                <img class="post-img" :src="post.thumbnail"/>
            </div>
            <div class="column is-half featured-content">
                <h3 class="heading post-category">{{$route.name}}</h3>
                <h1 class="title post-title">{{title}}</h1>
                <h3 class="author">by {{post.author ? post.author : "khs"}}</h3>
                <p class="post-excerpt">{{description}}</p>
                <br>
                <nuxt-link :to="`${$route.path}/${post.slug}`" class="button is-primary">Read More</nuxt-link>
            </div>
        </article>
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
          type: Object,
          required: true
      }
  },
  components: {},
  methods: {},
  watch: {
        "$store.state.curLang": function(newVal, oldVal) {
            this.description = this.post[`${newVal}_description`],
            this.title = this.post[`${newVal}_title`]
        }
    },
  created() {}
}
</script>

<style scoped>
    .title {
        font-size: 2.2rem;
        color: white;
    }

    .post-img {
        max-height: 250px;
    }

    .heading {
        color: #3b7adf;
    }

    .author {
        color: white;
    }
    .post-excerpt {
        line-height: 1.5rem;
        letter-spacing: .03rem;
        font-size: 1.2rem;
        font-family: 'IBM Plex Serif', serif;
        color: #92a3ab;
    }

    .center {
        width: 50%;
        margin-left: auto;
        margin-right: auto;
        display: block;
    }
</style>