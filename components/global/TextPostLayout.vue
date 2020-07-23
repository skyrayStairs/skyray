<template>
    <section class="posts">
        <div class="container">
            <div class="columns">
                <div class="column is-9">
                    <div v-if="Posts" class="columns is-multiline">
                        <post-card-small v-for="post of Posts" :key="post.slug"
                            :post="post"
                        ></post-card-small>
                    </div>
                    <div v-else :class="[`${$store.state.curLang}_no_post`]">
                        <h1>(╯°□°)╯︵ ┻━┻</h1>
                        <p>{{noPost}}</p>
                    </div>
                </div>
                <div class="column is-3">
                    <client-only>
                        <vertical-menu :menuItems="dates" v-on:date_clicked="getPosts"></vertical-menu>
                    </client-only>
                </div>
            </div>
        </div>
    </section>
</template>

<script>
    import postCardSmall from "@/components/post/postCardSmall"
    import verticalMenu from '@/components/global/verticalMenu.vue'
    import indexText from "@/assets/site_text/index.json"

    export default {
        data() {
            return {
                Posts: this.$store.getters.getPosts(this.$dayjs().format().split("T")[0].slice(0, 7), this.postType)
            }
        },
        components: {
            postCardSmall,
            verticalMenu
        },
        props: {
            postType: {
                type: String,
                required: true
            }
        },
        computed: {
            dates() {
                return this.$store.state.posts[this.postType];
            },
            noPost() {
                return indexText.no_post[this.$store.state.curLang]
            }
        },
        methods: {
            getPosts(val) {
                this.Posts = this.$store.getters.getPosts(val, this.postType)
            }
        }
    };
</script>

<style scoped>
    .posts {
        min-height: 100vh;
        background: #191b1f;
        padding-top: 4rem;
        padding-bottom: 10rem;
    }

    .en_no_post {
        font-family: "en_monsori",sans-serif;
        display: block;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.125;
        letter-spacing: 1px;
        color: white;
    }

    .kr_no_post {
        font-family: "kr_monsori",sans-serif;
        display: block;
        font-weight: 600;
        font-size: 2rem;
        line-height: 1.125;
        letter-spacing: 1px;
        color: white;
    }
</style>