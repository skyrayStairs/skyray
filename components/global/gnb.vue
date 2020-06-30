<template>
    <nav class="navbar">
        <div class="container">
            <div class="navbar-brand">
                <span class="navbar-item">
                    <nuxt-link to="/">
                        <fa icon="code-branch"></fa>
                    </nuxt-link>
                </span>
            </div>
            <div id="navbarMenu" class="navbar-menu">
                <div class="navbar-end">
                    <span class="navbar-item">
                        <nuxt-link to="/">Home</nuxt-link>
                    </span>
                    <client-only>
                        <span class="navbar-item" v-for="route in routes" :key="route.path">
                            <nuxt-link :to="route.path">{{route.name}}</nuxt-link>
                        </span>
                        <span class="navbar-item">
                            <div class="control has-icons-left">
                                <div class="select is-small">
                                    <select v-on:change="langChanged">
                                        <option value="kr" selected>kr</option>
                                        <option value="en">en</option>
                                    </select>
                                </div>
                                <span class="icon is-small is-left">
                                    <gb-flag :code="$store.state.curFlag" size="small" />
                                </span>
                            </div>
                        </span>
                    </client-only>
                </div>
            </div>
        </div>
    </nav>
</template>

<script>
export default {
    computed: {
        routes() {
            return this.$router.options.routes.filter(obj => obj.path.length !== 1 && !obj.path.includes(":"))
        }
    },
    methods: {
        langChanged(event) {
            this.$store.commit('setLang', {lang: event.target.value, flag: (event.target.value === "en") ? "us":event.target.value })
        }
    }
}
</script>