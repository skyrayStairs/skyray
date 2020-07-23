<template>
    <div class="card">
        <div class="card-content">
            <client-only>
                <p class="title" v-for="text of titleText.text" :key="text">
                    {{text}}
                </p>
            </client-only>
        </div>
        <footer class="subtitle">
            <client-only>
                <p v-if="!!titleText.author" style="text-align: right">
                    {{`- ${titleText.author}` }}
                </p>
            </client-only>
        </footer>
    </div>
</template>

<script>
import indexText from "@/assets/site_text/index.json"
import gnb from "@/components/global/gnb"

export default {
    data: function () {
        return {}
    },
    computed: {
        titleText() {
            let random_index = Math.floor(Math.random() * indexText.site_header[this.$store.state.curLang].length);
            return indexText.site_header[this.$store.state.curLang][random_index]
        }
    },
    components: {
        gnb
    },
    methods: {}
}
</script>

<style scoped>
.card-content {
    min-height: 300px;
}

.title {
    font-family:
        'Quicksand',
        'Source Sans Pro',
        -apple-system,
        BlinkMacSystemFont,
        'Segoe UI',
        Roboto,
        'Helvetica Neue',
        Arial,
        sans-serif;
    display: block;
    font-weight: 600;
    font-size: 2rem;
    line-height: 1.125;
    letter-spacing: 1px;
}
.subtitle {
    font-weight: 500;
    font-size: 24px;
    color: black;
    word-spacing: 2px;
    padding-bottom: 15px;
}
</style>