<script>
    import "../app.css"
    import { fly, fade, slide } from 'svelte/transition'
    import { gnbState } from '$lib/stores/gnb.svelte'

    let { children } = $props();
    let drawerOpen = $state(false)
    let toolkitExpanded = $state(false)
    let playgroundExpanded = $state(false)
</script>

<svelte:window onkeydown={(e) => { if (e.key === 'Escape') drawerOpen = false }} />

<div class="flex container flex-row" id="header" class:nav-hidden={gnbState.hidden}>
    <div class="flex container flex-row grid-rows-2 justify-between" id="gnb">
        <div class="flex basis-24 md:mt-0 lg:mt-4" id="left_top_text">
            <a class="mx-auto mt-auto" href="/" aria-label="Home">기록</a>
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
        transition:fade={{ duration: 150 }}
        onclick={() => drawerOpen = false}
        aria-label="Close navigation"
    ></button>

    <nav
        class="drawer-panel"
        transition:fly={{ x: 320, duration: 250 }}
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
                    <ul transition:slide={{ duration: 200 }} class="sub-nav">
                        <li>
                            <a href="/toolkit/spell-sets" onclick={() => drawerOpen = false}>Spell Sets</a>
                        </li>
                    </ul>
                {/if}
            </li>

            <!-- Playground — text navigates, chevron toggles children -->
            <li>
                <div class="toolkit-row">
                    <a href="/playground" onclick={() => drawerOpen = false}>Playground</a>
                    <button
                        class="chevron-btn"
                        onclick={() => playgroundExpanded = !playgroundExpanded}
                        aria-label={playgroundExpanded ? 'Collapse' : 'Expand'}
                    >{playgroundExpanded ? '▲' : '▼'}</button>
                </div>

                {#if playgroundExpanded}
                    <ul transition:slide={{ duration: 200 }} class="sub-nav">
                        <li>
                            <a href="/playground/guitar-routine" onclick={() => drawerOpen = false}>Guitar Routine</a>
                        </li>
                    </ul>
                {/if}
            </li>
        </ul>
    </nav>
{/if}

<style>
    #header {
        background-color: #F0EDCC;
        max-width: 100%;
        height: 10vh;
        position: relative;
        z-index: 10;
    }

    #gnb {
        max-width: 100%;
        font-family: 'KNUTRUTHTTF';
        color: #02343F;
        word-wrap: break-word;
    }

    #left_top_text {
        color: #02343F;
        align-self: center;
        -webkit-writing-mode: vertical-lr;
        writing-mode: vertical-lr;
        -webkit-text-orientation: upright;
        text-orientation: upright;
        /* keep the 2 chars in one vertical column; break-word let iOS wrap them side-by-side */
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
        margin-top: 1.5rem;
        margin-right: 2.5%;
        align-self: start;
    }

    #footer {
        max-width: 100%;
        height: 5vh;
        background-color: #F0EDCC;
    }

    #slot {
        height: 85vh;
        overflow-y: auto;
    }

    /* Run-mode exercise view hides the global nav + footer and reclaims their height. */
    #header.nav-hidden,
    #footer.nav-hidden {
        display: none;
    }

    #slot.nav-hidden {
        height: 100vh;
    }

    .hamburger {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        width: 28px;
        height: 20px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
    }

    .hamburger span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: #02343F;
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
        background-color: #F0EDCC;
        z-index: 101;
        display: flex;
        flex-direction: column;
        padding: 2rem 1.5rem;
        box-shadow: -4px 0 20px rgba(0, 0, 0, 0.15);
        font-family: 'KNUTRUTHTTF';
    }

    .drawer-close {
        background: none;
        border: none;
        cursor: pointer;
        align-self: flex-end;
        font-size: 1.5rem;
        color: #02343F;
        padding: 0;
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
        color: #02343F;
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
        background: none;
        border: none;
        cursor: pointer;
        color: #02343F;
        font-size: 0.75rem;
        opacity: 0.5;
        padding: 0.25rem 0.4rem;
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
