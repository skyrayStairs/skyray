<template>
  <div class="columns">
    <div class="column is-half">
      <div class="box">
        <div class="content">
          <div class="title">{{blogPost.en_title}}</div>
          <p v-html="$md.render(blogPost.en_body)"></p>
        </div>
      </div>
    </div>
    <div class="column is-half">
      <div class="box">
        <div class="content">
          <div class="title">{{blogPost.kr_title}}</div>
          <p v-html="$md.render(blogPost.kr_body)"></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script>

export default {
  async asyncData({ params, payload }) {
    if (payload) return { blogPost: payload };
    else
    return {
      blogPost: await require(`@/assets/content/game/${params.game}.json`),
    };
  },
};
</script>