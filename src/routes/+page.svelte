<div class="flex content-center flex-col" id="page">
    <div class="my-auto mx-auto carousel" id="center_card">
        {#each carouselImages as img}
            <div class="carousel-item w-full">
                <img src={img} alt="Loading" id="image" />
            </div>
        {/each}
    </div>
    
</div>


<script lang="ts">
    import { onMount } from "svelte";

    let carouselImages: string[] = [];
    var carouselTimer;
    
    onMount(() => {
        // 610/970
        const imageModules = import.meta.glob("$lib/assets/img/vertical/*.jpg");
        for (const modulePath in imageModules) {
            imageModules[modulePath]().then(({default: imageUrl }) => {
                carouselImages.push(imageUrl);
                carouselImages = carouselImages;
            })
        };

        setAutoIntervalCarousel(carouselImages.length);
    })

    function setAutoIntervalCarousel(imageSize : number) {
        const carouselBox = document.getElementById("center_card");
        let slide = 0;

        carouselTimer = setInterval(() => {
            if (slide >= carouselBox.scrollWidth) {
                slide = 0;
            } else {
                slide += (carouselBox.scrollWidth/carouselImages.length);
            }
            carouselBox.scrollLeft = slide;
        }, 4000);
    }
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
        background-size: cover;
        border-color: #F0EDCC;
        border-radius: 2rem;
    } 
    
    #image {
        object-fit: cover;
    }
</style>
