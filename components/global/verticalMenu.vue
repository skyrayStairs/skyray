<template>
    <aside class="menu bd-side">
        <p class="menu-label">
            {{curLang === "kr"? "날짜 별":"By date"}}
        </p>
        <ul class="menu-list">
            <li v-for="(date, i) of Object.keys(menuItems)" :key="i" aria-haspopup="true" aria-controls="dropdown-menu">
                <a class="date_menu" v-on:click="addClass" :value="date">{{date}} 
                    <fa class="menu_toggle" icon="angle-up" aria-hidden="true"></fa> 
                    <fa class="menu_toggle displayed" icon="angle-down" aria-hidden="true"></fa>
                    <ul class="not_displayed">
                        <li v-for="(post, i) of menuItems[date]['posts']" :key="`${date}-${i}`">
                            <a><nuxt-link :to="`${post.target}/${post.slug}`">{{post[`${curLang}_title`]}}</nuxt-link></a>
                        </li>
                    </ul>
                </a>
            </li>
        </ul>
    </aside>
</template>

<script>
    export default {
        props: {
            menuItems: {
                type: Object,
                default: null
            }
        },
        components: {},
        computed: {
            curLang() {
                return this.$store.state.curLang
            }
        },
        methods: {
            addClass(event) {
                if (event.target.classList.contains("date_menu")) {
                    event.target.classList.toggle('is_active')
                    event.target.children[0].classList.toggle("displayed")
                    event.target.children[1].classList.toggle("displayed")
                    event.target.lastElementChild.classList.toggle("not_displayed")
                    this.$emit("date_clicked", event.target.attributes.value.value)
                }
            }
        },
    };
</script>

<style scoped>
    a:hover {
        background-color: transparent;
        color: white;
    }

    .is_active {
        color: white;
    }

    .menu_toggle {
        display: none;
    }

    .displayed {
        display: inline-block;
    }

    .not_displayed {
        display: none;
    }
</style>