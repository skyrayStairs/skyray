<template>
    <section class="tech-posts">
        <div class="container">
            <div class="columns">
                <div class="column is-10 is-offset-1">
                    <div class="columns featured-post is-multiline">
                        <post-card-feature 
                            :post="blogPosts[0]"
                        ></post-card-feature>
                    </div>
                    <hr>
                    <div class="columns is-multiline">
                        <component v-for="(post, i) of blogPosts.slice(1)" :key="i"
                            :is="postSize(i)"
                            :post="post"
                        ></component>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
    import postCardFeature from "@/components/post/postCardFeature"
    import postCardMedium from "@/components/post/postCardMedium"
    import postCardSmall from "@/components/post/postCardSmall"

    export default {
        components: {
            postCardFeature,
            postCardMedium,
            postCardSmall
        },
        computed: {
            blogPosts() {
                return this.$store.state.posts.tech;
            },
        },
        methods: {
            postSize(i) {
                if (i < 2) {
                    return postCardMedium
                } else {
                    return postCardSmall
                }
            }
        }
    };
</script>

<style scoped>
    .tech-posts {
        min-height: 100vh;
        background: #191b1f;
        padding-top: 4rem;
        padding-bottom: 10rem;
    }
</style>