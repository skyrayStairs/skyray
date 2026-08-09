<script>
import "../app.css"
    import { onMount } from 'svelte'
    import { fly, fade, slide } from 'svelte/transition'
    import { gnbState } from '$lib/stores/gnb.svelte'

    let { children } = $props();
    let drawerOpen = $state(false)
    let toolkitExpanded = $state(false)
    let sandboxExpanded = $state(false)
    let reduce = $state(false)
    onMount(() => { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches })
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') drawerOpen = false }} />

<div class="flex container flex-row" id="header" class:nav-hidden={gnbState.hidden}>
    <div class="flex container flex-row grid-rows-2 justify-between" id="gnb">
        <div class="flex basis-24" id="left_top_text">
            <a class="mx-auto" href="/" aria-label="Home">기록</a>
        </div>
        <div class="flex" id="nav_bar">
            <button
                class="hamburger"
                onclick={() => drawerOpen = true}
                aria-label="Open navigation"
            >
                <span></span>
                <span></span>
                <span></span>
            </button>
        </div>
    </div>
</div>

<div id="slot" class:nav-hidden={gnbState.hidden}>
    {@render children()}
</div>

<div class="flex container" id="footer" class:nav-hidden={gnbState.hidden}></div>

{#if drawerOpen}
    <button
        class="drawer-backdrop"
        transition:fade={{ duration: reduce ? 0 : 150 }}
        onclick={() => drawerOpen = false}
        aria-label="Close navigation"
    ></button>

    <nav
        class="drawer-panel"
        transition:fly={{ x: 320, duration: reduce ? 0 : 250 }}
        aria-label="Site navigation"
    >
        <button
            class="drawer-close"
            onclick={() => drawerOpen = false}
            aria-label="Close"
        >✕</button>

        <ul>
            <!-- Home -->
            <li>
                <a href="/" onclick={() => drawerOpen = false}>Home</a>
            </li>

            <!-- Player's Toolkit — text navigates, chevron toggles children -->
            <li>
                <div class="toolkit-row">
                    <a href="/toolkit" onclick={() => drawerOpen = false}>Player's Toolkit</a>
                    <button
                        class="chevron-btn"
                        onclick={() => toolkitExpanded = !toolkitExpanded}
                        aria-label={toolkitExpanded ? 'Collapse' : 'Expand'}
                    >{toolkitExpanded ? '▲' : '▼'}</button>
                </div>

                {#if toolkitExpanded}
                    <ul transition:slide={{ duration: reduce ? 0 : 200 }} class="sub-nav">
                        <li>
                            <a href="/toolkit/spell-sets" onclick={() => drawerOpen = false}>Spell Sets</a>
                        </li>
                        <li>
                            <a href="/toolkit/class-features" onclick={() => drawerOpen = false}>Class Features</a>
                        </li>
                    </ul>
                {/if}
            </li>

            <!-- Sandbox — text navigates, chevron toggles children -->
            <li>
                <div class="toolkit-row">
                    <a href="/sandbox" onclick={() => drawerOpen = false}>Sandbox</a>
                    <button
                        class="chevron-btn"
                        onclick={() => sandboxExpanded = !sandboxExpanded}
                        aria-label={sandboxExpanded ? 'Collapse' : 'Expand'}
                    >{sandboxExpanded ? '▲' : '▼'}</button>
                </div>

                {#if sandboxExpanded}
                    <ul transition:slide={{ duration: reduce ? 0 : 200 }} class="sub-nav">
                        <li>
                            <a href="/sandbox/guitar-routine" onclick={() => drawerOpen = false}>Guitar Routine</a>
                        </li>
                        <li>
                            <a href="/sandbox/gym" onclick={() => drawerOpen = false}>Gym</a>
                        </li>
                    </ul>
                {/if}
            </li>
        </ul>
    </nav>
{/if}

<style>
    #header {
        background-color: var(--cream);
        max-width: 100%;
        height: 10dvh;
        position: relative;
        z-index: 10;
    }

    #gnb {
        max-width: 100%;
        font-family: 'KNUTRUTHTTF', sans-serif;
        color: var(--teal);
        word-wrap: break-word;
        /* One rule centres the whole bar. The wordmark and the hamburger used to be placed
           individually (align-self + margin-top), which drifted apart as the header scaled. */
        align-items: center;
    }

    #left_top_text {
        color: var(--teal);
        /* keep the 2 chars on one line; #gnb's break-word let iOS stack them */
        white-space: nowrap;
        /* stop iOS Safari from auto-inflating the glyphs ("too big" on iPhone) */
        -webkit-text-size-adjust: 100%;
        text-size-adjust: 100%;
        /* scale with header real estate; caps at the original 2.5rem on desktop */
        font-size: clamp(1.25rem, 5vh, 2.5rem);
    }

    #left_top_text a {
        color: inherit;
        text-decoration: none;
    }

    #nav_bar {
        margin-right: 2.5%;
    }

    #footer {
        max-width: 100%;
        height: 5dvh;
        background-color: var(--cream);
    }

    #slot {
        height: 85dvh;
        overflow-y: auto;
        /* Match the page background instead of the OS default (black gutter in desktop dark mode). */
        scrollbar-color: rgba(2, 52, 63, 0.4) var(--cream); /* thumb, track (Firefox) */
    }

    #slot::-webkit-scrollbar {
        width: 12px;
    }

    #slot::-webkit-scrollbar-track {
        background: var(--cream);
    }

    #slot::-webkit-scrollbar-thumb {
        background-color: rgba(2, 52, 63, 0.35);
        border-radius: 6px;
        border: 3px solid var(--cream); /* inset the thumb so the cream track shows around it */
    }

    #slot::-webkit-scrollbar-thumb:hover {
        background-color: rgba(2, 52, 63, 0.55);
    }

    /* Run-mode exercise view hides the global nav + footer and reclaims their height. */
    #header.nav-hidden,
    #footer.nav-hidden {
        display: none;
    }

    #slot.nav-hidden {
        height: 100dvh;
    }

    .hamburger {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 28px;
        /* 18px, not 20px: space-between then puts the bars on an 8px pitch, which
           stays whole in device px at 1.25×–2× DPI. A 9px pitch puts the middle
           bar on a half-pixel and it renders visibly thicker. */
        height: 18px;
        background: none;
        border: none;
        cursor: pointer;
        /* 28×18 icon, but a 54×44 tap target; negative margin keeps layout put. */
        box-sizing: content-box;
        padding: 13px;
        margin: -13px;
    }

    .hamburger span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: var(--teal);
        border-radius: 2px;
    }

    .drawer-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.4);
        z-index: 100;
        border: none;
        cursor: default;
        width: 100%;
        height: 100%;
    }

    .drawer-panel {
        position: fixed;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(320px, 80vw);
        background-color: var(--cream);
        z-index: 101;
        display: flex;
        flex-direction: column;
        padding: 2rem 1.5rem;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        font-family: 'KNUTRUTHTTF', sans-serif;
    }

    .drawer-close {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        background: none;
        border: none;
        cursor: pointer;
        align-self: flex-end;
        font-size: 1.5rem;
        color: var(--teal);
        margin-bottom: 2rem;
        line-height: 1;
    }

    .drawer-panel > ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
    }

    .drawer-panel a {
        color: var(--teal);
        text-decoration: none;
        font-size: 1.25rem;
        display: block;
        padding: 0.25rem 0;
        transition: opacity 0.15s;
    }

    .drawer-panel > ul > li > a,
    .toolkit-row > a {
        border-bottom: 1px solid rgba(2, 52, 63, 0.15);
    }

    .drawer-panel a:hover {
        opacity: 0.65;
    }

    /* Row that holds the toolkit link + chevron toggle */
    .toolkit-row {
        display: flex;
        align-items: center;
    }

    .toolkit-row > a {
        flex: 1;
    }

    .chevron-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 44px;
        min-height: 44px;
        background: none;
        border: none;
        cursor: pointer;
        color: var(--teal);
        font-size: 0.75rem;
        opacity: 0.5;
        line-height: 1;
        transition: opacity 0.15s;
    }

    .chevron-btn:hover {
        opacity: 1;
    }

    /* Sub-nav: indented secondary items */
    .sub-nav {
        list-style: none;
        padding: 0;
        margin: 0.5rem 0 0 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        padding-left: 1.25rem;
        border-left: 2px solid rgba(2, 52, 63, 0.15);
    }

    .sub-nav a {
        font-size: 1rem;
        opacity: 0.8;
        padding: 0.15rem 0;
        border-bottom: none;
    }

    .sub-nav a:hover {
        opacity: 1;
    }
</style>
