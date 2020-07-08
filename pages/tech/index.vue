<template>
    <section class="tech-posts">
        <div class="container">
            <div class="columns">
                <div class="column is-10 is-offset-1">
                    <div class="columns featured-post is-multiline">
                        <post-card-feature 
                            :title="{'kr': blogPosts[0].kr_title, 'en': blogPosts[0].en_title}"
                            :description="{'kr': blogPosts[0].kr_description, 'en': blogPosts[0].en_description}"
                            :date="blogPosts[0].date"
                            :author="blogPosts[0].author"
                            :slug="blogPosts[0].slug"
                            :images="{'thumbnail': blogPosts[0].thumbnail}"
                        ></post-card-feature>
                    </div>
                    <hr>
                    <div class="columns is-multiline">
                        <component v-for="(post, i) of blogPosts" :key="i"
                            :is="postSize(i)"
                            :title="{'kr': post.kr_title, 'en': post.en_title}"
                            :description="{'kr': post.kr_description, 'en': post.en_description}"
                            :date="post.date"
                            :author="post.author"
                            :slug="post.slug"
                            :images="{'thumbnail': post.thumbnail}"
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