<template>
    <div class="column post is-4">
        <article class="columns is-multiline">
        <div class="column is-12 center">
            <img class="post-img" :src="images.thumbnail"/>
        </div>
        <div class="column is-12 featured-content ">
            <h3 class="heading post-category">Category Name</h3>
                <h1 class="title post-title">{{title.en}} - {{ title.kr }}</h1>
                <h3 class="author">by {{author}}</h3>
                <p class="post-excerpt">{{description.en}}</p>
                <p class="post-excerpt">{{description.kr}}</p>
                <br>
                <nuxt-link :to="`${$route.path}/${slug}`" class="button is-primary">Read More</nuxt-link>
        </div>
        </article>
    </div>
</template>
<script>
export default {
  data: function () {
    return {}
  },
  props: {
      title: {
          type: Object
      },
      description: {
          type: Object
      },
      author: {
          type: String,
          default: "kyung"
      },
      slug: {
          type: String,
          default: "/"
      },
      images: {
          type: Object,
      }
  },
  components: {},
  methods: {}
}
</script>

<style scoped>
    .title {
        font-size: 2.2rem;
        color: white;
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

    .post-img {
        max-height: 200px;
    }

    .center {
        display: block;
        margin-left: auto;
        margin-right: auto;
        width: 50%;
    }
</style>