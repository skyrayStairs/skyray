<template>
    <div class="content">
        <section class="blog-posts">
            <div class="columns">
                <div class="column is-10 is-offset-1">
                    <div class="columns featured-post is-multiline">
                        <blog-card-feature 
                            :title="{'kr': blogPosts[0].kr_title, 'en': blogPosts[0].en_title}"
                            :description="{'kr': blogPosts[0].kr_description, 'en': blogPosts[0].en_description}"
                            :date="blogPosts[0].date"
                            :author="blogPosts[0].author"
                            :slug="blogPosts[0].slug"
                        ></blog-card-feature>
                    </div>
                    <div class="columns is-multiline">
                        <component v-for="(post, i) of blogPosts" :key="i"
                            :is="postSize(i)"
                            :title="{'kr': post.kr_title, 'en': post.en_title}"
                            :description="{'kr': post.kr_description, 'en': post.en_description}"
                            :date="post.date"
                            :author="post.author"
                            :slug="post.slug"
                        ></component>
                    </div>
                </div>
            </div>
        </section>
    </div>
</template>

<script>
    import blogCardFeature from "@/components/blog/blogCardFeature"
    import blogCardMedium from "@/components/blog/blogCardMedium"
    import blogCardSmall from "@/components/blog/blogCardSmall"

    export default {
        components: {
            blogCardFeature,
            blogCardMedium,
            blogCardSmall
        },
        computed: {
            blogPosts() {
                console.log(this.$store.state.blogPosts)
                return this.$store.state.blogPosts;
            },
        },
        methods: {
            postSize(i) {
                if (i < 2) {
                    return blogCardMedium
                } else {
                    return blogCardSmall
                }
            }
        }
    };
</script>

<style scoped>
</style>