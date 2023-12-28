<div class="flex content-center flex-col" id="page">
    <div class="flex container my-auto mx-auto" id="center_card">
    </div>
    
</div>


<script lang="ts">
    import { onMount } from "svelte";

    let carouselImages: string[] = []
    
    onMount(() => {
        const imageModules = import.meta.glob("$lib/assets/img/*.jpg");
        for (const modulePath in imageModules) {
            imageModules[modulePath]().then(({default: imageUrl }) => {
                carouselImages.push(imageUrl);
                carouselImages = carouselImages;
                console.log(imageUrl, modulePath);
            })
        };
    })
</script>

<style lang="postcss">
    #page {
        height: 85vh;
        position: relative;
    }

    #page::before {
        content: "";
        position: absolute;
        width: 100%;
        height: 100%;
        top: 0px;
        left: 0px;
        z-index: -1;
        /* background-image: url("/src/lib/assets/img/misc-1.jpg"); */
        background-color: #F0EDCC;
        background-size: cover;
        /* filter: brightness(90%) contrast(80%) blur(10px); */
    }

    #center_card {
        font-family:'KNUTRUTHTTF';
        aspect-ratio: 610/970;
        border-width: 6px;
        width: 670px;
        height: 100%;
        background-image: url("/src/lib/assets/img/misc-1.jpg");
        background-size: cover;
        border-color: #F0EDCC;
        /* background-color: #02343F; */
        border-radius: 2rem;
    }
</style>
