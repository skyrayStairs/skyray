<div class="flex container" id="header">
    <div class="flex container flex-row grid-rows-2 justify-between" id="gnb">
        <div class="flex basis-28 align-baseline" id="left_top_text">
            <div class="mx-auto my-auto">기록</div>
        </div>
        <div class="flex container basis-28" id="nav_bar">
            <nav class="mx-auto my-auto">
                <a href="/">home</a>
            </nav>
        </div>
    </div>
</div>
<slot id="slot" />
<div class="flex container" id="footer"></div>

<script>
    import "../app.css"
    export const prerender = true;
</script>

<style>
    #header {
        background-color: #F0EDCC;
        max-width: 100%;
        height: 10vh;
    }

    #gnb {
        max-width: 100%;
        font-family:'KNUTRUTHTTF';
        color: #02343F;
        word-wrap: break-word;
    }

    #left_top_text {
        color: #02343F;
        word-wrap: break-word;
        writing-mode: vertical-lr;
        text-orientation: upright;
        font-size: 1.5rem;
    }

    #nav_bar {
        margin-right: 2.5%;
    }

    #footer {
        max-width: 100%;
        height: 5vh;
        background-color: #F0EDCC;
    }

    #slot {
        height: 85vh;
    }
</style>

