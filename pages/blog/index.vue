<template>
    <div class="content">
        <div v-for="post of blogPosts" :key="post.title">
            <nuxt-link :to="`blog/${post.slug}`">{{post.title}}</nuxt-link>
        </div>
    </div>
</template>

<script>
    import gnb from "@/components/global/gnb"

    export default {
        computed: {
            blogPosts() {
                return this.$store.state.blogPosts;
            },
        }
    };
</script>