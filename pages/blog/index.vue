<template>
    <div>
        <p>{{blogPosts}}</p>
        <h2>bbbb</h2>
    </div>
</template>
<script>
export default {
  computed: {
    blogPosts() {
      return this.$store.state.blogPosts;
    },
  },
};
</script>