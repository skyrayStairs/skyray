<div class="flex content-center flex-col" id="page">
    <h1 class="sr-only">Photographs by Kyung Song</h1>
    <div class="my-auto mx-auto carousel" id="center_card">
        {#each carouselImages as img}
            <div class="carousel-item w-full">
                <img src={img} alt="" class="carousel-img" />
            </div>
        {/each}
    </div>

</div>


<script lang="ts">
    import { onMount } from "svelte";

    let carouselImages: string[] = $state([]);
    let carouselTimer: ReturnType<typeof setInterval>;

    onMount(() => {
        // 610/970
        const imageModules = import.meta.glob("$lib/assets/img/vertical/*.jpg");
        for (const modulePath in imageModules) {
            imageModules[modulePath]().then(({default: imageUrl }) => {
                carouselImages.push(imageUrl);
            })
        };

        // Respect the OS reduced-motion setting: skip the auto-rotate entirely.
        if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
            startAutoCarousel();
        }

        return () => clearInterval(carouselTimer);
    })

    function startAutoCarousel() {
        const carouselBox = document.getElementById("center_card");
        let slide = 0;

        carouselTimer = setInterval(() => {
            if (!carouselImages.length) return; // images load async; no-op until the first resolves
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
        height: 85dvh;
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
        background-color: var(--cream);
        background-size: cover;
    }

    #center_card {
        font-family:'KNUTRUTHTTF', sans-serif;
        aspect-ratio: 610/970;
        border-width: 6px;
        max-width: 670px;
        background-size: cover;
        border-color: var(--cream);
        border-radius: 2rem;
    }

    .carousel-img {
        object-fit: cover;
    }
</style>
