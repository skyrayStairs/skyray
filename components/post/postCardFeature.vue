<template>
    <div class="column post is-10">
        <article class="columns featured">
            <div class="column is-7 post-img ">
                <img :src="images.thumbnail"/>
            </div>
            <div class="column is-3 featured-content">
                <div>
                    <h3 class="heading post-category">Category Name</h3>
                    <h1 class="title post-title">{{title.en}} > {{ title.kr }}</h1>
                    <h3>by {{author}}</h3>
                    <p class="post-excerpt">{{description.en}}</p>
                    <p class="post-excerpt">{{description.kr}}</p>
                    <br>
                    <nuxt-link :to="`${$route.path}/${slug}`" class="button is-primary">Read More</nuxt-link>
                </div>
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
  methods: {},
  created() {
  }
}
</script>