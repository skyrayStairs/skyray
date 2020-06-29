<template>
    <div class="column post is-6">
        <article class="columns is-multiline">
            <div class="column is-12 post-img">
                <img src="https://cdn.emk.dev/templates/post-img.png" alt="Featured Image">
            </div>
            <div class="column is-12 featured-content ">
                <div>
                    <h3 class="heading post-category">Category Name</h3>
                    <h1 class="title post-title">{{title.en}} > {{ title.kr }}</h1>
                    <h3>by {{author}}</h3>
                    <p class="post-excerpt">{{description.en}}</p>
                    <p class="post-excerpt">{{description.kr}}</p>
                    <br>
                    <nuxt-link :to="`blog/${slug}`" class="button is-primary">Read More</nuxt-link>
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
      }
  },
  components: {},
  methods: {}
}
</script>