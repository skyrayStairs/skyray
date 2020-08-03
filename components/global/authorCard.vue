<template>
    <div class="card" style="margin-bottom: 0.5rem">
        <div class="card-content">
        <div class="media">
            <div class="media-left">
            <figure class="image is-48x48">
                <img :src="auth_image">
            </figure>
            </div>
            <div class="media-content">
            <p class="title is-4">{{auth_name}}</p>
            </div>
        </div>
        </div>
    </div>
</template>

<script>

export default {
    data() {
        return {

        }
    },
    props: {
        auth_image: {
            type: String,
            default: "img/blank-profile.png"
        },
        auth_name: {
            type: String
        }
    }
}
</script>

