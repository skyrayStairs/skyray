<template>
  <div class="container">
    <div class="columns is-variable is-1">
      <div class="column is-half">
        <div class="box">
          <div class="content">
            <div class="title">{{blogPost.en_title}}</div>
            <p v-html="$md.render(blogPost.en_body)"></p>
          </div>
        </div>
        <author-card :auth_name="blogPost.en_author" :auth_image="blogPost.original_author"></author-card>
      </div>
      <div class="column is-half">
        <div class="box">
          <div class="content">
            <div class="title">{{blogPost.kr_title}}</div>
            <p v-html="$md.render(blogPost.kr_body)"></p>
          </div>
        </div>
        <author-card :auth_name="blogPost.en_author" :auth_image="blogPost.original_author"></author-card>
      </div>
    </div>
  </div>
</template>

<script>
import authorCard from "@/components/global/authorCard"
export default {
  async asyncData({ params, payload }) {
    if (payload) return { blogPost: payload };
    else
    return {
      blogPost: await require(`@/assets/content/misc/${params.misc}.json`),
    };
  },
  components: {
    authorCard
  }
};
</script>

<style scoped>
</style>