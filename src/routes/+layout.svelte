<div class="flex container flex-row" id="header">
    <div class="flex container flex-row grid-rows-2 justify-between" id="gnb">
        <div class="flex basis-24 md:mt-0 lg:mt-4" id="left_top_text">
            <div class="mx-auto mt-auto">기록</div>
        </div>
        <div class="flex" id="nav_bar">
            <nav class="flex container mx-auto mb-auto justify-between">
                <a class="mr-2" href="/">home</a>
            </nav>
        </div>
    </div>
</div>
<slot id="slot" />
<div class="flex container" id="footer"></div>

<script>
    import "../app.css"
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
        align-self: center;
        font-size: 2.5rem;
    }

    #nav_bar {
        margin-top: 2rem;
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
    }
</style>

