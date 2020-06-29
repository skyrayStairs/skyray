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
}
</script>