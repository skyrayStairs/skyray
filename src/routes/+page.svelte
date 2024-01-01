<div class="flex content-center flex-col" id="page">
    <div class="my-auto mx-auto carousel rounded-box" id="center_card">
        {#each carouselImages as img}
            <div class="carousel-item">
                <img src={img} alt="Loading" id="image" />
            </div>
        {/each}
    </div>
    
</div>


<script lang="ts">
    import { onMount } from "svelte";

    let carouselImages: string[] = []
    
    onMount(() => {
        // 610/970
        const imageModules = import.meta.glob("$lib/assets/img/vertical/*.jpg");
        for (const modulePath in imageModules) {
            imageModules[modulePath]().then(({default: imageUrl }) => {
                carouselImages.push(imageUrl);
                carouselImages = carouselImages;
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
        background-color: #F0EDCC;
        background-size: cover;
    }

    #center_card {
        font-family:'KNUTRUTHTTF';
        aspect-ratio: 610/970;
        border-width: 6px;
        max-width: 670px;
        height: 100%;
        background-size: cover;
        border-color: #F0EDCC;
        border-radius: 2rem;
    } 
    
    #image {
        object-fit: cover;
    }
</style>
