<template>
  <section class="articles">
    <h2>{{blogPost.title}}</h2>
    <p v-html="$md.render(blogPost.en_body)"></p>
  </section>
</template>

<script>

export default {
    async asyncData({ params, payload }) {
        if (payload) return { blogPost: payload };
        else
        return {
            blogPost: await require(`@/assets/content/blog/${params.blog}.json`),
        };
    },
};
</script>